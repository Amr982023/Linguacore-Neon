// Application/Interfaces/Services/ICenterDeductionService.cs
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services
{
    public interface ICenterDeductionService
    {
        Task<ApiResponse<CenterDeductionResponse>> CreateAsync(CreateCenterDeductionRequest req);
        Task<ApiResponse<CenterDeductionResponse>> UpdateAsync(UpdateCenterDeductionRequest req);
        Task<ApiResponse<bool>> DeleteAsync(Guid id);

        // Legacy, unpaginated — kept until nothing else calls it
        Task<ApiResponse<IEnumerable<CenterDeductionResponse>>> GetByBranchAsync(
            Guid branchId, DateTime? from, DateTime? to);

        // New: offset-paginated, server-side filtered, includes range total
        Task<ApiResponse<CenterDeductionPagedResponse>> GetByBranchPagedAsync(
            CenterDeductionFilterRequest filter);
    }
}