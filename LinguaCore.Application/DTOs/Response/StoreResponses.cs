using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace LinguaCore.Application.DTOs.Response
{
    public record ItemCategoryResponse(Guid Id, string Name, string IconKey, string? CustomImageUrl, bool IsActive, int ItemCount);
    public record StoreItemResponse(
        Guid Id, Guid BranchId, Guid CategoryId, string CategoryName, string Name, string? Description,
        decimal Price, int Quantity, int LowStockThreshold, bool IsLowStock, bool IsActive, uint RowVersion);
    public record SaleItemResponse(string ItemName, decimal UnitPrice, int Quantity, decimal LineTotal);
    public record SaleResponse(Guid Id, DateTime SaleDate, decimal TotalAmount, IEnumerable<SaleItemResponse> Items);
    public record TopSellingItemResponse(string ItemName, int QuantitySold, decimal Revenue);
    public record SalesStatsResponse(
        decimal ThisMonthTotal, int ThisMonthCount,
        decimal Last3MonthsTotal, int Last3MonthsCount,
        decimal LastYearTotal, int LastYearCount,
        IEnumerable<TopSellingItemResponse> TopSellingItems);
}