using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Interfaces;
using LinguaCore.Infrastructure.Seeding;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IUnitOfWork _uow;
    private readonly IConfiguration _config;

    public AuthController(IAuthService auth, IUnitOfWork uow, IConfiguration config)
    {
        _auth = auth;
        _uow = uow;
        _config = config;
    }

    /// <summary>
    /// Returns true if at least one user exists.
    /// Used by the frontend to decide Login vs Initial Setup.
    /// </summary>
    [HttpGet("has-users")]
    [AllowAnonymous]
    public async Task<IActionResult> HasUsers()
    {
        var hasUsers = await _uow.Users.AnyAsync(u => true);
        return Ok(new { hasUsers });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        // ── Temporary diagnostics — REMOVE in production ──────────────────────
        Console.WriteLine($"[Login] Attempt for email: {req.Email}");
        Console.WriteLine(BCrypt.Net.BCrypt.HashPassword("amr123456"));


        var result = await _auth.LoginAsync(req);

        if (!result.Success)
            Console.WriteLine($"[Login] Failed for {req.Email}: {result.Message}");
        else
            Console.WriteLine($"[Login] Success for {req.Email}");
        // ── End diagnostics ───────────────────────────────────────────────────

        return result.Success ? Ok(result) : Unauthorized(result);
    }

    [HttpPost("register")]
    [AllowAnonymous] // enforced inside — only open when no users exist
    public async Task<IActionResult> Register([FromBody] RegisterUserRequest req)
    {
        var hasUsers = await _uow.Users.AnyAsync(u => true);

        if (hasUsers && !User.IsInRole("Super Admin"))
            return Forbid();

        var finalReq = req;

        if (!hasUsers)
        {
            var branchName = _config["Seeding:BranchName"] ?? "Main Branch";
            var branch = await _uow.Repository<LinguaCore.Domain.Entities.Branch>()
                                   .FirstOrDefaultAsync(b => b.Name == branchName);

            if (branch is null)
                return StatusCode(500, new
                {
                    success = false,
                    message = $"Branch '{branchName}' not found. " +
                              "Ensure seeding has run before registering the first user."
                });

            finalReq = req with
            {
                BranchId = branch.Id,
                RoleId = DatabaseSeeder.SeededSuperAdminRoleId,
            };
        }

        var result = await _auth.RegisterUserAsync(finalReq);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(
        Guid userId, string current, string newPwd)
    {
        var result = await _auth.ChangePasswordAsync(userId, current, newPwd);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}