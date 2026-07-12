using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IExamRepository : IGenericRepository<Exam>
{
    Task<IEnumerable<Exam>> GetByGroupAsync(Guid groupId);
    Task<IEnumerable<ExamResult>> GetResultsByExamAsync(Guid examId);
    Task<IEnumerable<ExamResult>> GetResultsByStudentAsync(Guid studentId);
    Task<IEnumerable<ExamResult>> GetRankingByGroupAsync(Guid groupId, string? periodLabel = null);
}
