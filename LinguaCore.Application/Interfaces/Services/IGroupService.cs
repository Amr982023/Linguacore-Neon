using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

public interface IGroupService
{
    Task<ApiResponse<GroupResponse>> CreateAsync(CreateGroupRequest request);
    Task<ApiResponse<GroupResponse>> UpdateAsync(UpdateGroupRequest request);
    Task<ApiResponse<GroupResponse>> GetByIdAsync(Guid id);
    Task<ApiResponse<bool>> DeleteAsync(Guid id);
    Task<ApiResponse<IEnumerable<GroupResponse>>> GetByLanguageLevelAsync(
        Guid languageId, Guid levelId, Guid? branchId = null);
    Task<ApiResponse<IEnumerable<GroupResponse>>> GetByBranchAsync(Guid branchId);
    Task<ApiResponse<bool>> ChangeInstructorAsync(ChangeGroupInstructorRequest request);
    Task<ApiResponse<bool>> CheckHallConflictAsync(Guid hallId, DateTime start, DateTime end, Guid? excludeSessionId = null);
    Task<ApiResponse<bool>> CheckZoomConflictAsync(Guid zoomId, DateTime start, DateTime end, Guid? excludeSessionId = null);
}
