namespace LinguaCore.Application.DTOs.Response;

public record PersonResponse(
    Guid Id, string FirstName, string? SecondName, string LastName,
    string? NationalId, int? Age, string? Gender,
    string? Phone, string? WhatsappNumber,
    string? Address, string? Email);
