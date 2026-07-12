using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LinguaCore.Infrastructure.Repositories
{
    public class ItemCategoryRepository : GenericRepository<ItemCategory>, IItemCategoryRepository
    {
        public ItemCategoryRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<ItemCategory>> GetAllActiveAsync()
            => await _dbSet
                .Include(c => c.StoreItems)
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();

        public async Task<ItemCategory?> GetByNameAsync(string name)
            => await _dbSet.FirstOrDefaultAsync(c => c.Name.ToUpper() == name.ToUpper());
    }
}
