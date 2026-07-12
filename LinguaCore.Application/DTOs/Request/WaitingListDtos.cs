using LinguaCore.Domain.Entities;

namespace LinguaCore.Application.DTOs.Request;

public record CreateWaitingListRequest(
    Guid BranchId, Guid LanguageId, Guid LevelId,
    string Name, string Phone, string? Email,
    decimal ReservationFee, Guid? AssignedTo, string? Notes);

public record UpdateWaitingListStatusRequest(Guid Id, string Status);

public record UpdateWaitingListRequest(
    Guid Id,
    string Name,
    string Phone,
    string? Email,
    Guid LanguageId,
    Guid LevelId,
    decimal ReservationFee,
    Guid? AssignedTo,
    string? Notes
);
public record ConvertToStudentRequest(
    Guid WaitingListId,
    string? NationalId,
    int? Age,
    string? Gender,
    string? WhatsappNumber,
    string? Address,
    string? SecondName,
    string? AttendanceMode,
    Guid? GoalId,
    Guid? NestedGoalId
);