using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class AttendanceRepository : GenericRepository<AttendanceRecord>, IAttendanceRepository
{
    public AttendanceRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<AttendanceRecord>> GetBySessionAsync(Guid sessionId)
        => await _dbSet
            .Include(a => a.Student).ThenInclude(s => s.Person)
            .Where(a => a.SessionId == sessionId)
            .ToListAsync();

    public async Task<IEnumerable<AttendanceRecord>> GetByStudentAsync(Guid studentId)
        => await _dbSet
            .Include(a => a.Session).ThenInclude(s => s.Group)
            .Where(a => a.StudentId == studentId)
            .OrderByDescending(a => a.RecordedAt)
            .ToListAsync();

    public async Task<AttendanceRecord?> GetBySessionAndStudentAsync(Guid sessionId, Guid studentId)
        => await _dbSet
            .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.StudentId == studentId && !a.Reverted);

    public async Task<int> GetAttendanceCountAsync(Guid studentId, Guid groupId)
        => await _dbSet
            .Include(a => a.Session)
            .CountAsync(a => a.StudentId == studentId
                          && a.Session.GroupId == groupId
                          && a.Status == "PRESENT"
                          && !a.Reverted);
}
