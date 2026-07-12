using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IStudentRepository : IGenericRepository<Student>
{
    Task<Student?> GetByQrCodeAsync(string qrCode);
    Task<IEnumerable<Student>> GetByBranchAsync(Guid branchId);
    Task<Student?> GetWithDetailsAsync(Guid id);
    Task<IEnumerable<Student>> GetByLanguageAsync(Guid branchId, Guid languageId);
}
