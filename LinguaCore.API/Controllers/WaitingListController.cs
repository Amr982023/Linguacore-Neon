using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WaitingListController : ControllerBase
{
    private readonly IWaitingListService _service;
    public WaitingListController(IWaitingListService service) => _service = service;

    [HttpGet("branch/{branchId}")]
    [Authorize(Policy = PermissionPolicies.WaitingListRead)]
    public async Task<IActionResult> GetByBranch(
        Guid branchId, [FromQuery] WaitingListFilterRequest filter)
    {
        var result = await _service.GetByBranchAsync(branchId, filter);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("exceeding/{days}")]
    [Authorize(Policy = PermissionPolicies.WaitingListRead)]
    public async Task<IActionResult> GetExceeding(
        int days,
        [FromQuery] WaitingListFilterRequest filter,
        [FromQuery] Guid? branchId)
    {
        var result = await _service.GetExceedingThresholdAsync(days, filter, branchId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.WaitingListWrite)]
    public async Task<IActionResult> Create([FromBody] CreateWaitingListRequest req)
    {
        var result = await _service.CreateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut]
    [Authorize(Policy = PermissionPolicies.WaitingListWrite)]
    public async Task<IActionResult> Update([FromBody] UpdateWaitingListRequest req)
    {
        var result = await _service.UpdateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("status")]
    [Authorize(Policy = PermissionPolicies.WaitingListWrite)]
    public async Task<IActionResult> UpdateStatus([FromBody] UpdateWaitingListStatusRequest req)
    {
        var result = await _service.UpdateStatusAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("convert")]
    [Authorize(Policy = PermissionPolicies.WaitingListWrite)]
    public async Task<IActionResult> ConvertToStudent([FromBody] ConvertToStudentRequest req)
    {
        var result = await _service.ConvertToStudentAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}