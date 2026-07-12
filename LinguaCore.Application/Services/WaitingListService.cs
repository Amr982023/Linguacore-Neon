using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services;

public class WaitingListService : IWaitingListService
{
    private readonly IUnitOfWork _uow;
    private readonly IStudentService _studentService;

    public WaitingListService(IUnitOfWork uow, IStudentService studentService)
    {
        _uow = uow;
        _studentService = studentService;
    }

    public async Task<ApiResponse<WaitingListResponse>> CreateAsync(CreateWaitingListRequest req)
    {
        var entry = new WaitingList
        {
            BranchId = req.BranchId,
            LanguageId = req.LanguageId,
            LevelId = req.LevelId,
            Name = req.Name,
            Phone = req.Phone,
            Email = req.Email,
            ReservationFee = req.ReservationFee,
            AssignedTo = req.AssignedTo,
            Status = "WAITING",
            Notes = req.Notes,
            RegisteredAt = DateTime.UtcNow,
        };
        await _uow.WaitingLists.AddAsync(entry);
        await _uow.SaveChangesAsync();
        return ApiResponse<WaitingListResponse>.Ok(await MapAsync(entry));
    }

    public async Task<ApiResponse<WaitingListResponse>> UpdateAsync(UpdateWaitingListRequest req)
    {
        var entry = await _uow.WaitingLists.GetByIdAsync(req.Id);
        if (entry is null) return ApiResponse<WaitingListResponse>.Fail("Waiting list entry not found.");

        entry.Name = req.Name;
        entry.Phone = req.Phone;
        entry.Email = req.Email;
        entry.LanguageId = req.LanguageId;
        entry.LevelId = req.LevelId;
        entry.ReservationFee = req.ReservationFee;
        entry.AssignedTo = req.AssignedTo;
        entry.Notes = req.Notes;

        _uow.WaitingLists.Update(entry);
        await _uow.SaveChangesAsync();
        return ApiResponse<WaitingListResponse>.Ok(await MapAsync(entry));
    }

    public async Task<ApiResponse<WaitingListResponse>> UpdateStatusAsync(UpdateWaitingListStatusRequest req)
    {
        var entry = await _uow.WaitingLists.GetByIdAsync(req.Id);
        if (entry is null) return ApiResponse<WaitingListResponse>.Fail("Waiting list entry not found.");
        entry.Status = req.Status;
        _uow.WaitingLists.Update(entry);
        await _uow.SaveChangesAsync();
        return ApiResponse<WaitingListResponse>.Ok(await MapAsync(entry));
    }

    public async Task<ApiResponse<PagedResponse<WaitingListResponse>>> GetByBranchAsync(
        Guid branchId, WaitingListFilterRequest filter)
    {
        var (entries, total) = await _uow.WaitingLists.GetByBranchAsync(
            branchId,
            filter.Page, filter.PageSize,
            filter.Status, filter.LanguageId, filter.HasReservationFee);

        var items = new List<WaitingListResponse>();
        foreach (var e in entries) items.Add(await MapAsync(e));

        return ApiResponse<PagedResponse<WaitingListResponse>>.Ok(
            new PagedResponse<WaitingListResponse>(
                items, total, filter.Page, filter.PageSize,
                (int)Math.Ceiling(total / (double)filter.PageSize)));
    }

    public async Task<ApiResponse<PagedResponse<WaitingListResponse>>> GetExceedingThresholdAsync(
       int days, WaitingListFilterRequest filter, Guid? branchId = null)
    {
        var (entries, total) = await _uow.WaitingLists.GetExceedingWaitDaysAsync(
            days,
            filter.Page, filter.PageSize,
            filter.Status, filter.LanguageId, filter.HasReservationFee);

        var scoped = branchId.HasValue
            ? entries.Where(e => e.BranchId == branchId.Value).ToList()
            : entries.ToList();

        var items = new List<WaitingListResponse>();
        foreach (var e in scoped) items.Add(await MapAsync(e));

        return ApiResponse<PagedResponse<WaitingListResponse>>.Ok(
            new PagedResponse<WaitingListResponse>(
                items, total, filter.Page, filter.PageSize,
                (int)Math.Ceiling(total / (double)filter.PageSize)));
    }

    public async Task<ApiResponse<StudentResponse>> ConvertToStudentAsync(ConvertToStudentRequest req)
    {
        var entry = await _uow.WaitingLists.GetByIdAsync(req.WaitingListId);
        if (entry is null) return ApiResponse<StudentResponse>.Fail("Waiting list entry not found.");

        var nameParts = entry.Name.Split(' ', 3, StringSplitOptions.RemoveEmptyEntries);
        var createReq = new CreateStudentRequest(
            FirstName: nameParts.ElementAtOrDefault(0) ?? entry.Name,
            SecondName: req.SecondName,
            LastName: nameParts.ElementAtOrDefault(2) ?? nameParts.ElementAtOrDefault(1) ?? "",
            NationalId: req.NationalId,
            Age: req.Age,
            Gender: req.Gender,
            Phone: entry.Phone,
            WhatsappNumber: req.WhatsappNumber,
            Address: req.Address,
            Email: entry.Email,
            BranchId: entry.BranchId,
            AttendanceMode: req.AttendanceMode,
            GoalId: req.GoalId,
            NestedGoalId: req.NestedGoalId,
            Notes: entry.Notes);

        var studentResult = await _studentService.CreateAsync(createReq);
        if (!studentResult.Success) return studentResult;

        // Mark waiting list entry as enrolled
        entry.Status = "ENROLLED";
        _uow.WaitingLists.Update(entry);
        await _uow.SaveChangesAsync();

        return studentResult;
    }

    private async Task<WaitingListResponse> MapAsync(WaitingList w)
    {
        var lang = await _uow.Repository<Language>().GetByIdAsync(w.LanguageId);
        var level = await _uow.Repository<Level>().GetByIdAsync(w.LevelId);
        var branch = await _uow.Repository<Branch>().GetByIdAsync(w.BranchId);
        var days = (int)(DateTime.UtcNow - w.RegisteredAt).TotalDays;
        string? assignedName = null;
        if (w.AssignedTo.HasValue)
        {
            var user = await _uow.Users.GetWithRoleAsync(w.AssignedTo.Value);
            assignedName = user?.Name;
        }
        return new WaitingListResponse(
            w.Id, w.BranchId, branch?.Name ?? "",
            w.LanguageId,
            w.LevelId,
            lang?.Name ?? "", level?.Code ?? "",
            w.Name, w.Phone, w.Email, w.ReservationFee,
            w.RegisteredAt, days, w.Status, assignedName,
            w.Notes, w.CreatedAt, w.ModifiedAt);
    }
}