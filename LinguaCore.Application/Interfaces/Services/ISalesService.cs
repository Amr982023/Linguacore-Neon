using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services
{
    public interface ISalesService
    {
        Task<ApiResponse<SaleResponse>> CreateSaleAsync(CreateSaleRequest req);
        Task<ApiResponse<PagedResult<SaleResponse>>> GetSalesAsync(SaleFilterRequest filter);
        Task<ApiResponse<SalesStatsResponse>> GetStatsAsync(Guid branchId);
    }
}