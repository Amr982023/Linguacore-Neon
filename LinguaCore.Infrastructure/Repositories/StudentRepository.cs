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


    /// <summary>
    /// Paged + filtered branch listing. Filters on language/level operate against
    /// the student's *active* enrollments (Pending/Active/Suspended/Partial),
    /// same semantics as DeriveActiveLanguagesAndLevels in StudentService.
    /// </summary>
    public async Task<(IEnumerable<Student> Items, int TotalCount)> GetByBranchPagedAsync(
        Guid branchId,
        int page,
        int pageSize,
        string? search = null,
        string? attendanceMode = null,
        bool? isActive = null,
        Guid? languageId = null,
        Guid? levelId = null,
        Guid? goalId = null,
        Guid? nestedGoalId = null)
    {
        var query = _dbSet
            .Include(s => s.Person)
            .Include(s => s.Goal)
            .Include(s => s.NestedGoal)
            .Include(s => s.Enrollments).ThenInclude(e => e.EnrollStatus)
            .Include(s => s.Enrollments).ThenInclude(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(s => s.Enrollments).ThenInclude(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Where(s => s.BranchId == branchId);

        query = ApplyFilters(query, search, attendanceMode, isActive, languageId, levelId, goalId, nestedGoalId);

        var total = await query.CountAsync();

        var items = await query
            .OrderBy(s => s.Person.FirstName).ThenBy(s => s.Person.LastName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    private static IQueryable<Student> ApplyFilters(
        IQueryable<Student> query,
        string? search,
        string? attendanceMode,
        bool? isActive,
        Guid? languageId,
        Guid? levelId,
        Guid? goalId,
        Guid? nestedGoalId)
    {
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(s =>
                EF.Functions.ILike(s.Person.FirstName + " " + s.Person.LastName, $"%{term}%") ||
                (s.Person.Phone != null && s.Person.Phone.Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(attendanceMode))
            query = query.Where(s => s.AttendanceMode == attendanceMode.ToUpper());

        if (isActive.HasValue)
            query = query.Where(s => s.IsActive == isActive.Value);

        if (goalId.HasValue)
            query = query.Where(s => s.GoalId == goalId.Value);

        if (nestedGoalId.HasValue)
            query = query.Where(s => s.NestedGoalId == nestedGoalId.Value);

        if (languageId.HasValue)
            query = query.Where(s => s.Enrollments.Any(e =>
                e.EnrollStatus != null &&
                ActiveStatuses.Contains(e.EnrollStatus.Name.ToUpper()) &&
                e.Group.LanguageLevel.LanguageId == languageId.Value));

        if (levelId.HasValue)
            query = query.Where(s => s.Enrollments.Any(e =>
                e.EnrollStatus != null &&
                ActiveStatuses.Contains(e.EnrollStatus.Name.ToUpper()) &&
                e.Group.LanguageLevel.LevelId == levelId.Value));

        return query;
    }


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
