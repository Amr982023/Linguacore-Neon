namespace LinguaCore.Application.DTOs.Response;

public record ExamResponse(
    Guid Id, Guid GroupId, string GroupName,
    string LanguageName, string LevelCode,
    bool IsFinalExam, string Title,
    decimal TotalMarks, decimal PassPercentage,
    DateTime ExamDate, int DurationMins, bool IsCustom,
    DateTime CreatedAt, DateTime ModifiedAt,
    int PassedCount, int FailedCount); // ? NEW, appended at the end

public record ExamResultResponse(
    Guid Id, Guid ExamId, string ExamTitle,
    Guid StudentId, string StudentName,
    decimal MarksObtained, bool Passed,
    int AttemptNumber, bool IsRetake,
    string? RetakeReason, DateTime RecordedAt);

public record RankingResponse(
    int Rank, Guid StudentId, string StudentName,
    decimal TotalMarks, decimal AverageMark, int ExamsCount);

public record RankingAggregateResponse(
    int Rank, Guid StudentId, string StudentName,
    decimal TotalMarks, decimal AverageMark, decimal BestMark, int Attempts, bool Passed
);

public record ExamOptionResponse(Guid Id, string Title, Guid GroupId, string GroupName);
