using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

public interface IExamService
{
    Task<ApiResponse<ExamResponse>> UpdateAsync(UpdateExamRequest req);
    Task<ApiResponse<ExamResponse>> CreateAsync(CreateExamRequest request, Guid userId);
    Task<ApiResponse<IEnumerable<ExamResponse>>> GetByGroupAsync(Guid groupId);
    Task<ApiResponse<ExamResultResponse>> AddResultAsync(AddExamResultRequest request, Guid userId);
    Task<ApiResponse<IEnumerable<ExamResultResponse>>> GetResultsByExamAsync(Guid examId);
    Task<ApiResponse<IEnumerable<ExamResultResponse>>> GetResultsByStudentAsync(Guid studentId);
    Task<ApiResponse<IEnumerable<RankingResponse>>> GetRankingByGroupAsync(Guid groupId);
    Task<ApiResponse<CertificateResponse>> IssueCertificateAsync(Guid examResultId);
}
