namespace LinguaCore.Application.DTOs.Response;

public record ExamResponse(
    Guid Id, Guid GroupId, string GroupName,
    string LanguageName, string LevelCode,
    bool IsFinalExam, string Title,
    decimal TotalMarks, decimal PassPercentage,
    DateTime ExamDate, int DurationMins, bool IsCustom,
    DateTime CreatedAt, DateTime ModifiedAt);

public record ExamResultResponse(
    Guid Id, Guid ExamId, string ExamTitle,
    Guid StudentId, string StudentName,
    decimal MarksObtained, bool Passed,
    int AttemptNumber, bool IsRetake,
    string? RetakeReason, DateTime RecordedAt);

public record RankingResponse(
    int Rank, Guid StudentId, string StudentName,
    decimal TotalMarks, decimal AverageMark, int ExamsCount);
