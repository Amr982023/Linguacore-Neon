namespace LinguaCore.Application.DTOs.Request;

public record CreateInstructorRequest(
    string FirstName, string? SecondName, string LastName,
    string? NationalId, int? Age, string? Gender,
    string? Phone, string? WhatsappNumber, string? Address,
    string? Email, Guid BranchId,
    IEnumerable<Guid> LanguageIds);

public record UpdateInstructorRequest(
    Guid Id,
    string FirstName, string? SecondName, string LastName,
    string? NationalId, int? Age, string? Gender,
    string? Phone, string? WhatsappNumber, string? Address,
    string? Email, bool IsActive,
    IEnumerable<Guid> LanguageIds);