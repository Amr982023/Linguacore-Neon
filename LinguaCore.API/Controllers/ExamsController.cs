using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExamsController : ControllerBase
{
    private readonly IExamService _service;
    public ExamsController(IExamService service) => _service = service;

    [HttpPut]
    [Authorize(Policy = PermissionPolicies.ExamsWrite)]
    public async Task<IActionResult> Update([FromBody] UpdateExamRequest req)
    {
        var result = await _service.UpdateAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{examId}/ranking")]
    [Authorize(Policy = PermissionPolicies.ExamsRead)]
    public async Task<IActionResult> GetRankingByExam(Guid examId)
    => Ok(await _service.GetRankingByExamAsync(examId));

    [HttpGet("group/{groupId}")]
    [Authorize(Policy = PermissionPolicies.ExamsRead)]
    public async Task<IActionResult> GetByGroup(Guid groupId)
        => Ok(await _service.GetByGroupAsync(groupId));

    [HttpGet("{examId}/results")]
    [Authorize(Policy = PermissionPolicies.ExamsRead)]
    public async Task<IActionResult> GetResults(Guid examId)
        => Ok(await _service.GetResultsByExamAsync(examId));

    [HttpGet("student/{studentId}/results")]
    [Authorize(Policy = PermissionPolicies.ExamsRead)]
    public async Task<IActionResult> GetResultsByStudent(Guid studentId)
        => Ok(await _service.GetResultsByStudentAsync(studentId));

    [HttpGet("group/{groupId}/ranking")]
    [Authorize(Policy = PermissionPolicies.ExamsRead)]
    public async Task<IActionResult> GetRanking(Guid groupId)
        => Ok(await _service.GetRankingByGroupAsync(groupId));

    [HttpPost]
    [Authorize(Policy = PermissionPolicies.ExamsWrite)]
    public async Task<IActionResult> Create([FromBody] CreateExamRequest req)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var currentUserId))
            return Unauthorized("Invalid user identity.");
        var result = await _service.CreateAsync(req, currentUserId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("result")]
    [Authorize(Policy = PermissionPolicies.ExamsWrite)]
    public async Task<IActionResult> AddResult([FromBody] AddExamResultRequest req)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var currentUserId))
            return Unauthorized("Invalid user identity.");
        var result = await _service.AddResultAsync(req, currentUserId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{examResultId}/certificate")]
    [Authorize(Policy = PermissionPolicies.ExamsWrite)]
    public async Task<IActionResult> IssueCertificate(Guid examResultId)
    {
        var result = await _service.IssueCertificateAsync(examResultId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ?? NEW: branch-wide paginated + filtered exam list, newest-created-first ??
    [HttpGet("branch/{branchId}")]
    [Authorize(Policy = PermissionPolicies.ExamsRead)]
    public async Task<IActionResult> GetByBranch(Guid branchId, [FromQuery] ExamFilterRequest filter)
    {
        var result = await _service.GetByBranchAsync(branchId, filter);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ?? NEW: lightweight dropdown-source list for the ranking filter UI ????????
    [HttpGet("branch/{branchId}/options")]
    [Authorize(Policy = PermissionPolicies.ExamsRead)]
    public async Task<IActionResult> GetExamOptions(
        Guid branchId, [FromQuery] Guid? groupId, [FromQuery] Guid? languageId, [FromQuery] Guid? levelId)
        => Ok(await _service.GetExamOptionsAsync(branchId, groupId, languageId, levelId));

    // ?? NEW: branch-wide aggregated + paginated ranking ?????????????????????????
    [HttpGet("branch/{branchId}/ranking")]
    [Authorize(Policy = PermissionPolicies.ExamsRead)]
    public async Task<IActionResult> GetRankingByBranch(Guid branchId, [FromQuery] RankingFilterRequest filter)
    {
        var result = await _service.GetRankingByBranchAsync(branchId, filter);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}