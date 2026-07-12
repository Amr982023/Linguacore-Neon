namespace LinguaCore.Application.DTOs.Response;

// ── Step 3: GenericClosing responses ─────────────────────────────────────────



public record InstructorClosingSummaryResponse(
    Guid ClosingId,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    string Status,
    decimal TotalCommission,
    decimal TotalDeductions,
    decimal NetPayable);
public record GenericClosingPartialPaymentResponse(
    Guid Id,
    Guid PaymentId,
    string GroupName,
    string PeriodLabelName,
    int ProcessedSessionsCount,
    int ExpectedSessionsCount,
    int MissingSessionsCount,           // = Expected - Processed
    decimal AmountPaid,
    DateTime CreatedAt);
/// <summary>
/// Per-payment / per-group detail line within an instructor's closing summary.
/// Sourced from GenericClosingDetail (snapshot from CommissionLedger).
/// </summary>
public record GenericClosingDetailResponse(
    Guid Id,
    Guid CommissionLedgerId,
    Guid GroupId,
    string GroupName,
    string LanguageName,
    string LevelCode,
    Guid PaymentId,
    Guid? SessionId,                      // ← NEW
    decimal GrossPayment,
    decimal CommissionAmount,
    bool IsAdjustment,
    bool IsFromPreviousPeriod,           // ← NEW
    DateTime CreatedAt);

public record GenericClosingResponse(
    Guid Id,
    Guid BranchId,
    string BranchName,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    string Status,
    string CreatedByName,
    string? ConfirmedByName,
    DateTime? ConfirmedAt,
    DateTime? PaidAt,
    string? Notes,
    DateTime CreatedAt,
    DateTime ModifiedAt,
    decimal TotalIncomeReceived,
    decimal TotalCenterDeductions,
    decimal CenterNetEarned,
    decimal TotalRefunded,                                               // ← NEW Layer 4
    decimal TotalInstructorBonuses,                                      // ← NEW
    decimal TotalInstructorSalaryDeductions,                             // ← NEW
    IEnumerable<GenericClosingIncomeRecordResponse> IncomeRecords,
    IEnumerable<GenericClosingInstructorResponse> InstructorRows,
    IEnumerable<GenericClosingCenterDeductionResponse> CenterDeductions,
    IEnumerable<GenericClosingPartialPaymentResponse> PartialPayments,
    IEnumerable<GenericClosingRefundResponse> RefundRecords);            // ← NEW Layer 4

public record GenericClosingIncomeRecordResponse(
    Guid Id,
    Guid PaymentId,
    string StudentName,
    string GroupName,
    string PeriodLabelName,
    decimal AmountPaid,
    DateTime PaymentDate);


public record GenericClosingCenterDeductionResponse(
    Guid Id,
    string Name,
    decimal Amount,
    DateTime DeductionDate,   // ← NEW: the actual expense date, snapshotted from CenterDeduction
    DateTime CreatedAt);

public record CenterDeductionResponse(
    Guid Id,
    Guid BranchId,
    string Name,
    decimal Amount,
    DateTime DeductionDate,
    string CreatedByName,
    string? Notes,
    DateTime CreatedAt);

/// <summary>Ad-hoc bonus line item awarded to an instructor within a closing.</summary>
public record GenericClosingInstructorBonusResponse(
    Guid Id,
    string Name,
    decimal Amount,
    DateTime CreatedAt);

/// <summary>Ad-hoc salary deduction line item withheld from an instructor within a closing.</summary>
public record GenericClosingInstructorSalaryDeductionResponse(
    Guid Id,
    string Name,
    decimal Amount,
    DateTime CreatedAt);

/// <summary>
/// Per-instructor summary within a GenericClosing.
/// Contains aggregated totals + drill-down details.
/// NetPayable = TotalCommission - TotalDeductions - TotalSalaryDeductions + TotalBonus
/// </summary>
public record GenericClosingInstructorResponse(
    Guid Id,
    Guid InstructorId,
    string InstructorName,
    decimal TotalGross,
    decimal TotalCommission,
    decimal TotalDeductions,
    decimal TotalBonus,                                                       // ← NEW
    decimal TotalSalaryDeductions,                                            // ← NEW
    decimal NetPayable,
    IEnumerable<GenericClosingDetailResponse> Details,
    IEnumerable<GenericClosingInstructorBonusResponse> Bonuses,                          // ← NEW
    IEnumerable<GenericClosingInstructorSalaryDeductionResponse> SalaryDeductions);       // ← NEW

// Response DTO
public record ClosingAuditFlagsResponse(
    Guid ClosingId,
    int PartialPaymentCount,
    int CrossPeriodEntryCount);



public record GenericClosingRefundResponse(
    Guid Id,
    Guid PaymentId,
    string StudentName,
    string GroupName,
    int SessionsAttended,
    int SessionsTotal,
    decimal AmountPaid,
    decimal RefundAmount,
    DateTime RefundDate);
/// <summary>
/// Full GenericClosing response with master data + all instructor rows.
/// Status flow: DRAFT → CONFIRMED → PAID
/// CONFIRMED = locked (read-only).
/// </summary>


/// <summary>Lightweight list item for the closing index page.</summary>
public record GenericClosingSummaryResponse(
    Guid Id,
    Guid BranchId,
    string BranchName,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    string Status,
    int InstructorCount,
    decimal TotalNetPayable,
    decimal TotalIncomeReceived,
    decimal TotalCenterDeductions,
    decimal CenterNetEarned,
    decimal TotalRefunded,          // ← NEW
    decimal TotalInstructorBonuses,            // ← NEW
    decimal TotalInstructorSalaryDeductions,   // ← NEW
    DateTime CreatedAt);