// Application/Services/CenterDeductionService.cs
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LinguaCore.Application.Services;

public class CenterDeductionService : ICenterDeductionService
{
    private readonly IUnitOfWork _uow;
    public CenterDeductionService(IUnitOfWork uow) => _uow = uow;

    private static ApiResponse<T> Ok<T>(T data) => ApiResponse<T>.Ok(data);
    private static ApiResponse<T> Fail<T>(string m) => ApiResponse<T>.Fail(m);

    public async Task<ApiResponse<CenterDeductionResponse>> CreateAsync(CreateCenterDeductionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Fail<CenterDeductionResponse>("Deduction name is required.");
        if (req.Amount <= 0)
            return Fail<CenterDeductionResponse>("Amount must be greater than zero.");

        var entity = new CenterDeduction
        {
            BranchId = req.BranchId,
            Name = req.Name.Trim(),
            Amount = req.Amount,
            DeductionDate = req.DeductionDate,
            CreatedBy = req.CreatedBy,
            Notes = req.Notes,
        };

        await _uow.Repository<CenterDeduction>().AddAsync(entity);
        await _uow.SaveChangesAsync();

        var withUser = await _uow.Repository<CenterDeduction>().Query()
            .Include(d => d.CreatedByUser).ThenInclude(u => u.Person)
            .FirstAsync(d => d.Id == entity.Id);

        return Ok(MapToResponse(withUser));
    }

    public async Task<ApiResponse<CenterDeductionResponse>> UpdateAsync(UpdateCenterDeductionRequest req)
    {
        var entity = await _uow.Repository<CenterDeduction>().GetByIdAsync(req.Id);
        if (entity is null) return Fail<CenterDeductionResponse>("Deduction not found.");

        if (string.IsNullOrWhiteSpace(req.Name))
            return Fail<CenterDeductionResponse>("Deduction name is required.");
        if (req.Amount <= 0)
            return Fail<CenterDeductionResponse>("Amount must be greater than zero.");

        entity.Name = req.Name.Trim();
        entity.Amount = req.Amount;
        entity.DeductionDate = req.DeductionDate;
        entity.Notes = req.Notes;

        _uow.Repository<CenterDeduction>().Update(entity);
        await _uow.SaveChangesAsync();

        var withUser = await _uow.Repository<CenterDeduction>().Query()
            .Include(d => d.CreatedByUser).ThenInclude(u => u.Person)
            .FirstAsync(d => d.Id == entity.Id);

        return Ok(MapToResponse(withUser));
    }

    public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
    {
        var entity = await _uow.Repository<CenterDeduction>().GetByIdAsync(id);
        if (entity is null) return Fail<bool>("Deduction not found.");

        // Once a deduction has been swept into a closing, deleting it would
        // silently desync that closing's snapshot. Block it — the admin should
        // delete the DRAFT closing (if still DRAFT) and recreate it instead.
        var swept = await _uow.Repository<GenericClosingCenterDeduction>()
            .AnyAsync(d => d.CenterDeductionId == id);
        if (swept)
            return Fail<bool>(
                "This deduction has already been included in a closing and can't be deleted. " +
                "If the closing is still DRAFT, delete and recreate the closing first.");

        _uow.Repository<CenterDeduction>().Remove(entity);
        await _uow.SaveChangesAsync();
        return Ok(true);
    }

    public async Task<ApiResponse<IEnumerable<CenterDeductionResponse>>> GetByBranchAsync(
        Guid branchId, DateTime? from, DateTime? to)
    {
        var list = await _uow.Repository<CenterDeduction>().Query()
            .Include(d => d.CreatedByUser).ThenInclude(u => u.Person)
            .Where(d => d.BranchId == branchId
                     && (from == null || d.DeductionDate >= from)
                     && (to == null || d.DeductionDate <= to))
            .OrderByDescending(d => d.DeductionDate)
            .ToListAsync();

        return Ok(list.Select(MapToResponse));
    }

    private static CenterDeductionResponse MapToResponse(CenterDeduction d) => new(
        d.Id, d.BranchId, d.Name, d.Amount, d.DeductionDate,
        d.CreatedByUser?.Person is null ? "" : $"{d.CreatedByUser.Person.FirstName} {d.CreatedByUser.Person.LastName}",
        d.Notes, d.CreatedAt);
}