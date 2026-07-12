using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class SessionRepository : GenericRepository<Session>, ISessionRepository
{
    public SessionRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Session>> GetByGroupAsync(Guid groupId)
        => await _dbSet
            .Include(s => s.Instructor).ThenInclude(i => i.Person)
            .Include(s => s.Hall)
            .Include(s => s.ZoomAccount)
            .Include(s => s.Group).ThenInclude(g=>g.Hall).Include(g => g.ZoomAccount)

            .Where(s => s.GroupId == groupId)
            .OrderByDescending(s => s.ScheduledDate)
            .ToListAsync();

    public async Task<IEnumerable<Session>> GetByInstructorAsync(Guid instructorId)
        => await _dbSet
            .Include(s => s.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(s => s.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Where(s => s.InstructorId == instructorId)
            .OrderByDescending(s => s.ScheduledDate)
            .ToListAsync();

    public async Task<IEnumerable<Session>> GetByHallAsync(Guid hallId, DateTime? from = null, DateTime? to = null)
        => await _dbSet
            .Include(s => s.Group)
            .Where(s => (s.HallId == hallId || (s.HallId == null && s.Group.HallId == hallId))
                     && s.Status != "CANCELLED"
                     && (from == null || s.ScheduledDate >= from)
                     && (to == null || s.ScheduledDate <= to))
            .OrderBy(s => s.ScheduledDate)
            .ToListAsync();

    public async Task<IEnumerable<Session>> GetByZoomAccountAsync(Guid zoomAccountId, DateTime? from = null, DateTime? to = null)
        => await _dbSet
            .Include(s => s.Group)
            .Where(s => (s.ZoomAccountId == zoomAccountId || (s.ZoomAccountId == null && s.Group.ZoomAccountId == zoomAccountId))
                     && s.Status != "CANCELLED"
                     && (from == null || s.ScheduledDate >= from)
                     && (to == null || s.ScheduledDate <= to))
            .OrderBy(s => s.ScheduledDate)
            .ToListAsync();

    public async Task<Session?> GetCurrentOpenSessionForGroupAsync(Guid groupId)
        => await _dbSet
            .Where(s => s.GroupId == groupId && s.Status == "SCHEDULED"
                     && s.ScheduledDate.Date == DateTime.UtcNow.Date)
            .FirstOrDefaultAsync();

    public async Task<int> CountSessionsByPeriodAndInstructorAsync(Guid groupId, Guid instructorId, string periodLabel)
        => await _dbSet
            .CountAsync(s => s.GroupId == groupId
                          && s.InstructorId == instructorId
                          && s.PeriodLabel.Name == periodLabel
                          && s.Status == "COMPLETED");

    public async Task<(IEnumerable<Session> Items, int TotalCount)> GetByBranchPagedAsync(
    Guid branchId,
    int page,
    int pageSize,
    string? status = null,
    Guid? groupId = null,
    Guid? periodLabelId = null,
    string? search = null)
    {
        var query = _dbSet
            .Include(s => s.Instructor).ThenInclude(i => i.Person)
            .Include(s => s.Hall)
            .Include(s => s.ZoomAccount)
            .Include(s => s.Group)
            .Include(s => s.PeriodLabel)
            .Where(s => s.Group.BranchId == branchId);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status);

        if (groupId.HasValue)
            query = query.Where(s => s.GroupId == groupId.Value);

        if (periodLabelId.HasValue)
            query = query.Where(s => s.PeriodLabelId == periodLabelId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(x =>
                x.Group.Name.ToLower().Contains(s) ||
                (x.Topic != null && x.Topic.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(s => s.ScheduledDate.Date)
            .ThenBy(s => s.ScheduledDate.TimeOfDay)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }


    public async Task<(int Scheduled, int Completed, int Cancelled)> GetStatsByBranchAsync(Guid branchId)
    {
        var counts = await _dbSet
            .Where(s => s.Group.BranchId == branchId)
            .GroupBy(s => s.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        return (
            counts.FirstOrDefault(c => c.Status == "SCHEDULED")?.Count ?? 0,
            counts.FirstOrDefault(c => c.Status == "COMPLETED")?.Count ?? 0,
            counts.FirstOrDefault(c => c.Status == "CANCELLED")?.Count ?? 0
        );
    }
}
