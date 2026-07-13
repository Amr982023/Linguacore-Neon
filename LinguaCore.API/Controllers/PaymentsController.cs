using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using LinguaCore.Application.DTOs.Request.Filters;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _service;
    public PaymentsController(IPaymentService service) => _service = service;

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.PaymentsWrite)]
    public async Task<IActionResult> Create([FromBody] CreatePaymentRequest req)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                     ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdStr, out var userId))
            return BadRequest("Cannot resolve user from token.");
        var result = await _service.CreateAsync(req, userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("enrollment/{enrollmentId:guid}")]
    [Authorize(Policy = PermissionPolicies.PaymentsRead)]
    public async Task<IActionResult> GetByEnrollment(Guid enrollmentId)
        => Ok(await _service.GetByEnrollmentAsync(enrollmentId));

    [HttpGet("group/{groupId:guid}")]
    [Authorize(Policy = PermissionPolicies.PaymentsRead)]
    public async Task<IActionResult> GetByGroup(Guid groupId)
        => Ok(await _service.GetByGroupAsync(groupId));

    // ?? Legacy, unpaginated — kept until the frontend is migrated ??????????
    [HttpGet("period")]
    [Authorize(Policy = PermissionPolicies.PaymentsRead)]
    public async Task<IActionResult> GetByPeriod(
        [FromQuery] Guid branchId,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
        => Ok(await _service.GetByPeriodAsync(branchId, from, to));

    // ?? New: offset-paginated, server-side filtered ?????????????????????????
    // GET /api/payments/period/paged?branchId=...&from=...&to=...
    //     &page=1&pageSize=20&search=ali&languageId=...&levelId=...&status=unpaid
    [HttpGet("period/paged")]
    [Authorize(Policy = PermissionPolicies.PaymentsRead)]
    public async Task<IActionResult> GetByPeriodPaged([FromQuery] PaymentFilterRequest req)
    {
        var result = await _service.GetByPeriodPagedAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("settle-balance")]
    [Authorize(Policy = PermissionPolicies.PaymentsWrite)]
    public async Task<IActionResult> SettleBalance([FromBody] SettleOutstandingBalanceRequest req)
    {
        var result = await _service.SettleBalanceAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("debts/{branchId:guid}")]
    [Authorize(Policy = PermissionPolicies.PaymentsRead)]
    public async Task<IActionResult> GetDebts(
        Guid branchId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
        => Ok(await _service.GetDebtsByBranchAsync(branchId, from, to));

    // ?? Legacy, unpaginated — kept until the frontend is migrated ??????????
    [HttpGet("commission/instructor/{instructorId:guid}")]
    [Authorize(Policy = PermissionPolicies.PaymentsRead)]
    public async Task<IActionResult> GetCommission(
        Guid instructorId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
        => Ok(await _service.GetCommissionByInstructorAsync(instructorId, from, to));

    // ?? New: offset-paginated instructor commission history ?????????????????
    // GET /api/payments/commission/instructor/{instructorId}/paged
    //     ?from=...&to=...&page=1&pageSize=20
    [HttpGet("commission/instructor/{instructorId:guid}/paged")]
    [Authorize(Policy = PermissionPolicies.PaymentsRead)]
    public async Task<IActionResult> GetCommissionPaged(
        Guid instructorId,
        [FromQuery] CommissionLedgerFilterRequest filter)
    {
        // route param wins over any stray instructorId in the querystring
        var result = await _service.GetCommissionByInstructorPagedAsync(filter with { InstructorId = instructorId });
        return result.Success ? Ok(result) : BadRequest(result);
    }
}