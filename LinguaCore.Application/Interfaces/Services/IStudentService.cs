using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

public interface IStudentService
{
    Task<ApiResponse<StudentResponse>> CreateAsync(CreateStudentRequest request);
    Task<ApiResponse<StudentResponse>> UpdateAsync(UpdateStudentRequest request);
    Task<ApiResponse<StudentDetailResponse>> GetByIdAsync(Guid id);
    Task<ApiResponse<IEnumerable<StudentResponse>>> GetByBranchAsync(Guid branchId);
    Task<ApiResponse<StudentResponse>> GetByQrCodeAsync(string qrCode);
    Task<ApiResponse<bool>> DeactivateAsync(Guid id);
    Task<ApiResponse<PagedResponse<StudentResponse>>> GetByBranchPagedAsync(
    Guid branchId, StudentFilterRequest filter);
    Task<ApiResponse<string>> RegenerateQrCodeAsync(Guid id);
}
