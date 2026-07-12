using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services
{
    public interface IStoreService
    {
        Task<ApiResponse<IEnumerable<ItemCategoryResponse>>> GetCategoriesAsync();
        Task<ApiResponse<ItemCategoryResponse>> CreateCategoryAsync(CreateItemCategoryRequest req);
        Task<ApiResponse<ItemCategoryResponse>> UpdateCategoryAsync(UpdateItemCategoryRequest req);

        Task<ApiResponse<IEnumerable<StoreItemResponse>>> GetItemsAsync(Guid branchId, Guid? categoryId, bool lowStockOnly);
        Task<ApiResponse<StoreItemResponse>> CreateItemAsync(CreateStoreItemRequest req);
        Task<ApiResponse<StoreItemResponse>> UpdateItemAsync(UpdateStoreItemRequest req);
        Task<ApiResponse<StoreItemResponse>> RestockAsync(RestockRequest req);
        Task<ApiResponse<bool>> DeleteItemAsync(Guid id);
    }
}
