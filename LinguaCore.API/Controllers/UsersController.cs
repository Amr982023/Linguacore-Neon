using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;
using System.Security.Claims;
using LinguaCore.Application.DTOs.Request.Filters;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IAuthService _auth;
    public UsersController(IAuthService auth) => _auth = auth;

    /// <summary>List all users — Super Admin only.</summary>
    [HttpGet]
    [Authorize(Policy = PermissionPolicies.UsersManage)]
    public async Task<IActionResult> GetAll()
        => Ok(await _auth.GetAllUsersAsync());

    /// <summary>Get a single user by id.
    /// Super Admin can get anyone; regular users can only get themselves.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var callerId = Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());

        // Non-super-admin users may only view their own profile
        if (!User.IsInRole("Super Admin") && callerId != id)
            return Forbid();

        var result = await _auth.GetUserByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    /// <summary>Paged, branch-scoped, filterable user list — used by Branch Overview.</summary>
    [HttpGet("branch/{branchId:guid}/paged")]
    [Authorize(Policy = PermissionPolicies.UsersManage)]
    public async Task<IActionResult> GetByBranchPaged(Guid branchId, [FromQuery] UserFilterRequest filter)
        => Ok(await _auth.GetByBranchPagedAsync(branchId, filter));

    /// <summary>Create a new user — Super Admin only.</summary>
    [HttpPost]
    [Authorize(Policy = PermissionPolicies.UsersManage)]
    public async Task<IActionResult> Create([FromBody] RegisterUserRequest req)
    {
        var result = await _auth.RegisterUserAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>Update a user's profile.
    /// Super Admin can update anyone; users can only update themselves.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest req)
    {
        var callerId = Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());

        if (!User.IsInRole("Super Admin") && callerId != id)
            return Forbid();

        var result = await _auth.UpdateUserAsync(id, req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>Toggle IsActive — Super Admin only.</summary>
    [HttpPut("{id:guid}/toggle-active")]
    [Authorize(Policy = PermissionPolicies.UsersManage)]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var result = await _auth.ToggleUserActiveAsync(id);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>Reset password — Super Admin only.</summary>
    [HttpPut("{id:guid}/reset-password")]
    [Authorize(Policy = PermissionPolicies.UsersManage)]
    public async Task<IActionResult> ResetPassword(
        Guid id, [FromBody] ResetPasswordRequest req)
    {
        var result = await _auth.ResetPasswordAsync(id, req.NewPassword);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}