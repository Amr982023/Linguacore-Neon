namespace LinguaCore.Application.DTOs.Response;

public record AuthResponse(
    string Token, string RefreshToken,
    Guid UserId, string Name, string Email,
    string RoleName, string? Permissions,
    Guid BranchId, DateTime ExpiresAt);
