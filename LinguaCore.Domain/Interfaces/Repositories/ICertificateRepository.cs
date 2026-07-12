using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface ICertificateRepository : IGenericRepository<Certificate>
{
    Task<IEnumerable<Certificate>> GetByStudentAsync(Guid studentId);
    Task<Certificate?> GetBySerialNumberAsync(string serialNumber);
    Task<IEnumerable<Certificate>> GetByBranchAsync(Guid branchId);
    Task<Certificate?> GetWithDetailsAsync(Guid id);
}
