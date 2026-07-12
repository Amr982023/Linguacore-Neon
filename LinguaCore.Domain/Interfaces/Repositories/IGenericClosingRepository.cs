using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IGenericClosingRepository : IGenericRepository<GenericClosing>
{
    /// <summary>Returns all closings for a branch, ordered descending by PeriodStart.</summary>
    Task<IEnumerable<GenericClosing>> GetByBranchAsync(Guid branchId);

    /// <summary>Returns a closing with full instructor + detail drill-down loaded.</summary>
    Task<GenericClosing?> GetWithDetailsAsync(Guid closingId);

    /// <summary>
    /// Checks whether any existing closing for the branch overlaps the proposed range.
    /// Overlap condition: new.start &lt;= existing.end AND new.end &gt;= existing.start
    /// </summary>
    Task<bool> HasOverlapAsync(Guid branchId, DateTime start, DateTime end, Guid? excludeClosingId = null);
    Task<IEnumerable<GenericClosing>> GetByInstructorAsync(Guid instructorId);
}
