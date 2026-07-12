using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LinguaCore.Application.Services;

/// <summary>
/// Implements IClosingService.
///
/// Closing contains three independent financial layers:
///
///   Layer 1 — Income Received
///     Source : Payments WHERE PaymentDate within (PeriodStart, PeriodEnd)
///     Answers: "How much money entered the center this period?"
///     Stored : GenericClosingIncomeRecord
///
///   Layer 2 — Commission Distributed
///     Source : CommissionLedger WHERE CreatedAt within (PeriodStart, PeriodEnd)
///     Answers: "How much commission was earned by instructors this period?"
///     Stored : GenericClosingInstructor + GenericClosingDetail
///
///   Layer 3 — Outstanding Commission Obligations
///     Source : Payments WHERE PaymentDate &lt;= PeriodEnd AND CommissionDistributionCompleted = false
///     Answers: "Which payments still have sessions yet to run?"
///     Stored : GenericClosingPartialPayment
///     Includes 0/8, 3/8, 7/8 — any incomplete distribution state.
/// </summary>
public class ClosingService : IClosingService
{
    private readonly IUnitOfWork _uow;
    public ClosingService(IUnitOfWork uow) => _uow = uow;

    // ── Helpers ───────────────────────────────────────────────────────────

    private static void RecalculateCenterTotals(GenericClosing closing)
    {
        var grandGross = closing.InstructorRows.Sum(ir => ir.TotalGross);
        var grandCommissions = closing.InstructorRows.Sum(ir => ir.TotalCommission);
        var centerDeductions = closing.CenterDeductions.Sum(d => d.Amount);
        var totalRefunded = closing.RefundSnapshots.Sum(r => r.RefundAmount);
        var totalBonuses = closing.InstructorRows.Sum(ir => ir.TotalBonus);
        var totalSalaryDeductions = closing.InstructorRows.Sum(ir => ir.TotalSalaryDeductions);

        closing.TotalCenterDeductions = centerDeductions;
        closing.TotalRefunded = totalRefunded;
        closing.TotalInstructorBonuses = totalBonuses;
        closing.TotalInstructorSalaryDeductions = totalSalaryDeductions;
        // Bonuses leave the center (on top of commission); salary deductions
        // are withheld from instructors and stay with the center.
        closing.CenterNetEarned = grandGross - grandCommissions - centerDeductions
            - totalRefunded - totalBonuses + totalSalaryDeductions;
    }

    /// <summary>
    /// Recomputes a single instructor row's NetPayable from its ledger-derived
    /// totals plus the CURRENT set of ad-hoc bonuses/salary deductions, read
    /// directly from the database by GenericClosingInstructorId.
    ///
    /// This does NOT trust row.Bonuses / row.SalaryDeductions, because those
    /// navigation collections are only as complete as whatever Include chain
    /// was used to load the parent closing — if a prior step in the same
    /// request loaded the closing without including them, summing the
    /// in-memory collection silently produces 0 and overwrites the real,
    /// already-persisted total with a wrong one. Querying fresh by FK is the
    /// only way to guarantee the new item add/remove accumulates correctly
    /// against whatever already exists, regardless of what was Included.
    ///
    /// Call this after adding or removing a GenericClosingInstructorBonus or
    /// GenericClosingInstructorSalaryDeduction for this row.
    /// </summary>
    private async Task RecalculateInstructorRowAsync(GenericClosingInstructor row)
    {
        var bonuses = await _uow.Repository<GenericClosingInstructorBonus>()
            .FindAsync(b => b.GenericClosingInstructorId == row.Id);
        var salaryDeductions = await _uow.Repository<GenericClosingInstructorSalaryDeduction>()
            .FindAsync(d => d.GenericClosingInstructorId == row.Id);

        row.TotalBonus = bonuses.Sum(b => b.Amount);
        row.TotalSalaryDeductions = salaryDeductions.Sum(d => d.Amount);
        row.NetPayable = row.TotalCommission - row.TotalDeductions
            - row.TotalSalaryDeductions + row.TotalBonus;

        // Keep the in-memory collections consistent with what we just read,
        // so MapToResponse (called right after, in the same request) reflects
        // the true current set rather than whatever was originally loaded.
        row.Bonuses = bonuses.ToList();
        row.SalaryDeductions = salaryDeductions.ToList();
    }

    /// <summary>
    /// Ensures every instructor row's Bonuses/SalaryDeductions collections are
    /// populated, regardless of whether GetWithDetailsAsync's Include chain covers
    /// them. Without this, the navigation collections can come back empty on read
    /// even though TotalBonus/TotalSalaryDeductions (plain columns) read back fine —
    /// which shows up as correct totals but an empty/nameless line-item list in the UI.
    /// Call this before mapping any full GenericClosingResponse.
    /// </summary>
    private async Task EnsureInstructorAdjustmentsLoadedAsync(GenericClosing closing)
    {
        var instructorRowIds = closing.InstructorRows.Select(ir => ir.Id).ToList();
        if (instructorRowIds.Count == 0) return;

        var bonuses = await _uow.Repository<GenericClosingInstructorBonus>()
            .FindAsync(b => instructorRowIds.Contains(b.GenericClosingInstructorId));
        var bonusesByRow = bonuses.GroupBy(b => b.GenericClosingInstructorId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var salaryDeductions = await _uow.Repository<GenericClosingInstructorSalaryDeduction>()
            .FindAsync(d => instructorRowIds.Contains(d.GenericClosingInstructorId));
        var salaryDeductionsByRow = salaryDeductions.GroupBy(d => d.GenericClosingInstructorId)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var ir in closing.InstructorRows)
        {
            ir.Bonuses = bonusesByRow.TryGetValue(ir.Id, out var b) ? b : new List<GenericClosingInstructorBonus>();
            ir.SalaryDeductions = salaryDeductionsByRow.TryGetValue(ir.Id, out var d) ? d : new List<GenericClosingInstructorSalaryDeduction>();
        }
    }

    private static ApiResponse<T> Ok<T>(T data) => ApiResponse<T>.Ok(data);
    private static ApiResponse<T> Fail<T>(string m) => ApiResponse<T>.Fail(m);

    // ── Create ────────────────────────────────────────────────────────────

    public async Task<ApiResponse<GenericClosingResponse>> CreateGenericClosingAsync(
     CreateGenericClosingRequest req)
    {
        if (req.PeriodStart >= req.PeriodEnd)
            return Fail<GenericClosingResponse>("PeriodStart must be before PeriodEnd.");

        var hasOverlap = await _uow.GenericClosings.HasOverlapAsync(
            req.BranchId, req.PeriodStart, req.PeriodEnd);
        if (hasOverlap)
            return Fail<GenericClosingResponse>(
                "A closing for this branch already covers the requested period. Periods must not overlap.");

        // ── Layer 1 source: payments received within the closing window ───
        // Keyed on PaymentDate — independent of whether sessions have happened.
        // This captures income even when ProcessedSessionsCount = 0.
        var incomePayments = await _uow.Payments.Query()
            .Include(p => p.Enrollment).ThenInclude(e => e.Student).ThenInclude(s => s.Person)
            .Include(p => p.Enrollment).ThenInclude(e => e.Group)
            .Include(p => p.PeriodLabel)
           .Where(p => p.PaymentDate >= req.PeriodStart &&
            p.PaymentDate <= req.PeriodEnd &&
            p.Enrollment.Group.BranchId == req.BranchId)
            .ToListAsync();

        // ── Layer 2 source: ledger entries created within the closing window
        // Keyed on CommissionLedger.CreatedAt — commission is earned when
        // the session happens, which is when the ledger entry is created.
        var allLedgers = await _uow.CommissionLedgers.Query()
            .Include(l => l.Payment)
            .Include(l => l.Session)
           .Where(l => l.CreatedAt >= req.PeriodStart &&
            l.CreatedAt <= req.PeriodEnd &&
            l.Group.BranchId == req.BranchId)
            .ToListAsync();

        // A closing with no income AND no ledger entries is empty — reject.
        if (!incomePayments.Any() && !allLedgers.Any())
            return Fail<GenericClosingResponse>(
                "No payments received and no commission ledger entries found for the specified period. Nothing to close.");

        await _uow.BeginTransactionAsync();
        try
        {
            // ── Create master record ──────────────────────────────────────
            var closing = new GenericClosing
            {
                BranchId = req.BranchId,
                CreatedBy = req.CreatedBy,
                PeriodStart = req.PeriodStart,
                PeriodEnd = req.PeriodEnd,
                Status = "DRAFT",
                Notes = req.Notes,
            };
            await _uow.GenericClosings.AddAsync(closing);
            await _uow.SaveChangesAsync(); // flush to get closing.Id

            // ── Layer 1: Income records ───────────────────────────────────
            // One record per payment received in this period.
            // Snapshot student name, group, period label, amount, date.
            if (incomePayments.Any())
            {
                var incomeRecords = incomePayments.Select(p => new GenericClosingIncomeRecord
                {
                    GenericClosingId = closing.Id,
                    PaymentId = p.Id,
                    GroupId = p.Enrollment.GroupId,
                    StudentId = p.Enrollment.StudentId,
                    PeriodLabelId = p.PeriodLabelId,
                    AmountPaid = p.AmountPaid,
                    PaymentDate = p.PaymentDate,
                }).ToList();

                await _uow.Repository<GenericClosingIncomeRecord>().AddRangeAsync(incomeRecords);
                await _uow.SaveChangesAsync();

                closing.TotalIncomeReceived = incomeRecords.Sum(r => r.AmountPaid);
            }

            // ── Layer 2: Commission distributed (instructor rows + details)
            if (allLedgers.Any())
            {
                var byInstructor = allLedgers.GroupBy(l => l.InstructorId);

                foreach (var instructorGroup in byInstructor)
                {
                    var entries = instructorGroup.ToList();
                    var totalGross = entries.Where(l => !l.IsAdjustment).Sum(l => l.GrossPayment);
                    var totalComm = entries.Where(l => !l.IsAdjustment).Sum(l => l.CommissionAmount);
                    var totalDed = Math.Abs(entries.Where(l => l.IsAdjustment).Sum(l => l.CommissionAmount));

                    var instructorRow = new GenericClosingInstructor
                    {
                        GenericClosingId = closing.Id,
                        InstructorId = instructorGroup.Key,
                        TotalGross = totalGross,
                        TotalCommission = totalComm,
                        TotalDeductions = totalDed,
                        NetPayable = totalComm - totalDed,
                    };
                    await _uow.Repository<GenericClosingInstructor>().AddAsync(instructorRow);
                    await _uow.SaveChangesAsync(); // flush to get instructorRow.Id

                    var details = entries.Select(l => new GenericClosingDetail
                    {
                        GenericClosingInstructorId = instructorRow.Id,
                        CommissionLedgerId = l.Id,
                        GroupId = l.GroupId,
                        PaymentId = l.PaymentId,
                        SessionId = l.SessionId,
                        GrossPayment = l.GrossPayment,
                        CommissionAmount = l.CommissionAmount,
                        IsAdjustment = l.IsAdjustment,
                        // Cross-period flag: payment received before this closing period started,
                        // but the session (and therefore the ledger entry) happened in this period.
                        IsFromPreviousPeriod = l.Payment.PaymentDate < req.PeriodStart,
                    }).ToList();

                    await _uow.Repository<GenericClosingDetail>().AddRangeAsync(details);
                }

                await _uow.SaveChangesAsync();
            }

            // ── Layer 3: Outstanding commission obligations ────────────────
            //
            // Source: ALL payments where PaymentDate <= PeriodEnd AND
            //         CommissionDistributionCompleted = false.
            //
            // This deliberately does NOT use paymentIdsInClosing (ledger-derived).
            // A payment with 0 sessions distributed has no ledger entries at all
            // and would be completely invisible to a ledger-based query.
            // We must go directly to the Payments table.
            //
            // PaymentDate <= PeriodEnd (not just within the window) because a
            // payment from a previous period that is still incomplete is also
            // an outstanding obligation visible at this closing time.
            var outstandingPayments = await _uow.Payments.Query()
                .Include(p => p.Enrollment).ThenInclude(e => e.Group)
                .Include(p => p.PeriodLabel)
                .Where(p => p.PaymentDate <= req.PeriodEnd &&
            !p.CommissionDistributionCompleted &&
            p.Enrollment.Group.BranchId == req.BranchId)
                .ToListAsync();

            if (outstandingPayments.Any())
            {
                var partials = new List<GenericClosingPartialPayment>();

                foreach (var p in outstandingPayments)
                {
                    var gp = await _uow.GroupPeriods.GetAsync(
                        p.Enrollment.GroupId, p.PeriodLabelId);

                    var expectedSessions = gp?.ExpectedSessionsCount
                        ?? (await _uow.Groups.GetByIdAsync(p.Enrollment.GroupId))?.SessionsPerMonth
                        ?? 0;

                    partials.Add(new GenericClosingPartialPayment
                    {
                        GenericClosingId = closing.Id,
                        PaymentId = p.Id,
                        GroupId = p.Enrollment.GroupId,
                        PeriodLabelId = p.PeriodLabelId,
                        ProcessedSessionsCount = p.ProcessedSessionsCount,
                        ExpectedSessionsCount = expectedSessions,
                        AmountPaid = p.AmountPaid,
                    });
                }

                await _uow.Repository<GenericClosingPartialPayment>().AddRangeAsync(partials);
                await _uow.SaveChangesAsync();
            }

            // ── Layer 4: Refunds issued within this closing period ────────────────
            // Source: RefundRecord.RefundDate within (PeriodStart, PeriodEnd)
            // for students belonging to this branch.
            var refundRecords = await _uow.Repository<RefundRecord>()
                .Query()  // assumes IGenericRepository<T> exposes IQueryable<T> Query()
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Enrollment)
                        .ThenInclude(e => e.Group)
                .Include(r => r.Student).ThenInclude(s => s.Person)
                .Where(r => r.RefundDate >= req.PeriodStart &&
                            r.RefundDate <= req.PeriodEnd &&
                            r.Payment.Enrollment.Group.BranchId == req.BranchId)
                .ToListAsync();

            if (refundRecords.Any())
            {
                var snapshots = refundRecords.Select(r => new GenericClosingRefundSnapshot
                {
                    GenericClosingId = closing.Id,
                    RefundRecordId = r.Id,
                    StudentId = r.StudentId,
                    GroupId = r.Payment.Enrollment.GroupId,
                    SessionsAttended = r.SessionsAttended,
                    SessionsTotal = r.SessionsTotal,
                    AmountPaid = r.AmountPaid,
                    RefundAmount = r.RefundAmount,
                    RefundDate = r.RefundDate,
                }).ToList();

                await _uow.Repository<GenericClosingRefundSnapshot>().AddRangeAsync(snapshots);
                await _uow.SaveChangesAsync();
            }

            // ── Center deductions within the closing period (auto-swept) ───────
            // Source: CenterDeduction.DeductionDate within (PeriodStart, PeriodEnd)
            // for this branch. Deductions are created independently on the Center
            // Deductions page — no manual "add deduction" step during closing
            // creation anymore. Mirrors the RefundRecord snapshot pattern above.
            var centerDeductionsInRange = await _uow.Repository<CenterDeduction>()
                .FindAsync(d => d.BranchId == req.BranchId &&
                                 d.DeductionDate >= req.PeriodStart &&
                                 d.DeductionDate <= req.PeriodEnd);

            if (centerDeductionsInRange.Any())
            {
                var deductionSnapshots = centerDeductionsInRange.Select(d => new GenericClosingCenterDeduction
                {
                    GenericClosingId = closing.Id,
                    CenterDeductionId = d.Id,
                    Name = d.Name,
                    Amount = d.Amount,
                    DeductionDate = d.DeductionDate,
                }).ToList();

                await _uow.Repository<GenericClosingCenterDeduction>().AddRangeAsync(deductionSnapshots);
                await _uow.SaveChangesAsync();
            }

            // ── Recalculate center totals and flush ───────────────────────
            var freshClosing = await _uow.GenericClosings.GetWithDetailsAsync(closing.Id);
            RecalculateCenterTotals(freshClosing!);
            _uow.GenericClosings.Update(freshClosing!);
            await _uow.SaveChangesAsync();

            await _uow.CommitTransactionAsync();

            var result = await _uow.GenericClosings.GetWithDetailsAsync(closing.Id);
            await EnsureInstructorAdjustmentsLoadedAsync(result!);
            return Ok(MapToResponse(result!));
        }
        catch (Exception ex)
        {
            await _uow.RollbackTransactionAsync();
            return Fail<GenericClosingResponse>($"Closing creation failed: {ex.Message}");
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────

    public async Task<ApiResponse<bool>> DeleteClosingAsync(Guid closingId)
    {
        var closing = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
        if (closing is null) return Fail<bool>("Closing not found.");
        if (closing.Status != "DRAFT") return Fail<bool>("Only DRAFT closings can be deleted.");

        await _uow.BeginTransactionAsync();
        try
        {
            // 1. Delete detail rows (grandchildren of instructor rows)
            foreach (var ir in closing.InstructorRows)
                foreach (var detail in ir.Details)
                    _uow.Repository<GenericClosingDetail>().Remove(detail);
            await _uow.SaveChangesAsync();

            // 1b. Delete bonus / salary deduction line items (grandchildren of instructor rows)
            //
            // Query directly by FK instead of relying on ir.Bonuses / ir.SalaryDeductions
            // being populated. GetWithDetailsAsync's Include chain may not cover these
            // newer collections, and an empty/unloaded navigation here would silently skip
            // the delete, leaving rows behind that later violate the FK constraint when
            // the parent GenericClosingInstructor is removed in step 5.
            var instructorRowIds = closing.InstructorRows.Select(ir => ir.Id).ToList();

            var bonusesToDelete = await _uow.Repository<GenericClosingInstructorBonus>()
                .FindAsync(b => instructorRowIds.Contains(b.GenericClosingInstructorId));
            foreach (var bonus in bonusesToDelete)
                _uow.Repository<GenericClosingInstructorBonus>().Remove(bonus);

            var salaryDeductionsToDelete = await _uow.Repository<GenericClosingInstructorSalaryDeduction>()
                .FindAsync(d => instructorRowIds.Contains(d.GenericClosingInstructorId));
            foreach (var deduction in salaryDeductionsToDelete)
                _uow.Repository<GenericClosingInstructorSalaryDeduction>().Remove(deduction);

            await _uow.SaveChangesAsync();

            // 2. Delete partial payment snapshots (Layer 3)
            foreach (var partial in closing.PartialPayments)
                _uow.Repository<GenericClosingPartialPayment>().Remove(partial);
            await _uow.SaveChangesAsync();

            // 3. Delete income records (Layer 1)
            foreach (var income in closing.IncomeRecords)
                _uow.Repository<GenericClosingIncomeRecord>().Remove(income);
            await _uow.SaveChangesAsync();

            // 4. Delete refund snapshots (Layer 4) ← NEW
            foreach (var refund in closing.RefundSnapshots)
                _uow.Repository<GenericClosingRefundSnapshot>().Remove(refund);
            await _uow.SaveChangesAsync();

            // 5. Delete instructor rows (children)
            foreach (var ir in closing.InstructorRows)
                _uow.Repository<GenericClosingInstructor>().Remove(ir);
            await _uow.SaveChangesAsync();

            // 6. Delete center deductions
            foreach (var d in closing.CenterDeductions)
                _uow.Repository<GenericClosingCenterDeduction>().Remove(d);
            await _uow.SaveChangesAsync();

            // 7. Delete master record
            _uow.GenericClosings.Remove(closing);
            await _uow.SaveChangesAsync();

            await _uow.CommitTransactionAsync();
            return Ok(true);
        }
        catch (Exception ex)
        {
            await _uow.RollbackTransactionAsync();
            var inner = ex.InnerException?.Message;
            var detail = string.IsNullOrWhiteSpace(inner) ? ex.Message : $"{ex.Message} | Inner: {inner}";
            return Fail<bool>($"Delete failed: {detail}");
        }
    }

    // ── Confirm ───────────────────────────────────────────────────────────

    public async Task<ApiResponse<GenericClosingResponse>> ConfirmClosingAsync(
        ConfirmGenericClosingRequest req)
    {
        var closing = await _uow.GenericClosings.GetWithDetailsAsync(req.ClosingId);
        if (closing is null) return Fail<GenericClosingResponse>("Closing not found.");
        if (closing.Status != "DRAFT")
            return Fail<GenericClosingResponse>(
                $"Only DRAFT closings can be confirmed. Current status: {closing.Status}");

        await _uow.BeginTransactionAsync();
        try
        {
            closing.Status = "CONFIRMED";
            closing.ConfirmedBy = req.ConfirmedBy;
            closing.ConfirmedAt = DateTime.UtcNow;
            _uow.GenericClosings.Update(closing);
            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();
            await EnsureInstructorAdjustmentsLoadedAsync(closing);
            return Ok(MapToResponse(closing));
        }
        catch (Exception ex)
        {
            await _uow.RollbackTransactionAsync();
            return Fail<GenericClosingResponse>($"Confirm failed: {ex.Message}");
        }
    }

    // ── Mark Paid ─────────────────────────────────────────────────────────

    public async Task<ApiResponse<GenericClosingResponse>> MarkClosingPaidAsync(
        MarkGenericClosingPaidRequest req)
    {
        var closing = await _uow.GenericClosings.GetWithDetailsAsync(req.ClosingId);
        if (closing is null) return Fail<GenericClosingResponse>("Closing not found.");
        if (closing.Status != "CONFIRMED")
            return Fail<GenericClosingResponse>(
                $"Only CONFIRMED closings can be marked as paid. Current status: {closing.Status}");

        await _uow.BeginTransactionAsync();
        try
        {
            closing.Status = "PAID";
            closing.PaidAt = DateTime.UtcNow;
            _uow.GenericClosings.Update(closing);
            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();
            await EnsureInstructorAdjustmentsLoadedAsync(closing);
            return Ok(MapToResponse(closing));
        }
        catch (Exception ex)
        {
            await _uow.RollbackTransactionAsync();
            return Fail<GenericClosingResponse>($"Mark paid failed: {ex.Message}");
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────

    public async Task<ApiResponse<GenericClosingResponse>> GetClosingDetailsAsync(Guid closingId)
    {
        var closing = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
        if (closing is null) return Fail<GenericClosingResponse>("Closing not found.");
        await EnsureInstructorAdjustmentsLoadedAsync(closing);
        return Ok(MapToResponse(closing));
    }

    public async Task<ApiResponse<GenericClosingResponse>> AddCenterDeductionAsync(
        Guid closingId, AddCenterDeductionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Fail<GenericClosingResponse>("Deduction name is required.");
        if (req.Amount <= 0)
            return Fail<GenericClosingResponse>("Amount must be greater than zero.");

        var closing = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
        if (closing is null) return Fail<GenericClosingResponse>("Closing not found.");
        if (closing.Status != "DRAFT")
            return Fail<GenericClosingResponse>("Center deductions can only be added to DRAFT closings.");

        await _uow.BeginTransactionAsync();
        try
        {
            var deduction = new GenericClosingCenterDeduction
            {
                GenericClosingId = closingId,
                Name = req.Name.Trim(),
                Amount = req.Amount,
            };
            await _uow.Repository<GenericClosingCenterDeduction>().AddAsync(deduction);

            // Mutate the already-tracked graph directly instead of re-fetching
            // (see AddInstructorBonusAsync for why re-fetching on the same
            // DbContext is unsafe here). Guarded against EF relationship-fixup
            // double-adding the same entity into CenterDeductions.
            if (!closing.CenterDeductions.Contains(deduction))
                closing.CenterDeductions.Add(deduction);
            RecalculateCenterTotals(closing);
            _uow.GenericClosings.Update(closing);
            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();

            var result = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
            await EnsureInstructorAdjustmentsLoadedAsync(result!);
            return Ok(MapToResponse(result!));
        }
        catch (Exception ex)
        {
            await _uow.RollbackTransactionAsync();
            return Fail<GenericClosingResponse>($"Add center deduction failed: {ex.Message}");
        }
    }

    //public async Task<ApiResponse<GenericClosingResponse>> RemoveCenterDeductionAsync(
    //    Guid closingId, RemoveCenterDeductionRequest req)
    //{
    //    var closing = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
    //    if (closing is null) return Fail<GenericClosingResponse>("Closing not found.");
    //    if (closing.Status != "DRAFT")
    //        return Fail<GenericClosingResponse>("Center deductions can only be removed from DRAFT closings.");

    //    var deduction = closing.CenterDeductions.FirstOrDefault(d => d.Id == req.DeductionId);
    //    if (deduction is null)
    //        return Fail<GenericClosingResponse>("Deduction not found in this closing.");

    //    await _uow.BeginTransactionAsync();
    //    try
    //    {
    //        _uow.Repository<GenericClosingCenterDeduction>().Remove(deduction);
    //        closing.CenterDeductions.Remove(deduction);
    //        RecalculateCenterTotals(closing);
    //        _uow.GenericClosings.Update(closing);
    //        await _uow.SaveChangesAsync();
    //        await _uow.CommitTransactionAsync();

    //        var result = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
    //        await EnsureInstructorAdjustmentsLoadedAsync(result!);
    //        return Ok(MapToResponse(result!));
    //    }
    //    catch (Exception ex)
    //    {
    //        await _uow.RollbackTransactionAsync();
    //        return Fail<GenericClosingResponse>($"Remove center deduction failed: {ex.Message}");
    //    }
    //}

    // ── Per-instructor bonuses ───────────────────────────────────────────────

    public async Task<ApiResponse<GenericClosingResponse>> AddInstructorBonusAsync(
        Guid closingId, AddInstructorBonusRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Fail<GenericClosingResponse>("Bonus name is required.");
        if (req.Amount <= 0)
            return Fail<GenericClosingResponse>("Amount must be greater than zero.");

        var closing = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
        if (closing is null) return Fail<GenericClosingResponse>("Closing not found.");
        if (closing.Status != "DRAFT")
            return Fail<GenericClosingResponse>("Bonuses can only be added to DRAFT closings.");

        var instructorRow = closing.InstructorRows.FirstOrDefault(ir => ir.Id == req.GenericClosingInstructorId);
        if (instructorRow is null)
            return Fail<GenericClosingResponse>(
                "Instructor row not found in this closing. The instructor must have commission ledger entries in this period before a bonus can be added.");

        await _uow.BeginTransactionAsync();
        try
        {
            var bonus = new GenericClosingInstructorBonus
            {
                GenericClosingInstructorId = instructorRow.Id,
                Name = req.Name.Trim(),
                Amount = req.Amount,
            };
            await _uow.Repository<GenericClosingInstructorBonus>().AddAsync(bonus);
            await _uow.SaveChangesAsync();

            // RecalculateInstructorRowAsync re-queries bonuses/salary deductions
            // directly from the database by FK, so it always accumulates against
            // whatever already exists — it never trusts a possibly-unloaded
            // in-memory collection, which is what previously made each add
            // overwrite the other adjustment type's total.
            await RecalculateInstructorRowAsync(instructorRow);
            RecalculateCenterTotals(closing);
            _uow.GenericClosings.Update(closing);
            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();

            var result = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
            await EnsureInstructorAdjustmentsLoadedAsync(result!);
            return Ok(MapToResponse(result!));
        }
        catch (Exception ex)
        {
            await _uow.RollbackTransactionAsync();
            return Fail<GenericClosingResponse>($"Add instructor bonus failed: {ex.Message}");
        }
    }

    public async Task<ApiResponse<GenericClosingResponse>> RemoveInstructorBonusAsync(
        Guid closingId, RemoveInstructorBonusRequest req)
    {
        var closing = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
        if (closing is null) return Fail<GenericClosingResponse>("Closing not found.");
        if (closing.Status != "DRAFT")
            return Fail<GenericClosingResponse>("Bonuses can only be removed from DRAFT closings.");

        // Look up the bonus directly by Id instead of searching through
        // closing.InstructorRows[].Bonuses, which is only as complete as
        // whatever Include chain loaded the closing — relying on it here
        // previously caused "Bonus not found" even when the bonus existed.
        var bonusRepo = _uow.Repository<GenericClosingInstructorBonus>();
        var matches = await bonusRepo.FindAsync(b => b.Id == req.BonusId);
        var bonus = matches.FirstOrDefault();
        if (bonus is null)
            return Fail<GenericClosingResponse>("Bonus not found in this closing.");

        var instructorRow = closing.InstructorRows.FirstOrDefault(
            ir => ir.Id == bonus.GenericClosingInstructorId);
        if (instructorRow is null)
            return Fail<GenericClosingResponse>("Bonus not found in this closing.");

        await _uow.BeginTransactionAsync();
        try
        {
            bonusRepo.Remove(bonus);
            await _uow.SaveChangesAsync();

            await RecalculateInstructorRowAsync(instructorRow);
            RecalculateCenterTotals(closing);
            _uow.GenericClosings.Update(closing);
            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();

            var result = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
            await EnsureInstructorAdjustmentsLoadedAsync(result!);
            return Ok(MapToResponse(result!));
        }
        catch (Exception ex)
        {
            await _uow.RollbackTransactionAsync();
            return Fail<GenericClosingResponse>($"Remove instructor bonus failed: {ex.Message}");
        }
    }

    // ── Per-instructor salary deductions ─────────────────────────────────────

    public async Task<ApiResponse<GenericClosingResponse>> AddInstructorSalaryDeductionAsync(
        Guid closingId, AddInstructorSalaryDeductionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Fail<GenericClosingResponse>("Salary deduction name is required.");
        if (req.Amount <= 0)
            return Fail<GenericClosingResponse>("Amount must be greater than zero.");

        var closing = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
        if (closing is null) return Fail<GenericClosingResponse>("Closing not found.");
        if (closing.Status != "DRAFT")
            return Fail<GenericClosingResponse>("Salary deductions can only be added to DRAFT closings.");

        var instructorRow = closing.InstructorRows.FirstOrDefault(ir => ir.Id == req.GenericClosingInstructorId);
        if (instructorRow is null)
            return Fail<GenericClosingResponse>(
                "Instructor row not found in this closing. The instructor must have commission ledger entries in this period before a salary deduction can be added.");

        await _uow.BeginTransactionAsync();
        try
        {
            var deduction = new GenericClosingInstructorSalaryDeduction
            {
                GenericClosingInstructorId = instructorRow.Id,
                Name = req.Name.Trim(),
                Amount = req.Amount,
            };
            await _uow.Repository<GenericClosingInstructorSalaryDeduction>().AddAsync(deduction);
            await _uow.SaveChangesAsync();

            // See AddInstructorBonusAsync — RecalculateInstructorRowAsync re-queries
            // by FK so additions always accumulate correctly against whatever
            // already exists (including the other adjustment type).
            await RecalculateInstructorRowAsync(instructorRow);
            RecalculateCenterTotals(closing);
            _uow.GenericClosings.Update(closing);
            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();

            var result = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
            await EnsureInstructorAdjustmentsLoadedAsync(result!);
            return Ok(MapToResponse(result!));
        }
        catch (Exception ex)
        {
            await _uow.RollbackTransactionAsync();
            return Fail<GenericClosingResponse>($"Add instructor salary deduction failed: {ex.Message}");
        }
    }

    public async Task<ApiResponse<GenericClosingResponse>> RemoveInstructorSalaryDeductionAsync(
        Guid closingId, RemoveInstructorSalaryDeductionRequest req)
    {
        var closing = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
        if (closing is null) return Fail<GenericClosingResponse>("Closing not found.");
        if (closing.Status != "DRAFT")
            return Fail<GenericClosingResponse>("Salary deductions can only be removed from DRAFT closings.");

        // Look up directly by Id rather than via closing.InstructorRows[].SalaryDeductions
        // — see RemoveInstructorBonusAsync for why that lookup is unreliable.
        var deductionRepo = _uow.Repository<GenericClosingInstructorSalaryDeduction>();
        var matches = await deductionRepo.FindAsync(d => d.Id == req.SalaryDeductionId);
        var deduction = matches.FirstOrDefault();
        if (deduction is null)
            return Fail<GenericClosingResponse>("Salary deduction not found in this closing.");

        var instructorRow = closing.InstructorRows.FirstOrDefault(
            ir => ir.Id == deduction.GenericClosingInstructorId);
        if (instructorRow is null)
            return Fail<GenericClosingResponse>("Salary deduction not found in this closing.");

        await _uow.BeginTransactionAsync();
        try
        {
            deductionRepo.Remove(deduction);
            await _uow.SaveChangesAsync();

            await RecalculateInstructorRowAsync(instructorRow);
            RecalculateCenterTotals(closing);
            _uow.GenericClosings.Update(closing);
            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();

            var result = await _uow.GenericClosings.GetWithDetailsAsync(closingId);
            await EnsureInstructorAdjustmentsLoadedAsync(result!);
            return Ok(MapToResponse(result!));
        }
        catch (Exception ex)
        {
            await _uow.RollbackTransactionAsync();
            return Fail<GenericClosingResponse>($"Remove instructor salary deduction failed: {ex.Message}");
        }
    }

    public async Task<ApiResponse<IEnumerable<InstructorClosingSummaryResponse>>> GetByInstructorAsync(
    Guid instructorId)
    {
        var closings = await _uow.GenericClosings.GetByInstructorAsync(instructorId);
        var result = closings.Select(c =>
        {
            var row = c.InstructorRows.First(ir => ir.InstructorId == instructorId);
            return new InstructorClosingSummaryResponse(
                c.Id,
                c.PeriodStart,
                c.PeriodEnd,
                c.Status,
                row.TotalCommission,
                row.TotalDeductions,
                row.NetPayable);
        });
        return Ok(result);
    }

    public async Task<ApiResponse<IEnumerable<GenericClosingSummaryResponse>>> GetByBranchAsync(
        Guid branchId)
    {
        var closings = await _uow.GenericClosings.GetByBranchAsync(branchId);
        var summaries = closings.Select(c => MapToSummary(c));

        return Ok(summaries);
    }
    private static GenericClosingSummaryResponse MapToSummary(GenericClosing c) => new(
    c.Id, c.BranchId, c.Branch?.Name ?? "",
    c.PeriodStart, c.PeriodEnd, c.Status,
    c.InstructorRows.Count,
    c.InstructorRows.Sum(ir => ir.NetPayable),
    c.TotalIncomeReceived,
    c.TotalCenterDeductions,
    c.CenterNetEarned,
    c.TotalRefunded,        // ← NEW
    c.TotalInstructorBonuses,          // ← NEW
    c.TotalInstructorSalaryDeductions, // ← NEW
    c.CreatedAt);

    public async Task<ApiResponse<IEnumerable<ClosingAuditFlagsResponse>>> GetAuditFlagsAsync(
        Guid branchId)
    {
        var closings = await _uow.GenericClosings.GetByBranchAsync(branchId);
        var results = new List<ClosingAuditFlagsResponse>();

        foreach (var c in closings)
        {
            var partialCount = (await _uow.Repository<GenericClosingPartialPayment>()
                .FindAsync(p => p.GenericClosingId == c.Id)).Count();

            var crossCount = c.InstructorRows
                .SelectMany(ir => ir.Details)
                .Count(d => d.IsFromPreviousPeriod);

            results.Add(new ClosingAuditFlagsResponse(c.Id, partialCount, crossCount));
        }

        return Ok((IEnumerable<ClosingAuditFlagsResponse>)results);
    }

    // ── Mapping ───────────────────────────────────────────────────────────

    private static GenericClosingResponse MapToResponse(GenericClosing c) => new(
      c.Id,
      c.BranchId,
      c.Branch?.Name ?? "",
      c.PeriodStart,
      c.PeriodEnd,
      c.Status,
      c.CreatedByUser?.Person is null ? "" : $"{c.CreatedByUser.Person.FirstName} {c.CreatedByUser.Person.LastName}",
      c.ConfirmedByUser?.Person is null ? null : $"{c.ConfirmedByUser.Person.FirstName} {c.ConfirmedByUser.Person.LastName}",
      c.ConfirmedAt,
      c.PaidAt,
      c.Notes,
      c.CreatedAt,
      c.ModifiedAt,
      c.TotalIncomeReceived,
      c.TotalCenterDeductions,
      c.CenterNetEarned,
      c.TotalRefunded,                                    // ← Layer 4
      c.TotalInstructorBonuses,                           // ← NEW
      c.TotalInstructorSalaryDeductions,                  // ← NEW
      c.IncomeRecords.Select(r => new GenericClosingIncomeRecordResponse(
          r.Id, r.PaymentId,
          r.Student?.Person is null ? "" : $"{r.Student.Person.FirstName} {r.Student.Person.LastName}",
          r.Group?.Name ?? "",
          r.PeriodLabel?.Name ?? "",
          r.AmountPaid, r.PaymentDate)),
      c.InstructorRows.Select(MapInstructorRow),
     c.CenterDeductions.Select(d => new GenericClosingCenterDeductionResponse(
    d.Id, d.Name, d.Amount, d.DeductionDate, d.CreatedAt)),
      c.PartialPayments.Select(p => new GenericClosingPartialPaymentResponse(
          p.Id, p.PaymentId, p.Group?.Name ?? "", p.PeriodLabel?.Name ?? "",
          p.ProcessedSessionsCount, p.ExpectedSessionsCount,
          p.ExpectedSessionsCount - p.ProcessedSessionsCount,
          p.AmountPaid, p.CreatedAt)),
      c.RefundSnapshots.Select(r => new GenericClosingRefundResponse(    // ← NEW
          r.Id, r.RefundRecordId,
          r.Student?.Person is null ? "" : $"{r.Student.Person.FirstName} {r.Student.Person.LastName}",
          r.Group?.Name ?? "",
          r.SessionsAttended, r.SessionsTotal,
          r.AmountPaid, r.RefundAmount, r.RefundDate)));

    private static GenericClosingInstructorResponse MapInstructorRow(
        GenericClosingInstructor ir) => new(
        ir.Id,
        ir.InstructorId,
        ir.Instructor?.Person is null
            ? ""
            : $"{ir.Instructor.Person.FirstName} {ir.Instructor.Person.LastName}",
        ir.TotalGross,
        ir.TotalCommission,
        ir.TotalDeductions,
        ir.TotalBonus,
        ir.TotalSalaryDeductions,
        ir.NetPayable,
        ir.Details.Select(MapDetail),
        ir.Bonuses.Select(b => new GenericClosingInstructorBonusResponse(b.Id, b.Name, b.Amount, b.CreatedAt)),
        ir.SalaryDeductions.Select(d => new GenericClosingInstructorSalaryDeductionResponse(d.Id, d.Name, d.Amount, d.CreatedAt)));

    private static GenericClosingDetailResponse MapDetail(GenericClosingDetail d) => new(
        d.Id,
        d.CommissionLedgerId,
        d.GroupId,
        d.Group?.Name ?? "",
        d.Group?.LanguageLevel?.Language?.Name ?? "",
        d.Group?.LanguageLevel?.Level?.Code ?? "",
        d.PaymentId,
        d.SessionId,
        d.GrossPayment,
        d.CommissionAmount,
        d.IsAdjustment,
        d.IsFromPreviousPeriod,
        d.CreatedAt);
}