using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

public interface IInstructorService
{
    Task<ApiResponse<InstructorResponse>> ToggleActiveAsync(Guid id);
    Task<ApiResponse<InstructorResponse>> CreateAsync(CreateInstructorRequest request);
    Task<ApiResponse<InstructorResponse>> UpdateAsync(UpdateInstructorRequest request);
    Task<ApiResponse<InstructorResponse>> GetByIdAsync(Guid id);

    // ?? CHANGED: now takes a filter/pagination request and returns a PagedResponse ??
    Task<ApiResponse<PagedResponse<InstructorResponse>>> GetByBranchAsync(Guid branchId, InstructorFilterRequest filter);

    Task<ApiResponse<IEnumerable<InstructorResponse>>> GetByLanguageAsync(Guid languageId);
}