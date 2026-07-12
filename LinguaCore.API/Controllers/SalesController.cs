using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LinguaCore.API.Controllers
{
    [ApiController]
    [Route("api/sales")]
    public class SalesController : ControllerBase
    {
        private readonly ISalesService _salesService;
        public SalesController(ISalesService salesService) => _salesService = salesService;

        [HttpPost]
        [Authorize(Policy = PermissionPolicies.SalesWrite)]
        public async Task<IActionResult> CreateSale(CreateSaleRequest req)
        {
            var result = await _salesService.CreateSaleAsync(req);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpGet]
        [Authorize(Policy = PermissionPolicies.SalesRead)]
        public async Task<IActionResult> GetSales(
     [FromQuery] Guid branchId, [FromQuery] DateTime? from, [FromQuery] DateTime? to,
     [FromQuery] int page = 1, [FromQuery] int pageSize = 8)
     => Ok(await _salesService.GetSalesAsync(branchId, from, to, page, pageSize));

        [HttpGet("stats")]
        [Authorize(Policy = PermissionPolicies.SalesRead)]
        public async Task<IActionResult> GetStats([FromQuery] Guid branchId)
            => Ok(await _salesService.GetStatsAsync(branchId));
    }
}
