using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Domain.Entities;

namespace LinguaCore.Application.Interfaces.Services;

/// <summary>
/// Single responsibility: manage the GenericClosing lifecycle.
/// Source of all calculations: CommissionLedger ONLY.
/// Status flow: DRAFT → CONFIRMED (locked) → PAID
/// </summary>
public interface IClosingService
{
    Task<ApiResponse<PagedResponse<GenericClosingSummaryResponse>>> GetByBranchPagedAsync(
    Guid branchId, ClosingFilterRequest filter);
    Task<ApiResponse<GenericClosingResponse>> AddInstructorBonusAsync(Guid closingId, AddInstructorBonusRequest req);
    Task<ApiResponse<GenericClosingResponse>> RemoveInstructorBonusAsync(Guid closingId, RemoveInstructorBonusRequest req);
    Task<ApiResponse<GenericClosingResponse>> AddInstructorSalaryDeductionAsync(Guid closingId, AddInstructorSalaryDeductionRequest req);
    Task<ApiResponse<GenericClosingResponse>> RemoveInstructorSalaryDeductionAsync(Guid closingId, RemoveInstructorSalaryDeductionRequest req);

    /// <summary>Adds a named center deduction to a DRAFT closing. Recalculates CenterNetEarned.</summary>
  

    Task<ApiResponse<IEnumerable<ClosingAuditFlagsResponse>>> GetAuditFlagsAsync(Guid branchId);
    Task<ApiResponse<bool>> DeleteClosingAsync(Guid closingId);
    /// <summary>
    /// Creates a new GenericClosing for the given period.
    /// - Validates no overlap with existing closings for the branch.
    /// - Reads CommissionLedger entries in [PeriodStart, PeriodEnd].
    /// - Groups by InstructorId → creates GenericClosingInstructor rows.
    /// - Expands each ledger entry → creates GenericClosingDetail rows.
    /// - Runs inside a DB transaction.
    /// - Supports both MONTHLY and LEVEL_BASED group strategies.
    /// </summary>
    Task<ApiResponse<GenericClosingResponse>> CreateGenericClosingAsync(CreateGenericClosingRequest request);

    /// <summary>
    /// Transitions DRAFT → CONFIRMED.
    /// A CONFIRMED closing is LOCKED — no further edits are permitted.
    /// </summary>
    Task<ApiResponse<GenericClosingResponse>> ConfirmClosingAsync(ConfirmGenericClosingRequest request);

    /// <summary>Transitions CONFIRMED → PAID.</summary>
    Task<ApiResponse<GenericClosingResponse>> MarkClosingPaidAsync(MarkGenericClosingPaidRequest request);

    /// <summary>Returns full closing with all instructor rows and per-payment details.</summary>
    Task<ApiResponse<GenericClosingResponse>> GetClosingDetailsAsync(Guid closingId);

    /// <summary>Returns lightweight summary list for a branch, ordered by PeriodStart DESC.</summary>
    Task<ApiResponse<IEnumerable<GenericClosingSummaryResponse>>> GetByBranchAsync(Guid branchId);
    Task<ApiResponse<IEnumerable<InstructorClosingSummaryResponse>>> GetByInstructorAsync(Guid instructorId);
}
