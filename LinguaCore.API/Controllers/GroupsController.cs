using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _service;
    public GroupsController(IGroupService service) => _service = service;

    [HttpGet("branch/{branchId}")]
    [Authorize(Policy = PermissionPolicies.GroupsRead)]
    public async Task<IActionResult> GetByBranch(Guid branchId)
        => Ok(await _service.GetByBranchAsync(branchId));

    [HttpGet("{id}")]
    [Authorize(Policy = PermissionPolicies.GroupsRead)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpGet("language-level")]
    [Authorize(Policy = PermissionPolicies.GroupsRead)]
    public async Task<IActionResult> GetByLanguageLevel(
        [FromQuery] Guid languageId,
        [FromQuery] Guid levelId,
        [FromQuery] Guid? branchId)
    {
        var result = await _service.GetByLanguageLevelAsync(languageId, levelId, branchId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.GroupsWrite)]
    public async Task<IActionResult> Create([FromBody] CreateGroupRequest req)
    {
        var result = await _service.CreateAsync(req);
        return result.Success
            ? CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result)
            : BadRequest(result);
    }

    [HttpPut]
    [Authorize(Policy = PermissionPolicies.GroupsWrite)]
    public async Task<IActionResult> Update([FromBody] UpdateGroupRequest req)
    {
        var result = await _service.UpdateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = PermissionPolicies.GroupsWrite)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _service.DeleteAsync(id);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("change-instructor")]
    [Authorize(Policy = PermissionPolicies.GroupsWrite)]
    public async Task<IActionResult> ChangeInstructor([FromBody] ChangeGroupInstructorRequest req)
    {
        var result = await _service.ChangeInstructorAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("hall-conflict")]
    [Authorize(Policy = PermissionPolicies.GroupsRead)]
    public async Task<IActionResult> CheckHallConflict(
        Guid hallId, DateTime start, DateTime end, Guid? excludeSessionId)
        => Ok(await _service.CheckHallConflictAsync(hallId, start, end, excludeSessionId));

    [HttpGet("zoom-conflict")]
    [Authorize(Policy = PermissionPolicies.GroupsRead)]
    public async Task<IActionResult> CheckZoomConflict(
        Guid zoomId, DateTime start, DateTime end, Guid? excludeSessionId)
        => Ok(await _service.CheckZoomConflictAsync(zoomId, start, end, excludeSessionId));
}