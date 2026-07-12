using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class InstructorRepository : GenericRepository<Instructor>, IInstructorRepository
{
    public InstructorRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Instructor>> GetByBranchAsync(Guid branchId)
      => await _dbSet
          .Include(i => i.Person)
          .Include(i => i.InstructorLanguages).ThenInclude(il => il.Language)
          .Include(i => i.Groups).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language) // ? add
          .Where(i => i.BranchId == branchId)
          .ToListAsync();

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
