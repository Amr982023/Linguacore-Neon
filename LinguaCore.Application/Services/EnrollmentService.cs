using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace LinguaCore.Application.Services;

/// <summary>
/// EnrollmentService is now the CORE entity for per-student financial and language data.
/// Scholarship and DiscountPct are stored on Enrollment (not Student).
/// Language and Level are always derived from Group → LanguageLevel — never stored directly.
/// </summary>
public class EnrollmentService : IEnrollmentService
{
    private readonly IUnitOfWork _uow;
    private readonly IHttpContextAccessor _httpContext;

    public EnrollmentService(IUnitOfWork uow, IHttpContextAccessor httpContext)
    {
        _uow = uow;
        _httpContext = httpContext;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public async Task<ApiResponse<EnrollmentResponse>> CreateAsync(CreateEnrollmentRequest req)
    {
        var pendingStatus = await _uow.Repository<EnrollStatus>()
            .FirstOrDefaultAsync(s => s.Name == "PENDING");

        var ActiveStatus = await _uow.Repository<EnrollStatus>()
          .FirstOrDefaultAsync(s => s.Name == "ACTIVE");


        var enrollment = new Enrollment
        {
            StudentId = req.StudentId,
            GroupId = req.GroupId,
            EnrollStatusId = pendingStatus!.Id,
            EnrollDate = req.EnrollDate.ToUniversalTime(),
            EffectiveFee = req.EffectiveFee,
            Scholarship = req.Scholarship,
            DiscountPct = req.DiscountPct,
        };

        if (req.Scholarship)
        {
            enrollment.EnrollStatusId = ActiveStatus!.Id;
        }

        await _uow.Enrollments.AddAsync(enrollment);
        await _uow.SaveChangesAsync();

        var result = await _uow.Enrollments.GetWithDetailsAsync(enrollment.Id);
        return ApiResponse<EnrollmentResponse>.Ok(MapToResponse(result!));
    }

    // ── Create Partial ────────────────────────────────────────────────────────

    public async Task<ApiResponse<EnrollmentResponse>> CreatePartialAsync(CreatePartialEnrollmentRequest req)
    {
        var partialStatus = await _uow.Repository<EnrollStatus>()
            .FirstOrDefaultAsync(s => s.Name == "PARTIAL");

        var enrollment = new Enrollment
        {
            StudentId = req.StudentId,
            GroupId = req.GroupId,
            EnrollStatusId = partialStatus!.Id,
            EnrollDate = req.PartialStart.ToUniversalTime(),
            EffectiveFee = req.PartialCost,
            IsPartial = true,
            PartialStart = req.PartialStart.ToUniversalTime(),
            PartialEnd = req.PartialEnd.ToUniversalTime(),
            PartialCost = req.PartialCost,
            Scholarship = req.Scholarship,
            DiscountPct = req.DiscountPct,
        };
        await _uow.Enrollments.AddAsync(enrollment);
        await _uow.SaveChangesAsync();

        var result = await _uow.Enrollments.GetWithDetailsAsync(enrollment.Id);
        return ApiResponse<EnrollmentResponse>.Ok(MapToResponse(result!));
    }

    // ── Status update ─────────────────────────────────────────────────────────

    public async Task<ApiResponse<EnrollmentResponse>> UpdateStatusAsync(UpdateEnrollmentStatusRequest req)
    {
        var enrollment = await _uow.Enrollments.GetByIdAsync(req.EnrollmentId);
        if (enrollment is null)
            return ApiResponse<EnrollmentResponse>.Fail("Enrollment not found.");

        enrollment.EnrollStatusId = req.EnrollStatusId;
        _uow.Enrollments.Update(enrollment);
        await _uow.SaveChangesAsync();

        var result = await _uow.Enrollments.GetWithDetailsAsync(enrollment.Id);
        return ApiResponse<EnrollmentResponse>.Ok(MapToResponse(result!));
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public async Task<ApiResponse<IEnumerable<EnrollmentResponse>>> GetByStudentAsync(Guid studentId)
    {
        var enrollments = await _uow.Enrollments.GetByStudentAsync(studentId);
        return ApiResponse<IEnumerable<EnrollmentResponse>>.Ok(enrollments.Select(MapToResponse));
    }

    public async Task<ApiResponse<IEnumerable<EnrollmentResponse>>> GetByGroupAsync(Guid groupId)
    {
        var enrollments = await _uow.Enrollments.GetByGroupAsync(groupId);
        return ApiResponse<IEnumerable<EnrollmentResponse>>.Ok(enrollments.Select(MapToResponse));
    }

    // ── Unenroll (hard delete — PENDING / PARTIAL with no payments only) ──────

    public async Task<ApiResponse<bool>> UnenrollAsync(Guid enrollmentId)
    {
        // 1. Load with payments so we can check them
        var enrollment = await _uow.Enrollments.GetWithDetailsAsync(enrollmentId);
        if (enrollment is null)
            return ApiResponse<bool>.Fail("Enrollment not found.");

        // 2. Only allow for PENDING or PARTIAL — anything else has financial history
        var statusName = enrollment.EnrollStatus?.Name ?? "";
        var allowedStatuses = new[] { "PENDING", "PARTIAL" };
        if (!allowedStatuses.Contains(statusName, StringComparer.OrdinalIgnoreCase))
            return ApiResponse<bool>.Fail(
                $"Cannot unenroll a student with status '{statusName}'. " +
                "Only PENDING or PARTIAL enrollments with no payments can be removed. " +
                "Use Early Exit & Refund for active students.");

        // 3. Block if any payment exists — financial records are immutable
        if (enrollment.Payments.Any())
            return ApiResponse<bool>.Fail(
                "This enrollment has payment records and cannot be deleted. " +
                "Use Early Exit & Refund to process a refund and close the enrollment instead.");

        // 4. Hard delete — no financial side effects since no payment ever existed
        await _uow.Enrollments.DeleteAsync(enrollment);
        await _uow.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<IEnumerable<RefundListResponse>>> GetRefundsByBranchAsync(
     Guid branchId, DateTime? from = null, DateTime? to = null)
    {
        var refunds = await _uow.Refunds.GetByBranchAsync(branchId);

        if (from.HasValue) refunds = refunds.Where(r => r.RefundDate >= from.Value);
        if (to.HasValue) refunds = refunds.Where(r => r.RefundDate <= to.Value);

        var result = refunds.Select(r => new RefundListResponse(
            r.Id,
            r.StudentId,
            r.Student?.Person is null ? "" : $"{r.Student.Person.FirstName} {r.Student.Person.LastName}",
            r.PaymentId,
            r.Payment?.EnrollmentId ?? Guid.Empty,
            r.Payment?.Enrollment?.Group?.Name ?? "",
            r.Payment?.Enrollment?.Group?.LanguageLevel?.Language?.Name ?? "",
            r.Payment?.Enrollment?.Group?.LanguageLevel?.Level?.Code ?? "",
            r.PaymentMethod?.Name ?? "",
            r.SessionsAttended,
            r.SessionsTotal,
            r.AmountPaid,
            r.CalculatedRefundAmount,
            r.ActualRefundAmount,
            r.AdjustmentReason,
            r.RefundDate));

        return ApiResponse<IEnumerable<RefundListResponse>>.Ok(result);
    }

    // ── Early Exit Refund ─────────────────────────────────────────────────────

    public async Task<ApiResponse<RefundResponse>> ProcessEarlyExitRefundAsync(EarlyExitRefundRequest req)
    {
        // 1. Load enrollment with full details
        var enrollment = await _uow.Enrollments.GetWithDetailsAsync(req.EnrollmentId);
        if (enrollment is null)
            return ApiResponse<RefundResponse>.Fail("Enrollment not found.");

        // 2. Validate status — only ACTIVE or OVERDUE can exit
        var currentStatusName = enrollment.EnrollStatus?.Name ?? "";
        var allowedStatuses = new[] { "ACTIVE", "OVERDUE" };
        if (!allowedStatuses.Contains(currentStatusName, StringComparer.OrdinalIgnoreCase))
            return ApiResponse<RefundResponse>.Fail(
                $"Cannot exit an enrollment with status '{currentStatusName}'.");

        // 3. Find EXITED_REFUNDED status entity
        var exitedStatus = await _uow.Repository<EnrollStatus>()
            .FirstOrDefaultAsync(s => s.Name == "EXITED_REFUNDED");
        if (exitedStatus is null)
            return ApiResponse<RefundResponse>.Fail(
                "'EXITED_REFUNDED' status not configured in the system.");

        // 4. Find the most recent payment for this enrollment
        var latestPayment = enrollment.Payments
            .OrderByDescending(p => p.PaymentDate)
            .FirstOrDefault();
        if (latestPayment is null)
            return ApiResponse<RefundResponse>.Fail("No payment found for this enrollment.");

        // 5. Resolve ExpectedSessionsCount for the latest payment's period.
        //    GroupPeriod is the source of truth (mirrors PaymentService logic) —
        //    NOT the count of Session rows actually created so far, since sessions
        //    for PER_MONTH groups are often created one at a time rather than
        //    all upfront. Falling back to the count of created rows would treat
        //    a period as "fully consumed" after just the first session.
        var groupPeriod = await _uow.GroupPeriods.GetAsync(enrollment.GroupId, latestPayment.PeriodLabelId);
        var sessionsTotal = groupPeriod?.ExpectedSessionsCount ?? enrollment.Group?.SessionsPerMonth ?? 0;

        // 6. Calculate consumed sessions and refund amount.
        //    "Consumed" = sessions actually created/held for this period so far
        //    (regardless of attendance) — once a session is held it's considered
        //    delivered/consumed, whether or not the student showed up.
        //    If the period has no expected sessions configured (prepaid before
        //    period starts / not yet set up) → full refund.
        int consumedSessions = 0;
        decimal refundAmount;

        if (sessionsTotal == 0)
        {
            // Nothing to consume against → full refund.
            refundAmount = latestPayment.AmountPaid;
        }
        else
        {
            var consumedSessionsList = await _uow.Sessions.FindAsync(s =>
                s.GroupId == enrollment.GroupId &&
                s.PeriodLabelId == latestPayment.PeriodLabelId &&
                s.Status != "CANCELLED");
            consumedSessions = consumedSessionsList.Count();

            // 7. Reject if the full period was already consumed
            if (consumedSessions >= sessionsTotal)
                return ApiResponse<RefundResponse>.Fail(
                    "The latest payment period has already been fully consumed. No refund is available.");

            refundAmount = RefundRecord.Calculate(
                latestPayment.AmountPaid,
                consumedSessions,
                sessionsTotal);
        }

        // 8. Validate actual refund amount supplied by the user
        if (req.ActualRefundAmount > latestPayment.AmountPaid)
            return ApiResponse<RefundResponse>.Fail(
                "Actual refund amount cannot exceed the original payment amount.");

        if (req.ActualRefundAmount != refundAmount &&
            string.IsNullOrWhiteSpace(req.AdjustmentReason))
            return ApiResponse<RefundResponse>.Fail(
                "An adjustment reason is required when the actual refund differs from the calculated amount.");

        // 9. Create refund record
        var userIdClaim = _httpContext.HttpContext?.User
        .FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var processedBy = Guid.TryParse(userIdClaim, out var uid) ? uid : Guid.Empty;

        var refund = new RefundRecord
        {
            StudentId = enrollment.StudentId,
            PaymentId = latestPayment.Id,
            PaymentMethodId = req.PaymentMethodId,
            ProcessedBy = processedBy,   // ← actual logged-in user
            SessionsAttended = consumedSessions, // now represents sessions held/created, not attendance
            SessionsTotal = sessionsTotal,
            AmountPaid = latestPayment.AmountPaid,
            RefundAmount = req.ActualRefundAmount,
            CalculatedRefundAmount = refundAmount,
            ActualRefundAmount = req.ActualRefundAmount,
            AdjustmentReason = req.AdjustmentReason,
            RefundDate = DateTime.UtcNow,
        };
        await _uow.Repository<RefundRecord>().AddAsync(refund);

        // 10. Block future commission distribution on the latest payment only
        latestPayment.IsCommissionDistributionBlocked = true;
        _uow.Repository<Payment>().Update(latestPayment);

        // 11. Update enrollment status
        enrollment.EnrollStatusId = exitedStatus.Id;
        _uow.Enrollments.Update(enrollment);

        await _uow.SaveChangesAsync();

        // 12. Build response
        var pm = await _uow.Repository<PaymentMethod>().GetByIdAsync(req.PaymentMethodId);
        var student = await _uow.Students.GetWithDetailsAsync(enrollment.StudentId);

        return ApiResponse<RefundResponse>.Ok(new RefundResponse(
            refund.Id,
            refund.StudentId,
            $"{student!.Person.FirstName} {student.Person.LastName}",
            refund.SessionsAttended,
            refund.SessionsTotal,
            refund.AmountPaid,
            refund.CalculatedRefundAmount,
            refund.ActualRefundAmount,
            refund.AdjustmentReason,
            refund.RefundDate,
            pm?.Name ?? ""));
    }

    // ── Refund Preview ────────────────────────────────────────────────────────

    public async Task<ApiResponse<RefundPreviewResponse>> GetRefundPreviewAsync(Guid enrollmentId)
    {
        var enrollment = await _uow.Enrollments.GetWithDetailsAsync(enrollmentId);
        if (enrollment is null)
            return ApiResponse<RefundPreviewResponse>.Fail("Enrollment not found.");

        var latestPayment = enrollment.Payments
            .OrderByDescending(p => p.PaymentDate)
            .FirstOrDefault();
        if (latestPayment is null)
            return ApiResponse<RefundPreviewResponse>.Fail("No payment found for this enrollment.");

        var periodLabel = await _uow.Repository<PeriodLabel>()
            .GetByIdAsync(latestPayment.PeriodLabelId);

        // ExpectedSessionsCount from GroupPeriod is the source of truth — NOT the
        // number of Session rows that happen to exist yet. Sessions for PER_MONTH
        // groups are typically created one at a time, so counting created rows
        // would make a period look "fully consumed" after just the first session.
        var groupPeriod = await _uow.GroupPeriods.GetAsync(enrollment.GroupId, latestPayment.PeriodLabelId);
        var sessionsInPeriod = groupPeriod?.ExpectedSessionsCount ?? enrollment.Group?.SessionsPerMonth ?? 0;

        // No expected sessions configured yet → full refund, nothing consumed
        if (sessionsInPeriod == 0)
            return ApiResponse<RefundPreviewResponse>.Ok(new RefundPreviewResponse(
                enrollmentId,
                latestPayment.Id,
                periodLabel?.Name ?? latestPayment.PeriodLabelId.ToString(),
                latestPayment.AmountPaid,
                SessionsInPeriod: 0,
                AttendedSessions: 0,
                RemainingSessions: 0,
                CalculatedRefundAmount: latestPayment.AmountPaid,
                CanRefund: true));

        var consumedSessionsList = await _uow.Sessions.FindAsync(s =>
            s.GroupId == enrollment.GroupId &&
            s.PeriodLabelId == latestPayment.PeriodLabelId &&
            s.Status != "CANCELLED");
        var consumedSessions = consumedSessionsList.Count();

        var canRefund = consumedSessions < sessionsInPeriod;
        var remaining = sessionsInPeriod - consumedSessions;
        var calculatedRefund = canRefund
            ? RefundRecord.Calculate(latestPayment.AmountPaid, consumedSessions, sessionsInPeriod)
            : 0;

        return ApiResponse<RefundPreviewResponse>.Ok(new RefundPreviewResponse(
            enrollmentId,
            latestPayment.Id,
            periodLabel?.Name ?? latestPayment.PeriodLabelId.ToString(),
            latestPayment.AmountPaid,
            sessionsInPeriod,
            consumedSessions,
            remaining,
            calculatedRefund,
            canRefund));
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static EnrollmentResponse MapToResponse(Enrollment e) => new(
        e.Id,
        e.StudentId,
        e.Student?.Person is null
            ? ""
            : $"{e.Student.Person.FirstName} {e.Student.Person.LastName}",
        e.GroupId,
        e.Group?.Name ?? "",
        e.Group?.PaymentStrategy ?? "MONTHLY",
        e.Group?.LanguageLevel?.Language?.Name ?? "",
        e.Group?.LanguageLevel?.Level?.Code ?? "",
        e.EnrollStatus?.Name ?? "",
        e.Scholarship,
        e.DiscountPct,
        e.EnrollDate,
        e.EffectiveFee,
        e.IsPartial,
        e.PartialStart,
        e.PartialEnd,
        e.PartialCost,
        e.CreatedAt,
        e.ModifiedAt);
}