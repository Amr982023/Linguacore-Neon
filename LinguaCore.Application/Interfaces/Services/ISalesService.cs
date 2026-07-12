using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services
{
    public interface ISalesService
    {
        Task<ApiResponse<SaleResponse>> CreateSaleAsync(CreateSaleRequest req);
        Task<ApiResponse<PagedResult<SaleResponse>>> GetSalesAsync(Guid branchId, DateTime? from, DateTime? to, int page, int pageSize);
        Task<ApiResponse<SalesStatsResponse>> GetStatsAsync(Guid branchId);
    }
}
