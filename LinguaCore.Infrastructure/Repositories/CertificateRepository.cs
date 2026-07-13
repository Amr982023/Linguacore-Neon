using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;

namespace LinguaCore.Infrastructure.Repositories;

public class CertificateRepository : GenericRepository<Certificate>, ICertificateRepository
{
    public CertificateRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Certificate>> GetByBranchAsync(Guid branchId)
        => await _dbSet
            .Include(c => c.Student).ThenInclude(s => s.Person)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(c => c.ExamResult)
                .ThenInclude(r => r!.Exam)
                    .ThenInclude(e => e!.Group)
            .Where(c => c.Student.BranchId == branchId)
            .OrderByDescending(c => c.IssuedAt)
            .ToListAsync();

    public async Task<Certificate?> GetWithDetailsAsync(Guid id)
        => await _dbSet
            .Include(c => c.Student).ThenInclude(s => s.Person)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(c => c.ExamResult)
                .ThenInclude(r => r!.Exam)
                    .ThenInclude(e => e!.Group)
            .FirstOrDefaultAsync(c => c.Id == id);
    public async Task<IEnumerable<Certificate>> GetByStudentAsync(Guid studentId)
        => await _dbSet
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(c => c.ExamResult)
            .Where(c => c.StudentId == studentId)
            .OrderByDescending(c => c.IssuedAt)
            .ToListAsync();

    public async Task<Certificate?> GetBySerialNumberAsync(string serialNumber)
        => await _dbSet
            .Include(c => c.Student).ThenInclude(s => s.Person)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Level)
            .FirstOrDefaultAsync(c => c.SerialNumber == serialNumber);

    // Infrastructure/Repositories/CertificateRepository.cs — add this method to the existing class
    public async Task<(IEnumerable<Certificate> Items, int TotalCount)> GetByBranchPagedAsync(
        Guid branchId, string? search, Guid? languageId, Guid? levelId, Guid? groupId,
        int page, int pageSize)
    {
        var query = _dbSet
            .Where(c => c.Student.BranchId == branchId);

        if (languageId.HasValue)
            query = query.Where(c => c.LanguageLevel.LanguageId == languageId.Value);

        if (levelId.HasValue)
            query = query.Where(c => c.LanguageLevel.LevelId == levelId.Value);

        if (groupId.HasValue)
            query = query.Where(c => c.ExamResult != null
                                   && c.ExamResult.Exam != null
                                   && c.ExamResult.Exam.GroupId == groupId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                c.SerialNumber.ToLower().Contains(term) ||
                (c.Student.Person.FirstName + " " + c.Student.Person.LastName).ToLower().Contains(term));
        }

        // Count against the filtered query BEFORE Include/Skip/Take — same reasoning
        // as SaleRepository: cheaper, and avoids the ExamResult/Exam/Group joins
        // inflating the row count.
        var totalCount = await query.CountAsync();

        var items = await query
            .Include(c => c.Student).ThenInclude(s => s.Person)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Level)
            .Include(c => c.ExamResult)
                .ThenInclude(r => r!.Exam)
                    .ThenInclude(e => e!.Group)
            .OrderByDescending(c => c.IssuedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}
