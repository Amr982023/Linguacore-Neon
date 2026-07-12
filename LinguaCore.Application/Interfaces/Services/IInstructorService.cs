using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

public interface IInstructorService
{
    Task<ApiResponse<InstructorResponse>> ToggleActiveAsync(Guid id);
    Task<ApiResponse<InstructorResponse>> CreateAsync(CreateInstructorRequest request);
    Task<ApiResponse<InstructorResponse>> UpdateAsync(UpdateInstructorRequest request);
    Task<ApiResponse<InstructorResponse>> GetByIdAsync(Guid id);
    Task<ApiResponse<IEnumerable<InstructorResponse>>> GetByBranchAsync(Guid branchId);
    Task<ApiResponse<IEnumerable<InstructorResponse>>> GetByLanguageAsync(Guid languageId);
}
