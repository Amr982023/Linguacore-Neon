using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InstructorsController : ControllerBase
{
    private readonly IInstructorService _service;
    public InstructorsController(IInstructorService service) => _service = service;

    [HttpGet("branch/{branchId}")]
    [Authorize(Policy = PermissionPolicies.InstructorsRead)]
    public async Task<IActionResult> GetByBranch(Guid branchId)
        => Ok(await _service.GetByBranchAsync(branchId));

    [HttpGet("{id}")]
    [Authorize(Policy = PermissionPolicies.InstructorsRead)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpGet("language/{languageId}")]
    [Authorize(Policy = PermissionPolicies.InstructorsRead)]
    public async Task<IActionResult> GetByLanguage(Guid languageId)
        => Ok(await _service.GetByLanguageAsync(languageId));

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.InstructorsWrite)]
    public async Task<IActionResult> Create([FromBody] CreateInstructorRequest req)
    {
        var result = await _service.CreateAsync(req);
        return result.Success
            ? CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result)
            : BadRequest(result);
    }
    [HttpPatch("{id}/toggle-active")]
    [Authorize(Policy = PermissionPolicies.InstructorsWrite)]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var result = await _service.ToggleActiveAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }
    [HttpPut]
    [Authorize(Policy = PermissionPolicies.InstructorsWrite)]
    public async Task<IActionResult> Update([FromBody] UpdateInstructorRequest req)
    {
        var result = await _service.UpdateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}