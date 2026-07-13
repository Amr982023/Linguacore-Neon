using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services;

public class GroupService : IGroupService
{
    private readonly IUnitOfWork _uow;
    public GroupService(IUnitOfWork uow) => _uow = uow;


    // New private helper — add near bottom of class, before MapToResponse
    private async Task<ApiResponse<bool>?> ValidateInstructorLanguageAsync(Guid instructorId, Guid languageLevelId)
    {
        var ll = (await _uow.Repository<LanguageLevel>()
            .FindAsync(x => x.Id == languageLevelId)).FirstOrDefault();
        if (ll is null) return ApiResponse<bool>.Fail("Language level not found.");

        bool qualified = await _uow.Groups.InstructorTeachesLanguageAsync(instructorId, ll.LanguageId);
        if (!qualified)
            return ApiResponse<bool>.Fail(
                "The selected instructor is not qualified to teach this language.");

        return null;
    }

    public async Task<ApiResponse<PagedResponse<GroupResponse>>> GetByBranchPagedAsync(
    Guid branchId, GroupFilterRequest filter)
    {
        var (entries, total) = await _uow.Groups.GetByBranchPagedAsync(
            branchId,
            filter.Page, filter.PageSize,
            filter.Search, filter.LanguageId, filter.LevelId, filter.InstructorId,
            filter.GroupCategoryId, filter.GroupTypeId, filter.DeliveryModeId,
            filter.GroupStatusId, filter.ZoomAccountId, filter.HallId);

        var items = entries.Select(MapToResponse).ToList();

        return ApiResponse<PagedResponse<GroupResponse>>.Ok(
            new PagedResponse<GroupResponse>(
                items, total, filter.Page, filter.PageSize,
                (int)Math.Ceiling(total / (double)filter.PageSize)));
    }

    public async Task<ApiResponse<GroupResponse>> CreateAsync(CreateGroupRequest req)
    {
        var langValidation = await ValidateInstructorLanguageAsync(req.InstructorId, req.LanguageLevelId);
        if (langValidation is not null)
            return ApiResponse<GroupResponse>.Fail(langValidation.Message);
        var group = new Group
        {
            BranchId                = req.BranchId,
            LanguageLevelId         = req.LanguageLevelId,
            InstructorId            = req.InstructorId,
            HallId                  = req.HallId,
            ZoomAccountId           = req.ZoomAccountId,
            GroupCategoryId         = req.GroupCategoryId,
            GroupTypeId             = req.GroupTypeId,
            DeliveryModeId          = req.DeliveryModeId,
            GroupStatusId           = req.GroupStatusId,
            Name                    = req.Name,
            InstructorCommissionPct = req.InstructorCommissionPct,
            PaymentStrategy         = req.PaymentStrategy,
            FeeAmount               = req.FeeAmount,
            SessionsPerMonth        = req.SessionsPerMonth,
            GracePeriodDays         = req.GracePeriodDays,
            StartDate               = req.StartDate.ToUniversalTime(),
            MaxCapacity             = req.MaxCapacity,
        };
        await _uow.Groups.AddAsync(group);
        await _uow.SaveChangesAsync(); // ? ensure Id is generated

        // Record initial instructor history
        var history = new GroupInstructorHistory
        {
            GroupId       = group.Id,
            InstructorId  = req.InstructorId,
            FromDate      = req.StartDate,
            CommissionPct = req.InstructorCommissionPct,
        };
        await _uow.Repository<GroupInstructorHistory>().AddAsync(history);
        await _uow.SaveChangesAsync();

        var result = await _uow.Groups.GetWithDetailsAsync(group.Id);
        return ApiResponse<GroupResponse>.Ok(MapToResponse(result!));
    }

    public async Task<ApiResponse<GroupResponse>> UpdateAsync(UpdateGroupRequest req)
    {
        var group = await _uow.Groups.GetByIdAsync(req.Id);
        if (group is null) return ApiResponse<GroupResponse>.Fail("Group not found.");

        group.Name = req.Name;
        group.LanguageLevelId = req.LanguageLevelId;      // ADD
        group.GroupCategoryId = req.GroupCategoryId;      // ADD
        group.GroupTypeId = req.GroupTypeId;          // ADD
        group.DeliveryModeId = req.DeliveryModeId;       // ADD
        group.GroupStatusId = req.GroupStatusId;
        group.HallId = req.HallId;
        group.ZoomAccountId = req.ZoomAccountId;
        group.PaymentStrategy = req.PaymentStrategy;      // ADD
        group.FeeAmount = req.FeeAmount;
        group.InstructorCommissionPct = req.InstructorCommissionPct; // ADD
        group.SessionsPerMonth = req.SessionsPerMonth;
        group.GracePeriodDays = req.GracePeriodDays;
        group.StartDate = req.StartDate.ToUniversalTime();            // ADD
        group.MaxCapacity = req.MaxCapacity;

        _uow.Groups.Update(group);
        await _uow.SaveChangesAsync();

        var result = await _uow.Groups.GetWithDetailsAsync(group.Id);
        return ApiResponse<GroupResponse>.Ok(MapToResponse(result!));
    }
    public async Task<ApiResponse<GroupResponse>> GetByIdAsync(Guid id)
    {
        var group = await _uow.Groups.GetWithDetailsAsync(id);
        if (group is null) return ApiResponse<GroupResponse>.Fail("Group not found.");
        return ApiResponse<GroupResponse>.Ok(MapToResponse(group));
    }

    public async Task<ApiResponse<IEnumerable<GroupResponse>>> GetByBranchAsync(Guid branchId)
    {
        var groups = await _uow.Groups.GetByBranchAsync(branchId);
        return ApiResponse<IEnumerable<GroupResponse>>.Ok(groups.Select(MapToResponse));
    }

    public async Task<ApiResponse<bool>> ChangeInstructorAsync(ChangeGroupInstructorRequest req)
    {
        var group = await _uow.Groups.GetByIdAsync(req.GroupId);
        if (group is null) return ApiResponse<bool>.Fail("Group not found.");

        var langValidation = await ValidateInstructorLanguageAsync(req.NewInstructorId, group.LanguageLevelId);
        if (langValidation is not null)
            return ApiResponse<bool>.Fail(langValidation.Message);

        // Close current history record
        var histories = await _uow.Repository<GroupInstructorHistory>()
            .FindAsync(h => h.GroupId == req.GroupId && h.ToDate == null);
        foreach (var h in histories)
        {
            h.ToDate = req.EffectiveFrom.AddDays(-1);
            _uow.Repository<GroupInstructorHistory>().Update(h);
        }

        // Open new history record
        var newHistory = new GroupInstructorHistory
        {
            GroupId       = req.GroupId,
            InstructorId  = req.NewInstructorId,
            FromDate      = req.EffectiveFrom,
            CommissionPct = req.NewCommissionPct,
        };
        await _uow.Repository<GroupInstructorHistory>().AddAsync(newHistory);

        // Update current instructor on group
        group.InstructorId            = req.NewInstructorId;
        group.InstructorCommissionPct = req.NewCommissionPct;
        _uow.Groups.Update(group);

        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<bool>> CheckHallConflictAsync(Guid hallId, DateTime start, DateTime end, Guid? excludeSessionId = null)
    {
        var conflict = await _uow.Groups.HasHallConflictAsync(hallId, start, end, excludeSessionId);
        return ApiResponse<bool>.Ok(conflict);
    }

    public async Task<ApiResponse<bool>> CheckZoomConflictAsync(Guid zoomId, DateTime start, DateTime end, Guid? excludeSessionId = null)
    {
        var conflict = await _uow.Groups.HasZoomConflictAsync(zoomId, start, end, excludeSessionId);
        return ApiResponse<bool>.Ok(conflict);
    }

    public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
    {
        var group = await _uow.Groups.GetByIdAsync(id);
        if (group is null) return ApiResponse<bool>.Fail("Group not found.");

        // Guard: block delete if enrollments exist
        var hasEnrollments = (await _uow.Repository<Enrollment>()
            .FindAsync(e => e.GroupId == id)).Any();
        if (hasEnrollments)
            return ApiResponse<bool>.Fail("Cannot delete this group because it has existing enrollments.");

        // Guard: block delete if sessions exist
        var hasSessions = (await _uow.Repository<Session>()
            .FindAsync(s => s.GroupId == id)).Any();
        if (hasSessions)
            return ApiResponse<bool>.Fail("Cannot delete this group because it has scheduled or past sessions.");

        // Remove instructor history rows first (FK constraint)
        var histories = await _uow.Repository<GroupInstructorHistory>()
            .FindAsync(h => h.GroupId == id);
        foreach (var h in histories)
            await _uow.Repository<GroupInstructorHistory>().DeleteAsync(h);

        await _uow.Groups.DeleteAsync(group);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }
    public async Task<ApiResponse<IEnumerable<GroupResponse>>> GetByLanguageLevelAsync(
      Guid languageId, Guid levelId, Guid? branchId = null)
    {
        var allGroups = await _uow.Repository<Group>()
            .FindAsync(g =>
                g.LanguageLevel.LanguageId == languageId &&
                g.LanguageLevel.LevelId == levelId &&
                g.GroupStatus.Name == "ACTIVE" &&
                (!branchId.HasValue || g.BranchId == branchId.Value));

        return ApiResponse<IEnumerable<GroupResponse>>.Ok(allGroups.Select(MapToResponse));
    }

    private static GroupResponse MapToResponse(Group g) => new(
         g.Id, g.BranchId, g.Branch?.Name ?? "",
         g.LanguageLevelId,
         g.LanguageLevel?.LanguageId ?? Guid.Empty,      // ADD THIS
         g.LanguageLevel?.Language?.Name ?? "",
         g.LanguageLevel?.Level?.Code ?? "",
         g.InstructorId,
         g.Instructor?.Person is null ? "" : $"{g.Instructor.Person.FirstName} {g.Instructor.Person.LastName}",
         g.HallId, g.Hall?.Name,
         g.ZoomAccountId, g.ZoomAccount?.DisplayName,
         g.GroupCategoryId,
         g.GroupTypeId,
         g.DeliveryModeId,
         g.GroupStatusId,
         g.Name, g.GroupCategory?.Name ?? "", g.GroupType?.Name ?? "",
         g.DeliveryMode?.Name ?? "", g.GroupStatus?.Name ?? "",
         g.InstructorCommissionPct, g.PaymentStrategy, g.FeeAmount,
         g.SessionsPerMonth, g.GracePeriodDays, g.StartDate, g.MaxCapacity,
         g.Enrollments?.Count ?? 0, g.CreatedAt, g.ModifiedAt);
}
