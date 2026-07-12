using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

public interface IAuthService
{
    Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request);
    Task<ApiResponse<AuthResponse>> RegisterUserAsync(RegisterUserRequest request);
    Task<ApiResponse<bool>> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
    Task<ApiResponse<List<UserListResponse>>> GetAllUsersAsync();
    Task<ApiResponse<bool>> ToggleUserActiveAsync(Guid userId);
    Task<ApiResponse<bool>> ResetPasswordAsync(Guid userId, string newPassword);
    Task<ApiResponse<UserListResponse>> GetUserByIdAsync(Guid id);
    Task<ApiResponse<UserListResponse>> UpdateUserAsync(Guid userId, UpdateUserRequest req);
}
