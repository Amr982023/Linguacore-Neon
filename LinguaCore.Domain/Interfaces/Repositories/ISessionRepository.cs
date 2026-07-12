using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface ISessionRepository : IGenericRepository<Session>
{
    Task<IEnumerable<Session>> GetByGroupAsync(Guid groupId);
    Task<IEnumerable<Session>> GetByInstructorAsync(Guid instructorId);
    Task<IEnumerable<Session>> GetByHallAsync(Guid hallId, DateTime? from = null, DateTime? to = null);
    Task<IEnumerable<Session>> GetByZoomAccountAsync(Guid zoomAccountId, DateTime? from = null, DateTime? to = null);
    Task<Session?> GetCurrentOpenSessionForGroupAsync(Guid groupId);
    Task<int> CountSessionsByPeriodAndInstructorAsync(Guid groupId, Guid instructorId, string periodLabel);
    Task<(int Scheduled, int Completed, int Cancelled)> GetStatsByBranchAsync(Guid branchId);
    Task<(IEnumerable<Session> Items, int TotalCount)> GetByBranchPagedAsync(
        Guid branchId,
        int page,
        int pageSize,
        string? status = null,
        Guid? groupId = null,
        Guid? periodLabelId = null,
        string? search = null);
}
