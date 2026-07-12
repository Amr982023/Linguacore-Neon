using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories
{
    public interface IStoreItemRepository : IGenericRepository<StoreItem>
    {
        Task<IEnumerable<StoreItem>> GetByBranchAsync(Guid branchId, Guid? categoryId, bool lowStockOnly);
        Task<StoreItem?> GetByIdWithCategoryAsync(Guid id);
        Task<StoreItem?> GetForBranchAsync(Guid id, Guid branchId);
    }
}
