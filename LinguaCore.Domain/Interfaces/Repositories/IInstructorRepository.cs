using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IInstructorRepository : IGenericRepository<Instructor>
{
    Task<(IEnumerable<Instructor> Items, int TotalCount)> GetByBranchAsync(
    Guid branchId, int page, int pageSize,
    string? search = null, Guid? languageId = null, bool? isActive = null);


    Task<Instructor?> GetWithDetailsAsync(Guid id);
    Task<IEnumerable<Instructor>> GetByLanguageAsync(Guid languageId);
}
