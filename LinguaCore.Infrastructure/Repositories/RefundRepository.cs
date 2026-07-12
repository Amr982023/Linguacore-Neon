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
    // LinguaCore.Infrastructure.Repositories/RefundRepository.cs
    public class RefundRepository : GenericRepository<RefundRecord>, IRefundRepository
    {
        public RefundRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<RefundRecord>> GetByBranchAsync(Guid branchId)
            => await _dbSet
                .Include(r => r.Student).ThenInclude(s => s.Person)
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Enrollment)
                        .ThenInclude(e => e.Group)
                            .ThenInclude(g => g.LanguageLevel)
                                .ThenInclude(ll => ll.Language)
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Enrollment)
                        .ThenInclude(e => e.Group)
                            .ThenInclude(g => g.LanguageLevel)
                                .ThenInclude(ll => ll.Level)
                .Include(r => r.PaymentMethod)
                .Where(r => r.Payment.Enrollment.Group.BranchId == branchId)
                .OrderByDescending(r => r.RefundDate)
                .ToListAsync();
    }
}
