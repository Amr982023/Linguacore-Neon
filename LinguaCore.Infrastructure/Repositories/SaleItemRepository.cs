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
    public class SaleItemRepository : GenericRepository<SaleItem>, ISaleItemRepository
    {
        public SaleItemRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<(string ItemName, int QuantitySold, decimal Revenue)>> GetTopSellingAsync(
            Guid branchId, DateTime since, int take)
        {
            var result = await _dbSet
                .Where(si => si.Sale.BranchId == branchId && si.Sale.SaleDate >= since)
                .GroupBy(si => si.ItemNameSnapshot)
                .Select(g => new
                {
                    ItemName = g.Key,
                    QuantitySold = g.Sum(x => x.Quantity),
                    Revenue = g.Sum(x => x.LineTotal)
                })
                .OrderByDescending(x => x.Revenue)
                .Take(take)
                .ToListAsync();

            return result.Select(x => (x.ItemName, x.QuantitySold, x.Revenue));
        }

        public async Task<bool> AnyForStoreItemAsync(Guid storeItemId)
            => await _dbSet.AnyAsync(si => si.StoreItemId == storeItemId);
    }
}
