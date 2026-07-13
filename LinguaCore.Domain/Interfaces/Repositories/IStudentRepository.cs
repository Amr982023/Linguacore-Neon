using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IStudentRepository : IGenericRepository<Student>
{
    Task<Student?> GetByQrCodeAsync(string qrCode);
    Task<IEnumerable<Student>> GetByBranchAsync(Guid branchId);
    Task<Student?> GetWithDetailsAsync(Guid id);
    Task<IEnumerable<Student>> GetByLanguageAsync(Guid branchId, Guid languageId);

    Task<(IEnumerable<Student> Items, int TotalCount)> GetByBranchPagedAsync(
        Guid branchId,
        int page,
        int pageSize,
        string? search = null,
        string? attendanceMode = null,
        bool? isActive = null,
        Guid? languageId = null,
        Guid? levelId = null,
        Guid? goalId = null,
        Guid? nestedGoalId = null);
}