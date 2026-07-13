using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

public interface IExamService
{
    Task<ApiResponse<ExamResponse>> CreateAsync(CreateExamRequest req, Guid userId);
    Task<ApiResponse<ExamResponse>> UpdateAsync(UpdateExamRequest req);
    Task<ApiResponse<IEnumerable<ExamResponse>>> GetByGroupAsync(Guid groupId);
    Task<ApiResponse<ExamResultResponse>> AddResultAsync(AddExamResultRequest req, Guid userId);
    Task<ApiResponse<IEnumerable<ExamResultResponse>>> GetResultsByExamAsync(Guid examId);
    Task<ApiResponse<IEnumerable<ExamResultResponse>>> GetResultsByStudentAsync(Guid studentId);
    Task<ApiResponse<IEnumerable<RankingResponse>>> GetRankingByGroupAsync(Guid groupId);
    Task<ApiResponse<CertificateResponse>> IssueCertificateAsync(Guid examResultId);

    // ?? NEW: branch-wide paginated exam list (service layer owns the FilterRequest DTO) ??
    Task<ApiResponse<PagedResponse<ExamResponse>>> GetByBranchAsync(Guid branchId, ExamFilterRequest filter);

    // ?? NEW: lightweight dropdown-source list for the ranking filter UI ??
    Task<ApiResponse<IEnumerable<ExamOptionResponse>>> GetExamOptionsAsync(
        Guid branchId, Guid? groupId, Guid? languageId, Guid? levelId);

    // ?? NEW: branch-wide aggregated + paginated ranking ??
    Task<ApiResponse<PagedResponse<RankingAggregateResponse>>> GetRankingByBranchAsync(
        Guid branchId, RankingFilterRequest filter);
}