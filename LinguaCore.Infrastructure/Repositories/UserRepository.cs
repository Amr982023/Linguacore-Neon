using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class UserRepository : GenericRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email)
        => await _dbSet
            .Include(u => u.Role)
            .Include(u => u.Person)
            .FirstOrDefaultAsync(u => u.Email == email);

    public async Task<(IEnumerable<User> Items, int TotalCount)> GetByBranchPagedAsync(
     Guid branchId,
     int page,
     int pageSize,
     string? search = null,
     Guid? roleId = null,
     bool? isActive = null)
    {
        var query = _dbSet
            .Include(u => u.Person)
            .Include(u => u.Role)
            .Include(u => u.Branch)
            .Where(u => u.BranchId == branchId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(u =>
                EF.Functions.ILike(u.Name, $"%{term}%") ||
                EF.Functions.ILike(u.Email, $"%{term}%"));
        }

        if (roleId.HasValue)
            query = query.Where(u => u.RoleId == roleId.Value);

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        var total = await query.CountAsync();

        var items = await query
            .OrderBy(u => u.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }
    public async Task<User?> GetWithRoleAsync(Guid id)
        => await _dbSet
            .Include(u => u.Role)
            .Include(u => u.Person)
            .Include(u => u.Branch)
            .FirstOrDefaultAsync(u => u.Id == id);

    public async Task<IEnumerable<User>> GetByBranchAsync(Guid branchId)
        => await _dbSet
            .Include(u => u.Role)
            .Include(u => u.Person)
            .Where(u => u.BranchId == branchId)
            .ToListAsync();

    public async Task<List<User>> GetAllWithRoleAndBranchAsync()
        => await _context.Users
               .Include(u => u.Role)
               .Include(u => u.Branch)
               .OrderBy(u => u.Name)
               .ToListAsync();

    public async Task<List<User>> GetAllWithDetailsAsync()
     => await _context.Users
            .Include(u => u.Role)
            .Include(u => u.Branch)
            .Include(u => u.Person)
            .OrderBy(u => u.Name)
            .ToListAsync();

    public async Task<User?> GetWithDetailsAsync(Guid id)
        => await _context.Users
               .Include(u => u.Role)
               .Include(u => u.Branch)
               .Include(u => u.Person)
               .FirstOrDefaultAsync(u => u.Id == id);
}
