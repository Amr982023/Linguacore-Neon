using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Application.Services;
using LinguaCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _service;
    public SessionsController(ISessionService service) => _service = service;

    [HttpGet("group/{groupId}")]
    [Authorize(Policy = PermissionPolicies.SessionsRead)]
    public async Task<IActionResult> GetByGroup(Guid groupId)
        => Ok(await _service.GetByGroupAsync(groupId));

    [HttpGet("hall/{hallId}")]
    [Authorize(Policy = PermissionPolicies.SessionsRead)]
    public async Task<IActionResult> GetByHall(Guid hallId, DateTime? from, DateTime? to)
        => Ok(await _service.GetByHallAsync(hallId, from, to));

    [HttpGet("zoom/{zoomId}")]
    [Authorize(Policy = PermissionPolicies.SessionsRead)]
    public async Task<IActionResult> GetByZoom(Guid zoomId, DateTime? from, DateTime? to)
        => Ok(await _service.GetByZoomAccountAsync(zoomId, from, to));

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.SessionsWrite)]
    public async Task<IActionResult> Create([FromBody] CreateSessionRequest req)
    {
        var result = await _service.CreateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut]
    [Authorize(Policy = PermissionPolicies.SessionsWrite)]
    public async Task<IActionResult> Update([FromBody] UpdateSessionRequest req)
    {
        var result = await _service.UpdateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{sessionId}/attendance")]
    [Authorize(Policy = PermissionPolicies.AttendanceRead)]
    public async Task<IActionResult> GetAttendance(Guid sessionId)
        => Ok(await _service.GetAttendanceBySessionAsync(sessionId));

    [HttpPost("attendance/manual")]
    [Authorize(Policy = PermissionPolicies.AttendanceWrite)]
    public async Task<IActionResult> MarkAttendance([FromBody] MarkAttendanceRequest req)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _service.MarkAttendanceAsync(req with { RecordedBy = userId });
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("attendance/qr")]
    [Authorize(Policy = PermissionPolicies.AttendanceWrite)]
    public async Task<IActionResult> QrAttendance([FromBody] QrAttendanceRequest req)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _service.QrAttendanceAsync(req with { RecordedBy = userId });
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("attendance/revert")]
    [Authorize(Policy = PermissionPolicies.AttendanceRevert)]
    public async Task<IActionResult> RevertAttendance([FromBody] RevertAttendanceRequest req)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _service.RevertAttendanceAsync(req with { RevertedBy = userId });
        return result.Success ? Ok(result) : BadRequest(result);
    }
    [HttpGet("next-number")]
    public async Task<IActionResult> GetNextSessionNumber(
    [FromQuery] Guid groupId,
    [FromQuery] Guid periodLabelId)
    {
        var result = await _service.GetNextSessionNumberAsync(groupId, periodLabelId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("branch/{branchId}")]
    [Authorize(Policy = PermissionPolicies.SessionsRead)]
    public async Task<IActionResult> GetByBranch(Guid branchId, [FromQuery] SessionQueryParams filter)
    {
        var result = await _service.GetByBranchPagedAsync(branchId, filter);
        return result.Success ? Ok(result) : BadRequest(result);
    }
    [HttpGet("branch/{branchId}/stats")]
    [Authorize(Policy = PermissionPolicies.SessionsRead)]
    public async Task<IActionResult> GetBranchStats(Guid branchId)
    {
        var result = await _service.GetBranchStatsAsync(branchId);

        return Ok(ApiResponse<object>.Ok(new
        {
            scheduled = result.Data?.Scheduled ?? 0,
            completed = result.Data?.Completed ?? 0,
            cancelled = result.Data?.Cancelled ?? 0,
        })); 
    }
}