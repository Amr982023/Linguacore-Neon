// LinguaCore.Application.Services/CertificateService.cs
using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services;

public class CertificateService : ICertificateService
{
    private readonly IUnitOfWork _uow;
    public CertificateService(IUnitOfWork uow) => _uow = uow;

    public async Task<ApiResponse<IEnumerable<CertificateResponse>>> GetByBranchAsync(Guid branchId)
    {
        var certs = await _uow.Certificates.GetByBranchAsync(branchId);
        return ApiResponse<IEnumerable<CertificateResponse>>.Ok(certs.Select(Map));
    }

    public async Task<ApiResponse<PagedResult<CertificateResponse>>> GetByBranchPagedAsync(
    CertificateFilterRequest filter)
    {
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize is < 1 or > 100 ? 10 : filter.PageSize; // hard cap, same as Sales

        var (certs, totalCount) = await _uow.Certificates.GetByBranchPagedAsync(
            filter.BranchId, filter.Search, filter.LanguageId, filter.LevelId, filter.GroupId,
            page, pageSize);

        return ApiResponse<PagedResult<CertificateResponse>>.Ok(
            new PagedResult<CertificateResponse>(certs.Select(Map), totalCount, page, pageSize));
    }

    public async Task<ApiResponse<CertificateResponse>> GetByIdAsync(Guid id)
    {
        var cert = await _uow.Certificates.GetWithDetailsAsync(id);
        if (cert is null)
            return ApiResponse<CertificateResponse>.Fail("Certificate not found.");

        return ApiResponse<CertificateResponse>.Ok(Map(cert));
    }

    private static CertificateResponse Map(Certificate c)
    {
        var studentName = c.Student?.Person is null ? ""
            : $"{c.Student.Person.FirstName} {c.Student.Person.LastName}";
        var group = c.ExamResult?.Exam?.Group;
        var languageLevel = c.LanguageLevel;

        return new CertificateResponse(
            Id: c.Id,
            StudentId: c.StudentId,
            StudentName: studentName,
            LanguageName: languageLevel?.Language?.Name ?? "",
            LevelCode: languageLevel?.Level?.Code ?? "",
            SerialNumber: c.SerialNumber,
            IssuedAt: c.IssuedAt,
            CreatedAt: c.CreatedAt,
            ModifiedAt: c.ModifiedAt,
            GroupId: group?.Id,
            GroupName: group?.Name,
            ExamResultId: c.ExamResultId,
            MarksObtained: c.ExamResult?.MarksObtained,
            TotalMarks: c.ExamResult?.Exam?.TotalMarks
        );
    }
}