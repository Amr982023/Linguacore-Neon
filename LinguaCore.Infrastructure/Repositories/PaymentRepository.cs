using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Common;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Infrastructure.Repositories;

public class PaymentRepository : GenericRepository<Payment>, IPaymentRepository
{
    public PaymentRepository(AppDbContext context) : base(context) { }

    // ?? Existing methods (unchanged) ????????????????????????????????????????

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
            .Where(p => p.PaymentDate >= from.ToUniversalTime() && p.PaymentDate <= to.ToUniversalTime())
            .ToListAsync();

    public async Task<decimal> GetTotalCollectedAsync(Guid branchId, DateTime from, DateTime to)
        => await _dbSet
            .Where(p => p.Enrollment.Group.BranchId == branchId
                     && p.PaymentDate >= from.ToUniversalTime() && p.PaymentDate <= to.ToUniversalTime())
            .SumAsync(p => p.AmountPaid);

    // ?? New: offset-paginated, fully server-side filtered query ????????????
    //
    // Every filter is a native predicate translated straight into SQL —
    // nothing is pulled into memory before filtering. TotalCount is computed
    // via CountAsync() on the filtered (but unpaged) query, same as the
    // standard Page/PageSize/TotalCount convention.
    public async Task<PagedResults<Payment>> GetByPeriodPagedAsync(
        Guid branchId,
        DateTime from,
        DateTime to,
        int page,
        int pageSize,
        string? search,
        Guid? languageId,
        Guid? levelId,
        Guid? paymentMethodId,
        Guid? groupId,
        string? status)
    {
        var query = _dbSet.AsNoTracking().Where(p =>
            p.Enrollment.Group.BranchId == branchId &&
            p.PaymentDate >= from.ToUniversalTime() &&
            p.PaymentDate <= to.ToUniversalTime());

        query = ApplyFilters(query, search, languageId, levelId, paymentMethodId, groupId, status);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.PaymentDate)
            .ThenByDescending(p => p.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(p => p.Enrollment).ThenInclude(e => e.Student).ThenInclude(s => s.Person)
            .Include(p => p.Enrollment).ThenInclude(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(p => p.Enrollment).ThenInclude(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(p => p.PaymentMethod)
            .Include(p => p.PeriodLabel)
            .ToListAsync();

        return new PagedResults<Payment>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
        };
    }

    private static IQueryable<Payment> ApplyFilters(
        IQueryable<Payment> query,
        string? search,
        Guid? languageId,
        Guid? levelId,
        Guid? paymentMethodId,
        Guid? groupId,
        string? status)
    {
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(p =>
                EF.Functions.ILike(p.Enrollment.Student.Person.FirstName, $"%{term}%") ||
                EF.Functions.ILike(p.Enrollment.Student.Person.LastName, $"%{term}%") ||
                EF.Functions.ILike(p.Enrollment.Group.Name, $"%{term}%"));
        }
        if (languageId.HasValue)
            query = query.Where(p => p.Enrollment.Group.LanguageLevel.LanguageId == languageId.Value);
        if (levelId.HasValue)
            query = query.Where(p => p.Enrollment.Group.LanguageLevel.LevelId == levelId.Value);
        if (paymentMethodId.HasValue)
            query = query.Where(p => p.PaymentMethodId == paymentMethodId.Value);
        if (groupId.HasValue)
            query = query.Where(p => p.Enrollment.GroupId == groupId.Value);
        if (string.Equals(status, "paid", StringComparison.OrdinalIgnoreCase))
            query = query.Where(p => p.AmountPaid >= p.AmountDue);
        else if (string.Equals(status, "unpaid", StringComparison.OrdinalIgnoreCase))
            query = query.Where(p => p.AmountPaid < p.AmountDue);

        return query;
    }
}