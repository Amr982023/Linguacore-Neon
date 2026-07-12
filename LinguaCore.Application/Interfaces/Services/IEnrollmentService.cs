using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Domain.Entities;

namespace LinguaCore.Application.Interfaces.Services;

public interface IEnrollmentService
{
    Task<ApiResponse<EnrollmentResponse>> CreateAsync(CreateEnrollmentRequest req);
    Task<ApiResponse<EnrollmentResponse>> CreatePartialAsync(CreatePartialEnrollmentRequest req);
    Task<ApiResponse<EnrollmentResponse>> UpdateStatusAsync(UpdateEnrollmentStatusRequest req);
    Task<ApiResponse<IEnumerable<EnrollmentResponse>>> GetByStudentAsync(Guid studentId);
    Task<ApiResponse<IEnumerable<EnrollmentResponse>>> GetByGroupAsync(Guid groupId);
    Task<ApiResponse<RefundPreviewResponse>> GetRefundPreviewAsync(Guid enrollmentId);
    Task<ApiResponse<RefundResponse>> ProcessEarlyExitRefundAsync(EarlyExitRefundRequest req);
    Task<ApiResponse<bool>> UnenrollAsync(Guid enrollmentId);
    Task<ApiResponse<IEnumerable<RefundListResponse>>> GetRefundsByBranchAsync(
    Guid branchId, DateTime? from = null, DateTime? to = null);

}