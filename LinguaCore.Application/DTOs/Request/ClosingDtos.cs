namespace LinguaCore.Application.DTOs.Request;

// ── Step 3: GenericClosing requests ──────────────────────────────────────────

/// <summary>
/// Creates a new GenericClosing for a branch and period.
/// Source: CommissionLedger ONLY.
/// </summary>
public record CreateGenericClosingRequest(
    Guid BranchId,
    Guid CreatedBy,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    string? Notes);

/// <summary>Adds a named center deduction to a DRAFT closing.</summary>
public record AddCenterDeductionRequest(
    string Name,
    decimal Amount);


/// <summary>
/// Adds an ad-hoc bonus to a specific instructor row within a DRAFT closing.
/// The instructor must already have a GenericClosingInstructor row in this closing
/// (i.e. have CommissionLedger entries for the period).
/// Increases that instructor's NetPayable; decreases the center's CenterNetEarned.
/// </summary>
public record AddInstructorBonusRequest(
    Guid GenericClosingInstructorId,
    string Name,
    decimal Amount);

/// <summary>Removes an instructor bonus by its Id.</summary>
public record RemoveInstructorBonusRequest(Guid BonusId);

/// <summary>
/// Adds an ad-hoc salary deduction to a specific instructor row within a DRAFT closing.
/// The instructor must already have a GenericClosingInstructor row in this closing
/// (i.e. have CommissionLedger entries for the period).
/// Decreases that instructor's NetPayable; increases the center's CenterNetEarned.
/// Distinct from GenericClosingCenterDeduction (center-wide expense) and from
/// CommissionLedger adjustment entries (commission-level corrections).
/// </summary>
public record AddInstructorSalaryDeductionRequest(
    Guid GenericClosingInstructorId,
    string Name,
    decimal Amount);

/// <summary>Removes an instructor salary deduction by its Id.</summary>
public record RemoveInstructorSalaryDeductionRequest(Guid SalaryDeductionId);

/// <summary>Transitions a DRAFT closing to CONFIRMED (locks it — no further edits).</summary>
public record ConfirmGenericClosingRequest(
    Guid ClosingId,
    Guid ConfirmedBy);   // still needed but now always set server-side

/// <summary>Transitions a CONFIRMED closing to PAID.</summary>
public record MarkGenericClosingPaidRequest(Guid ClosingId);

public record CreateCenterDeductionRequest(
    Guid BranchId,
    string Name,
    decimal Amount,
    DateTime DeductionDate,
    Guid CreatedBy,     // set server-side from claims, like CreateGenericClosingRequest
    string? Notes);

public record UpdateCenterDeductionRequest(
    Guid Id,
    string Name,
    decimal Amount,
    DateTime DeductionDate,
    string? Notes);

