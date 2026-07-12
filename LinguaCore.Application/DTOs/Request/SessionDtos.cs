namespace LinguaCore.Application.DTOs.Request;

public record CreateSessionRequest(
    Guid GroupId,
    int SessionNumber,
    Guid InstructorId,
    Guid PeriodLabelId,   // ? was: string PeriodLabel
    DateTime ScheduledDate,
    string? Topic,
    Guid? HallId,
    Guid? ZoomAccountId);

public record UpdateSessionRequest(
    Guid Id, DateTime ScheduledDate,
    Guid InstructorId, string? Topic,
    Guid? HallId, Guid? ZoomAccountId, string Status,
    string? CancelledReason);

public record MarkAttendanceRequest(
    Guid SessionId, Guid StudentId, string Status, string Method, Guid RecordedBy); 

public record QrAttendanceRequest(string QrCode, Guid SessionId, Guid RecordedBy); 

public record RevertAttendanceRequest(
    Guid AttendanceId, string RevertReason, Guid RevertedBy);
