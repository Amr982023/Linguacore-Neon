using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories
{
    public interface IGroupPeriodRepository : IGenericRepository<GroupPeriod>
    {
        Task<GroupPeriod?> GetAsync(Guid groupId, Guid periodLabelId);
        Task<IEnumerable<GroupPeriod>> GetByGroupAsync(Guid groupId);
    }
}
