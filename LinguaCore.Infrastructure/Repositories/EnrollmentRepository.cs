using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;
using System.Linq.Expressions;

namespace LinguaCore.Infrastructure.Repositories;

public class EnrollmentRepository : GenericRepository<Enrollment>, IEnrollmentRepository
{
    public EnrollmentRepository(AppDbContext context) : base(context) { }


    public async Task<IEnumerable<Enrollment>> FindAsync(Expression<Func<Enrollment, bool>> predicate)
        => await _dbSet.Where(predicate).Include(E => E.Student).ThenInclude(S => S.Person).ToListAsync();

    public async Task<IEnumerable<Enrollment>> GetByGroupIdsAsync(IEnumerable<Guid> groupIds, IEnumerable<string> statuses)
    => await _dbSet
        .Include(e => e.Student).ThenInclude(s => s.Person)
        .Include(e => e.EnrollStatus)
        .Where(e => groupIds.Contains(e.GroupId) && statuses.Contains(e.EnrollStatus.Name))
        .ToListAsync();

    public async Task<IEnumerable<Enrollment>> GetByStudentAsync(Guid studentId)
        => await _dbSet
            .Include(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(e => e.EnrollStatus)
            .Where(e => e.StudentId == studentId)
            .ToListAsync();

    public async Task<IEnumerable<Enrollment>> GetByGroupAsync(Guid groupId)
        => await _dbSet
            .Include(e => e.Student).ThenInclude(s => s.Person)
            .Include(e => e.EnrollStatus)
            .Where(e => e.GroupId == groupId)
            .ToListAsync();

    public async Task<Enrollment?> GetWithDetailsAsync(Guid id)
        => await _dbSet
            .Include(e => e.Student).ThenInclude(s => s.Person)
            .Include(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(e => e.EnrollStatus)
            .Include(e => e.Payments)
            .FirstOrDefaultAsync(e => e.Id == id);

    public async Task<IEnumerable<Enrollment>> GetOverdueAsync()
        => await _dbSet
            .Include(e => e.Student).ThenInclude(s => s.Person)
            .Include(e => e.Group)
            .Include(e => e.EnrollStatus)
            .Where(e => e.EnrollStatus.Name == "ACTIVE"
                     && e.Payments.Any(p => p.DueDate < DateTime.UtcNow
                                         && p.AmountPaid < p.AmountDue))
            .ToListAsync();
}
