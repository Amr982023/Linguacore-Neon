using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class PaymentRepository : GenericRepository<Payment>, IPaymentRepository
{
    public PaymentRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Payment>> GetByEnrollmentAsync(Guid enrollmentId)
        => await _dbSet
            .Include(p => p.PaymentMethod)
            .Include(p => p.RecordedByUser).ThenInclude(u => u.Person)
            .Where(p => p.EnrollmentId == enrollmentId)
            .OrderBy(p => p.PaymentDate)
            .ToListAsync();

    public async Task<IEnumerable<Payment>> GetByGroupAsync(Guid groupId)
        => await _dbSet
            .Include(p => p.Enrollment).ThenInclude(e => e.Student).ThenInclude(s => s.Person)
            .Include(p => p.PaymentMethod)
            .Where(p => p.Enrollment.GroupId == groupId)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();

    public async Task<IEnumerable<Payment>> GetByPeriodAsync(DateTime from, DateTime to)
    => await _dbSet
        .Include(p => p.Enrollment).ThenInclude(e => e.Student).ThenInclude(s => s.Person)
        .Include(p => p.Enrollment).ThenInclude(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
        .Include(p => p.Enrollment).ThenInclude(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
        .Include(p => p.PaymentMethod)
        .Include(p => p.PeriodLabel)
        .Where(p => p.PaymentDate >= from && p.PaymentDate <= to)
        .ToListAsync();

    public async Task<decimal> GetTotalCollectedAsync(Guid branchId, DateTime from, DateTime to)
        => await _dbSet
            .Where(p => p.Enrollment.Group.BranchId == branchId
                     && p.PaymentDate >= from && p.PaymentDate <= to)
            .SumAsync(p => p.AmountPaid);
}
