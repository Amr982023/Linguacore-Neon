using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories
{
    public interface ISaleItemRepository : IGenericRepository<SaleItem>
    {
        Task<IEnumerable<(string ItemName, int QuantitySold, decimal Revenue)>> GetTopSellingAsync(
            Guid branchId, DateTime since, int take);
        Task<bool> AnyForStoreItemAsync(Guid storeItemId);
    }
}
