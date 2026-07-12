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
}
