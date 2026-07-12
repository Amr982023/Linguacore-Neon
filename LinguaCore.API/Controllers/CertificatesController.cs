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

    [HttpGet("{id}")]
    [Authorize(Policy = PermissionPolicies.CertificatesRead)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }
}