// Domain/Interfaces/Repositories/ICertificateRepository.cs
using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface ICertificateRepository : IGenericRepository<Certificate>
{
    Task<IEnumerable<Certificate>> GetByStudentAsync(Guid studentId);
    Task<Certificate?> GetBySerialNumberAsync(string serialNumber);
    Task<IEnumerable<Certificate>> GetByBranchAsync(Guid branchId);
    Task<Certificate?> GetWithDetailsAsync(Guid id);

    // New: offset-paginated, server-side filtered
    Task<(IEnumerable<Certificate> Items, int TotalCount)> GetByBranchPagedAsync(
        Guid branchId, string? search, Guid? languageId, Guid? levelId, Guid? groupId,
        int page, int pageSize);
}