namespace LinguaCore.Application.DTOs.Request;

public record CreateExamRequest(
    Guid GroupId, bool IsFinalExam, string Title,
    decimal TotalMarks, decimal PassPercentage,
    DateTime ExamDate, int DurationMins, bool IsCustom);

public record AddExamResultRequest(
    Guid ExamId, Guid StudentId,
    decimal MarksObtained, bool IsRetake, string? RetakeReason);

public record UpdateExamRequest(
    Guid Id, Guid GroupId, bool IsFinalExam, string Title,
    decimal TotalMarks, decimal PassPercentage,
    DateTime ExamDate, int DurationMins);
