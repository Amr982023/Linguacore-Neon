using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories
{
    public interface ISaleRepository : IGenericRepository<Sale>
    {
        Task<(IEnumerable<Sale> Items, int TotalCount)> GetByBranchPagedAsync(
        Guid branchId, DateTime? from, DateTime? to, int page, int pageSize);
        Task<IEnumerable<Sale>> GetByBranchSinceAsync(Guid branchId, DateTime since);
    }
}
