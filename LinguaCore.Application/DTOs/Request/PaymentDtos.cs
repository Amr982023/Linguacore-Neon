namespace LinguaCore.Application.DTOs.Request;

// ── Step 4: PeriodLabel replaces string PeriodLabel ──────────────────────────

/// <summary>
/// PeriodLabelId is now a REQUIRED FK (Guid) — replaces the old string PeriodLabel field.
/// RecordedBy is injected from the JWT claims in the controller; not supplied by the client.
/// </summary>
public record CreatePaymentRequest(
    Guid EnrollmentId,
    Guid PaymentMethodId,
    Guid PeriodLabelId,
    decimal AmountDue,
    decimal AmountPaid,
    DateTime DueDate,
    string? Notes);

public record SettleOutstandingBalanceRequest(
    Guid EnrollmentId,
    Guid PeriodLabelId,
    decimal AdditionalAmount,
    string? Notes);

// ── Monthly closing requests REMOVED (Step 4) ────────────────────────────────
// CreateMonthlyClosingRequest  → replaced by CreateGenericClosingRequest
// ConfirmMonthlyClosingRequest → replaced by ConfirmGenericClosingRequest
// MarkClosingPaidRequest       → replaced by MarkGenericClosingPaidRequest
