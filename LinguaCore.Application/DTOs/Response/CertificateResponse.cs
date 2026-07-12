namespace LinguaCore.Application.DTOs.Response;

public record CertificateResponse(
    Guid Id,
    Guid StudentId,
    string StudentName,
    string LanguageName,       // ? old positional fields kept as-is
    string LevelCode,
    string SerialNumber,
    DateTime IssuedAt,
    DateTime CreatedAt,
    DateTime? ModifiedAt,
    // New optional fields — default to null so old callers compile unchanged
    Guid? GroupId = null,
    string? GroupName = null,
    Guid? ExamResultId = null,
    decimal? MarksObtained = null,
    decimal? TotalMarks = null
);
