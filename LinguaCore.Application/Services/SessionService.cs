using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services;

public class SessionService : ISessionService
{
    private readonly IUnitOfWork _uow;
    private readonly INotificationService _notifications;
    public SessionService(IUnitOfWork uow, INotificationService notifications)
    {
         _uow = uow;
         _notifications = notifications;                        // ? ADD
    }

    // LinguaCore.Application.Services/SessionService.cs — CreateAsync method replacement

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
    /*
    public async Task<ApiResponse<SessionResponse>> CreateAsync(CreateSessionRequest req)
    {
        // ?? 1. Validate group ?????????????????????????????????????????????????
        var group = await _uow.Groups.GetByIdAsync(req.GroupId);
        if (group is null) return ApiResponse<SessionResponse>.Fail("Group not found.");

        // ?? 2. Validate period label ??????????????????????????????????????????
        var periodLabel = await _uow.Repository<PeriodLabel>().GetByIdAsync(req.PeriodLabelId);
        if (periodLabel is null)
            return ApiResponse<SessionResponse>.Fail("Invalid period label.");

        // ?? 3. Ensure GroupPeriod exists ??????????????????????????????????????
        // GroupPeriod is the source of truth for ExpectedSessionsCount per period.
        // Auto-created on the first session of a new (Group, PeriodLabel) pair
        // using Group.SessionsPerMonth as the default. Staff can override via the
        // GroupPeriod endpoint for short final periods (e.g. 3 sessions).
        var groupPeriod = await _uow.GroupPeriods.GetAsync(req.GroupId, req.PeriodLabelId);
        if (groupPeriod is null)
        {
            groupPeriod = new GroupPeriod
            {
                GroupId = req.GroupId,
                PeriodLabelId = req.PeriodLabelId,
                ExpectedSessionsCount = group.SessionsPerMonth,
            };
            await _uow.GroupPeriods.AddAsync(groupPeriod);
            await _uow.SaveChangesAsync();
        }

        var expectedSessionCount = groupPeriod.ExpectedSessionsCount;

        // ?? 4. Create the session ?????????????????????????????????????????????
        var session = new Session
        {
            GroupId = req.GroupId,
            //InstructorId = group.InstructorId,
            InstructorId = req.InstructorId,
            SessionNumber = req.SessionNumber,
            PeriodLabelId = periodLabel.Id,
            ScheduledDate = req.ScheduledDate,
            Topic = req.Topic,
            HallId = req.HallId,
            ZoomAccountId = req.ZoomAccountId,
            Status = "SCHEDULED",
        };
        await _uow.Sessions.AddAsync(session);
        await _uow.SaveChangesAsync(); // flush to get session.Id

        // ?? 5. Load commission rate ???????????????????????????????????????????
        var groupWithDetails = await _uow.Groups.GetWithDetailsAsync(req.GroupId);
        var commissionPct = groupWithDetails!.InstructorCommissionPct;

        // ?? 6. Find matching payments (same group + period, not yet complete) ?
        // Period-scoped: only payments for this specific (GroupId + PeriodLabelId).
        // A student enrolled in the group but who hasn't paid for this period yet
        // will NOT appear here — that is intentional and correct. Their absence
        // causes ledgerCount < expectedPayerCount, keeping the flag false.
        var matchingPayments = (await _uow.Payments.FindAsync(p =>
                p.Enrollment.GroupId == req.GroupId &&
                p.PeriodLabelId == req.PeriodLabelId &&
                !p.CommissionDistributionCompleted))
            .ToList();

        // ?? 7. Create one CommissionLedger entry per matching payment ?????????
        var ledgersToAdd = new List<CommissionLedger>();

        foreach (var payment in matchingPayments)
        {
            // Duplicate guard — mirrors DB unique index (PaymentId, SessionId).
            var alreadyExists = (await _uow.CommissionLedgers
                .FindAsync(l => l.PaymentId == payment.Id && l.SessionId == session.Id))
                .Any();

            if (alreadyExists) continue;

            // Rounding: the final session of the payment period absorbs the remainder
            // so that SUM(GrossPayment) == Payment.AmountPaid exactly.
            // e.g. 1000 / 3 = 333.33 + 333.33 + 333.34 = 1000.00
            // This is the ONLY place remainder adjustment is applied.
            // PaymentService.CreateAsync catch-up uses flat amount only.
            var isLastSession = (payment.ProcessedSessionsCount + 1) >= expectedSessionCount;

            decimal perSessionGross;
            if (isLastSession)
            {
                var alreadyDistributed = (await _uow.CommissionLedgers
                    .FindAsync(l => l.PaymentId == payment.Id && !l.IsAdjustment))
                    .Sum(l => l.GrossPayment);

                perSessionGross = payment.AmountPaid - alreadyDistributed;
            }
            else
            {
                perSessionGross = Math.Round(payment.AmountPaid / expectedSessionCount, 2);
            }

            var commissionAmount = Math.Round(perSessionGross * commissionPct / 100, 2);

            ledgersToAdd.Add(new CommissionLedger
            {
                PaymentId = payment.Id,
                SessionId = session.Id,
                InstructorId = session.InstructorId,
                GroupId = req.GroupId,
                CommissionPct = commissionPct,
                GrossPayment = perSessionGross,
                CommissionAmount = commissionAmount,
                CentreAmount = perSessionGross - commissionAmount,
                PeriodLabel = periodLabel.Name,
                IsAdjustment = false,
            });

            payment.ProcessedSessionsCount++;
            if (payment.ProcessedSessionsCount >= expectedSessionCount)
                payment.CommissionDistributionCompleted = true;

            _uow.Payments.Update(payment);
        }

        if (ledgersToAdd.Count > 0)
            await _uow.CommissionLedgers.AddRangeAsync(ledgersToAdd);

        // ?? 8. Determine Session.IsCommissionFullyDistributed ?????????????????
        //
        // Question: "Have all students who are expected to pay for this group
        //            generated a CommissionLedger entry for this session?"
        //
        // ExpectedPayerCount = enrollments NOT in (DROPPED, EXITED_REFUNDED,
        //   CANCELLED, COMPLETED). Includes PENDING, ACTIVE, PARTIAL, SUSPENDED.
        //   This is group-scoped because enrollment is the record of group membership.
        //
        // LedgerCountForSession = ledgersToAdd.Count (created right now for this session).
        //   Students who haven't paid yet have no payment, so no ledger entry,
        //   so ledgerCount < expectedPayerCount ? flag stays false. Correct.
        //
        // Example:
        //   Group = 10 enrolled (8 ACTIVE, 2 PENDING who haven't paid yet)
        //   ExpectedPayerCount = 10
        //   5 students paid this period ? matchingPayments = 5 ? ledgersToAdd = 5
        //   IsCommissionFullyDistributed = (5 >= 10) = false  ? correct
        //
        //   Later when all 10 have paid and their session ledgers are created:
        //   ledgersToAdd = 10
        //   IsCommissionFullyDistributed = (10 >= 10) = true  ? correct
        var allGroupEnrollments = await _uow.Enrollments.GetByGroupAsync(req.GroupId);
        var expectedPayerCount = GetExpectedPayerCount(allGroupEnrollments);

        session.IsCommissionFullyDistributed =
            expectedPayerCount > 0 &&
            ledgersToAdd.Count >= expectedPayerCount;

        _uow.Sessions.Update(session);
        await _uow.SaveChangesAsync();

        var saved = await _uow.Sessions.GetByIdAsync(session.Id);
        return ApiResponse<SessionResponse>.Ok(await MapAsync(saved!));
    }
    */
    public async Task<ApiResponse<SessionResponse>> CreateAsync(CreateSessionRequest req)
    {
        // ?? 1. Validate group ?????????????????????????????????????????????????
        var group = await _uow.Groups.GetByIdAsync(req.GroupId);
        if (group is null) return ApiResponse<SessionResponse>.Fail("Group not found.");

        // ?? 2. Validate period label ??????????????????????????????????????????
        var periodLabel = await _uow.Repository<PeriodLabel>().GetByIdAsync(req.PeriodLabelId);
        if (periodLabel is null)
            return ApiResponse<SessionResponse>.Fail("Invalid period label.");

        // ?? 2.5. Conflict check ???????????????????????????????????????????????
        // No two sessions in the same group+period may be scheduled within
        // 30 minutes of each other. CANCELLED sessions release their slot.
        var existingSessions = await _uow.Sessions.FindAsync(s =>
            s.GroupId == req.GroupId &&
            s.PeriodLabelId == req.PeriodLabelId &&
            s.Status != "CANCELLED");

        var conflict = existingSessions.FirstOrDefault(s =>
            Math.Abs((s.ScheduledDate - req.ScheduledDate).TotalMinutes) < 30);

        if (conflict is not null)
            return ApiResponse<SessionResponse>.Fail(
                $"A session (#{conflict.SessionNumber}) is already scheduled at " +
                $"{conflict.ScheduledDate:yyyy-MM-dd HH:mm} for this group and period. " +
                $"Sessions must be at least 30 minutes apart.");

        // ?? 3. Ensure GroupPeriod exists ??????????????????????????????????????
        // Auto-created on the first session of a new (Group, PeriodLabel) pair
        // using Group.SessionsPerMonth as the default.
        var groupPeriod = await _uow.GroupPeriods.GetAsync(req.GroupId, req.PeriodLabelId);
        if (groupPeriod is null)
        {
            groupPeriod = new GroupPeriod
            {
                GroupId = req.GroupId,
                PeriodLabelId = req.PeriodLabelId,
                ExpectedSessionsCount = group.SessionsPerMonth,
            };
            await _uow.GroupPeriods.AddAsync(groupPeriod);
            await _uow.SaveChangesAsync();
        }

        // ?? 4. Create the session ?????????????????????????????????????????????
        var session = new Session
        {
            GroupId = req.GroupId,
            InstructorId = req.InstructorId,
            SessionNumber = req.SessionNumber,
            PeriodLabelId = periodLabel.Id,
            ScheduledDate = req.ScheduledDate.ToUniversalTime(),
            Topic = req.Topic,
            HallId = req.HallId,
            ZoomAccountId = req.ZoomAccountId,
            Status = "SCHEDULED",
        };
        await _uow.Sessions.AddAsync(session);
        await _uow.SaveChangesAsync();

        var saved = await _uow.Sessions.GetByIdAsync(session.Id);
        return ApiResponse<SessionResponse>.Ok(await MapAsync(saved!));
    }
    /*
    public async Task<ApiResponse<SessionResponse>> UpdateAsync(UpdateSessionRequest req)
    {
        var session = await _uow.Sessions.GetByIdAsync(req.Id);
        if (session is null) return ApiResponse<SessionResponse>.Fail("Session not found.");

        // ?? Financial lock guard ??????????????????????????????????????????????
        // Once a session has generated CommissionLedger entries it is financially
        // frozen. Status cannot be changed to CANCELLED and the session cannot be
        // soft-deleted through an update.
        if (req.Status == "CANCELLED" && session.Status != "CANCELLED")
        {
            var hasLedger = (await _uow.CommissionLedgers
                .FindAsync(l => l.SessionId == session.Id)).Any();

            if (hasLedger)
                return ApiResponse<SessionResponse>.Fail(
                    "This session has commission ledger entries and cannot be cancelled. " +
                    "Use an adjustment ledger entry to correct commissions instead.");
        }
        session.InstructorId = req.InstructorId;
        session.ScheduledDate = req.ScheduledDate;
        session.Topic = req.Topic;
        session.HallId = req.HallId;
        session.ZoomAccountId = req.ZoomAccountId;
        session.Status = req.Status;
        session.CancelledReason = req.CancelledReason;

        _uow.Sessions.Update(session);
        await _uow.SaveChangesAsync();
        return ApiResponse<SessionResponse>.Ok(await MapAsync(session));
    }
    */
    public async Task<ApiResponse<SessionResponse>> UpdateAsync(UpdateSessionRequest req)
    {
        var session = await _uow.Sessions.GetByIdAsync(req.Id);
        if (session is null) return ApiResponse<SessionResponse>.Fail("Session not found.");

        // ?? Financial lock guard ??????????????????????????????????????????????????
        // Once a session has generated CommissionLedger entries it is financially
        // frozen. Status cannot be changed to CANCELLED.
        if (req.Status == "CANCELLED" && session.Status != "CANCELLED")
        {
            var hasLedger = (await _uow.CommissionLedgers
                .FindAsync(l => l.SessionId == session.Id)).Any();

            if (hasLedger)
                return ApiResponse<SessionResponse>.Fail(
                    "This session has commission ledger entries and cannot be cancelled. " +
                    "Use an adjustment ledger entry to correct commissions instead.");
        }

        var isCompletingNow = req.Status == "COMPLETED" && session.Status != "COMPLETED";

        session.InstructorId = req.InstructorId;
        session.ScheduledDate = req.ScheduledDate.ToUniversalTime();
        session.Topic = req.Topic;
        session.HallId = req.HallId;
        session.ZoomAccountId = req.ZoomAccountId;
        session.Status = req.Status;
        session.CancelledReason = req.CancelledReason;

        if (!isCompletingNow)
        {
            _uow.Sessions.Update(session);
            await _uow.SaveChangesAsync();
            return ApiResponse<SessionResponse>.Ok(await MapAsync(session));
        }

        // ?? Commission distribution happens on completion ?????????????????????????
        await _uow.BeginTransactionAsync();
        try
        {
            await DistributeCommissionAsync(session);

            _uow.Sessions.Update(session);
            await _uow.SaveChangesAsync();

            await _uow.CommitTransactionAsync();
        }
        catch
        {
            await _uow.RollbackTransactionAsync();
            throw;
        }

        // ?? Absent notifications — fire after commit, best-effort ?????????????????
        // Runs outside the transaction so a notification failure never rolls back
        // the financial data. Both channels are enabled by default; the caller can
        // override via the controller's ?channel= param in future if needed.
        try
        {
            await _notifications.SendAbsentStudentsAsync(session.Id);
        }
        catch (Exception ex)
        {
            // Log but don't surface — attendance notifications are non-critical.
            
        }

        var saved = await _uow.Sessions.GetByIdAsync(session.Id);
        return ApiResponse<SessionResponse>.Ok(await MapAsync(saved!));
    }

    /// <summary>
    /// Generates CommissionLedger entries for a session being marked COMPLETED.
    /// One entry per (Payment, Session) for payments in this Group+PeriodLabel
    /// that haven't fully distributed their commission yet AND are not blocked
    /// by an early exit refund (IsCommissionDistributionBlocked = false).
    /// Also updates Session.IsCommissionFullyDistributed.
    /// </summary>
    private async Task DistributeCommissionAsync(Session session)
    {
        // ?? Load expected session count for this group+period ?????????????????
        var groupPeriod = await _uow.GroupPeriods.GetAsync(session.GroupId, session.PeriodLabelId);
        var group = await _uow.Groups.GetByIdAsync(session.GroupId);

        var expectedSessionCount = groupPeriod?.ExpectedSessionsCount
            ?? group?.SessionsPerMonth
            ?? 1;
        if (expectedSessionCount <= 0) expectedSessionCount = 1; // guard divide-by-zero

        // ?? Load commission rate ??????????????????????????????????????????????
        var groupWithDetails = await _uow.Groups.GetWithDetailsAsync(session.GroupId);
        var commissionPct = groupWithDetails!.InstructorCommissionPct;

        // ?? Find matching payments ????????????????????????????????????????????
        // Conditions (ALL must be true):
        //   1. Same group + period label
        //   2. CommissionDistributionCompleted = false  (still has sessions to distribute)
        //   3. IsCommissionDistributionBlocked = false  ? NEW: skip refunded payments
        //
        // When a student exits early, ProcessEarlyExitRefundAsync sets
        // IsCommissionDistributionBlocked = true on their latest payment.
        // That payment is permanently invisible to this query from that point on.
        // Historical ledger entries already created for Sessions 1, 2, etc. are untouched.
        var matchingPayments = (await _uow.Payments.FindAsync(p =>
                p.Enrollment.GroupId == session.GroupId &&
                p.PeriodLabelId == session.PeriodLabelId &&
                !p.CommissionDistributionCompleted &&
                !p.IsCommissionDistributionBlocked))            // ? KEY GUARD
            .ToList();

        var ledgersToAdd = new List<CommissionLedger>();


        foreach (var payment in matchingPayments)
        {
            // Duplicate guard — mirrors DB unique index (PaymentId, SessionId).
            var alreadyExists = (await _uow.CommissionLedgers
                .FindAsync(l => l.PaymentId == payment.Id && l.SessionId == session.Id))
                .Any();

            if (alreadyExists) continue;

            // Rounding: the final session absorbs the remainder so that
            // SUM(GrossPayment) == Payment.AmountPaid exactly.
            // e.g. 1000 / 3 = 333.33 + 333.33 + 333.34 = 1000.00
            var isLastSession = (payment.ProcessedSessionsCount + 1) >= expectedSessionCount;

            decimal perSessionGross;
            if (isLastSession)
            {
                var alreadyDistributed = (await _uow.CommissionLedgers
                    .FindAsync(l => l.PaymentId == payment.Id && !l.IsAdjustment))
                    .Sum(l => l.GrossPayment);

                perSessionGross = payment.AmountPaid - alreadyDistributed;
            }
            else
            {
                perSessionGross = Math.Round(payment.AmountPaid / expectedSessionCount, 2);
            }

            var commissionAmount = Math.Round(perSessionGross * commissionPct / 100, 2);

            ledgersToAdd.Add(new CommissionLedger
            {
                PaymentId = payment.Id,
                SessionId = session.Id,
                InstructorId = session.InstructorId,
                GroupId = session.GroupId,
                CommissionPct = commissionPct,
                GrossPayment = perSessionGross,
                CommissionAmount = commissionAmount,
                CentreAmount = perSessionGross - commissionAmount,
                IsAdjustment = false,
            });

            payment.ProcessedSessionsCount++;

            // A blocked payment never reaches this line, so CommissionDistributionCompleted
            // is only set true for payments that legitimately completed all sessions.
            if (payment.ProcessedSessionsCount >= expectedSessionCount)
                payment.CommissionDistributionCompleted = true;

            _uow.Payments.Update(payment);
        }

        if (ledgersToAdd.Count > 0)
            await _uow.CommissionLedgers.AddRangeAsync(ledgersToAdd);

        await _uow.SaveChangesAsync(); // flush payments + ledgers before recomputing flag

        // ?? Determine Session.IsCommissionFullyDistributed ????????????????????
        //
        // ExpectedPayerCount = enrollments NOT in (DROPPED, EXITED_REFUNDED,
        //   CANCELLED, COMPLETED). These students have left — their payments are
        //   either blocked or never existed for this period, so they don't count.
        //
        // Note: EXITED_REFUNDED is already in _excludedFromExpected, so exited
        // students are correctly removed from the expected payer count, and their
        // blocked payment never contributed a ledger entry. Both sides are
        // consistent — the flag calculates correctly without any extra logic.
        var allGroupEnrollments = await _uow.Enrollments.GetByGroupAsync(session.GroupId);
        var expectedPayerCount = GetExpectedPayerCount(allGroupEnrollments);

        // Count ALL non-adjustment ledger entries for this session (not just
        // ones just added), in case some already existed from a previous attempt.
        var totalLedgersForSession = (await _uow.CommissionLedgers
            .FindAsync(l => l.SessionId == session.Id && !l.IsAdjustment))
            .Count();

        session.IsCommissionFullyDistributed =
            expectedPayerCount > 0 &&
            totalLedgersForSession >= expectedPayerCount;
    }

    public async Task<ApiResponse<IEnumerable<SessionResponse>>> GetByGroupAsync(Guid groupId)
    {
        var sessions = await _uow.Sessions.GetByGroupAsync(groupId);
        var mapped = new List<SessionResponse>();
        foreach (var s in sessions) mapped.Add(await MapAsync(s));
        return ApiResponse<IEnumerable<SessionResponse>>.Ok(mapped);
    }

    public async Task<ApiResponse<IEnumerable<SessionResponse>>> GetByHallAsync(Guid hallId, DateTime? from, DateTime? to)
    {
        var sessions = await _uow.Sessions.GetByHallAsync(hallId, from, to);
        var mapped = new List<SessionResponse>();
        foreach (var s in sessions) mapped.Add(await MapAsync(s));
        return ApiResponse<IEnumerable<SessionResponse>>.Ok(mapped);
    }

    public async Task<ApiResponse<IEnumerable<SessionResponse>>> GetByZoomAccountAsync(Guid zoomId, DateTime? from, DateTime? to)
    {
        var sessions = await _uow.Sessions.GetByZoomAccountAsync(zoomId, from, to);
        var mapped = new List<SessionResponse>();
        foreach (var s in sessions) mapped.Add(await MapAsync(s));
        return ApiResponse<IEnumerable<SessionResponse>>.Ok(mapped);
    }
    public async Task<ApiResponse<bool>> DeleteAsync(Guid sessionId)
    {
        var session = await _uow.Sessions.GetByIdAsync(sessionId);
        if (session is null) return ApiResponse<bool>.Fail("Session not found.");

        var hasLedger = (await _uow.CommissionLedgers
            .FindAsync(l => l.SessionId == session.Id)).Any();

        if (hasLedger)
            return ApiResponse<bool>.Fail(
                "This session cannot be deleted because it has commission ledger entries. " +
                "Financial records are immutable once generated.");

        await _uow.Sessions.DeleteAsync(session);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<AttendanceResponse>> MarkAttendanceAsync(MarkAttendanceRequest req)
    {
        var existing = await _uow.Attendances.GetBySessionAndStudentAsync(req.SessionId, req.StudentId);
        if (existing is not null)
            return ApiResponse<AttendanceResponse>.Fail("Attendance already recorded for this student in this session.");

        var record = new AttendanceRecord
        {
            SessionId = req.SessionId,
            StudentId = req.StudentId,
            Status = req.Status,
            Method = req.Method,
            RecordedAt = DateTime.UtcNow,
            RecordedBy = req.RecordedBy, // ?  req.StudentId
        };
        await _uow.Attendances.AddAsync(record);
        await _uow.SaveChangesAsync();

        var student = await _uow.Students.GetWithDetailsAsync(req.StudentId);
        return ApiResponse<AttendanceResponse>.Ok(new AttendanceResponse(
            record.Id, record.SessionId, record.StudentId,
            student is null ? "" : $"{student.Person.FirstName} {student.Person.LastName}",
            record.Status, record.Method, record.RecordedAt, record.Reverted, record.RevertReason));
    }

    public async Task<ApiResponse<AttendanceResponse>> QrAttendanceAsync(QrAttendanceRequest req)
    {
        var student = await _uow.Students.GetByQrCodeAsync(req.QrCode);
        if (student is null) return ApiResponse<AttendanceResponse>.Fail("Invalid QR code.");

        var session = await _uow.Sessions.GetByIdAsync(req.SessionId);
        if (session is null) return ApiResponse<AttendanceResponse>.Fail("Session not found.");
        if (session.Status != "SCHEDULED")
            return ApiResponse<AttendanceResponse>.Fail("Session is not open for attendance.");

        var enrolled = await _uow.Enrollments
            .AnyAsync(e => e.StudentId == student.Id && e.GroupId == session.GroupId);
        if (!enrolled)
            return ApiResponse<AttendanceResponse>.Fail("Student is not enrolled in this group.");

        return await MarkAttendanceAsync(new MarkAttendanceRequest(
    req.SessionId, student.Id, "PRESENT", "QR_SCAN", req.RecordedBy)); 
    }

    public async Task<ApiResponse<bool>> RevertAttendanceAsync(RevertAttendanceRequest req)
    {
        var record = await _uow.Attendances.GetByIdAsync(req.AttendanceId);
        if (record is null) return ApiResponse<bool>.Fail("Attendance record not found.");

        record.Reverted     = true;
        record.RevertReason = req.RevertReason;
        record.RevertedBy   = req.RevertedBy;
        _uow.Attendances.Update(record);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<IEnumerable<AttendanceResponse>>> GetAttendanceBySessionAsync(Guid sessionId)
    {
        var session = await _uow.Sessions.GetByIdAsync(sessionId);
        if (session is null)
            return ApiResponse<IEnumerable<AttendanceResponse>>.Fail("Session not found.");

        var enrollments = await _uow.Enrollments.GetByGroupAsync(session.GroupId);
        var records = await _uow.Attendances.GetBySessionAsync(sessionId);
        var recordMap = records.ToDictionary(r => r.StudentId);

        var result = new List<AttendanceResponse>();
        var activeEnrollments = enrollments
            .Where(e => e.EnrollStatus.Name == "ACTIVE" || e.EnrollStatus.Name == "PENDING")
            .GroupBy(e => e.StudentId)
            .Select(g => g.First());

        foreach (var e in activeEnrollments)
        {
            if (recordMap.TryGetValue(e.StudentId, out var rec))
            {
                result.Add(new AttendanceResponse(
                    rec.Id, rec.SessionId, rec.StudentId,
                    rec.Student?.Person is null ? "" : $"{rec.Student.Person.FirstName} {rec.Student.Person.LastName}",
                    rec.Status, rec.Method, rec.RecordedAt, rec.Reverted, rec.RevertReason));
            }
            else
            {
                var student = await _uow.Students.GetWithDetailsAsync(e.StudentId);
                string name = student?.Person is null ? "" : $"{student.Person.FirstName} {student.Person.LastName}";
                result.Add(new AttendanceResponse(
                    Guid.Empty, sessionId, e.StudentId,
                    name, "ABSENT", "MANUAL", DateTime.UtcNow, false, null));
            }
        }

        return ApiResponse<IEnumerable<AttendanceResponse>>.Ok(result);
    }

    private async Task<SessionResponse> MapAsync(Session s)
    {
        string instructorName = "";
        if (s.Instructor?.Person is not null)
            instructorName = $"{s.Instructor.Person.FirstName} {s.Instructor.Person.LastName}";
        else
        {
            var inst = await _uow.Instructors.GetWithDetailsAsync(s.InstructorId);
            instructorName = inst?.Person is null ? "" : $"{inst.Person.FirstName} {inst.Person.LastName}";
        }

        // ? CHANGED: was s.PeriodLabel.Name (throws if nav prop not loaded)
        string periodLabelName = s.PeriodLabel?.Name
            ?? (await _uow.Repository<PeriodLabel>().GetByIdAsync(s.PeriodLabelId))?.Name
            ?? "";

        return new SessionResponse(
    s.Id, s.GroupId, s.Group?.Name ?? "",
    s.InstructorId, instructorName,
    s.HallId,
    s.Hall?.Name ?? s.Group?.Hall?.Name,
    s.ZoomAccountId,
    s.ZoomAccount?.DisplayName ?? s.Group?.ZoomAccount?.DisplayName,
    s.SessionNumber,
    s.PeriodLabelId,        // ? ADD (second-to-last before periodLabelName)
    periodLabelName,
    s.ScheduledDate, s.ActualDate, s.Topic, s.Status, s.CancelledReason,
    s.CreatedAt, s.ModifiedAt);
    }

    // SessionService
    public async Task<ApiResponse<int>> GetNextSessionNumberAsync(Guid groupId, Guid periodLabelId)
    {
        var sessions = await _uow.Sessions.FindAsync(s =>
            s.GroupId == groupId &&
            s.PeriodLabelId == periodLabelId &&
            s.Status != "CANCELLED");

        var next = sessions.Any() ? sessions.Max(s => s.SessionNumber) + 1 : 1;
        return ApiResponse<int>.Ok(next);
    }

    public async Task<ApiResponse<PagedResponse<SessionResponse>>> GetByBranchPagedAsync(Guid branchId,
        SessionQueryParams filter)
    {
        var (items, totalCount) = await _uow.Sessions.GetByBranchPagedAsync(
            branchId, filter.Page, filter.PageSize, filter.Status, filter.GroupId, filter.PeriodLabelId, filter.Search);

        var mapped = new List<SessionResponse>();
        foreach (var s in items)
            mapped.Add(await MapAsync(s));

        var totalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize);

        return ApiResponse<PagedResponse<SessionResponse>>.Ok(
            new PagedResponse<SessionResponse>(mapped, totalCount, filter.Page, filter.PageSize, totalPages));
    }

    public async Task<ApiResponse<SessionStatsResponse>> GetBranchStatsAsync(Guid branchId)
    {
        var (scheduled, completed, cancelled) = await _uow.Sessions.GetStatsByBranchAsync(branchId);
        return ApiResponse<SessionStatsResponse>.Ok(new SessionStatsResponse(scheduled, completed, cancelled));
    }
}
