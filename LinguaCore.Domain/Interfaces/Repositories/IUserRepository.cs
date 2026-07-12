using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IUserRepository : IGenericRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetWithRoleAsync(Guid id);
    Task<IEnumerable<User>> GetByBranchAsync(Guid branchId);
    Task<List<User>> GetAllWithRoleAndBranchAsync();
    Task<List<User>> GetAllWithDetailsAsync();
    Task<User?>      GetWithDetailsAsync(Guid id);
}
