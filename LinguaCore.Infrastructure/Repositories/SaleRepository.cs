using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LinguaCore.Infrastructure.Repositories;

public class SaleRepository : GenericRepository<Sale>, ISaleRepository
{
    public SaleRepository(AppDbContext context) : base(context) { }

    public async Task<(IEnumerable<Sale> Items, int TotalCount)> GetByBranchPagedAsync(
        Guid branchId, DateTime? from, DateTime? to, int page, int pageSize)
    {
        var query = _dbSet.Where(s => s.BranchId == branchId);

        if (from.HasValue) query = query.Where(s => s.SaleDate >= from.Value);
        if (to.HasValue) query = query.Where(s => s.SaleDate <= to.Value);

        // Count against the filtered query BEFORE Include/Skip/Take — cheaper,
        // and avoids a join blowing up the row count via SaleItems.
        var totalCount = await query.CountAsync();

        var items = await query
            .Include(s => s.SaleItems)
            .OrderByDescending(s => s.SaleDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<IEnumerable<Sale>> GetByBranchSinceAsync(Guid branchId, DateTime since)
    {
        var sinceUtc = since.Kind switch
        {
            DateTimeKind.Utc => since,
            DateTimeKind.Local => since.ToUniversalTime(),
            _ => DateTime.SpecifyKind(since, DateTimeKind.Utc)
        };

        return await _dbSet
            .Where(s => s.BranchId == branchId && s.SaleDate >= sinceUtc)
            .ToListAsync();
    }
}

