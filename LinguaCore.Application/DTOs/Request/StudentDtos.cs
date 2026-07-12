namespace LinguaCore.Application.DTOs.Request;

public record CreateStudentRequest(
    string FirstName,
    string? SecondName,
    string LastName,
    string? NationalId,
    int? Age,
    string? Gender,
    string? Phone,
    string? WhatsappNumber,
    string? Address,
    string? Email,
    Guid BranchId,
    string AttendanceMode,
    Guid? GoalId,
    Guid? NestedGoalId,     // ? ADD
    string? Notes);

public record UpdateStudentRequest(
    Guid Id,
    string FirstName,
    string? SecondName,
    string LastName,
    string? NationalId,
    int? Age,
    string? Gender,
    string? Phone,
    string? WhatsappNumber,
    string? Address,
    string? Email,
    string AttendanceMode,
    Guid? GoalId,
    Guid? NestedGoalId,     // ? ADD
    string? Notes,
    bool IsActive);
