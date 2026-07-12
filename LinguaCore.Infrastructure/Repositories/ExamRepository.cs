using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

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
}
