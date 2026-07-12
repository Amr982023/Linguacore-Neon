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
    public class StoreItemRepository : GenericRepository<StoreItem>, IStoreItemRepository
    {
        public StoreItemRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<StoreItem>> GetByBranchAsync(Guid branchId, Guid? categoryId, bool lowStockOnly)
        {
            var query = _dbSet
                .Include(x => x.Category)
                .Where(x => x.BranchId == branchId && x.IsActive);

            if (categoryId.HasValue)
                query = query.Where(x => x.CategoryId == categoryId.Value);

            if (lowStockOnly)
                query = query.Where(x => x.Quantity <= x.LowStockThreshold);

            return await query.OrderBy(x => x.Name).ToListAsync();
        }

        public async Task<StoreItem?> GetByIdWithCategoryAsync(Guid id)
            => await _dbSet
                .Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == id);

        public async Task<StoreItem?> GetForBranchAsync(Guid id, Guid branchId)
            => await _dbSet
                .FirstOrDefaultAsync(x => x.Id == id && x.BranchId == branchId);
    }
}
