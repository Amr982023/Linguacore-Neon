using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

//public interface IWaitingListRepository : IGenericRepository<WaitingList>
//{
//    Task<IEnumerable<WaitingList>> GetByBranchAsync(Guid branchId);
//    Task<IEnumerable<WaitingList>> GetByLanguageAndLevelAsync(Guid languageId, Guid levelId);
//    Task<IEnumerable<WaitingList>> GetExceedingWaitDaysAsync(int thresholdDays);
//}

public interface IWaitingListRepository : IGenericRepository<WaitingList>
{
    Task<IEnumerable<WaitingList>> GetByBranchAsync(Guid branchId);

    Task<(IEnumerable<WaitingList> Items, int TotalCount)> GetByBranchAsync(
        Guid branchId,
        int page,
        int pageSize,
        string? status = null,
        Guid? languageId = null,
        bool? hasReservationFee = null);

    Task<IEnumerable<WaitingList>> GetByLanguageAndLevelAsync(Guid languageId, Guid levelId);

    Task<(IEnumerable<WaitingList> Items, int TotalCount)> GetExceedingWaitDaysAsync(
        int thresholdDays,
        int page,
        int pageSize,
        string? status = null,
        Guid? languageId = null,
        bool? hasReservationFee = null);
}
