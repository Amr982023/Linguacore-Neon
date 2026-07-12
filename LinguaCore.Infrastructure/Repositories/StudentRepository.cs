using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class StudentRepository : GenericRepository<Student>, IStudentRepository
{
    // Status names that constitute an "active" enrollment for language/level derivation.
    private static readonly string[] ActiveStatuses =
        { "PENDING", "ACTIVE", "SUSPENDED", "PARTIAL" };

    public StudentRepository(AppDbContext context) : base(context) { }

    public async Task<Student?> GetByQrCodeAsync(string qrCode)
        => await _dbSet
            .Include(s => s.Person)
            .Include(s => s.Branch)
            .Include(s => s.Goal)
            .Include(s => s.NestedGoal)
            // Include active enrollments so language/level can be derived
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.EnrollStatus)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Language)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Level)
            .FirstOrDefaultAsync(s => s.QrCode == qrCode);

    
    public async Task<IEnumerable<Student>> GetByBranchAsync(Guid branchId)
        => await _dbSet
            .Include(s => s.Person)
            .Include(s => s.Goal)
            .Include(s => s.NestedGoal)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.EnrollStatus)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Language)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Level)
            .Where(s => s.BranchId == branchId)
            .OrderBy(s => s.Person.FirstName).ThenBy(s => s.Person.LastName)
            .ToListAsync();

  
    public async Task<Student?> GetWithDetailsAsync(Guid id)
        => await _dbSet
            .Include(s => s.Person)
            .Include(s => s.Branch)
            .Include(s => s.Goal)
            .Include(s => s.NestedGoal)
            // All enrollments — needed for history view
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.EnrollStatus)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Language)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Level)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.Group)
                    .ThenInclude(g => g.Instructor)
                        .ThenInclude(i => i.Person)
            .Include(s => s.Certificates)
                .ThenInclude(c => c.LanguageLevel)
                    .ThenInclude(ll => ll.Language)
            .Include(s => s.Certificates)
                .ThenInclude(c => c.LanguageLevel)
                    .ThenInclude(ll => ll.Level)
            .FirstOrDefaultAsync(s => s.Id == id);

    
    public async Task<IEnumerable<Student>> GetByLanguageAsync(Guid branchId, Guid languageId)
        => await _dbSet
            .Include(s => s.Person)
            .Include(s => s.Goal)
            .Include(s => s.NestedGoal)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.EnrollStatus)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Language)
            .Include(s => s.Enrollments)
                .ThenInclude(e => e.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Level)
            .Where(s =>
                s.BranchId == branchId &&
                s.Enrollments.Any(e =>
                    ActiveStatuses.Contains(e.EnrollStatus.Name.ToUpper()) &&
                    e.Group.LanguageLevel.LanguageId == languageId))
            .OrderBy(s => s.Person.FirstName).ThenBy(s => s.Person.LastName)
            .ToListAsync();
}
