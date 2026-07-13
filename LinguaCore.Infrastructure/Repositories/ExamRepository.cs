using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Domain.Projections;
using LinguaCore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LinguaCore.Infrastructure.Repositories;

public class ExamRepository : GenericRepository<Exam>, IExamRepository
{
    public ExamRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Exam>> GetByGroupAsync(Guid groupId)
        => await _dbSet
            .Include(e => e.ExamResults)
            .Where(e => e.GroupId == groupId)
            .OrderBy(e => e.ExamDate)
            .ToListAsync();

    public async Task<IEnumerable<ExamResult>> GetResultsByExamAsync(Guid examId)
        => await _context.ExamResults
            .Include(r => r.Student).ThenInclude(s => s.Person)
            .Where(r => r.ExamId == examId)
            .OrderByDescending(r => r.MarksObtained)
            .ToListAsync();

    public async Task<IEnumerable<ExamResult>> GetResultsByStudentAsync(Guid studentId)
        => await _context.ExamResults
            .Include(r => r.Exam).ThenInclude(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(r => r.Exam).ThenInclude(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Where(r => r.StudentId == studentId)
            .OrderByDescending(r => r.RecordedAt)
            .ToListAsync();

    public async Task<IEnumerable<ExamResult>> GetRankingByGroupAsync(Guid groupId, string? periodLabel = null)
        => await _context.ExamResults
            .Include(r => r.Student).ThenInclude(s => s.Person)
            .Include(r => r.Exam)
            .Where(r => r.Exam.GroupId == groupId)
            .OrderByDescending(r => r.MarksObtained)
            .ToListAsync();

    // ?? NEW: paginated + filtered branch-wide exam list ????????????????????????
    public async Task<(IEnumerable<Exam> Items, int TotalCount)> GetByBranchAsync(
        Guid branchId,
        int page,
        int pageSize,
        Guid? groupId = null,
        bool? isFinalExam = null,
        int? month = null,
        int? year = null,
        string? resultFilter = null)
    {
        var query = _dbSet
            .Include(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(e => e.Group).ThenInclude(g => g.LanguageLevel).ThenInclude(ll => ll.Level)
            .Where(e => e.Group.BranchId == branchId);

        if (groupId.HasValue) query = query.Where(e => e.GroupId == groupId.Value);
        if (isFinalExam.HasValue) query = query.Where(e => e.IsFinalExam == isFinalExam.Value);
        if (month.HasValue) query = query.Where(e => e.ExamDate.Month == month.Value);
        if (year.HasValue) query = query.Where(e => e.ExamDate.Year == year.Value);
        if (resultFilter == "passed") query = query.Where(e => e.ExamResults.Any(r => r.Passed));
        if (resultFilter == "failed") query = query.Where(e => e.ExamResults.Any(r => !r.Passed));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(e => e.CreatedAt) // newest-created-first
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsSplitQuery()
            .ToListAsync();

        return (items, total);
    }

    // ?? NEW: lightweight, capped dropdown-source list ??????????????????????????
    public async Task<IEnumerable<Exam>> GetExamOptionsAsync(
        Guid branchId,
        Guid? groupId = null,
        Guid? languageId = null,
        Guid? levelId = null)
    {
        var query = _dbSet.Include(e => e.Group).Where(e => e.Group.BranchId == branchId);

        if (groupId.HasValue) query = query.Where(e => e.GroupId == groupId.Value);
        if (languageId.HasValue) query = query.Where(e => e.Group.LanguageLevel.LanguageId == languageId.Value);
        if (levelId.HasValue) query = query.Where(e => e.Group.LanguageLevel.LevelId == levelId.Value);

        return await query
            .OrderByDescending(e => e.CreatedAt)
            .Take(300) // dropdown source, capped
            .ToListAsync();
    }

    // ?? NEW: server-side aggregated branch-wide ranking — full list, unpaginated.
    // See interface doc comment for why pagination/ranking live in the service. ??
    public async Task<IEnumerable<RankingAggregateRow>> GetRankingAsync(
     Guid branchId,
     Guid? examId = null,
     Guid? groupId = null,
     Guid? languageId = null,
     Guid? levelId = null)
    {
        var query = _context.ExamResults.Where(r => r.Exam.Group.BranchId == branchId);

        if (examId.HasValue)
        {
            query = query.Where(r => r.ExamId == examId.Value);
        }
        else if (groupId.HasValue)
        {
            query = query.Where(r => r.Exam.GroupId == groupId.Value);
        }
        else
        {
            if (languageId.HasValue)
                query = query.Where(r => r.Exam.Group.LanguageLevel.LanguageId == languageId.Value);
            if (levelId.HasValue)
                query = query.Where(r => r.Exam.Group.LanguageLevel.LevelId == levelId.Value);
        }

        // Step 1: let SQL do the grouping/aggregation into a plain anonymous type
        var grouped = await query
            .GroupBy(r => new { r.StudentId, r.Student.Person.FirstName, r.Student.Person.LastName })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.FirstName,
                g.Key.LastName,
                TotalMarks = g.Sum(x => x.MarksObtained),
                AverageMark = g.Average(x => x.MarksObtained),
                BestMark = g.Max(x => x.MarksObtained),
                ExamCount = g.Count(),
                AnyPassed = g.Max(x => x.Passed ? 1 : 0)
            })
            .OrderByDescending(x => x.AverageMark)
            .ThenByDescending(x => x.BestMark)
            .ToListAsync();

        // Step 2: build the record in memory — cheap, no translation involved
        return grouped.Select(x => new RankingAggregateRow(
            x.StudentId,
            x.FirstName + " " + x.LastName,
            x.TotalMarks,
            x.AverageMark,
            x.BestMark,
            x.ExamCount,
            x.AnyPassed == 1));
    }
}