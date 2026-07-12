using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IPaymentRepository : IGenericRepository<Payment>
{
    Task<IEnumerable<Payment>> GetByEnrollmentAsync(Guid enrollmentId);
    Task<IEnumerable<Payment>> GetByGroupAsync(Guid groupId);
    Task<IEnumerable<Payment>> GetByPeriodAsync(DateTime from, DateTime to);
    Task<decimal> GetTotalCollectedAsync(Guid branchId, DateTime from, DateTime to);
}
