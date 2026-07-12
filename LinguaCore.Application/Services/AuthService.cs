using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _uow;
    private readonly IConfiguration _config;

    public AuthService(IUnitOfWork uow, IConfiguration config)
    {
        _uow = uow;
        _config = config;
    }

    public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _uow.Users.GetByEmailAsync(request.Email);

        Console.WriteLine($"[Debug] User found: {user is not null}");
        if (user is not null)
        {
            Console.WriteLine($"[Debug] PasswordHash starts with: {user.PasswordHash?[..Math.Min(10, user.PasswordHash.Length)]}");
            // BCrypt hashes always start with $2a$ or $2b$
        }

        if (user is null)
            return ApiResponse<AuthResponse>.Fail("Invalid email or password.");

        bool passwordOk;
        try
        {
            passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AuthService] BCrypt.Verify threw: {ex.Message}");
            return ApiResponse<AuthResponse>.Fail("Invalid email or password.");
        }

        if (!passwordOk)
            return ApiResponse<AuthResponse>.Fail("Invalid email or password.");

        if (!user.IsActive)
            return ApiResponse<AuthResponse>.Fail("Account is deactivated.");

        // Ensure Role navigation property is loaded
        if (user.Role is null)
        {
            var fullUser = await _uow.Users.GetWithRoleAsync(user.Id);
            if (fullUser is not null) user = fullUser;
        }

        var token = GenerateJwt(user);
        var refresh = GenerateRefreshToken();
        var perms = NormalisePermissions(user.Role?.Permissions);

        return ApiResponse<AuthResponse>.Ok(new AuthResponse(
            token, refresh,
            user.Id, user.Name, user.Email,
            user.Role?.Name ?? string.Empty,
            perms,
            user.BranchId,
            DateTime.UtcNow.AddHours(8)));
    }

    public async Task<ApiResponse<AuthResponse>> RegisterUserAsync(RegisterUserRequest request)
    {
        if (await _uow.Users.AnyAsync(u => u.Email == request.Email))
            return ApiResponse<AuthResponse>.Fail("Email already exists.");

        var person = new Person
        {
            FirstName = request.FirstName,
            SecondName = request.SecondName,
            LastName = request.LastName,
            NationalId = request.NationalId,
            Age = request.Age,
            Gender = request.Gender,
            Phone = request.Phone,
            WhatsappNumber = request.WhatsappNumber,
            Address = request.Address,
            Email = request.Email,
        };
        await _uow.Repository<Person>().AddAsync(person);

        var user = new User
        {
            PersonId = person.Id,
            BranchId = request.BranchId,
            RoleId = request.RoleId,
            Name = $"{request.FirstName} {request.LastName}",
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsActive = true,
        };
        await _uow.Users.AddAsync(user);
        await _uow.SaveChangesAsync();

        var fullUser = await _uow.Users.GetWithRoleAsync(user.Id);
        var token = GenerateJwt(fullUser!);
        var perms = NormalisePermissions(fullUser!.Role?.Permissions);

        return ApiResponse<AuthResponse>.Ok(new AuthResponse(
            token, GenerateRefreshToken(),
            user.Id, user.Name, user.Email,
            fullUser.Role?.Name ?? string.Empty,
            perms,
            user.BranchId,
            DateTime.UtcNow.AddHours(8)));
    }

    private static UserListResponse MapUser(LinguaCore.Domain.Entities.User u) =>
           new(
               u.Id,
               u.Name,
               u.Email,
               u.Role?.Name ?? "—",
               u.RoleId,
               u.BranchId,
               u.Branch?.Name ?? "—",
               u.IsActive,
               u.CreatedAt,
               u.Person?.FirstName,
               u.Person?.SecondName,
               u.Person?.LastName,
               u.Person?.Phone,
               u.Person?.WhatsappNumber,
               u.Person?.Address,
               u.Person?.NationalId,
               u.Person?.Age,
               u.Person?.Gender
           );

    public async Task<ApiResponse<List<UserListResponse>>> GetAllUsersAsync()
    {
        var users = await _uow.Users.GetAllWithDetailsAsync();
        return ApiResponse<List<UserListResponse>>.Ok(
            users.Select(MapUser).ToList());
    }

    public async Task<ApiResponse<UserListResponse>> GetUserByIdAsync(Guid id)
    {
        var user = await _uow.Users.GetWithDetailsAsync(id);
        if (user is null)
            return ApiResponse<UserListResponse>.Fail("User not found.");
        return ApiResponse<UserListResponse>.Ok(MapUser(user));
    }

    public async Task<ApiResponse<bool>> ToggleUserActiveAsync(Guid userId)
    {
        var user = await _uow.Users.GetByIdAsync(userId);
        if (user is null) return ApiResponse<bool>.Fail("User not found.");
        user.IsActive = !user.IsActive;
        user.ModifiedAt = DateTime.UtcNow;
        _uow.Users.Update(user);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> ResetPasswordAsync(
        Guid userId, string newPassword)
    {
        var user = await _uow.Users.GetByIdAsync(userId);
        if (user is null) return ApiResponse<bool>.Fail("User not found.");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.ModifiedAt = DateTime.UtcNow;
        _uow.Users.Update(user);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<UserListResponse>> UpdateUserAsync(
        Guid userId, UpdateUserRequest req)
    {
        var user = await _uow.Users.GetWithDetailsAsync(userId);
        if (user is null)
            return ApiResponse<UserListResponse>.Fail("User not found.");

        // Update Person fields
        if (user.Person is not null)
        {
            user.Person.FirstName = req.FirstName;
            user.Person.SecondName = req.SecondName;
            user.Person.LastName = req.LastName;
            user.Person.Phone = req.Phone;
            user.Person.WhatsappNumber = req.WhatsappNumber;
            user.Person.Address = req.Address;
            user.Person.NationalId = req.NationalId;
            user.Person.Age = req.Age;
            user.Person.Gender = req.Gender;
            user.Person.ModifiedAt = DateTime.UtcNow;
        }

        // Update User display name
        user.Name = $"{req.FirstName} {req.LastName}".Trim();
        user.ModifiedAt = DateTime.UtcNow;

        // Role / Branch — only if provided (Super Admin fields)
        if (req.RoleId.HasValue) user.RoleId = req.RoleId.Value;
        if (req.BranchId.HasValue) user.BranchId = req.BranchId.Value;

        _uow.Users.Update(user);
        await _uow.SaveChangesAsync();

        // Reload to return updated data
        var updated = await _uow.Users.GetWithDetailsAsync(userId);
        return ApiResponse<UserListResponse>.Ok(MapUser(updated!));
    }
    

    public async Task<ApiResponse<bool>> ChangePasswordAsync(
        Guid userId, string currentPassword, string newPassword)
    {
        var user = await _uow.Users.GetByIdAsync(userId);
        if (user is null)
            return ApiResponse<bool>.Fail("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            return ApiResponse<bool>.Fail("Current password is incorrect.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        _uow.Users.Update(user);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

 


   
    // ?? Helpers ???????????????????????????????????????????????????????????????

    /// <summary>
    /// Converts whatever is stored in Role.Permissions to a plain integer string.
    ///
    /// Handles all known formats:
    ///   "536870912"      ? "536870912"   (already correct)
    ///   "{"all": true}"  ? "536870912"   (old JSON format — map to Permission.All)
    ///   "{}"             ? "0"
    ///   null / ""        ? "0"
    /// </summary>
    private static string NormalisePermissions(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return "0";

        // Already a valid integer string
        if (long.TryParse(raw, out _))
            return raw;

        // Legacy JSON format — {"all": true} means full access
        if (raw.Contains("\"all\"") && raw.Contains("true"))
            return "536870912"; // Permission.All = 1 << 29

        // Any other JSON / unknown format ? no permissions
        return "0";
    }

    private string GenerateJwt(User user)
    {
        var jwtKey = _config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey))
            throw new InvalidOperationException("JWT key 'Jwt:Key' is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var perms = NormalisePermissions(user.Role?.Permissions);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new("branchId",                    user.BranchId.ToString()),
            new(ClaimTypes.Role,               user.Role?.Name ?? string.Empty),
            new("permissions",                 perms),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }
}