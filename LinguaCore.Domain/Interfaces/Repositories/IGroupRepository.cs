using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IGroupRepository : IGenericRepository<Group>
{
    Task<IEnumerable<Group>> GetByBranchAsync(Guid branchId);
    Task<IEnumerable<Group>> GetByInstructorAsync(Guid instructorId);
    Task<Group?> GetWithDetailsAsync(Guid id);
    Task<bool> InstructorTeachesLanguageAsync(Guid instructorId, Guid languageId);
    Task<IEnumerable<Group>> GetByLanguageLevelAsync(Guid languageLevelId);
    Task<bool> HasHallConflictAsync(Guid hallId, DateTime start, DateTime end, Guid? excludeSessionId = null);
    Task<bool> HasZoomConflictAsync(Guid zoomAccountId, DateTime start, DateTime end, Guid? excludeSessionId = null);

    Task<(IEnumerable<Group> Items, int TotalCount)> GetByBranchPagedAsync(
        Guid branchId,
        int page,
        int pageSize,
        string? search = null,
        Guid? languageId = null,
        Guid? levelId = null,
        Guid? instructorId = null,
        Guid? groupCategoryId = null,
        Guid? groupTypeId = null,
        Guid? deliveryModeId = null,
        Guid? groupStatusId = null,
        Guid? zoomAccountId = null,
        Guid? hallId = null);
}