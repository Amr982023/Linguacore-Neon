using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface ICommissionLedgerRepository : IGenericRepository<CommissionLedger>
{
    Task<IEnumerable<CommissionLedger>> GetByInstructorAsync(Guid instructorId, DateTime? from = null, DateTime? to = null);
    Task<IEnumerable<CommissionLedger>> GetByGroupAsync(Guid groupId);
    Task<decimal> GetTotalCommissionAsync(Guid instructorId, DateTime from, DateTime to);
    Task<IEnumerable<CommissionLedger>> GetBySessionAsync(Guid sessionId);
}
