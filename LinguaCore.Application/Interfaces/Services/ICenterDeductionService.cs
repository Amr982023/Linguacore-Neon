using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services
{
    public interface ICenterDeductionService
    {
        Task<ApiResponse<CenterDeductionResponse>> CreateAsync(CreateCenterDeductionRequest req);
        Task<ApiResponse<CenterDeductionResponse>> UpdateAsync(UpdateCenterDeductionRequest req);
        Task<ApiResponse<bool>> DeleteAsync(Guid id);
        Task<ApiResponse<IEnumerable<CenterDeductionResponse>>> GetByBranchAsync(
            Guid branchId, DateTime? from, DateTime? to);
    }
}
