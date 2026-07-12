using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class WaitingListRepository : GenericRepository<WaitingList>, IWaitingListRepository
{
    public WaitingListRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<WaitingList>> GetByBranchAsync(Guid branchId)
    => await _dbSet
        .Include(w => w.Language)
        .Include(w => w.Level)
        .Include(w => w.AssignedToUser).ThenInclude(u => u!.Person)
        .Where(w => w.BranchId == branchId)
        .OrderBy(w => w.RegisteredAt)
        .ToListAsync();

    public async Task<(IEnumerable<WaitingList> Items, int TotalCount)> GetByBranchAsync(
        Guid branchId,
        int page,
        int pageSize,
        string? status = null,
        Guid? languageId = null,
        bool? hasReservationFee = null)
    {
        var query = _dbSet
            .Include(w => w.Language)
            .Include(w => w.Level)
            .Include(w => w.AssignedToUser).ThenInclude(u => u!.Person)
            .Where(w => w.BranchId == branchId);

        query = ApplyFilters(query, status, languageId, hasReservationFee);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(w => w.RegisteredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<IEnumerable<WaitingList>> GetByLanguageAndLevelAsync(Guid languageId, Guid levelId)
        => await _dbSet
            .Include(w => w.Language)
            .Include(w => w.Level)
            .Where(w => w.LanguageId == languageId && w.LevelId == levelId && w.Status == "WAITING")
            .ToListAsync();

    public async Task<(IEnumerable<WaitingList> Items, int TotalCount)> GetExceedingWaitDaysAsync(
     int thresholdDays,
     int page,
     int pageSize,
     string? status = null,
     Guid? languageId = null,
     bool? hasReservationFee = null)
    {
        var thresholdDate = DateTime.UtcNow.AddDays(-thresholdDays);

        var query = _dbSet
            .Include(w => w.Language)
            .Include(w => w.Level)
            .Include(w => w.AssignedToUser).ThenInclude(u => u!.Person)
            .Where(w => w.RegisteredAt <= thresholdDate);

        query = ApplyFilters(query, status, languageId, hasReservationFee);

        var total = await query.CountAsync();

        var items = await query
            .OrderBy(w => w.RegisteredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    private static IQueryable<WaitingList> ApplyFilters(
        IQueryable<WaitingList> query,
        string? status,
        Guid? languageId,
        bool? hasReservationFee)
    {
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(w => w.Status == status.ToUpper());

        if (languageId.HasValue)
            query = query.Where(w => w.LanguageId == languageId.Value);

        if (hasReservationFee.HasValue)
            query = hasReservationFee.Value
                ? query.Where(w => w.ReservationFee != null && w.ReservationFee > 0)
                : query.Where(w => w.ReservationFee == null || w.ReservationFee == 0);

        return query;
    }
}
