using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class GroupRepository : GenericRepository<Group>, IGroupRepository
{
    public GroupRepository(AppDbContext context) : base(context) { }

    public async Task<bool> InstructorTeachesLanguageAsync(Guid instructorId, Guid languageId)
        => await _context.InstructorLanguages
            .AnyAsync(il => il.InstructorId == instructorId && il.LanguageId == languageId);

    public async Task<IEnumerable<Group>> GetByBranchAsync(Guid branchId)
    {
        return await _context.Groups
            .Where(g => g.BranchId == branchId)
            .Include(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(g => g.Instructor).ThenInclude(i => i.Person)
            .Include(g => g.Hall)
            .Include(g => g.ZoomAccount)
            .Include(g => g.GroupCategory)
            .Include(g => g.GroupType)
            .Include(g => g.DeliveryMode)
            .Include(g => g.GroupStatus)
            .Include(g => g.Branch)
            .Include(g => g.Enrollments)
            .ToListAsync();
    }

    /// <summary>
    /// Paged + filtered branch listing. Language/Level filters go straight through
    /// Group.LanguageLevel (no enrollment indirection needed — unlike Students).
    /// </summary>
    public async Task<(IEnumerable<Group> Items, int TotalCount)> GetByBranchPagedAsync(
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
        Guid? hallId = null)
    {
        var query = _context.Groups
            .Where(g => g.BranchId == branchId)
            .Include(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(g => g.Instructor).ThenInclude(i => i.Person)
            .Include(g => g.Hall)
            .Include(g => g.ZoomAccount)
            .Include(g => g.GroupCategory)
            .Include(g => g.GroupType)
            .Include(g => g.DeliveryMode)
            .Include(g => g.GroupStatus)
            .Include(g => g.Branch)
            .Include(g => g.Enrollments)
            .AsQueryable();

        query = ApplyFilters(
            query, search, languageId, levelId, instructorId,
            groupCategoryId, groupTypeId, deliveryModeId, groupStatusId, zoomAccountId, hallId);

        var total = await query.CountAsync();

        var items = await query
            .OrderBy(g => g.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    private static IQueryable<Group> ApplyFilters(
        IQueryable<Group> query,
        string? search,
        Guid? languageId,
        Guid? levelId,
        Guid? instructorId,
        Guid? groupCategoryId,
        Guid? groupTypeId,
        Guid? deliveryModeId,
        Guid? groupStatusId,
        Guid? zoomAccountId,
        Guid? hallId)
    {
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(g => EF.Functions.ILike(g.Name, $"%{search.Trim()}%"));

        if (languageId.HasValue)
            query = query.Where(g => g.LanguageLevel.LanguageId == languageId.Value);

        if (levelId.HasValue)
            query = query.Where(g => g.LanguageLevel.LevelId == levelId.Value);

        if (instructorId.HasValue)
            query = query.Where(g => g.InstructorId == instructorId.Value);

        if (groupCategoryId.HasValue)
            query = query.Where(g => g.GroupCategoryId == groupCategoryId.Value);

        if (groupTypeId.HasValue)
            query = query.Where(g => g.GroupTypeId == groupTypeId.Value);

        if (deliveryModeId.HasValue)
            query = query.Where(g => g.DeliveryModeId == deliveryModeId.Value);

        if (groupStatusId.HasValue)
            query = query.Where(g => g.GroupStatusId == groupStatusId.Value);

        if (zoomAccountId.HasValue)
            query = query.Where(g => g.ZoomAccountId == zoomAccountId.Value);

        if (hallId.HasValue)
            query = query.Where(g => g.HallId == hallId.Value);

        return query;
    }

    public async Task<IEnumerable<Group>> GetByInstructorAsync(Guid instructorId)
        => await _dbSet
            .Include(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(g => g.GroupStatus)
            .Where(g => g.InstructorId == instructorId)
            .ToListAsync();

    public async Task<Group?> GetWithDetailsAsync(Guid id)
        => await _dbSet
            .Include(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(g => g.Instructor).ThenInclude(i => i.Person)
            .Include(g => g.Branch)
            .Include(g => g.Hall)
            .Include(g => g.ZoomAccount)
            .Include(g => g.GroupCategory)
            .Include(g => g.GroupType)
            .Include(g => g.DeliveryMode)
            .Include(g => g.GroupStatus)
            .Include(g => g.GroupInstructorHistories).ThenInclude(h => h.Instructor).ThenInclude(i => i.Person)
            .FirstOrDefaultAsync(g => g.Id == id);

    public async Task<IEnumerable<Group>> GetByLanguageLevelAsync(Guid languageLevelId)
        => await _dbSet
            .Include(g => g.Instructor).ThenInclude(i => i.Person)
            .Include(g => g.GroupStatus)
            .Where(g => g.LanguageLevelId == languageLevelId)
            .ToListAsync();

    public async Task<bool> HasHallConflictAsync(Guid hallId, DateTime start, DateTime end, Guid? excludeSessionId = null)
        => await _context.Sessions
            .Where(s => (s.HallId == hallId || (s.HallId == null && s.Group.HallId == hallId))
                     && s.Status != "CANCELLED"
                     && s.ScheduledDate < end && s.ScheduledDate > start
                     && (excludeSessionId == null || s.Id != excludeSessionId))
            .AnyAsync();

    public async Task<bool> HasZoomConflictAsync(Guid zoomAccountId, DateTime start, DateTime end, Guid? excludeSessionId = null)
        => await _context.Sessions
            .Where(s => (s.ZoomAccountId == zoomAccountId || (s.ZoomAccountId == null && s.Group.ZoomAccountId == zoomAccountId))
                     && s.Status != "CANCELLED"
                     && s.ScheduledDate < end && s.ScheduledDate > start
                     && (excludeSessionId == null || s.Id != excludeSessionId))
            .AnyAsync();
}