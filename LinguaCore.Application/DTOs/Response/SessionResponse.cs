namespace LinguaCore.Application.DTOs.Response;

public record SessionResponse(
    Guid Id, Guid GroupId, string GroupName,
    Guid InstructorId, string InstructorName,
    Guid? HallId, string? HallName, Guid? ZoomAccountId, string? ZoomAccountName,
    int SessionNumber,
    Guid PeriodLabelId,      // ? ADD
    string PeriodLabel,
    DateTime ScheduledDate, DateTime? ActualDate,
    string? Topic, string Status, string? CancelledReason,
    DateTime CreatedAt, DateTime ModifiedAt);

public record AttendanceResponse(
    Guid Id, Guid SessionId, Guid StudentId,
    string StudentName, string Status, string Method,
    DateTime RecordedAt, bool Reverted, string? RevertReason);
