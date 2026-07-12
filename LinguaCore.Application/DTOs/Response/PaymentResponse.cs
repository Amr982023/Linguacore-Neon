namespace LinguaCore.Application.DTOs.Response;

// ── Step 4: Updated to use PeriodLabel entity ─────────────────────────────────

public record PaymentResponse(
    Guid Id,
    Guid EnrollmentId,
    Guid StudentId,
    string StudentName,
    string GroupName,
    string PaymentStrategy,
    string PaymentMethod,
    decimal AmountDue,
    decimal AmountPaid,
    DateTime PaymentDate,
    DateTime DueDate,
    Guid? PeriodLabelId,
    string PeriodLabelName,
    string? Notes,
    DateTime CreatedAt,
    DateTime ModifiedAt,
    string LanguageName,   // ← ADD
    string LevelCode);     // ← ADD

public record RefundPreviewResponse(
    Guid EnrollmentId,
    Guid PaymentId,
    string PeriodLabel,
    decimal AmountPaid,
    int SessionsInPeriod,
    int AttendedSessions,
    int RemainingSessions,
    decimal CalculatedRefundAmount,
    bool CanRefund);

public record RefundResponse(
    Guid Id,
    Guid StudentId,
    string StudentName,
    int SessionsAttended,
    int SessionsTotal,
    decimal AmountPaid,
    decimal CalculatedRefundAmount,
    decimal ActualRefundAmount,
    string? AdjustmentReason,
    DateTime RefundDate,
    string PaymentMethod);

public record PaymentDebtResponse(
    Guid EnrollmentId,
    Guid StudentId,
    string StudentName,
    Guid GroupId,
    string GroupName,
    string PaymentStrategy,
    string LanguageName,
    string LevelCode,
    Guid PeriodLabelId,
    string PeriodLabelName,
    decimal EffectiveFee,
    decimal AmountPaid,
    decimal Balance,
    DateTime? FirstSessionDate,
    int DaysSinceFirstSession,
    bool IsOverdue);
public record CommissionLedgerResponse(
    Guid Id,
    string InstructorName,
    string GroupName,
    string PaymentStrategy,
    decimal CommissionPct,
    decimal GrossPayment,
    decimal CommissionAmount,
    decimal CentreAmount,
    string PeriodLabelName,
    bool IsAdjustment,
    string PeriodLabel,
    DateTime CreatedAt);

// MonthlyClosingResponse REMOVED (Step 4) — replaced by GenericClosingResponse in ClosingResponses.cs
