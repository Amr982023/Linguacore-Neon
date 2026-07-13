using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CertificatesController : ControllerBase
{
    private readonly ICertificateService _service;
    public CertificatesController(ICertificateService service) => _service = service;

    [HttpGet("branch/{branchId}")]
    [Authorize(Policy = PermissionPolicies.CertificatesRead)]
    public async Task<IActionResult> GetByBranch(Guid branchId)
        => Ok(await _service.GetByBranchAsync(branchId));

    // ── New: offset-paginated, server-side filtered ─────────────────────────
    // GET /api/certificates/branch/{branchId}/paged
    //     ?search=ali&languageId=...&levelId=...&groupId=...&page=1&pageSize=10
    [HttpGet("branch/{branchId:guid}/paged")]
    [Authorize(Policy = PermissionPolicies.CertificatesRead)]
    public async Task<IActionResult> GetByBranchPaged(Guid branchId, [FromQuery] CertificateFilterRequest filter)
    {
        var result = await _service.GetByBranchPagedAsync(filter with { BranchId = branchId });
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("{id}")]
    [Authorize(Policy = PermissionPolicies.CertificatesRead)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }
}