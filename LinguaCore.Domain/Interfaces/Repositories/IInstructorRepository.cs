using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IInstructorRepository : IGenericRepository<Instructor>
{
    Task<IEnumerable<Instructor>> GetByBranchAsync(Guid branchId);
    Task<Instructor?> GetWithDetailsAsync(Guid id);
    Task<IEnumerable<Instructor>> GetByLanguageAsync(Guid languageId);
}
