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
    public class GroupPeriodRepository : GenericRepository<GroupPeriod>, IGroupPeriodRepository
    {
        public GroupPeriodRepository(AppDbContext context) : base(context) { }

        public async Task<GroupPeriod?> GetAsync(Guid groupId, Guid periodLabelId)
            => await _dbSet.FirstOrDefaultAsync(gp =>
                gp.GroupId == groupId && gp.PeriodLabelId == periodLabelId);

        public async Task<IEnumerable<GroupPeriod>> GetByGroupAsync(Guid groupId)
            => await _dbSet
                .Include(gp => gp.PeriodLabel)
                .Where(gp => gp.GroupId == groupId)
                .ToListAsync();
    }
}
