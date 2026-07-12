using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IEnrollmentRepository : IGenericRepository<Enrollment>
{
    Task<IEnumerable<Enrollment>> GetByStudentAsync(Guid studentId);
    Task<IEnumerable<Enrollment>> GetByGroupAsync(Guid groupId);
    Task<Enrollment?> GetWithDetailsAsync(Guid id);
    Task<IEnumerable<Enrollment>> GetByGroupIdsAsync(IEnumerable<Guid> groupIds, IEnumerable<string> statuses);

    Task<IEnumerable<Enrollment>> GetOverdueAsync();
}
