using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services
{

    public class StoreService : IStoreService
    {
        private readonly IUnitOfWork _uow;
        public StoreService(IUnitOfWork uow) => _uow = uow;

        public async Task<ApiResponse<IEnumerable<ItemCategoryResponse>>> GetCategoriesAsync()
        {
            var categories = await _uow.ItemCategories.GetAllActiveAsync();
            return ApiResponse<IEnumerable<ItemCategoryResponse>>.Ok(categories.Select(MapCategory));
        }

        public async Task<ApiResponse<ItemCategoryResponse>> CreateCategoryAsync(CreateItemCategoryRequest req)
        {
            var existing = await _uow.ItemCategories.GetByNameAsync(req.Name);
            if (existing is not null) return ApiResponse<ItemCategoryResponse>.Fail("A category with this name already exists.");

            var category = new ItemCategory
            {
                Name = req.Name,
                IconKey = req.IconKey,
                CustomImageUrl = req.CustomImageUrl
            };
            await _uow.ItemCategories.AddAsync(category);
            await _uow.SaveChangesAsync();

            return ApiResponse<ItemCategoryResponse>.Ok(MapCategory(category));
        }

        public async Task<ApiResponse<ItemCategoryResponse>> UpdateCategoryAsync(UpdateItemCategoryRequest req)
        {
            var category = await _uow.ItemCategories.GetByIdAsync(req.Id);
            if (category is null) return ApiResponse<ItemCategoryResponse>.Fail("Category not found.");

            category.Name = req.Name;
            category.IconKey = req.IconKey;
            category.CustomImageUrl = req.CustomImageUrl;
            category.IsActive = req.IsActive;

            _uow.ItemCategories.Update(category);
            await _uow.SaveChangesAsync();

            return ApiResponse<ItemCategoryResponse>.Ok(MapCategory(category));
        }

        public async Task<ApiResponse<IEnumerable<StoreItemResponse>>> GetItemsAsync(Guid branchId, Guid? categoryId, bool lowStockOnly)
        {
            var items = await _uow.StoreItems.GetByBranchAsync(branchId, categoryId, lowStockOnly);
            return ApiResponse<IEnumerable<StoreItemResponse>>.Ok(items.Select(MapItem));
        }

        public async Task<ApiResponse<StoreItemResponse>> CreateItemAsync(CreateStoreItemRequest req)
        {
            var category = await _uow.ItemCategories.GetByIdAsync(req.CategoryId);
            if (category is null) return ApiResponse<StoreItemResponse>.Fail("Category not found.");

            var item = new StoreItem
            {
                BranchId = req.BranchId,
                CategoryId = req.CategoryId,
                Name = req.Name,
                Description = req.Description,
                Price = req.Price,
                Quantity = req.Quantity,
                LowStockThreshold = req.LowStockThreshold,
                CreatedBy = req.CreatedBy
            };
            await _uow.StoreItems.AddAsync(item);
            await _uow.SaveChangesAsync();

            var withCategory = await _uow.StoreItems.GetByIdWithCategoryAsync(item.Id);
            return ApiResponse<StoreItemResponse>.Ok(MapItem(withCategory!));
        }

        public async Task<ApiResponse<StoreItemResponse>> UpdateItemAsync(UpdateStoreItemRequest req)
        {
            var item = await _uow.StoreItems.GetByIdWithCategoryAsync(req.Id);
            if (item is null) return ApiResponse<StoreItemResponse>.Fail("Item not found.");

            // RowVersion is now the Postgres `xmin` system column, mapped as `uint`
            // (was `byte[]` under SQL Server's `rowversion`). A simple value comparison
            // replaces the old SequenceEqual byte-array check.
            if (req.RowVersion.HasValue && req.RowVersion.Value != item.RowVersion)
                return ApiResponse<StoreItemResponse>.Fail("This item was changed by someone else. Please refresh and try again.");

            item.Name = req.Name;
            item.Description = req.Description;
            item.Price = req.Price;
            item.LowStockThreshold = req.LowStockThreshold;
            // Quantity intentionally NOT editable here — only via Sale or Restock, so stock stays auditable

            _uow.StoreItems.Update(item);
            await _uow.SaveChangesAsync();

            return ApiResponse<StoreItemResponse>.Ok(MapItem(item));
        }

        public async Task<ApiResponse<StoreItemResponse>> RestockAsync(RestockRequest req)
        {
            if (req.AddQuantity <= 0) return ApiResponse<StoreItemResponse>.Fail("Restock quantity must be positive.");

            var item = await _uow.StoreItems.GetByIdWithCategoryAsync(req.Id);
            if (item is null) return ApiResponse<StoreItemResponse>.Fail("Item not found.");

            if (req.RowVersion.HasValue && req.RowVersion.Value != item.RowVersion)
                return ApiResponse<StoreItemResponse>.Fail("This item was changed by someone else. Please refresh and try again.");

            item.Quantity += req.AddQuantity;
            _uow.StoreItems.Update(item);
            await _uow.SaveChangesAsync();

            return ApiResponse<StoreItemResponse>.Ok(MapItem(item));
        }

        public async Task<ApiResponse<bool>> DeleteItemAsync(Guid id)
        {
            var item = await _uow.StoreItems.GetByIdAsync(id);
            if (item is null) return ApiResponse<bool>.Fail("Item not found.");

            var hasSales = await _uow.SaleItems.AnyForStoreItemAsync(id);
            if (hasSales)
            {
                item.IsActive = false;               // soft-delete: preserve history for past sales
                _uow.StoreItems.Update(item);
            }
            else
            {
                _uow.StoreItems.Remove(item);
            }

            await _uow.SaveChangesAsync();
            return ApiResponse<bool>.Ok(true);
        }

        private static ItemCategoryResponse MapCategory(ItemCategory c) =>
            new(c.Id, c.Name, c.IconKey, c.CustomImageUrl, c.IsActive, c.StoreItems?.Count(x => x.IsActive) ?? 0);

        private static StoreItemResponse MapItem(StoreItem x) =>
            new(x.Id, x.BranchId, x.CategoryId, x.Category?.Name ?? "", x.Name, x.Description,
                x.Price, x.Quantity, x.LowStockThreshold, x.IsLowStock, x.IsActive, x.RowVersion);
    }
}