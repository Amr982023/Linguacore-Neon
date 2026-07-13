using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class CommissionLedgerRepository : GenericRepository<CommissionLedger>, ICommissionLedgerRepository
{
    public CommissionLedgerRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<CommissionLedger>> GetByInstructorAsync(Guid instructorId, DateTime? from = null, DateTime? to = null)
        => await _dbSet
            .Include(c => c.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(c => c.Payment)
            .Where(c => c.InstructorId == instructorId
                     && (from == null || c.CreatedAt >= from)
                     && (to == null || c.CreatedAt <= to))
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

    public async Task<IEnumerable<CommissionLedger>> GetByGroupAsync(Guid groupId)
        => await _dbSet
            .Include(c => c.Instructor).ThenInclude(i => i.Person)
            .Include(c => c.Payment)
            .Where(c => c.GroupId == groupId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

    public async Task<decimal> GetTotalCommissionAsync(Guid instructorId, DateTime from, DateTime to)
        => await _dbSet
            .Where(c => c.InstructorId == instructorId
                     && c.CreatedAt >= from && c.CreatedAt <= to)
            .SumAsync(c => c.CommissionAmount - (c.IsAdjustment ? c.CommissionAmount * 2 : 0));

    public async Task<IEnumerable<CommissionLedger>> GetBySessionAsync(Guid sessionId)
        => await _dbSet
            .Include(c => c.Instructor).ThenInclude(i => i.Person)
            .Where(c => c.SessionId == sessionId)
            .ToListAsync();

    public async Task<(IEnumerable<CommissionLedger> Items, int TotalCount)> GetByInstructorPagedAsync(
        Guid instructorId, DateTime? from, DateTime? to, int page, int pageSize)
    {
        var query = _dbSet.Where(c => c.InstructorId == instructorId
                                    && (from == null || c.CreatedAt >= from)
                                    && (to == null || c.CreatedAt <= to));

        // Count against the filtered query BEFORE Include/Skip/Take — cheaper,
        // and avoids the Group/Payment joins inflating the row count. Same
        // reasoning as SaleRepository.GetByBranchPagedAsync.
        var totalCount = await query.CountAsync();

        var items = await query
            .Include(c => c.Instructor).ThenInclude(i => i.Person)
            .Include(c => c.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(c => c.Payment)
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}