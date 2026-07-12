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
            GroupId        = req.GroupId,
            CreatedBy      = userId,
            IsFinalExam    = req.IsFinalExam,
            Title          = req.Title,
            TotalMarks     = req.TotalMarks,
            PassPercentage = req.PassPercentage,
            ExamDate       = req.ExamDate,
            DurationMins   = req.DurationMins,
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
            exam.IsCustom, exam.CreatedAt, exam.ModifiedAt));
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
        exam.IsCustom = !req.IsFinalExam;   // ? auto-derive

        _uow.Exams.Update(exam);
        await _uow.SaveChangesAsync();

        var group = await _uow.Groups.GetWithDetailsAsync(exam.GroupId);
        return ApiResponse<ExamResponse>.Ok(new ExamResponse(
            exam.Id, exam.GroupId, group?.Name ?? "",
            group?.LanguageLevel?.Language?.Name ?? "",
            group?.LanguageLevel?.Level?.Code ?? "",
            exam.IsFinalExam, exam.Title, exam.TotalMarks,
            exam.PassPercentage, exam.ExamDate, exam.DurationMins,
            exam.IsCustom, exam.CreatedAt, exam.ModifiedAt));
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
            e.ExamDate, e.DurationMins, e.IsCustom, e.CreatedAt, e.ModifiedAt)));
    }

    public async Task<ApiResponse<ExamResultResponse>> AddResultAsync(AddExamResultRequest req, Guid userId)
    {
        var exam = await _uow.Exams.GetByIdAsync(req.ExamId);
        if (exam is null) return ApiResponse<ExamResultResponse>.Fail("Exam not found.");

        var result = new ExamResult
        {
            ExamId        = req.ExamId,
            StudentId     = req.StudentId,
            RecordedBy    = userId,
            MarksObtained = req.MarksObtained,
            AttemptNumber = req.IsRetake ? 2 : 1,
            IsRetake      = req.IsRetake,
            RetakeReason  = req.RetakeReason,
            RecordedAt    = DateTime.UtcNow,
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

            // Fetch the COMPLETED status entity by name — never hardcode a GUID
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
                    // Also update the navigation property so any in-memory
                    // checks on .EnrollStatus.Name are consistent
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

    //public async Task<ApiResponse<CertificateResponse>> IssueCertificateAsync(Guid examResultId)
    //{
    //    var result = await _uow.Repository<ExamResult>().GetByIdAsync(examResultId);
    //    if (result is null) return ApiResponse<CertificateResponse>.Fail("Exam result not found.");
    //    if (!result.Passed) return ApiResponse<CertificateResponse>.Fail("Student has not passed this exam.");

    //    var exam  = await _uow.Exams.GetByIdAsync(result.ExamId);
    //    var group = await _uow.Groups.GetWithDetailsAsync(exam!.GroupId);
    //    var cert  = new Certificate
    //    {
    //        StudentId       = result.StudentId,
    //        LanguageLevelId = group!.LanguageLevelId,
    //        ExamResultId    = result.Id,
    //        IssuedAt        = DateTime.UtcNow,
    //    };
    //    await _uow.Certificates.AddAsync(cert);
    //    await _uow.SaveChangesAsync();

    //    var student = await _uow.Students.GetWithDetailsAsync(result.StudentId);
    //    return ApiResponse<CertificateResponse>.Ok(new CertificateResponse(
    //        cert.Id, cert.StudentId,
    //        student is null ? "" : $"{student.Person.FirstName} {student.Person.LastName}",
    //        group.LanguageLevel?.Language?.Name ?? "",
    //        group.LanguageLevel?.Level?.Code ?? "",
    //        cert.SerialNumber, cert.IssuedAt, cert.CreatedAt, cert.ModifiedAt));
    //}


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

    private static ExamResultResponse MapResult(ExamResult r) => new(
        r.Id, r.ExamId, r.Exam?.Title ?? "",
        r.StudentId,
        r.Student?.Person is null ? "" : $"{r.Student.Person.FirstName} {r.Student.Person.LastName}",
        r.MarksObtained, r.Passed, r.AttemptNumber, r.IsRetake, r.RetakeReason, r.RecordedAt);
}
