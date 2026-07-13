using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IGenericClosingRepository : IGenericRepository<GenericClosing>
{
    Task<IEnumerable<GenericClosing>> GetByBranchAsync(Guid branchId);
    Task<(IEnumerable<GenericClosing> Items, int TotalCount)> GetByBranchPagedAsync(
        Guid branchId, int page, int pageSize, string? status = null);
    Task<GenericClosing?> GetWithDetailsAsync(Guid closingId);
    Task<bool> HasOverlapAsync(Guid branchId, DateTime start, DateTime end, Guid? excludeClosingId = null);
    Task<IEnumerable<GenericClosing>> GetByInstructorAsync(Guid instructorId);
}