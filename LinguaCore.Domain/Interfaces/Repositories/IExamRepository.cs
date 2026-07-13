using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Projections;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IExamRepository : IGenericRepository<Exam>
{
    Task<IEnumerable<Exam>> GetByGroupAsync(Guid groupId);
    Task<IEnumerable<ExamResult>> GetResultsByExamAsync(Guid examId);
    Task<IEnumerable<ExamResult>> GetResultsByStudentAsync(Guid studentId);
    Task<IEnumerable<ExamResult>> GetRankingByExamAsync(Guid examId);

    Task<IEnumerable<ExamResult>> GetRankingByGroupAsync(Guid groupId, string? periodLabel = null);

    // ?? NEW: paginated + filtered branch-wide exam list, newest-created-first ??
    Task<(IEnumerable<Exam> Items, int TotalCount)> GetByBranchAsync(
        Guid branchId,
        int page,
        int pageSize,
        Guid? groupId = null,
        bool? isFinalExam = null,
        int? month = null,
        int? year = null,
        string? resultFilter = null);

    // ?? NEW: lightweight, capped dropdown-source list for the ranking filter UI ??
    Task<IEnumerable<Exam>> GetExamOptionsAsync(
        Guid branchId,
        Guid? groupId = null,
        Guid? languageId = null,
        Guid? levelId = null);

    // ?? NEW: server-side aggregated branch-wide ranking.
    // Returns the FULL grouped list (one row per distinct student in scope —
    // already collapsed down from raw ExamResult rows via GROUP BY, so this is
    // normally small/bounded, not the whole ExamResults table). Pagination and
    // tie-aware rank assignment (equal averages share a rank number) happen in
    // the service layer, since plain LINQ can't translate a RANK() OVER window
    // function, and Skip/Take here would make ties impossible to detect across
    // a page boundary. ??
    Task<IEnumerable<RankingAggregateRow>> GetRankingAsync(
        Guid branchId,
        Guid? examId = null,
        Guid? groupId = null,
        Guid? languageId = null,
        Guid? levelId = null);
}