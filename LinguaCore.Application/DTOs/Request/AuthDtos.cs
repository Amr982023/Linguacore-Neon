namespace LinguaCore.Application.DTOs.Request;

public record LoginRequest(string Email, string Password);

public record RegisterUserRequest(
    string FirstName, string? SecondName, string LastName,
    string? NationalId, int? Age, string? Gender,
    string? Phone, string? WhatsappNumber, string? Address,
    string Email, string Password,
    Guid BranchId, Guid RoleId);

public record ResetPasswordRequest(string NewPassword);

public record UpdateUserRequest(
    string FirstName,
    string? SecondName,
    string LastName,
    string? Phone,
    string? WhatsappNumber,
    string? Address,
    string? NationalId,
    int? Age,
    string? Gender,
    // Super Admin only fields (ignored silently for self-update)
    Guid? RoleId,
    Guid? BranchId
);

public record UserListResponse(
    Guid Id,
    string Name,
    string Email,
    string RoleName,
    Guid RoleId,
    Guid BranchId,
    string BranchName,
    bool IsActive,
    DateTime CreatedAt,
    // Person fields
    string? FirstName,
    string? SecondName,
    string? LastName,
    string? Phone,
    string? WhatsappNumber,
    string? Address,
    string? NationalId,
    int? Age,
    string? Gender
);
