using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

/// <summary>
/// Responsible for Payments and CommissionLedger entries only.
/// All closing logic has been moved to IClosingService (Step 4).
/// </summary>
public interface IPaymentService
{
    Task<ApiResponse<IEnumerable<PaymentDebtResponse>>> GetDebtsByBranchAsync(
    Guid branchId, DateTime? from = null, DateTime? to = null);
    Task<ApiResponse<PaymentResponse>> SettleBalanceAsync(SettleOutstandingBalanceRequest req);
    Task<ApiResponse<PaymentResponse>>                        CreateAsync(CreatePaymentRequest req, Guid recordedBy);
    Task<ApiResponse<IEnumerable<PaymentResponse>>>           GetByEnrollmentAsync(Guid enrollmentId);
    Task<ApiResponse<IEnumerable<PaymentResponse>>>           GetByGroupAsync(Guid groupId);
    Task<ApiResponse<IEnumerable<PaymentResponse>>> GetByPeriodAsync(Guid branchId, DateTime from, DateTime to);
    Task<ApiResponse<IEnumerable<CommissionLedgerResponse>>>  GetCommissionByInstructorAsync(Guid instructorId, DateTime? from, DateTime? to);
}
