// Application/Interfaces/Services/ICertificateService.cs
using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services
{
    public interface ICertificateService
    {
        Task<ApiResponse<IEnumerable<CertificateResponse>>> GetByBranchAsync(Guid branchId);
        Task<ApiResponse<CertificateResponse>> GetByIdAsync(Guid id);

        // New: offset-paginated, server-side filtered
        Task<ApiResponse<PagedResult<CertificateResponse>>> GetByBranchPagedAsync(
            CertificateFilterRequest filter);
    }
}