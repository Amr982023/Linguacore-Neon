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
using Microsoft.EntityFrameworkCore;

namespace LinguaCore.Application.Services;

public class SalesService : ISalesService
{
    private readonly IUnitOfWork _uow;
    public SalesService(IUnitOfWork uow) => _uow = uow;

    public async Task<ApiResponse<SaleResponse>> CreateSaleAsync(CreateSaleRequest req)
    {
        if (req.Lines is null || req.Lines.Count == 0)
            return ApiResponse<SaleResponse>.Fail("Sale must contain at least one item.");

        var mergedLines = req.Lines
            .GroupBy(l => l.StoreItemId)
            .Select(g => new SaleLineRequest(g.Key, g.Sum(x => x.Quantity)))
            .ToList();

        await _uow.BeginTransactionAsync();
        try
        {
            var sale = new Sale
            {
                BranchId = req.BranchId,
                SaleDate = DateTime.UtcNow,
                CreatedBy = req.CreatedBy
            };

            decimal total = 0;

            foreach (var line in mergedLines)
            {
                // Tracked entity — its RowVersion becomes the concurrency guard on SaveChanges,
                // so a second sale hitting the same item mid-transaction throws instead of overselling.
                var item = await _uow.StoreItems.GetForBranchAsync(line.StoreItemId, req.BranchId);

                if (item is null)
                    return ApiResponse<SaleResponse>.Fail($"Item {line.StoreItemId} not found in this branch.");

                if (item.Quantity < line.Quantity)
                    return ApiResponse<SaleResponse>.Fail($"'{item.Name}' has only {item.Quantity} left, requested {line.Quantity}.");

                item.Quantity -= line.Quantity;
                _uow.StoreItems.Update(item);

                var lineTotal = item.Price * line.Quantity;
                total += lineTotal;

                sale.SaleItems.Add(new SaleItem
                {
                    StoreItemId = item.Id,
                    ItemNameSnapshot = item.Name,
                    UnitPriceSnapshot = item.Price,
                    Quantity = line.Quantity,
                    LineTotal = lineTotal
                });
            }

            sale.TotalAmount = total;
            await _uow.Sales.AddAsync(sale);

            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();

            return ApiResponse<SaleResponse>.Ok(MapSale(sale));
        }
        catch (DbUpdateConcurrencyException)
        {
            await _uow.RollbackTransactionAsync();
            return ApiResponse<SaleResponse>.Fail("Stock changed while processing this sale. Please retry.");
        }
        catch
        {
            await _uow.RollbackTransactionAsync();
            throw;
        }
    }

    public async Task<ApiResponse<PagedResult<SaleResponse>>> GetSalesAsync(
     Guid branchId, DateTime? from, DateTime? to, int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 8 : pageSize; // hard cap so a bad query param can't force a huge scan

        var (sales, totalCount) = await _uow.Sales.GetByBranchPagedAsync(branchId, from, to, page, pageSize);
        return ApiResponse<PagedResult<SaleResponse>>.Ok(
            new PagedResult<SaleResponse>(sales.Select(MapSale), totalCount, page, pageSize));
    }

    public async Task<ApiResponse<SalesStatsResponse>> GetStatsAsync(Guid branchId)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var last3Months = now.AddMonths(-3);
        var lastYear = now.AddYears(-1);

        var thisMonth = await _uow.Sales.GetByBranchSinceAsync(branchId, startOfMonth);
        var last3 = await _uow.Sales.GetByBranchSinceAsync(branchId, last3Months);
        var yearAgo = await _uow.Sales.GetByBranchSinceAsync(branchId, lastYear);

        var topItems = await _uow.SaleItems.GetTopSellingAsync(branchId, last3Months, 5);

        return ApiResponse<SalesStatsResponse>.Ok(new SalesStatsResponse(
            thisMonth.Sum(s => s.TotalAmount), thisMonth.Count(),
            last3.Sum(s => s.TotalAmount), last3.Count(),
            yearAgo.Sum(s => s.TotalAmount), yearAgo.Count(),
            topItems.Select(x => new TopSellingItemResponse(x.ItemName, x.QuantitySold, x.Revenue))));
    }

    private static SaleResponse MapSale(Sale s) => new(
        s.Id, s.SaleDate, s.TotalAmount,
        s.SaleItems.Select(si => new SaleItemResponse(si.ItemNameSnapshot, si.UnitPriceSnapshot, si.Quantity, si.LineTotal)));
}
