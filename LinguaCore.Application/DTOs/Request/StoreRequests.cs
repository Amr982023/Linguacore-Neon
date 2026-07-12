using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace LinguaCore.Application.DTOs.Request
{
    public record CreateItemCategoryRequest(string Name, string IconKey, string? CustomImageUrl);
    public record UpdateItemCategoryRequest(Guid Id, string Name, string IconKey, string? CustomImageUrl, bool IsActive);
    public record CreateStoreItemRequest(
        Guid BranchId, Guid CategoryId, string Name, string? Description,
        decimal Price, int Quantity, int LowStockThreshold, Guid CreatedBy);
    public record UpdateStoreItemRequest(
        Guid Id, string Name, string? Description, decimal Price, int LowStockThreshold, uint? RowVersion);
    public record RestockRequest(Guid Id, int AddQuantity, uint? RowVersion);
    public record SaleLineRequest(Guid StoreItemId, int Quantity);
    public record CreateSaleRequest(Guid BranchId, Guid CreatedBy, List<SaleLineRequest> Lines);
}