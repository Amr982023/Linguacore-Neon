using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories
{
    public interface IRefundRepository : IGenericRepository<RefundRecord>
    {
        Task<IEnumerable<RefundRecord>> GetByBranchAsync(Guid branchId);
    }
}
