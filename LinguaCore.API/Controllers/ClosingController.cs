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
public class ClosingController : ControllerBase
{
    private readonly IClosingService _service;
    public ClosingController(IClosingService service) => _service = service;

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> Create([FromBody] CreateGenericClosingRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                              ?? User.FindFirstValue("sub")!);
        var safeReq = req with { CreatedBy = userId };
        var result = await _service.CreateGenericClosingAsync(safeReq);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("confirm")]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> Confirm([FromBody] ConfirmGenericClosingRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                              ?? User.FindFirstValue("sub")!);
        var safeReq = req with { ConfirmedBy = userId };
        var result = await _service.ConfirmClosingAsync(safeReq);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("paid")]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> MarkPaid([FromBody] MarkGenericClosingPaidRequest req)
    {
        var result = await _service.MarkClosingPaidAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PermissionPolicies.ClosingsRead)]
    public async Task<IActionResult> GetDetails(Guid id)
    {
        var result = await _service.GetClosingDetailsAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var res = await _service.DeleteClosingAsync(id);
            return res.Success ? Ok(res) : BadRequest(res);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message, inner = ex.InnerException?.Message });
        }
    }
 

    /// <summary>Adds an ad-hoc bonus to a specific instructor row within a DRAFT closing.</summary>
    [HttpPost("{id:guid}/instructor-bonuses")]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> AddInstructorBonus(
        Guid id, [FromBody] AddInstructorBonusRequest req)
    {
        var result = await _service.AddInstructorBonusAsync(id, req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpDelete("{id:guid}/instructor-bonuses/{bonusId:guid}")]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> RemoveInstructorBonus(Guid id, Guid bonusId)
    {
        var result = await _service.RemoveInstructorBonusAsync(
            id, new RemoveInstructorBonusRequest(bonusId));
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>Adds an ad-hoc salary deduction to a specific instructor row within a DRAFT closing.</summary>
    [HttpPost("{id:guid}/instructor-salary-deductions")]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> AddInstructorSalaryDeduction(
        Guid id, [FromBody] AddInstructorSalaryDeductionRequest req)
    {
        var result = await _service.AddInstructorSalaryDeductionAsync(id, req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpDelete("{id:guid}/instructor-salary-deductions/{deductionId:guid}")]
    [Authorize(Policy = PermissionPolicies.ClosingsWrite)]
    public async Task<IActionResult> RemoveInstructorSalaryDeduction(Guid id, Guid deductionId)
    {
        var result = await _service.RemoveInstructorSalaryDeductionAsync(
            id, new RemoveInstructorSalaryDeductionRequest(deductionId));
        return result.Success ? Ok(result) : BadRequest(result);
    }



    /// <summary>
    /// Returns lightweight audit flags for multiple closings at once.
    /// Used to populate the Flags column in the closing list without loading full details.
    /// </summary>
    [HttpGet("audit-flags/{branchId:guid}")]
    [Authorize(Policy = PermissionPolicies.ClosingsRead)]
    public async Task<IActionResult> GetAuditFlags(Guid branchId)
    {
        var result = await _service.GetAuditFlagsAsync(branchId);
        return Ok(result);
    }
    [HttpGet("branch/{branchId:guid}")]
    [Authorize(Policy = PermissionPolicies.ClosingsRead)]
    public async Task<IActionResult> GetByBranch(Guid branchId)
    {
        var result = await _service.GetByBranchAsync(branchId);
        return Ok(result);
    }

    [HttpGet("instructor/{instructorId:guid}")]
    [Authorize(Policy = PermissionPolicies.ClosingsRead)]
    public async Task<IActionResult> GetByInstructor(Guid instructorId)
    {
        var result = await _service.GetByInstructorAsync(instructorId);
        return Ok(result);
    }
}