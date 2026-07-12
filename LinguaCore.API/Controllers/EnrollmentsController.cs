using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EnrollmentsController : ControllerBase
{
    private readonly IEnrollmentService _service;
    public EnrollmentsController(IEnrollmentService service) => _service = service;

    [HttpGet("student/{studentId}")]
    [Authorize(Policy = PermissionPolicies.StudentsRead)]
    public async Task<IActionResult> GetByStudent(Guid studentId)
        => Ok(await _service.GetByStudentAsync(studentId));

    [HttpGet("group/{groupId}")]
    [Authorize(Policy = PermissionPolicies.GroupsRead)]
    public async Task<IActionResult> GetByGroup(Guid groupId)
        => Ok(await _service.GetByGroupAsync(groupId));

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.StudentsWrite)]
    public async Task<IActionResult> Create([FromBody] CreateEnrollmentRequest req)
    {
        var result = await _service.CreateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("partial")]
    [Authorize(Policy = PermissionPolicies.StudentsWrite)]
    public async Task<IActionResult> CreatePartial([FromBody] CreatePartialEnrollmentRequest req)
    {
        var result = await _service.CreatePartialAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("status")]
    [Authorize(Policy = PermissionPolicies.StudentsWrite)]
    public async Task<IActionResult> UpdateStatus([FromBody] UpdateEnrollmentStatusRequest req)
    {
        var result = await _service.UpdateStatusAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ?? Unenroll — hard delete for PENDING / PARTIAL with no payments ?????????
    // Use this to undo a mistakenly added enrollment before any payment is recorded.
    // Returns 400 with a clear message if the enrollment has payments or is ACTIVE/OVERDUE
    // (those must go through early-exit-refund instead).
    [HttpDelete("{id}")]
    [Authorize(Policy = PermissionPolicies.StudentsWrite)]
    public async Task<IActionResult> Unenroll(Guid id)
    {
        var result = await _service.UnenrollAsync(id);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{enrollmentId}/refund-preview")]
    [Authorize(Policy = PermissionPolicies.PaymentsWrite)]
    public async Task<IActionResult> GetRefundPreview(Guid enrollmentId)
    {
        var result = await _service.GetRefundPreviewAsync(enrollmentId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ?? Early exit with refund — for ACTIVE / OVERDUE with payments ???????????
    [HttpPost("early-exit-refund")]
    [Authorize(Policy = PermissionPolicies.PaymentsWrite)]
    public async Task<IActionResult> EarlyExitRefund([FromBody] EarlyExitRefundRequest req)
    {
        var result = await _service.ProcessEarlyExitRefundAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("refunds/branch/{branchId:guid}")]
    [Authorize(Policy = PermissionPolicies.PaymentsRead)]
    public async Task<IActionResult> GetRefundsByBranch(
      Guid branchId,
      [FromQuery] DateTime? from = null,
      [FromQuery] DateTime? to = null)
    {
        var result = await _service.GetRefundsByBranchAsync(branchId, from, to);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}