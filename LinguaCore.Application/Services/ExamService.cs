using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services;

public class ExamService : IExamService
{
    private readonly IUnitOfWork _uow;
    public ExamService(IUnitOfWork uow) => _uow = uow;

    public async Task<ApiResponse<ExamResponse>> CreateAsync(CreateExamRequest req, Guid userId)
    {
        var exam = new Exam
        {
            GroupId = req.GroupId,
            CreatedBy = userId,
            IsFinalExam = req.IsFinalExam,
            Title = req.Title,
            TotalMarks = req.TotalMarks,
            PassPercentage = req.PassPercentage,
            ExamDate = req.ExamDate,
            DurationMins = req.DurationMins,
            IsCustom = !req.IsFinalExam,
        };
        await _uow.Exams.AddAsync(exam);
        await _uow.SaveChangesAsync();

        var group = await _uow.Groups.GetWithDetailsAsync(req.GroupId);
        return ApiResponse<ExamResponse>.Ok(new ExamResponse(
            exam.Id, exam.GroupId, group?.Name ?? "",
            group?.LanguageLevel?.Language?.Name ?? "",
            group?.LanguageLevel?.Level?.Code ?? "",
            exam.IsFinalExam, exam.Title, exam.TotalMarks,
            exam.PassPercentage, exam.ExamDate, exam.DurationMins,
            exam.IsCustom, exam.CreatedAt, exam.ModifiedAt,
            0, 0)); // brand-new exam has no results yet
    }

    public async Task<ApiResponse<ExamResponse>> UpdateAsync(UpdateExamRequest req)
    {
        var exam = await _uow.Exams.GetByIdAsync(req.Id);
        if (exam is null) return ApiResponse<ExamResponse>.Fail("Exam not found.");

        exam.GroupId = req.GroupId;
        exam.IsFinalExam = req.IsFinalExam;
        exam.Title = req.Title;
        exam.TotalMarks = req.TotalMarks;
        exam.PassPercentage = req.PassPercentage;
        exam.ExamDate = req.ExamDate;
        exam.DurationMins = req.DurationMins;
        exam.IsCustom = !req.IsFinalExam;

        _uow.Exams.Update(exam);
        await _uow.SaveChangesAsync();

        var group = await _uow.Groups.GetWithDetailsAsync(exam.GroupId);
        var results = await _uow.Exams.GetResultsByExamAsync(exam.Id);
        var passedCount = results.Count(r => r.Passed);
        var failedCount = results.Count(r => !r.Passed);

        return ApiResponse<ExamResponse>.Ok(new ExamResponse(
            exam.Id, exam.GroupId, group?.Name ?? "",
            group?.LanguageLevel?.Language?.Name ?? "",
            group?.LanguageLevel?.Level?.Code ?? "",
            exam.IsFinalExam, exam.Title, exam.TotalMarks,
            exam.PassPercentage, exam.ExamDate, exam.DurationMins,
            exam.IsCustom, exam.CreatedAt, exam.ModifiedAt,
            passedCount, failedCount));
    }

    public async Task<ApiResponse<IEnumerable<ExamResponse>>> GetByGroupAsync(Guid groupId)
    {
        var exams = await _uow.Exams.GetByGroupAsync(groupId);
        var group = await _uow.Groups.GetWithDetailsAsync(groupId);
        return ApiResponse<IEnumerable<ExamResponse>>.Ok(exams.Select(e => new ExamResponse(
            e.Id, e.GroupId, group?.Name ?? "",
            group?.LanguageLevel?.Language?.Name ?? "",
            group?.LanguageLevel?.Level?.Code ?? "",
            e.IsFinalExam, e.Title, e.TotalMarks, e.PassPercentage,
            e.ExamDate, e.DurationMins, e.IsCustom, e.CreatedAt, e.ModifiedAt,
            e.ExamResults?.Count(r => r.Passed) ?? 0,
            e.ExamResults?.Count(r => !r.Passed) ?? 0)));
    }

    public async Task<ApiResponse<ExamResultResponse>> AddResultAsync(AddExamResultRequest req, Guid userId)
    {
        var exam = await _uow.Exams.GetByIdAsync(req.ExamId);
        if (exam is null) return ApiResponse<ExamResultResponse>.Fail("Exam not found.");

        var result = new ExamResult
        {
            ExamId = req.ExamId,
            StudentId = req.StudentId,
            RecordedBy = userId,
            MarksObtained = req.MarksObtained,
            AttemptNumber = req.IsRetake ? 2 : 1,
            IsRetake = req.IsRetake,
            RetakeReason = req.RetakeReason,
            RecordedAt = DateTime.UtcNow,
        };
        result.ComputePassed(exam.TotalMarks, exam.PassPercentage);
        await _uow.Repository<ExamResult>().AddAsync(result);

        // Auto-issue certificate if passed final exam
        if (result.Passed && exam.IsFinalExam)
        {
            var group = await _uow.Groups.GetWithDetailsAsync(exam.GroupId);
            var cert = new Certificate
            {
                StudentId = req.StudentId,
                LanguageLevelId = group!.LanguageLevelId,
                ExamResultId = result.Id,
                IssuedAt = DateTime.UtcNow,
            };
            await _uow.Certificates.AddAsync(cert);

            var completedStatus = await _uow.Repository<EnrollStatus>()
                .FirstOrDefaultAsync(s => s.Name.ToUpper() == "COMPLETED");

            if (completedStatus is not null)
            {
                var enrollment = await _uow.Enrollments
                    .FirstOrDefaultAsync(e => e.StudentId == req.StudentId
                                           && e.GroupId == exam.GroupId);

                if (enrollment is not null)
                {
                    enrollment.EnrollStatusId = completedStatus.Id;
                    enrollment.EnrollStatus = completedStatus;
                    _uow.Enrollments.Update(enrollment);
                }
            }
        }

        await _uow.SaveChangesAsync();

        var student = await _uow.Students.GetWithDetailsAsync(req.StudentId);
        return ApiResponse<ExamResultResponse>.Ok(new ExamResultResponse(
            result.Id, result.ExamId, exam.Title, result.StudentId,
            student is null ? "" : $"{student.Person.FirstName} {student.Person.LastName}",
            result.MarksObtained, result.Passed, result.AttemptNumber,
            result.IsRetake, result.RetakeReason, result.RecordedAt));
    }

    public async Task<ApiResponse<IEnumerable<ExamResultResponse>>> GetResultsByExamAsync(Guid examId)
    {
        var results = await _uow.Exams.GetResultsByExamAsync(examId);
        return ApiResponse<IEnumerable<ExamResultResponse>>.Ok(results.Select(MapResult));
    }

    public async Task<ApiResponse<IEnumerable<ExamResultResponse>>> GetResultsByStudentAsync(Guid studentId)
    {
        var results = await _uow.Exams.GetResultsByStudentAsync(studentId);
        return ApiResponse<IEnumerable<ExamResultResponse>>.Ok(results.Select(MapResult));
    }

    public async Task<ApiResponse<IEnumerable<RankingResponse>>> GetRankingByGroupAsync(Guid groupId)
    {
        var results = await _uow.Exams.GetRankingByGroupAsync(groupId);
        var grouped = results
            .GroupBy(r => r.StudentId)
            .Select((g, idx) => new RankingResponse(
                idx + 1, g.Key,
                g.First().Student?.Person is null ? "" :
                    $"{g.First().Student.Person.FirstName} {g.First().Student.Person.LastName}",
                g.Sum(r => r.MarksObtained),
                g.Count() > 0 ? g.Average(r => r.MarksObtained) : 0,
                g.Count()))
            .OrderByDescending(r => r.TotalMarks)
            .Select((r, idx) => r with { Rank = idx + 1 });
        return ApiResponse<IEnumerable<RankingResponse>>.Ok(grouped);
    }

    public async Task<ApiResponse<CertificateResponse>> IssueCertificateAsync(Guid examResultId)
    {
        var existingCertificate = await _uow.Certificates
            .FirstOrDefaultAsync(c => c.ExamResultId == examResultId);

        if (existingCertificate is not null)
            return ApiResponse<CertificateResponse>.Fail(
                "A certificate has already been issued for this exam result.");

        var result = await _uow.Repository<ExamResult>().GetByIdAsync(examResultId);

        if (result is null)
            return ApiResponse<CertificateResponse>.Fail("Exam result not found.");

        if (!result.Passed)
            return ApiResponse<CertificateResponse>.Fail(
                "Student has not passed this exam.");

        var exam = await _uow.Exams.GetByIdAsync(result.ExamId);
        var group = await _uow.Groups.GetWithDetailsAsync(exam!.GroupId);

        var cert = new Certificate
        {
            StudentId = result.StudentId,
            LanguageLevelId = group!.LanguageLevelId,
            ExamResultId = result.Id,
            IssuedAt = DateTime.UtcNow,
        };

        await _uow.Certificates.AddAsync(cert);
        await _uow.SaveChangesAsync();

        var student = await _uow.Students.GetWithDetailsAsync(result.StudentId);
        return ApiResponse<CertificateResponse>.Ok(new CertificateResponse(
            cert.Id, cert.StudentId,
            student is null ? "" : $"{student.Person.FirstName} {student.Person.LastName}",
            group.LanguageLevel?.Language?.Name ?? "",
            group.LanguageLevel?.Level?.Code ?? "",
            cert.SerialNumber, cert.IssuedAt, cert.CreatedAt, cert.ModifiedAt));
    }

    // ?? NEW: branch-wide paginated exam list ????????????????????????????????????
    public async Task<ApiResponse<PagedResponse<ExamResponse>>> GetByBranchAsync(
        Guid branchId, ExamFilterRequest filter)
    {
        var (items, total) = await _uow.Exams.GetByBranchAsync(
            branchId,
            filter.Page, filter.PageSize,
            filter.GroupId, filter.IsFinalExam, filter.Month, filter.Year, filter.ResultFilter);

        var totalPages = filter.PageSize > 0
            ? (int)Math.Ceiling(total / (double)filter.PageSize)
            : 0;

        var response = new PagedResponse<ExamResponse>(
            items.Select(e => new ExamResponse(
                e.Id, e.GroupId, e.Group?.Name ?? "",
                e.Group?.LanguageLevel?.Language?.Name ?? "",
                e.Group?.LanguageLevel?.Level?.Code ?? "",
                e.IsFinalExam, e.Title, e.TotalMarks, e.PassPercentage,
                e.ExamDate, e.DurationMins, e.IsCustom, e.CreatedAt, e.ModifiedAt,
                e.ExamResults?.Count(r => r.Passed) ?? 0,
                e.ExamResults?.Count(r => !r.Passed) ?? 0)),
            total, filter.Page, filter.PageSize, totalPages);

        return ApiResponse<PagedResponse<ExamResponse>>.Ok(response);
    }

    // ?? NEW: lightweight dropdown-source list ???????????????????????????????????
    public async Task<ApiResponse<IEnumerable<ExamOptionResponse>>> GetExamOptionsAsync(
        Guid branchId, Guid? groupId, Guid? languageId, Guid? levelId)
    {
        var exams = await _uow.Exams.GetExamOptionsAsync(branchId, groupId, languageId, levelId);
        return ApiResponse<IEnumerable<ExamOptionResponse>>.Ok(
            exams.Select(e => new ExamOptionResponse(e.Id, e.Title, e.GroupId, e.Group?.Name ?? "")));
    }

    // ?? NEW: branch-wide aggregated ranking, with ties sharing a rank number ????
    // (matches the old client-side "competition ranking" behavior: 1, 2, 2, 4 —
    // rank only advances when the average actually drops from the previous row).
    // The repo returns the full grouped list (one row per student in scope, not
    // per raw exam result — already small/bounded), so pagination happens here,
    // after ranks are assigned, so ties are never split across a page boundary.
    public async Task<ApiResponse<PagedResponse<RankingAggregateResponse>>> GetRankingByBranchAsync(
        Guid branchId, RankingFilterRequest filter)
    {
        var rows = (await _uow.Exams.GetRankingAsync(
            branchId, filter.ExamId, filter.GroupId, filter.LanguageId, filter.LevelId)).ToList();

        var ranked = new List<RankingAggregateResponse>(rows.Count);
        var currentRank = 0;
        decimal? lastAverage = null;

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            if (lastAverage is null || row.AverageMark < lastAverage.Value)
                currentRank = i + 1;
            lastAverage = row.AverageMark;

            ranked.Add(new RankingAggregateResponse(
                currentRank, row.StudentId, row.StudentName,
                row.TotalMarks, row.AverageMark, row.BestMark, row.Attempts, row.Passed));
        }

        var total = ranked.Count;
        var totalPages = filter.PageSize > 0
            ? (int)Math.Ceiling(total / (double)filter.PageSize)
            : 0;

        var page = ranked
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize);

        var response = new PagedResponse<RankingAggregateResponse>(
            page, total, filter.Page, filter.PageSize, totalPages);

        return ApiResponse<PagedResponse<RankingAggregateResponse>>.Ok(response);
    }

    private static ExamResultResponse MapResult(ExamResult r) => new(
        r.Id, r.ExamId, r.Exam?.Title ?? "",
        r.StudentId,
        r.Student?.Person is null ? "" : $"{r.Student.Person.FirstName} {r.Student.Person.LastName}",
        r.MarksObtained, r.Passed, r.AttemptNumber, r.IsRetake, r.RetakeReason, r.RecordedAt);
}