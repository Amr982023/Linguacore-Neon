using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services
{
    public interface ICertificateService
    {
        Task<ApiResponse<IEnumerable<CertificateResponse>>> GetByBranchAsync(Guid branchId);
        Task<ApiResponse<CertificateResponse>> GetByIdAsync(Guid id);
    }
}
