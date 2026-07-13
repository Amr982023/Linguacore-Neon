using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Common;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;
using Microsoft.AspNetCore.Http;

namespace LinguaCore.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly IUnitOfWork _uow;
    private readonly IHttpContextAccessor _httpContext;
    public PaymentService(IUnitOfWork uow, IHttpContextAccessor httpContext)
    { _uow = uow; _httpContext = httpContext; }
    // ── Create ────────────────────────────────────────────────────────────────

    // LinguaCore.Application.Services/PaymentService.cs — CreateAsync replacement
    private static readonly HashSet<string> _financiallyExpectedStatuses =
       new(StringComparer.OrdinalIgnoreCase)
       {
        "PENDING",    // enrolled, not yet paid — still a group member
        "ACTIVE",     // enrolled and attending
        "PARTIAL",    // partially paid — still a group member
        "SUSPENDED",  // temporarily paused — still a group member
       };

    private static readonly HashSet<string> _excludedFromExpected =
      new(StringComparer.OrdinalIgnoreCase)
      {
        "DROPPED",
        "EXITED_REFUNDED",
        "CANCELLED",
        "COMPLETED",
      };

    /// <summary>
    /// Returns the count of enrollments that are still financially expected
    /// to pay for this group. Does NOT depend on whether they have paid yet.
    /// </summary>
    private static int GetExpectedPayerCount(IEnumerable<Enrollment> groupEnrollments)
        => groupEnrollments.Count(
            e => e.EnrollStatus?.Name is not null &&
                 !_excludedFromExpected.Contains(e.EnrollStatus.Name));
    private static int GetExpectedPaymentCount(IEnumerable<Enrollment> groupEnrollments)
    => groupEnrollments.Count(
        e => e.EnrollStatus?.Name is not null &&
             _financiallyExpectedStatuses.Contains(e.EnrollStatus.Name));
    public async Task<ApiResponse<PaymentResponse>> CreateAsync(
   CreatePaymentRequest req, Guid recordedBy)
    {
        // ── 1. Validate enrollment ────────────────────────────────────────────
        var enrollment = await _uow.Enrollments.GetWithDetailsAsync(req.EnrollmentId);
        if (enrollment is null)
            return ApiResponse<PaymentResponse>.Fail("Enrollment not found.");

        // ── 2. Validate PeriodLabel ───────────────────────────────────────────
        var periodLabel = await _uow.Repository<PeriodLabel>().GetByIdAsync(req.PeriodLabelId);
        if (periodLabel is null)
            return ApiResponse<PaymentResponse>.Fail(
                "PeriodLabel not found. Select a valid period from Lookups.");

        // ── 2.5 Guard: only ONE payment allowed per enrollment + period ────────
        // Prevents duplicate submissions (double-click, retry, etc.) from creating
        // two separate Payment rows for the same enrollment+period, which would
        // also double up the commission-ledger distribution logic in step 5.
        var duplicatePayment = (await _uow.Payments.FindAsync(p =>
                p.EnrollmentId == req.EnrollmentId &&
                p.PeriodLabelId == req.PeriodLabelId))
            .Any();

        if (duplicatePayment)
            return ApiResponse<PaymentResponse>.Fail(
                $"A payment already exists for this enrollment in period '{periodLabel.Name}'. " +
                "Use Settle Balance to add an additional amount to the existing payment instead.");

        var groupId = enrollment.GroupId;

        // ── 3. Resolve ExpectedSessionsCount ─────────────────────────────────
        // GroupPeriod is the source of truth. Falls back to Group.SessionsPerMonth
        // when no sessions have been created for this group+period yet.
        var group = await _uow.Groups.GetWithDetailsAsync(groupId);
        if (group is null)
            return ApiResponse<PaymentResponse>.Fail("Group not found.");

        var groupPeriod = await _uow.GroupPeriods.GetAsync(groupId, req.PeriodLabelId);
        var expectedCount = groupPeriod?.ExpectedSessionsCount ?? group.SessionsPerMonth;
        var commissionPct = group.InstructorCommissionPct;

        // ── 4. Create Payment ─────────────────────────────────────────────────
        var payment = new Payment
        {
            EnrollmentId = req.EnrollmentId,
            PaymentMethodId = req.PaymentMethodId,
            RecordedBy = recordedBy,
            PeriodLabelId = req.PeriodLabelId,
            AmountDue = req.AmountDue,
            AmountPaid = req.AmountPaid,
            PaymentDate = DateTime.UtcNow,
            DueDate = req.DueDate,
            Notes = req.Notes,
            ProcessedSessionsCount = 0,
            CommissionDistributionCompleted = false,
        };
        await _uow.Payments.AddAsync(payment);
        await _uow.SaveChangesAsync(); // flush to get payment.Id

        // ── 5. Catch-up: distribute commission for sessions already run ───────
        //
        // When a student pays late, sessions may already exist for this period.
        // We generate one CommissionLedger entry per existing session now.
        //
        // Flat amount only — NO remainder adjustment here.
        // The rounding remainder is applied exclusively in SessionService.CreateAsync
        // when ProcessedSessionsCount + 1 == ExpectedSessionsCount (the actual
        // final session of the period). Applying it here would assign the full
        // remainder to whichever existing session happens to be last in the list,
        // which is not the final session of the period.
        //
        // Example (correct):
        //   Payment = 1000, Expected = 8, Existing sessions at payment time = [S1, S2]
        //   S1 → 125.00  (flat)
        //   S2 → 125.00  (flat)
        //   ProcessedSessionsCount = 2, Completed = false
        //   S3–S7 → 125.00 each (as SessionService creates them going forward)
        //   S8    → 125.00 + remainder (SessionService final-session logic)
        var existingSessions = (await _uow.Sessions.FindAsync(
                s => s.GroupId == groupId &&
                     s.PeriodLabelId == req.PeriodLabelId &&
                     s.Status != "CANCELLED"))
            .OrderBy(s => s.SessionNumber)
            .ToList();

        var ledgersToAdd = new List<CommissionLedger>();
        var perSessionGross = Math.Round(req.AmountPaid / expectedCount, 2); // flat, no remainder

        foreach (var session in existingSessions)
        {
            // Duplicate guard — mirrors DB unique index (PaymentId, SessionId).
            var alreadyExists = (await _uow.CommissionLedgers
                .FindAsync(l => l.PaymentId == payment.Id && l.SessionId == session.Id))
                .Any();

            if (alreadyExists) continue;

            var commissionAmount = Math.Round(perSessionGross * commissionPct / 100, 2);

            ledgersToAdd.Add(new CommissionLedger
            {
                PaymentId = payment.Id,
                SessionId = session.Id,
                InstructorId = session.InstructorId,
                GroupId = groupId,
                CommissionPct = commissionPct,
                GrossPayment = perSessionGross,
                CommissionAmount = commissionAmount,
                CentreAmount = perSessionGross - commissionAmount,
                PeriodLabel = periodLabel.Name,
                IsAdjustment = false,
            });

            payment.ProcessedSessionsCount++;
        }

        // Complete only if every expected session already existed at payment time.
        if (payment.ProcessedSessionsCount >= expectedCount)
            payment.CommissionDistributionCompleted = true;

        if (ledgersToAdd.Count > 0)
            await _uow.CommissionLedgers.AddRangeAsync(ledgersToAdd);

        _uow.Payments.Update(payment);

        // ── 6. Re-evaluate IsCommissionFullyDistributed on affected sessions ──
        //
        // This late payment adds a new ledger entry to each existing session.
        // Re-check whether any of those sessions are now fully distributed.
        //
        // Uses the same rule as SessionService step 8:
        //   LedgerCountForSession >= ExpectedPayerCount (enrollment-based, not payment-based)
        //
        // We load all enrollments now — AFTER the payment is saved but BEFORE the
        // enrollment status is changed from PENDING → ACTIVE in step 7. This is
        // correct because the paying student is still PENDING at this point and
        // is already included in GetExpectedPayerCount (PENDING is an expected status).
        // Their new ledger entry (in ledgersToAdd) accounts for them, so the math
        // is correct without any special-casing of the status transition.
        if (existingSessions.Any())
        {
            var allGroupEnrollments = await _uow.Enrollments.GetByGroupAsync(groupId);
            var expectedPayerCount = GetExpectedPayerCount(allGroupEnrollments);

            foreach (var session in existingSessions)
            {
                // Ledger entries already in DB for this session (from prior payments)
                var existingLedgerCount = (await _uow.CommissionLedgers
    .FindAsync(l => l.SessionId == session.Id && !l.IsAdjustment))
    .Count();

                // +1 for the entry we just created for this session (not yet saved)
                var newEntry = ledgersToAdd.Any(l => l.SessionId == session.Id) ? 1 : 0;
                var totalForSession = existingLedgerCount + newEntry;

                if (totalForSession >= expectedPayerCount && expectedPayerCount > 0)
                {
                    session.IsCommissionFullyDistributed = true;
                    _uow.Sessions.Update(session);
                }
            }
        }

        // ── 7. Activate enrollment on first payment if still PENDING ──────────
        if (enrollment.EnrollStatus?.Name == "PENDING" && req.AmountPaid > 0)
        {
            var activeStatus = await _uow.Repository<EnrollStatus>()
                .FirstOrDefaultAsync(s => s.Name == "ACTIVE");
            if (activeStatus is not null)
            {
                enrollment.EnrollStatusId = activeStatus.Id;
                _uow.Enrollments.Update(enrollment);
            }
        }

        await _uow.SaveChangesAsync();

        // ── 8. Map and return response ────────────────────────────────────────
        var pm = await _uow.Repository<PaymentMethod>().GetByIdAsync(req.PaymentMethodId);
        var student = await _uow.Students.GetWithDetailsAsync(enrollment.StudentId);

        return ApiResponse<PaymentResponse>.Ok(new PaymentResponse(
            payment.Id,
            payment.EnrollmentId,
            enrollment.StudentId,
            student?.Person is null
                ? ""
                : $"{student.Person.FirstName} {student.Person.LastName}",
            enrollment.Group?.Name ?? "",
            enrollment.Group?.PaymentStrategy ?? "MONTHLY",
            pm?.Name ?? "",
            payment.AmountDue,
            payment.AmountPaid,
            payment.PaymentDate,
            payment.DueDate,
            payment.PeriodLabelId,
            periodLabel.Name,
            payment.Notes,
            payment.CreatedAt,
            payment.ModifiedAt,
            enrollment.Group?.LanguageLevel?.Language?.Name ?? "",
            enrollment.Group?.LanguageLevel?.Level?.Code ?? ""));
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public async Task<ApiResponse<IEnumerable<PaymentResponse>>> GetByEnrollmentAsync(Guid enrollmentId)
    {
        var payments = await _uow.Payments.GetByEnrollmentAsync(enrollmentId);
        return ApiResponse<IEnumerable<PaymentResponse>>.Ok(payments.Select(MapToResponse));
    }

    public async Task<ApiResponse<IEnumerable<PaymentResponse>>> GetByGroupAsync(Guid groupId)
    {
        var payments = await _uow.Payments.GetByGroupAsync(groupId);
        return ApiResponse<IEnumerable<PaymentResponse>>.Ok(payments.Select(MapToResponse));
    }

    public async Task<ApiResponse<PagedResults<PaymentResponse>>> GetByPeriodPagedAsync(
    PaymentFilterRequest req)
    {
        // ── DTO unpacking happens here, at the service layer — the repository
        // only ever sees plain parameters. ─────────────────────────────────────
        var result = await _uow.Payments.GetByPeriodPagedAsync(
            req.BranchId,
            req.From,
            req.To,
            req.Page,
            req.PageSize,
            req.Search,
            req.LanguageId,
            req.LevelId,
            req.PaymentMethodId,
            req.GroupId,
            req.Status);

        var mapped = new PagedResults<PaymentResponse>
        {
            Items = result.Items.Select(MapToResponse).ToList(),
            Page = result.Page,
            PageSize = result.PageSize,
            TotalCount = result.TotalCount,
        };

        return ApiResponse<PagedResults<PaymentResponse>>.Ok(mapped);
    }

    public async Task<ApiResponse<IEnumerable<PaymentResponse>>> GetByPeriodAsync(Guid branchId, DateTime from, DateTime to)
    {
        var payments = await _uow.Payments.GetByPeriodAsync(from, to);
        var filtered = payments.Where(p =>
            p.Enrollment?.Group?.BranchId == branchId);
        return ApiResponse<IEnumerable<PaymentResponse>>.Ok(filtered.Select(MapToResponse));
    }

    public async Task<ApiResponse<PagedResults<CommissionLedgerResponse>>> GetCommissionByInstructorPagedAsync(
    CommissionLedgerFilterRequest req)
    {
        var (ledgers, totalCount) = await _uow.CommissionLedgers.GetByInstructorPagedAsync(
            req.InstructorId, req.From, req.To, req.Page, req.PageSize);

        var mapped = new PagedResults<CommissionLedgerResponse>
        {
            Items = ledgers.Select(l => new CommissionLedgerResponse(
                l.Id,
                l.Instructor?.Person is null ? "" : $"{l.Instructor.Person.FirstName} {l.Instructor.Person.LastName}",
                l.Group?.Name ?? "",
                l.Group?.PaymentStrategy ?? "MONTHLY",
                l.CommissionPct,
                l.GrossPayment,
                l.CommissionAmount,
                l.CentreAmount,
                l.Payment?.PeriodLabel?.Name ?? "",
                l.IsAdjustment,
                l.PeriodLabel,
                l.CreatedAt)).ToList(),
            Page = req.Page,
            PageSize = req.PageSize,
            TotalCount = totalCount,
        };

        return ApiResponse<PagedResults<CommissionLedgerResponse>>.Ok(mapped);
    }

    public async Task<ApiResponse<IEnumerable<CommissionLedgerResponse>>> GetCommissionByInstructorAsync(
        Guid instructorId, DateTime? from, DateTime? to)
    {
        var ledgers = await _uow.CommissionLedgers.GetByInstructorAsync(instructorId, from, to);
        return ApiResponse<IEnumerable<CommissionLedgerResponse>>.Ok(ledgers.Select(l =>
            new CommissionLedgerResponse(
                l.Id,
                l.Instructor?.Person is null ? "" : $"{l.Instructor.Person.FirstName} {l.Instructor.Person.LastName}",
                l.Group?.Name ?? "",
                l.Group?.PaymentStrategy ?? "MONTHLY",
                l.CommissionPct,
                l.GrossPayment,
                l.CommissionAmount,
                l.CentreAmount,
                l.Payment?.PeriodLabel?.Name ?? "",
                l.IsAdjustment,
                l.PeriodLabel,
                l.CreatedAt)));
    }

    // ── Private map ───────────────────────────────────────────────────────────

    public async Task<ApiResponse<IEnumerable<PaymentDebtResponse>>> GetDebtsByBranchAsync(
     Guid branchId, DateTime? from = null, DateTime? to = null)
    {
        // 1. Overdue threshold
        var setting = await _uow.Repository<AppSetting>()
            .FirstOrDefaultAsync(s => s.Key == "payment.overdue_days");
        var overdueDays = int.TryParse(setting?.Value, out var d) ? d : 30;

        // 2. Load ALL data for this branch in bulk
        var groups = (await _uow.Groups.GetByBranchAsync(branchId)).ToList();
        if (!groups.Any())
            return ApiResponse<IEnumerable<PaymentDebtResponse>>.Ok([]);

        var groupIds = groups.Select(g => g.Id).ToHashSet();

        var allSessions = (await _uow.Sessions.FindAsync(s =>
            groupIds.Contains(s.GroupId) && s.Status != "CANCELLED")).ToList();

        var allEnrollments = (await _uow.Enrollments.FindAsync(e =>
            groupIds.Contains(e.GroupId) &&
            (e.EnrollStatus.Name == "ACTIVE" ||
             e.EnrollStatus.Name == "PENDING" ||
             e.EnrollStatus.Name == "PARTIAL"))).ToList();

        // Only load payments that still have an outstanding balance
        var allPayments = (await _uow.Payments.FindAsync(p =>
            groupIds.Contains(p.Enrollment.GroupId))).ToList();

        var allPeriodLabels = (await _uow.Repository<PeriodLabel>().GetAllAsync())
            .ToDictionary(p => p.Id);

        var allGroupPeriods = (await _uow.Repository<GroupPeriod>().FindAsync(gp =>
            groupIds.Contains(gp.GroupId))).ToList();

        var sessionIds = allSessions.Select(s => s.Id).ToHashSet();
        var allAttendances = (await _uow.Attendances.FindAsync(a =>
            sessionIds.Contains(a.SessionId) &&
            a.Status == "PRESENT" &&
            !a.Reverted)).ToList();

        // 3. Lookups for O(1) access
        var sessionsByGroup = allSessions
            .GroupBy(s => s.GroupId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var sessionsById = allSessions.ToDictionary(s => s.Id);

        var enrollmentsByGroup = allEnrollments
            .GroupBy(e => e.GroupId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var paymentsByEnrollment = allPayments
            .GroupBy(p => p.EnrollmentId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var groupPeriodsByGroup = allGroupPeriods
            .GroupBy(gp => gp.GroupId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var attendancesByStudent = allAttendances
            .GroupBy(a => a.StudentId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<PaymentDebtResponse>();
        var handledDebtKeys = new HashSet<(Guid EnrollmentId, Guid PeriodLabelId)>();

        DateTime? GetFirstAttendedDate(Enrollment enrollment, List<Session>? periodSessions)
        {
            if (periodSessions is null || !periodSessions.Any()) return null;
            if (!attendancesByStudent.TryGetValue(enrollment.StudentId, out var studentAttendances))
                return null;

            var periodSessionIds = periodSessions.Select(s => s.Id).ToHashSet();
            return studentAttendances
                .Where(a => periodSessionIds.Contains(a.SessionId))
                .Select(a => sessionsById.TryGetValue(a.SessionId, out var s) ? s.ScheduledDate : (DateTime?)null)
                .Where(dt => dt.HasValue)
                .OrderBy(dt => dt)
                .FirstOrDefault();
        }

        DateTime ResolveReferenceDate(Enrollment enrollment, List<Session>? periodSessions, GroupPeriod? groupPeriod)
        {
            // Tier 1 — earliest attended session
            var attended = GetFirstAttendedDate(enrollment, periodSessions);
            if (attended.HasValue) return attended.Value;

            // Tier 2 — first scheduled session of the period
            if (periodSessions is not null && periodSessions.Any())
                return periodSessions.OrderBy(s => s.ScheduledDate).First().ScheduledDate;

            // Tier 3 — GroupPeriod creation date, or enrollment date as last resort
            return groupPeriod?.CreatedAt ?? enrollment.EnrollDate;
        }

        foreach (var group in groups)
        {
            if (!enrollmentsByGroup.TryGetValue(group.Id, out var enrollments) || !enrollments.Any())
                continue;

            var hasSessions = sessionsByGroup.TryGetValue(group.Id, out var sessions) && sessions.Any();
            groupPeriodsByGroup.TryGetValue(group.Id, out var groupPeriods);

            var periodIdsFromSessions = hasSessions
                ? sessions.Select(s => s.PeriodLabelId).Distinct()
                : Enumerable.Empty<Guid>();

            var periodIdsFromGroupPeriods = groupPeriods?.Select(gp => gp.PeriodLabelId).Distinct()
                ?? Enumerable.Empty<Guid>();

            var periodIdsFromPayments = enrollments
                .SelectMany(e => paymentsByEnrollment.TryGetValue(e.Id, out var pmts) ? pmts : Enumerable.Empty<Payment>())
                .Select(p => p.PeriodLabelId)
                .Distinct();

            var allPeriodIdsForGroup = periodIdsFromSessions
                .Union(periodIdsFromGroupPeriods)
                .Union(periodIdsFromPayments)
                .Distinct()
                .ToList();

            foreach (var periodLabelId in allPeriodIdsForGroup)
            {
                var periodSessions = hasSessions
                    ? sessions.Where(s => s.PeriodLabelId == periodLabelId).ToList()
                    : null;

                var groupPeriod = groupPeriods?.FirstOrDefault(gp => gp.PeriodLabelId == periodLabelId);

                allPeriodLabels.TryGetValue(periodLabelId, out var periodLabel);

                foreach (var enrollment in enrollments)
                {
                    var statusName = enrollment.EnrollStatus?.Name ?? "";
                    if (_excludedFromExpected.Contains(statusName)) continue;

                    // ── Drive balance from actual payments, not EffectiveFee ──────────
                    // Find the underpaid payment for this enrollment+period.
                    // This guarantees PeriodLabelId is always real and never Guid.Empty.
                    var enrollmentPeriodPayments = paymentsByEnrollment.TryGetValue(enrollment.Id, out var pmts)
                        ? pmts.Where(p => p.PeriodLabelId == periodLabelId).ToList()
                        : new List<Payment>();

                    // No payment at all for this enrollment+period → no debt row
                    if (!enrollmentPeriodPayments.Any()) continue;

                    var totalDue = enrollmentPeriodPayments.Sum(p => p.AmountDue);
                    var totalPaid = enrollmentPeriodPayments.Sum(p => p.AmountPaid);
                    var balance = totalDue - totalPaid;

                    // Fully paid → no debt
                    if (balance <= 0) continue;

                    // ── referenceDate: all branches now always resolve to a valid date ─
                    var referenceDate = ResolveReferenceDate(enrollment, periodSessions, groupPeriod);

                    if (from.HasValue && referenceDate < from.Value) continue;
                    if (to.HasValue && referenceDate > to.Value) continue;

                    var daysSince = (int)Math.Floor((DateTime.UtcNow - referenceDate).TotalDays);

                    handledDebtKeys.Add((enrollment.Id, periodLabelId));

                    result.Add(new PaymentDebtResponse(
                        enrollment.Id,
                        enrollment.StudentId,
                        enrollment.Student?.Person is null ? "" :
                            $"{enrollment.Student.Person.FirstName} {enrollment.Student.Person.LastName}",
                        group.Id,
                        group.Name,
                        group.PaymentStrategy ?? "MONTHLY",
                        group.LanguageLevel?.Language?.Name ?? "",
                        group.LanguageLevel?.Level?.Code ?? "",
                        periodLabelId,
                        periodLabel?.Name ?? "",
                        totalDue,
                        totalPaid,
                        balance,
                        referenceDate,
                        daysSince,
                        daysSince >= overdueDays));
                }
            }

            // ── Fallback: enrollments with NO payment in ANY period ───────────────
            // These are genuinely unassigned — no payment exists to derive a period from.
            // ── Fallback: enrollments with NO payment in ANY period ───────────────
            // These are genuinely unassigned — no payment exists to derive a period from.
            foreach (var enrollment in enrollments)
            {
                if (handledDebtKeys.Any(k => k.EnrollmentId == enrollment.Id)) continue;

                var statusName = enrollment.EnrollStatus?.Name ?? "";
                if (_excludedFromExpected.Contains(statusName)) continue;
                if (enrollment.IsPartial || statusName.Equals("PENDING", StringComparison.OrdinalIgnoreCase))
                    continue;

                // ── Skip scholarship enrollments (EffectiveFee = 0) — nothing owed ────
                if (enrollment.EffectiveFee <= 0) continue;

                // Only reach here if truly no payment exists at all
                var hasPaidAnything = paymentsByEnrollment.ContainsKey(enrollment.Id);
                if (hasPaidAnything) continue; // has payments but all fully paid → no debt

                var referenceDate = enrollment.EnrollDate;
                if (from.HasValue && referenceDate < from.Value) continue;
                if (to.HasValue && referenceDate > to.Value) continue;

                var daysSince = (int)Math.Floor((DateTime.UtcNow - referenceDate).TotalDays);

                result.Add(new PaymentDebtResponse(
                    enrollment.Id,
                    enrollment.StudentId,
                    enrollment.Student?.Person is null ? "" :
                        $"{enrollment.Student.Person.FirstName} {enrollment.Student.Person.LastName}",
                    group.Id,
                    group.Name,
                    group.PaymentStrategy ?? "MONTHLY",
                    group.LanguageLevel?.Language?.Name ?? "",
                    group.LanguageLevel?.Level?.Code ?? "",
                    Guid.Empty,
                    "No period assigned",
                    enrollment.EffectiveFee,
                    0,
                    enrollment.EffectiveFee,
                    referenceDate,
                    daysSince,
                    daysSince >= overdueDays));
            }
        }

        return ApiResponse<IEnumerable<PaymentDebtResponse>>.Ok(result);
    }

    public async Task<ApiResponse<PaymentResponse>> SettleBalanceAsync(SettleOutstandingBalanceRequest req)
    {
        if (req.AdditionalAmount <= 0)
            return ApiResponse<PaymentResponse>.Fail("Additional amount must be greater than zero.");

        var enrollment = await _uow.Enrollments.GetWithDetailsAsync(req.EnrollmentId);
        if (enrollment is null)
            return ApiResponse<PaymentResponse>.Fail("Enrollment not found.");

        var statusName = enrollment.EnrollStatus?.Name ?? "";
        if (_excludedFromExpected.Contains(statusName))
            return ApiResponse<PaymentResponse>.Fail(
                $"Cannot settle a balance — enrollment status is '{statusName}'.");

        var periodPayments = enrollment.Payments
            .Where(p => p.PeriodLabelId == req.PeriodLabelId)
            .OrderByDescending(p => p.PaymentDate)
            .ToList();

        var payment = periodPayments.FirstOrDefault(p => p.AmountPaid < p.AmountDue)
                      ?? periodPayments.FirstOrDefault();

        if (payment is null)
            return ApiResponse<PaymentResponse>.Fail(
                "No payment found for this enrollment in the selected period.");

        if (payment.IsCommissionDistributionBlocked)
            return ApiResponse<PaymentResponse>.Fail(
                "Commission distribution is blocked for this payment (likely an early exit/refund already processed). Cannot settle balance.");

        var newAmountPaid = payment.AmountPaid + req.AdditionalAmount;
        if (newAmountPaid > payment.AmountDue)
            return ApiResponse<PaymentResponse>.Fail(
                $"Settling {req.AdditionalAmount:0.##} would bring the paid amount to {newAmountPaid:0.##}, " +
                $"which exceeds the amount due ({payment.AmountDue:0.##}).");

        var group = await _uow.Groups.GetWithDetailsAsync(enrollment.GroupId);
        if (group is null)
            return ApiResponse<PaymentResponse>.Fail("Group not found.");

        var groupPeriod = await _uow.GroupPeriods.GetAsync(enrollment.GroupId, payment.PeriodLabelId);
        var expectedCount = groupPeriod?.ExpectedSessionsCount ?? group.SessionsPerMonth;

        var periodLabel = await _uow.Repository<PeriodLabel>().GetByIdAsync(payment.PeriodLabelId);

        // ── All financial writes happen inside a single transaction ───────────────
        await _uow.BeginTransactionAsync();
        try
        {
            // ── Retroactively correct the rate on sessions already distributed ────
            // We never insert new ledger rows here (PaymentId+SessionId is unique).
            // Instead we bump each existing row up to what it should have been paid
            // at the corrected AmountPaid. Any session not yet processed will simply
            // read the new (higher) AmountPaid when SessionService distributes it —
            // no special handling needed there.
            if (expectedCount > 0)
            {
                var existingLedgers = (await _uow.CommissionLedgers
                        .FindAsync(l => l.PaymentId == payment.Id && !l.IsAdjustment))
                    .OrderBy(l => l.CreatedAt)
                    .ToList();

                if (existingLedgers.Count > 0)
                {
                    var flatTarget = Math.Round(newAmountPaid / expectedCount, 2);

                    // If this payment's distribution is already fully closed
                    // (CommissionDistributionCompleted), no future session will run to
                    // absorb the rounding remainder — so the last existing row must.
                    // Otherwise, leave remainder absorption to whichever session
                    // actually turns out to be the period's final one, same as today.
                    var isClosed = payment.CommissionDistributionCompleted;

                    decimal runningTotal = 0m;
                    for (int i = 0; i < existingLedgers.Count; i++)
                    {
                        var row = existingLedgers[i];
                        var isLastExistingRow = i == existingLedgers.Count - 1;

                        var targetGross = (isClosed && isLastExistingRow)
                            ? newAmountPaid - runningTotal
                            : flatTarget;

                        runningTotal += targetGross;

                        row.GrossPayment = targetGross;
                        row.CommissionAmount = Math.Round(targetGross * row.CommissionPct / 100, 2);
                        row.CentreAmount = targetGross - row.CommissionAmount;
                        _uow.CommissionLedgers.Update(row);
                    }
                }
                // No sessions processed yet for this payment → nothing to correct;
                // the corrected AmountPaid is simply picked up going forward.
            }

            // ── Update the payment itself ──────────────────────────────────────────
            payment.AmountPaid = newAmountPaid;
            if (!string.IsNullOrWhiteSpace(req.Notes))
            {
                payment.Notes = string.IsNullOrWhiteSpace(payment.Notes)
                    ? req.Notes
                    : $"{payment.Notes} | Balance settled (+{req.AdditionalAmount:0.##}): {req.Notes}";
            }
            _uow.Payments.Update(payment);

            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();
        }
        catch
        {
            await _uow.RollbackTransactionAsync();
            throw;
        }

        var pm = await _uow.Repository<PaymentMethod>().GetByIdAsync(payment.PaymentMethodId);
        var student = await _uow.Students.GetWithDetailsAsync(enrollment.StudentId);

        return ApiResponse<PaymentResponse>.Ok(new PaymentResponse(
            payment.Id, payment.EnrollmentId, enrollment.StudentId,
            student?.Person is null ? "" : $"{student.Person.FirstName} {student.Person.LastName}",
            enrollment.Group?.Name ?? "",
            enrollment.Group?.PaymentStrategy ?? "MONTHLY",
            pm?.Name ?? "",
            payment.AmountDue,
            payment.AmountPaid,
            payment.PaymentDate,
            payment.DueDate,
            payment.PeriodLabelId,
            periodLabel?.Name ?? "",
            payment.Notes,
            payment.CreatedAt,
            payment.ModifiedAt,
            enrollment.Group?.LanguageLevel?.Language?.Name ?? "",
            enrollment.Group?.LanguageLevel?.Level?.Code ?? ""));
    }
    private static PaymentResponse MapToResponse(Payment p) => new(
    p.Id,
    p.EnrollmentId,
    p.Enrollment?.StudentId ?? Guid.Empty,
    p.Enrollment?.Student?.Person is null ? "" :
        $"{p.Enrollment.Student.Person.FirstName} {p.Enrollment.Student.Person.LastName}",
    p.Enrollment?.Group?.Name ?? "",
    p.Enrollment?.Group?.PaymentStrategy ?? "MONTHLY",
    p.PaymentMethod?.Name ?? "",
    p.AmountDue,
    p.AmountPaid,
    p.PaymentDate,
    p.DueDate,
    p.PeriodLabelId,
    p.PeriodLabel?.Name ?? "",
    p.Notes,
    p.CreatedAt,
    p.ModifiedAt,
    p.Enrollment?.Group?.LanguageLevel?.Language?.Name ?? "",  // ← ADD
    p.Enrollment?.Group?.LanguageLevel?.Level?.Code ?? "");    // ← ADD
}