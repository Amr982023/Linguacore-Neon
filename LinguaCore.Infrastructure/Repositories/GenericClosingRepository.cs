using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class GenericClosingRepository : GenericRepository<GenericClosing>, IGenericClosingRepository
{
    public GenericClosingRepository(AppDbContext context) : base(context) { }
    public async Task<IEnumerable<GenericClosing>> GetByInstructorAsync(Guid instructorId)
    => await _dbSet
        .Include(c => c.Branch)
        .Include(c => c.InstructorRows)
            .ThenInclude(ir => ir.Instructor).ThenInclude(i => i.Person)
        .Include(c => c.InstructorRows)
            .ThenInclude(ir => ir.Details)
                .ThenInclude(d => d.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Language)
        .Include(c => c.InstructorRows)
            .ThenInclude(ir => ir.Details)
                .ThenInclude(d => d.Group)
                    .ThenInclude(g => g.LanguageLevel)
                        .ThenInclude(ll => ll.Level)
        .Where(c => c.InstructorRows.Any(ir => ir.InstructorId == instructorId))
        .OrderByDescending(c => c.PeriodStart)
        .ToListAsync();


    public async Task<(IEnumerable<GenericClosing> Items, int TotalCount)> GetByBranchPagedAsync(
    Guid branchId, int page, int pageSize, string? status = null)
    {
        var query = _dbSet
            .Include(c => c.Branch)
            .Include(c => c.CreatedByUser).ThenInclude(u => u.Person)
            .Include(c => c.ConfirmedByUser).ThenInclude(u => u!.Person)
            .Include(c => c.CenterDeductions)
            .Include(c => c.InstructorRows)
                .ThenInclude(ir => ir.Details)
            .Where(c => c.BranchId == branchId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(c => c.Status == status.ToUpper());

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(c => c.PeriodStart)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }


    public async Task<IEnumerable<GenericClosing>> GetByBranchAsync(Guid branchId)
        => await _dbSet
            .Include(c => c.Branch)
            .Include(c => c.CreatedByUser).ThenInclude(u => u.Person)
            .Include(c => c.ConfirmedByUser).ThenInclude(u => u!.Person)
            .Include(c => c.CenterDeductions)
            .Include(c => c.InstructorRows)
                .ThenInclude(ir => ir.Details)          // needed by GetAuditFlagsAsync
            .Where(c => c.BranchId == branchId)
            .OrderByDescending(c => c.PeriodStart)
            .ToListAsync();

   public async Task<GenericClosing?> GetWithDetailsAsync(Guid closingId)
    => await _dbSet
        .Include(c => c.Branch)
        .Include(c => c.CreatedByUser).ThenInclude(u => u.Person)
        .Include(c => c.ConfirmedByUser).ThenInclude(u => u!.Person)
        .Include(c => c.CenterDeductions)

        // Layer 1
        .Include(c => c.IncomeRecords).ThenInclude(r => r.Student).ThenInclude(s => s.Person)
        .Include(c => c.IncomeRecords).ThenInclude(r => r.Group)
        .Include(c => c.IncomeRecords).ThenInclude(r => r.PeriodLabel)

        // Layer 2
        .Include(c => c.InstructorRows).ThenInclude(ir => ir.Instructor).ThenInclude(i => i.Person)
        .Include(c => c.InstructorRows).ThenInclude(ir => ir.Details)
            .ThenInclude(d => d.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
        .Include(c => c.InstructorRows).ThenInclude(ir => ir.Details)
            .ThenInclude(d => d.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
        .Include(c => c.InstructorRows).ThenInclude(ir => ir.Details).ThenInclude(d => d.Payment)

        // Layer 3
        .Include(c => c.PartialPayments).ThenInclude(p => p.Group)
        .Include(c => c.PartialPayments).ThenInclude(p => p.PeriodLabel)

        // Layer 4 — Refunds
        .Include(c => c.RefundSnapshots).ThenInclude(r => r.Student).ThenInclude(s => s.Person)
        .Include(c => c.RefundSnapshots).ThenInclude(r => r.Group)

        .FirstOrDefaultAsync(c => c.Id == closingId);

    public async Task<bool> HasOverlapAsync(
        Guid branchId, DateTime start, DateTime end, Guid? excludeClosingId = null)
        => await _dbSet.AnyAsync(c =>
            c.BranchId == branchId &&
            (excludeClosingId == null || c.Id != excludeClosingId) &&
            c.PeriodStart <= end &&
            c.PeriodEnd >= start);
}