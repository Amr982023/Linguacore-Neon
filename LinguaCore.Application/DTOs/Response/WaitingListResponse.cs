namespace LinguaCore.Application.DTOs.Response;

public record WaitingListResponse(
    Guid Id, Guid BranchId, string BranchName,
    Guid LanguageId,   // ? ADD
    Guid LevelId,      // ? ADD
    string LanguageName, string LevelCode,
    string Name, string Phone, string? Email,
    decimal ReservationFee, DateTime RegisteredAt,
    int WaitingDays, string Status,
    string? AssignedToName, string? Notes,
    DateTime CreatedAt, DateTime ModifiedAt);
