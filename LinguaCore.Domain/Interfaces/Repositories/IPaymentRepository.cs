using LinguaCore.Domain.Common;
using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IPaymentRepository : IGenericRepository<Payment>
{
    // ?? Existing (kept — still used by GetByEnrollment/GetByGroup endpoints,
    // commission distribution logic, etc.) ?????????????????????????????????
    Task<IEnumerable<Payment>> GetByEnrollmentAsync(Guid enrollmentId);
    Task<IEnumerable<Payment>> GetByGroupAsync(Guid groupId);
    Task<IEnumerable<Payment>> GetByPeriodAsync(DateTime from, DateTime to);
    Task<decimal> GetTotalCollectedAsync(Guid branchId, DateTime from, DateTime to);

    // ?? New: offset-paginated, fully server-side filtered query ????????????
    // Plain parameters (not the DTO) — DTO unpacking happens at the service
    // layer, per the established pattern.
    Task<PagedResults<Payment>> GetByPeriodPagedAsync(
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
        string? status);
}