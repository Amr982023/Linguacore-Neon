using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LinguaCore.API.Controllers
{
    [ApiController]
    [Route("api/store")]
    public class StoreController : ControllerBase
    {
        private readonly IStoreService _storeService;
        public StoreController(IStoreService storeService) => _storeService = storeService;

        [HttpGet("categories")]
        [Authorize(Policy = PermissionPolicies.StoreRead)]
        public async Task<IActionResult> GetCategories()
            => Ok(await _storeService.GetCategoriesAsync());

        [HttpPost("categories")]
        [Authorize(Policy = PermissionPolicies.StoreWrite)]
        public async Task<IActionResult> CreateCategory(CreateItemCategoryRequest req)
        {
            var result = await _storeService.CreateCategoryAsync(req);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPut("categories")]
        [Authorize(Policy = PermissionPolicies.StoreWrite)]
        public async Task<IActionResult> UpdateCategory(UpdateItemCategoryRequest req)
        {
            var result = await _storeService.UpdateCategoryAsync(req);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpGet("items")]
        [Authorize(Policy = PermissionPolicies.StoreRead)]
        public async Task<IActionResult> GetItems([FromQuery] Guid branchId, [FromQuery] Guid? categoryId, [FromQuery] bool lowStockOnly = false)
            => Ok(await _storeService.GetItemsAsync(branchId, categoryId, lowStockOnly));

        [HttpPost("items")]
        [Authorize(Policy = PermissionPolicies.StoreWrite)]
        public async Task<IActionResult> CreateItem(CreateStoreItemRequest req)
        {
            var result = await _storeService.CreateItemAsync(req);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPut("items")]
        [Authorize(Policy = PermissionPolicies.StoreWrite)]
        public async Task<IActionResult> UpdateItem(UpdateStoreItemRequest req)
        {
            var result = await _storeService.UpdateItemAsync(req);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("items/restock")]
        [Authorize(Policy = PermissionPolicies.StoreWrite)]
        public async Task<IActionResult> Restock(RestockRequest req)
        {
            var result = await _storeService.RestockAsync(req);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpDelete("items/{id}")]
        [Authorize(Policy = PermissionPolicies.StoreWrite)]
        public async Task<IActionResult> DeleteItem(Guid id)
        {
            var result = await _storeService.DeleteItemAsync(id);
            return result.Success ? Ok(result) : BadRequest(result);
        }
    }
}
