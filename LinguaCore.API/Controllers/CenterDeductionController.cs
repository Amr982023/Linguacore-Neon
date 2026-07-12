// API/Controllers/CenterDeductionController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;
using System.Security.Claims;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CenterDeductionController : ControllerBase
{
    private readonly ICenterDeductionService _service;
    public CenterDeductionController(ICenterDeductionService service) => _service = service;

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> Create([FromBody] CreateCenterDeductionRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                              ?? User.FindFirstValue("sub")!);
        var result = await _service.CreateAsync(req with { CreatedBy = userId });
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> Update([FromBody] UpdateCenterDeductionRequest req)
    {
        var result = await _service.UpdateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _service.DeleteAsync(id);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("branch/{branchId:guid}")]
    [Authorize(Policy = PermissionPolicies.ClosingsRead)]
    public async Task<IActionResult> GetByBranch(Guid branchId, DateTime? from, DateTime? to)
    {
        var result = await _service.GetByBranchAsync(branchId, from, to);
        return Ok(result);
    }
}