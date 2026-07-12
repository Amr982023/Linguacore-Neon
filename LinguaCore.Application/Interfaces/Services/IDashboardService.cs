using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

public interface IDashboardService
{
    Task<ApiResponse<GroupSummaryRichResponse>> GetGroupSummaryRichAsync(Guid? branchId);

    Task<ApiResponse<PaymentSummaryRichResponse>> GetPaymentSummaryRichAsync(
        Guid? branchId, string? period);

    Task<ApiResponse<InstructorSummaryRichResponse>> GetInstructorSummaryRichAsync(
        Guid? branchId, string? period);

    Task<ApiResponse<ExamSummaryRichResponse>> GetExamSummaryRichAsync(
        Guid? branchId, string? period);

    Task<ApiResponse<WaitingSummaryRichResponse>> GetWaitingSummaryRichAsync(Guid? branchId);
    Task<ApiResponse<FinancialSummaryResponse>> GetFinancialSummaryAsync(Guid? branchId, DateTime from, DateTime to);
    Task<ApiResponse<StudentSummaryResponse>> GetStudentSummaryAsync(Guid? branchId);
    Task<ApiResponse<GroupSummaryResponse>> GetGroupSummaryAsync(Guid? branchId);
    Task<ApiResponse<CashDrawerResponse>> GetCashDrawerAsync(Guid? branchId);
}
