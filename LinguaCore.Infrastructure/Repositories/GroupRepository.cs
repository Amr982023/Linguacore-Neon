using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class GroupRepository : GenericRepository<Group>, IGroupRepository
{
    public GroupRepository(AppDbContext context) : base(context) { }


    public async Task<bool> InstructorTeachesLanguageAsync(Guid instructorId, Guid languageId)
    => await _context.InstructorLanguages  // or whatever your join table DbSet is called
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
            .Include(g => g.GroupType)         // ? this was missing
            .Include(g => g.DeliveryMode)      // ? this was missing
            .Include(g => g.GroupStatus)
            .Include(g => g.Branch)
            .Include(g => g.Enrollments)
            .ToListAsync();
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
