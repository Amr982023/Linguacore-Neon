using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LinguaCore.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly IUnitOfWork _uow;
    private readonly IPaymentService _paymentService;

    public DashboardService(IUnitOfWork uow, IPaymentService paymentService)
    {
        _uow = uow;
        _paymentService = paymentService;
    }

    public async Task<ApiResponse<FinancialSummaryResponse>> GetFinancialSummaryAsync(
        Guid? branchId, DateTime from, DateTime to)
    {
        var payments = await _uow.Payments.GetByPeriodAsync(from, to);
        if (branchId.HasValue)
            payments = payments.Where(p => p.Enrollment.Group.BranchId == branchId.Value);

        var paymentsList = payments.ToList();

        var total = paymentsList.Sum(p => p.AmountPaid);
        var expected = paymentsList.Sum(p => p.AmountDue);

        // FIX: was reading p.CommissionLedgers off each payment, which relies on
        // eager-loading that GetByPeriodAsync does not provide (nav prop is
        // effectively always empty). Query CommissionLedgers directly instead,
        // same pattern already used in GetPaymentSummaryRichAsync.
        var totalComm = (await _uow.CommissionLedgers.FindAsync(l =>
                !l.IsAdjustment &&
                l.CreatedAt >= from && l.CreatedAt <= to &&
                (!branchId.HasValue || l.Group.BranchId == branchId.Value)))
            .Sum(l => l.CommissionAmount);

        // FIX: was missing branch filtering entirely — refunds from every
        // branch were being summed regardless of the requested branchId.
        var refunds = await _uow.Repository<RefundRecord>().Query()
            .Include(r => r.Payment).ThenInclude(p => p.Enrollment).ThenInclude(e => e.Group)
            .Where(r => r.RefundDate >= from && r.RefundDate <= to &&
                        (!branchId.HasValue || r.Payment.Enrollment.Group.BranchId == branchId.Value))
            .ToListAsync();
        var totalRefunds = refunds.Sum(r => r.RefundAmount);

        // FIX: was using Enrollments.GetOverdueAsync() — a third, inconsistent
        // definition of "overdue" that doesn't match the reference-date/threshold
        // logic in GetDebtsByBranchAsync (the one the Payments page actually uses).
        // Delegate to the same source of truth instead.
        var debtsResult = await _paymentService.GetDebtsByBranchAsync(
            branchId ?? Guid.Empty, from, to);
        var debts = debtsResult.Data ?? Enumerable.Empty<PaymentDebtResponse>();
        var overdueCount = debts.Count(d => d.IsOverdue);

        var byMethod = paymentsList
            .GroupBy(p => p.PaymentMethod?.Name ?? "Unknown")
            .ToDictionary(g => g.Key, g => g.Sum(p => p.AmountPaid));

        return ApiResponse<FinancialSummaryResponse>.Ok(new FinancialSummaryResponse(
            total, expected, totalComm, total - totalComm,
            totalRefunds, 0, overdueCount, byMethod));
    }

    public async Task<ApiResponse<StudentSummaryResponse>> GetStudentSummaryAsync(Guid? branchId)
    {
        var all = branchId.HasValue
            ? await _uow.Students.GetByBranchAsync(branchId.Value)
            : await _uow.Students.GetAllAsync();

        var totalActive = all.Count(s => s.IsActive);
        var totalInactive = all.Count(s => !s.IsActive);

        var newThisMonth = all.Count(s =>
            s.CreatedAt.Month == DateTime.UtcNow.Month &&
            s.CreatedAt.Year == DateTime.UtcNow.Year);

        var scholarship = all.Count(s =>
            s.Enrollments.Any(e => e.Scholarship));

        var discount = all.Count(s =>
            s.Enrollments.Any(e => e.DiscountPct > 0));

        var gracePeriod = await _uow.Enrollments.GetOverdueAsync();

        var wl = branchId.HasValue
            ? await _uow.WaitingLists.GetByBranchAsync(branchId.Value)
            : await _uow.WaitingLists.GetAllAsync();
        var waitingCount = wl.Count(w => w.Status == "WAITING");

        return ApiResponse<StudentSummaryResponse>.Ok(new StudentSummaryResponse(
            totalActive, totalInactive, newThisMonth,
            gracePeriod.Count(), scholarship, discount,
            waitingCount, 0));
    }

    public async Task<ApiResponse<GroupSummaryResponse>> GetGroupSummaryAsync(Guid? branchId)
    {
        var groups = branchId.HasValue
            ? await _uow.Groups.GetByBranchAsync(branchId.Value)
            : await _uow.Groups.GetAllAsync();

        return ApiResponse<GroupSummaryResponse>.Ok(new GroupSummaryResponse(
            groups.Count(g => g.GroupStatus?.Name == "ACTIVE"),
            groups.Count(g => g.GroupStatus?.Name == "COMPLETED"),
            groups.Count(g => g.GroupStatus?.Name == "SUSPENDED"),
            groups.Count(g => g.DeliveryMode?.Name == "ONLINE"),
            groups.Count(g => g.DeliveryMode?.Name == "OFFLINE")));
    }

    private static (DateTime From, DateTime To, string Label) ResolvePeriod(string? period)
    {
        var now = DateTime.UtcNow;
        return (period ?? "month").ToLowerInvariant() switch
        {
            "3months" => (now.AddMonths(-3), now, "Last 3 months"),
            "year" => (now.AddYears(-1), now, "Last year"),
            _ => (new DateTime(now.Year, now.Month, 1), now, "This month"),
        };
    }

    public async Task<ApiResponse<GroupSummaryRichResponse>> GetGroupSummaryRichAsync(Guid? branchId)
    {
        var groups = branchId.HasValue
            ? await _uow.Groups.GetByBranchAsync(branchId.Value)
            : await _uow.Groups.GetAllAsync();

        var groupList = groups.ToList();

        var byInstructor = groupList
            .GroupBy(g => g.Instructor?.Person is null
                ? "Unassigned"
                : $"{g.Instructor.Person.FirstName} {g.Instructor.Person.LastName}".Trim())
            .Select(gr => new NameCount(gr.Key, gr.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        var byLevel = groupList
            .GroupBy(g => g.LanguageLevel is null
                ? "Unspecified"
                : $"{g.LanguageLevel.Language?.Name ?? ""} {g.LanguageLevel.Level?.Code ?? ""}".Trim())
            .Select(gr => new NameCount(gr.Key, gr.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        var byType = groupList
            .GroupBy(g => g.GroupType?.Name ?? "Unspecified")
            .Select(gr => new NameCount(gr.Key, gr.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        var byCategory = groupList
            .GroupBy(g => g.GroupCategory?.Name ?? "Unspecified")
            .Select(gr => new NameCount(gr.Key, gr.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        return ApiResponse<GroupSummaryRichResponse>.Ok(new GroupSummaryRichResponse(
            groupList.Count(g => g.GroupStatus?.Name == "ACTIVE"),
            groupList.Count(g => g.GroupStatus?.Name == "COMPLETED"),
            groupList.Count(g => g.GroupStatus?.Name == "SUSPENDED"),
            groupList.Count(g => g.DeliveryMode?.Name == "ONLINE"),
            groupList.Count(g => g.DeliveryMode?.Name == "OFFLINE"),
            byInstructor, byLevel, byType, byCategory,
            "All time"));
    }

    public async Task<ApiResponse<PaymentSummaryRichResponse>> GetPaymentSummaryRichAsync(
        Guid? branchId, string? period)
    {
        var (from, to, label) = ResolvePeriod(period);

        var payments = (await _uow.Payments.GetByPeriodAsync(from, to)).ToList();
        if (branchId.HasValue)
            payments = payments.Where(p => p.Enrollment.Group.BranchId == branchId.Value).ToList();

        var totalCollected = payments.Sum(p => p.AmountPaid);
        var totalExpected = payments.Sum(p => p.AmountDue);

        var allLedgers = (await _uow.CommissionLedgers.FindAsync(
                l => !l.IsAdjustment && l.CreatedAt >= from && l.CreatedAt <= to))
            .ToList();
        if (branchId.HasValue)
        {
            var branchGroupIds = (await _uow.Groups.GetByBranchAsync(branchId.Value))
                .Select(g => g.Id).ToHashSet();
            allLedgers = allLedgers.Where(l => branchGroupIds.Contains(l.GroupId)).ToList();
        }
        var totalCommissions = allLedgers.Sum(l => l.CommissionAmount);
        var netRevenue = totalCollected - totalCommissions;

        // FIX: was missing branch filter — refunds from other branches leaked in.
        var refunds = await _uow.Repository<RefundRecord>().Query()
            .Include(r => r.Payment).ThenInclude(p => p.Enrollment).ThenInclude(e => e.Group)
            .Where(r => r.RefundDate >= from && r.RefundDate <= to &&
                        (!branchId.HasValue || r.Payment.Enrollment.Group.BranchId == branchId.Value))
            .ToListAsync();
        var totalRefunds = refunds.Sum(r => r.RefundAmount);

        var periodDeductions = (await _uow.Repository<CenterDeduction>().FindAsync(
                d => d.DeductionDate >= from && d.DeductionDate <= to &&
                     (!branchId.HasValue || d.BranchId == branchId.Value)))
            .Sum(d => d.Amount);

        var cashInDrawerAfterPeriod = totalCollected - periodDeductions - totalRefunds - totalCommissions;

        // FIX: outstanding/overdue now delegate to the same debt-resolution logic
        // that GetDebtsByBranchAsync already uses (3-tier reference date, real
        // overdue-days threshold), instead of a plain (expected - collected)
        // subtraction and Enrollments.GetOverdueAsync(), which disagreed with
        // what the Payments page shows.
        var debtsResult = await _paymentService.GetDebtsByBranchAsync(
            branchId ?? Guid.Empty, from, to);
        var debts = (debtsResult.Data ?? Enumerable.Empty<PaymentDebtResponse>()).ToList();
        var overdueCount = debts.Count(d => d.IsOverdue);
        var totalOutstandingBalance = debts.Where(d => !d.IsOverdue).Sum(d => d.Balance);
        var totalOverdueBalance = debts.Where(d => d.IsOverdue).Sum(d => d.Balance);

        var byMethod = payments
            .GroupBy(p => p.PaymentMethod?.Name ?? "Unknown")
            .ToDictionary(g => g.Key, g => g.Sum(p => p.AmountPaid));

        var byGroup = payments
            .GroupBy(p => p.Enrollment?.Group?.Name ?? "Unknown group")
            .Select(g => new NameAmount(g.Key, g.Sum(p => p.AmountPaid)))
            .OrderByDescending(x => x.Amount)
            .ToList();

        var byClosingType = allLedgers
            .GroupBy(l => string.IsNullOrWhiteSpace(l.PeriodLabel) ? "Uncategorized" : l.PeriodLabel)
            .Select(g => new NameAmount(g.Key, g.Sum(l => l.GrossPayment)))
            .OrderByDescending(x => x.Amount)
            .ToList();

        var yearStart = new DateTime(DateTime.UtcNow.Year, 1, 1);
        var ytdPayments = (await _uow.Payments.GetByPeriodAsync(yearStart, DateTime.UtcNow)).ToList();
        if (branchId.HasValue)
            ytdPayments = ytdPayments.Where(p => p.Enrollment.Group.BranchId == branchId.Value).ToList();

        var byMonthYTD = ytdPayments
            .GroupBy(p => p.PaymentDate.Month)
            .OrderBy(g => g.Key)
            .Select(g => new MonthAmount(
                new DateTime(DateTime.UtcNow.Year, g.Key, 1).ToString("MMM"),
                g.Sum(p => p.AmountPaid)))
            .ToList();

        var byYear = new List<YearAmount>();
        for (var y = DateTime.UtcNow.Year - 2; y <= DateTime.UtcNow.Year; y++)
        {
            var yFrom = new DateTime(y, 1, 1);
            var yTo = y == DateTime.UtcNow.Year ? DateTime.UtcNow : new DateTime(y, 12, 31, 23, 59, 59);
            var yearPayments = (await _uow.Payments.GetByPeriodAsync(yFrom, yTo)).ToList();
            if (branchId.HasValue)
                yearPayments = yearPayments.Where(p => p.Enrollment.Group.BranchId == branchId.Value).ToList();
            if (yearPayments.Count > 0)
                byYear.Add(new YearAmount(y, yearPayments.Sum(p => p.AmountPaid)));
        }

        var monthlyTrend = new List<MonthlyTrendPoint>();
        for (var i = 5; i >= 0; i--)
        {
            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-i);
            var monthEnd = monthStart.AddMonths(1).AddTicks(-1);

            var monthPayments = (await _uow.Payments.GetByPeriodAsync(monthStart, monthEnd)).ToList();
            if (branchId.HasValue)
                monthPayments = monthPayments.Where(p => p.Enrollment.Group.BranchId == branchId.Value).ToList();

            // FIX: month-scoped refunds were also missing the branch filter.
            var monthRefunds = (await _uow.Repository<RefundRecord>().Query()
                    .Include(r => r.Payment).ThenInclude(p => p.Enrollment).ThenInclude(e => e.Group)
                    .Where(r => r.RefundDate >= monthStart && r.RefundDate <= monthEnd &&
                                (!branchId.HasValue || r.Payment.Enrollment.Group.BranchId == branchId.Value))
                    .ToListAsync())
                .Sum(r => r.RefundAmount);

            var monthCollected = monthPayments.Sum(p => p.AmountPaid);
            var monthOutstanding = Math.Max(0, monthPayments.Sum(p => p.AmountDue) - monthCollected);
            var monthOverdueCount = monthPayments.Count(p => p.AmountPaid < p.AmountDue && p.DueDate < DateTime.UtcNow);

            monthlyTrend.Add(new MonthlyTrendPoint(
                monthStart.ToString("MMM"), monthCollected, monthOutstanding, monthRefunds, monthOverdueCount));
        }

        return ApiResponse<PaymentSummaryRichResponse>.Ok(new PaymentSummaryRichResponse(
            netRevenue, totalCollected, totalExpected, totalRefunds, totalCommissions,
            periodDeductions, cashInDrawerAfterPeriod, overdueCount,
            byMethod, byGroup, byClosingType, byMonthYTD, byYear, monthlyTrend, label));
    }

    public async Task<ApiResponse<InstructorSummaryRichResponse>> GetInstructorSummaryRichAsync(
        Guid? branchId, string? period)
    {
        var (from, to, label) = ResolvePeriod(period);

        var ledgersInRange = (await _uow.CommissionLedgers.FindAsync(
                l => !l.IsAdjustment && l.CreatedAt >= from && l.CreatedAt <= to))
            .ToList();

        var sessionsInRange = (await _uow.Repository<Session>().FindAsync(
                s => s.ScheduledDate >= from && s.ScheduledDate <= to && s.Status != "CANCELLED"))
            .ToList();

        if (branchId.HasValue)
        {
            var branchGroupIds = (await _uow.Groups.GetByBranchAsync(branchId.Value))
                .Select(g => g.Id).ToHashSet();
            ledgersInRange = ledgersInRange.Where(l => branchGroupIds.Contains(l.GroupId)).ToList();
            sessionsInRange = sessionsInRange.Where(s => branchGroupIds.Contains(s.GroupId)).ToList();
        }

        var instructorIds = sessionsInRange.Select(s => s.InstructorId)
            .Union(ledgersInRange.Select(l => l.InstructorId))
            .Distinct()
            .ToList();

        var nameById = new Dictionary<Guid, string>();
        async Task<string> ResolveInstructorNameAsync(Guid id)
        {
            var inst = await _uow.Instructors.GetWithDetailsAsync(id);
            if (inst is null)
                return "Unknown instructor";

            var person = inst.Person;
            if (person is null)
                person = await _uow.Repository<Person>().GetByIdAsync(inst.PersonId);

            return person is null
                ? "Unknown instructor"
                : $"{person.FirstName} {person.LastName}".Trim();
        }

        foreach (var id in instructorIds)
            nameById[id] = await ResolveInstructorNameAsync(id);

        var sessionCounts = sessionsInRange
            .GroupBy(s => s.InstructorId)
            .ToDictionary(g => g.Key, g => g.Count());

        var commissionByInstructor = ledgersInRange
            .GroupBy(l => l.InstructorId)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.CommissionAmount));

        var instructorMonthly = instructorIds
            .Select(id => new InstructorSessionStat(
                nameById[id],
                sessionCounts.GetValueOrDefault(id, 0),
                commissionByInstructor.GetValueOrDefault(id, 0)))
            .OrderByDescending(x => x.Sessions)
            .ToList();

        var ledgersBySession = ledgersInRange
            .GroupBy(l => l.SessionId)
            .ToDictionary(g => g.Key, g => g.First().InstructorId);

        var closingSessionCounts = new Dictionary<Guid, int>();
        foreach (var s in sessionsInRange.Where(s => s.IsCommissionFullyDistributed))
        {
            var resolvedInstructorId = ledgersBySession.TryGetValue(s.Id, out var ledgerInstructorId)
                ? ledgerInstructorId
                : s.InstructorId;

            closingSessionCounts[resolvedInstructorId] =
                closingSessionCounts.GetValueOrDefault(resolvedInstructorId, 0) + 1;
        }

        foreach (var id in closingSessionCounts.Keys.Where(id => !nameById.ContainsKey(id)))
            nameById[id] = await ResolveInstructorNameAsync(id);

        var instructorClosing = closingSessionCounts
            .Select(kv => new InstructorSessionCount(nameById[kv.Key], kv.Value))
            .OrderByDescending(x => x.Sessions)
            .ToList();

        var totalCommissions = commissionByInstructor.Values.Sum();
        var totalCollectedInRange = (await _uow.Payments.GetByPeriodAsync(from, to))
            .Where(p => !branchId.HasValue || p.Enrollment.Group.BranchId == branchId.Value)
            .Sum(p => p.AmountPaid);

        var pendingClosings = (await _uow.GenericClosings.GetByBranchAsync(branchId ?? Guid.Empty))
            .Count(c => c.Status != "PAID");

        return ApiResponse<InstructorSummaryRichResponse>.Ok(new InstructorSummaryRichResponse(
            totalCommissions, totalCollectedInRange - totalCommissions, pendingClosings,
            instructorMonthly, instructorClosing, label));
    }

    public async Task<ApiResponse<ExamSummaryRichResponse>> GetExamSummaryRichAsync(
        Guid? branchId, string? period)
    {
        var (from, to, label) = ResolvePeriod(period);

        var exams = (await _uow.Repository<Exam>().FindAsync(
                e => e.ExamDate >= from && e.ExamDate <= to))
            .ToList();

        if (branchId.HasValue)
        {
            var branchGroupIds = (await _uow.Groups.GetByBranchAsync(branchId.Value))
                .Select(g => g.Id).ToHashSet();
            exams = exams.Where(e => branchGroupIds.Contains(e.GroupId)).ToList();
        }

        var examIds = exams.Select(e => e.Id).ToHashSet();
        var examById = exams.ToDictionary(e => e.Id);

        var results = (await _uow.Repository<ExamResult>().FindAsync(
                r => examIds.Contains(r.ExamId)))
            .ToList();

        var examsThisMonth = exams.Count;

        double? avgPassRate = results.Count > 0
            ? (double)results.Count(r => r.Passed) / results.Count
            : null;

        var failedFinals = results.Count(r =>
            !r.Passed && examById.TryGetValue(r.ExamId, out var ex) && ex.IsFinalExam);

        var certificatesIssued = (await _uow.Certificates.GetByBranchAsync(branchId ?? Guid.Empty))
            .Count(c => c.IssuedAt >= from && c.IssuedAt <= to);

        var examsByType = new List<NameCount>
        {
            new("Final", exams.Count(e => e.IsFinalExam)),
            new("Regular", exams.Count(e => !e.IsFinalExam)),
        };

        var examsByResult = new List<NameCount>
        {
            new("Passed", results.Count(r => r.Passed)),
            new("Failed", results.Count(r => !r.Passed)),
        };

        var groupIds = exams.Select(e => e.GroupId).Distinct().ToList();
        var groupNameById = new Dictionary<Guid, string>();
        foreach (var gid in groupIds)
        {
            var g = await _uow.Groups.GetWithDetailsAsync(gid);
            groupNameById[gid] = g?.Name ?? "Unknown group";
        }

        var passedByGroup = results
            .Where(r => r.Passed)
            .GroupBy(r => examById.TryGetValue(r.ExamId, out var ex) ? ex.GroupId : Guid.Empty)
            .Where(g => g.Key != Guid.Empty)
            .Select(g => new GroupPassCount(groupNameById.GetValueOrDefault(g.Key, "Unknown group"), g.Count()))
            .OrderByDescending(x => x.Passed)
            .ToList();

        var studentIds = results.Select(r => r.StudentId).Distinct().ToList();
        var studentNameById = new Dictionary<Guid, string>();
        foreach (var sid in studentIds)
        {
            var s = await _uow.Students.GetWithDetailsAsync(sid);
            studentNameById[sid] = s?.Person is null
                ? "Unknown student"
                : $"{s.Person.FirstName} {s.Person.LastName}".Trim();
        }

        var studentPassRate = results
            .GroupBy(r => r.StudentId)
            .Select(g => new StudentPassRate(
                studentNameById.GetValueOrDefault(g.Key, "Unknown student"),
                (double)g.Count(r => r.Passed) / g.Count()))
            .OrderByDescending(x => x.Rate)
            .ToList();

        return ApiResponse<ExamSummaryRichResponse>.Ok(new ExamSummaryRichResponse(
            examsThisMonth, avgPassRate, failedFinals, certificatesIssued,
            examsByType, examsByResult, passedByGroup, studentPassRate, label));
    }

    public async Task<ApiResponse<WaitingSummaryRichResponse>> GetWaitingSummaryRichAsync(Guid? branchId)
    {
        var all = branchId.HasValue
            ? await _uow.WaitingLists.GetByBranchAsync(branchId.Value)
            : await _uow.WaitingLists.GetAllAsync();

        var list = all.ToList();
        var now = DateTime.UtcNow;

        var waiting = list.Where(w => w.Status == "WAITING").ToList();
        var enrolledThisMonth = list.Count(w =>
            w.Status == "ENROLLED" && w.ModifiedAt.Month == now.Month && w.ModifiedAt.Year == now.Year);
        var cancelled = list.Count(w => w.Status == "CANCELLED" || w.Status == "EXPIRED");

        var waitDays = waiting.Select(w => (int)(now - w.RegisteredAt).TotalDays).ToList();
        var avgWaitDays = waitDays.Count > 0 ? waitDays.Average() : 0;

        var waitingByDays = waitDays
            .GroupBy(d => d)
            .Select(g => new WaitingDayCount(g.Key, g.Count()))
            .OrderBy(x => x.Days)
            .ToList();

        var buckets = new List<WaitingBucket>
        {
            new("0-7 days", waitDays.Count(d => d <= 7)),
            new("8-14 days", waitDays.Count(d => d is > 7 and <= 14)),
            new("15-30 days", waitDays.Count(d => d is > 14 and <= 30)),
            new("31-60 days", waitDays.Count(d => d is > 30 and <= 60)),
            new("60+ days", waitDays.Count(d => d > 60)),
        };

        return ApiResponse<WaitingSummaryRichResponse>.Ok(new WaitingSummaryRichResponse(
            waiting.Count, enrolledThisMonth, cancelled, Math.Round(avgWaitDays, 1),
            waitingByDays, buckets, "Current"));
    }

    public async Task<ApiResponse<CashDrawerResponse>> GetCashDrawerAsync(Guid? branchId)
    {
        var payments = await _uow.Payments.Query()
            .Where(p => !branchId.HasValue || p.Enrollment.Group.BranchId == branchId.Value)
            .ToListAsync();
        var totalIncome = payments.Sum(p => p.AmountPaid);

        var refunds = await _uow.Repository<RefundRecord>().Query()
            .Include(r => r.Payment).ThenInclude(p => p.Enrollment).ThenInclude(e => e.Group)
            .Where(r => !branchId.HasValue || r.Payment.Enrollment.Group.BranchId == branchId.Value)
            .ToListAsync();
        var totalRefunds = refunds.Sum(r => r.RefundAmount);

        var totalDeductions = (await _uow.Repository<CenterDeduction>()
            .FindAsync(d => !branchId.HasValue || d.BranchId == branchId.Value))
            .Sum(d => d.Amount);

        var ledgers = await _uow.CommissionLedgers.Query()
            .Where(l => !branchId.HasValue || l.Group.BranchId == branchId.Value)
            .ToListAsync();
        var totalCommissionNet =
            ledgers.Where(l => !l.IsAdjustment).Sum(l => l.CommissionAmount) -
            Math.Abs(ledgers.Where(l => l.IsAdjustment).Sum(l => l.CommissionAmount));

        var closingRowIds = await _uow.Repository<GenericClosingInstructor>()
            .Query()
            .Where(ir => !branchId.HasValue || ir.GenericClosing.BranchId == branchId.Value)
            .Select(ir => ir.Id)
            .ToListAsync();

        var totalBonuses = (await _uow.Repository<GenericClosingInstructorBonus>()
            .FindAsync(b => closingRowIds.Contains(b.GenericClosingInstructorId)))
            .Sum(b => b.Amount);
        var totalSalaryDeductions = (await _uow.Repository<GenericClosingInstructorSalaryDeduction>()
            .FindAsync(d => closingRowIds.Contains(d.GenericClosingInstructorId)))
            .Sum(d => d.Amount);

        var cashInDrawer = totalIncome - totalRefunds - totalDeductions
            - totalCommissionNet - totalBonuses + totalSalaryDeductions;

        var closedLedgerIds = (await _uow.Repository<GenericClosingDetail>().Query()
                .Select(d => d.CommissionLedgerId)
                .ToListAsync())
            .ToHashSet();
        var pendingCommission = ledgers
            .Where(l => !closedLedgerIds.Contains(l.Id))
            .Sum(l => l.IsAdjustment ? -Math.Abs(l.CommissionAmount) : l.CommissionAmount);

        var outstandingCount = payments.Count(p => !p.CommissionDistributionCompleted);

        return ApiResponse<CashDrawerResponse>.Ok(new CashDrawerResponse(
            totalIncome, totalRefunds, totalDeductions, totalCommissionNet,
            totalBonuses, totalSalaryDeductions, cashInDrawer,
            pendingCommission, outstandingCount, DateTime.UtcNow));
    }
}