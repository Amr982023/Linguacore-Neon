using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;
using LinguaCore.Application.DTOs.Request.Filters;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _service;
    public StudentsController(IStudentService service) => _service = service;

    [HttpGet("branch/{branchId}")]
    [Authorize(Policy = PermissionPolicies.StudentsRead)]
    public async Task<IActionResult> GetByBranch(Guid branchId)
        => Ok(await _service.GetByBranchAsync(branchId));

    [HttpGet("{id}")]
    [Authorize(Policy = PermissionPolicies.StudentsRead)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpGet("branch/{branchId}/paged")]
    [Authorize(Policy = PermissionPolicies.StudentsRead)]
    public async Task<IActionResult> GetByBranchPaged(Guid branchId, [FromQuery] StudentFilterRequest filter)
    => Ok(await _service.GetByBranchPagedAsync(branchId, filter));

    [HttpGet("qr/{qrCode}")]
    [Authorize(Policy = PermissionPolicies.AttendanceWrite)]
    public async Task<IActionResult> GetByQr(string qrCode)
    {
        var result = await _service.GetByQrCodeAsync(qrCode);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.StudentsWrite)]
    public async Task<IActionResult> Create([FromBody] CreateStudentRequest req)
    {
        var result = await _service.CreateAsync(req);
        return result.Success
            ? CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result)
            : BadRequest(result);
    }

    [HttpPut]
    [Authorize(Policy = PermissionPolicies.StudentsWrite)]
    public async Task<IActionResult> Update([FromBody] UpdateStudentRequest req)
    {
        var result = await _service.UpdateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = PermissionPolicies.StudentsWrite)]
    public async Task<IActionResult> Deactivate(Guid id)
        => Ok(await _service.DeactivateAsync(id));

    [HttpPost("{id}/regenerate-qr")]
    [Authorize(Policy = PermissionPolicies.StudentsWrite)]
    public async Task<IActionResult> RegenerateQr(Guid id)
        => Ok(await _service.RegenerateQrCodeAsync(id));
}