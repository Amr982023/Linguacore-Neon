using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _service;
    public DashboardController(IDashboardService service) => _service = service;

    [HttpGet("financial")]
    [Authorize(Policy = PermissionPolicies.DashboardRead)]
    public async Task<IActionResult> GetFinancial(Guid? branchId, DateTime from, DateTime to)
        => Ok(await _service.GetFinancialSummaryAsync(branchId, from, to));

    [HttpGet("students")]
    [Authorize(Policy = PermissionPolicies.DashboardRead)]
    public async Task<IActionResult> GetStudents(Guid? branchId, string? period)
    => Ok(await _service.GetStudentSummaryAsync(branchId, period));

    [HttpGet("groups")]
    [Authorize(Policy = PermissionPolicies.DashboardRead)]
    public async Task<IActionResult> GetGroups(Guid? branchId)
        => Ok(await _service.GetGroupSummaryAsync(branchId));

    [HttpGet("groups-rich")]
    [Authorize(Policy = PermissionPolicies.DashboardRead)]
    public async Task<IActionResult> GetGroupsRich(Guid? branchId)
        => Ok(await _service.GetGroupSummaryRichAsync(branchId));

    [HttpGet("payments-rich")]
    [Authorize(Policy = PermissionPolicies.DashboardRead)]
    public async Task<IActionResult> GetPaymentsRich(Guid? branchId, string? period)
        => Ok(await _service.GetPaymentSummaryRichAsync(branchId, period));

    [HttpGet("instructors-rich")]
    [Authorize(Policy = PermissionPolicies.DashboardRead)]
    public async Task<IActionResult> GetInstructorsRich(Guid? branchId, string? period)
        => Ok(await _service.GetInstructorSummaryRichAsync(branchId, period));

    [HttpGet("exams-rich")]
    [Authorize(Policy = PermissionPolicies.DashboardRead)]
    public async Task<IActionResult> GetExamsRich(Guid? branchId, string? period)
        => Ok(await _service.GetExamSummaryRichAsync(branchId, period));

    [HttpGet("waiting-rich")]
    [Authorize(Policy = PermissionPolicies.DashboardRead)]
    public async Task<IActionResult> GetWaitingRich(Guid? branchId)
        => Ok(await _service.GetWaitingSummaryRichAsync(branchId));

    [HttpGet("cash-drawer")]
    [Authorize(Policy = PermissionPolicies.DashboardRead)]
    public async Task<IActionResult> GetCashDrawer(Guid? branchId)
    => Ok(await _service.GetCashDrawerAsync(branchId));
}