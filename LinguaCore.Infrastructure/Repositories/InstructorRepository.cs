using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class InstructorRepository : GenericRepository<Instructor>, IInstructorRepository
{
    public InstructorRepository(AppDbContext context) : base(context) { }

    public async Task<(IEnumerable<Instructor> Items, int TotalCount)> GetByBranchAsync(
        Guid branchId, int page, int pageSize,
        string? search = null, Guid? languageId = null, bool? isActive = null)
    {
        var query = _dbSet
            .Include(i => i.Person)
            .Include(i => i.InstructorLanguages).ThenInclude(il => il.Language)
            .Where(i => i.BranchId == branchId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(i =>
                EF.Functions.ILike(i.Person.FirstName, $"%{term}%") ||
                EF.Functions.ILike(i.Person.LastName, $"%{term}%"));
        }
        if (languageId.HasValue)
            query = query.Where(i => i.InstructorLanguages.Any(il => il.LanguageId == languageId.Value));
        if (isActive.HasValue)
            query = query.Where(i => i.IsActive == isActive.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(i => i.Person.FirstName).ThenBy(i => i.Person.LastName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsSplitQuery()   
            .ToListAsync();

        return (items, total);
    }

    public async Task<Instructor?> GetWithDetailsAsync(Guid id)
        => await _dbSet
            .Include(i => i.Person)
            .Include(i => i.Branch)
            .Include(i => i.InstructorLanguages).ThenInclude(il => il.Language)
            .Include(i => i.Groups).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(i => i.Groups).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .FirstOrDefaultAsync(i => i.Id == id);

    public async Task<IEnumerable<Instructor>> GetByLanguageAsync(Guid languageId)
        => await _dbSet
            .Include(i => i.Person)
            .Include(i => i.InstructorLanguages)
            .Where(i => i.InstructorLanguages.Any(il => il.LanguageId == languageId))
            .ToListAsync();
}
