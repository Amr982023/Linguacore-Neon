using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services;

public class LookupService : ILookupService
{
    private readonly IUnitOfWork _uow;
    public LookupService(IUnitOfWork uow) => _uow = uow;

    // ?? LANGUAGE ??????????????????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<LanguageWithLevelIdsResponse>>> GetLanguagesAsync(Guid branchId)
    {
        var langs = await _uow.Repository<Language>().FindAsync(l => l.BranchId == branchId);
        var lls = await _uow.Repository<LanguageLevel>().GetAllAsync();
        var levels = await _uow.Repository<Level>().GetAllAsync();

        var result = langs.Select(l =>
        {
            var langLevels = lls
                .Where(ll => ll.LanguageId == l.Id)
                .Select(ll => new
                {
                    ll,
                    level = levels.FirstOrDefault(lv => lv.Id == ll.LevelId)
                })
                .Where(x => x.level is not null)
                .OrderBy(x => x.level!.DisplayOrder)
                .Select(x => new LanguageLevelResponse(
                    x.level!.Id,
                    x.level.Code,
                    x.ll.Id));

            return new LanguageWithLevelIdsResponse(l.Id, l.Name, langLevels, l.ModifiedAt);
        });

        return ApiResponse<IEnumerable<LanguageWithLevelIdsResponse>>.Ok(result);
    }

    public async Task<ApiResponse<LanguageResponse>> CreateLanguageAsync(CreateLanguageRequest req)
    {
        var lang = new Language { BranchId = req.BranchId, Name = req.Name };
        await _uow.Repository<Language>().AddAsync(lang);
        await _uow.SaveChangesAsync();

        foreach (var levelId in req.LevelIds ?? Enumerable.Empty<Guid>())
            await _uow.Repository<LanguageLevel>().AddAsync(
    new LanguageLevel { BranchId = req.BranchId, LanguageId = lang.Id, LevelId = levelId });

        await _uow.SaveChangesAsync();

        var levels = await _uow.Repository<Level>().GetAllAsync();
        var langLevels = (req.LevelIds ?? Enumerable.Empty<Guid>())
            .Select(lid => levels.FirstOrDefault(lv => lv.Id == lid))
            .Where(lv => lv is not null)
            .OrderBy(lv => lv!.DisplayOrder)
            .Select(lv => new LookupResponse(lv!.Id, lv.Code));

        return ApiResponse<LanguageResponse>.Ok(
            new LanguageResponse(lang.Id, lang.Name, langLevels, lang.ModifiedAt));
    }

    public async Task<ApiResponse<LanguageResponse>> UpdateLanguageAsync(UpdateLanguageRequest req)
    {
        var lang = (await _uow.Repository<Language>().FindAsync(l => l.Id == req.Id)).FirstOrDefault();
        if (lang is null) return ApiResponse<LanguageResponse>.Fail("Language not found.");

        lang.Name = req.Name;

        var existingLinks = await _uow.Repository<LanguageLevel>().FindAsync(ll => ll.LanguageId == req.Id);
        foreach (var link in existingLinks)
            await _uow.Repository<LanguageLevel>().DeleteAsync(link);

        foreach (var levelId in req.LevelIds)
            await _uow.Repository<LanguageLevel>().AddAsync(
         new LanguageLevel { BranchId = lang.BranchId, LanguageId = lang.Id, LevelId = levelId });

        await _uow.SaveChangesAsync();

        var lls = await _uow.Repository<LanguageLevel>().FindAsync(ll => ll.LanguageId == lang.Id);
        var levels = await _uow.Repository<Level>().GetAllAsync();
        var langLevels = lls
            .Select(ll => levels.FirstOrDefault(lv => lv.Id == ll.LevelId))
            .Where(lv => lv is not null)
            .OrderBy(lv => lv!.DisplayOrder)
            .Select(lv => new LookupResponse(lv!.Id, lv.Code));

        return ApiResponse<LanguageResponse>.Ok(
            new LanguageResponse(lang.Id, lang.Name, langLevels, lang.ModifiedAt));
    }


    public async Task<ApiResponse<IEnumerable<AppSettingResponse>>> GetAppSettingsAsync()
    {
        var settings = await _uow.Repository<AppSetting>().GetAllAsync();
        return ApiResponse<IEnumerable<AppSettingResponse>>.Ok(
            settings.Select(s => new AppSettingResponse(s.Key, s.Value, s.Description)));
    }

    public async Task<ApiResponse<AppSettingResponse>> UpdateAppSettingAsync(UpdateAppSettingRequest req)
    {
        var setting = await _uow.Repository<AppSetting>()
            .FirstOrDefaultAsync(s => s.Key == req.Key);

        if (setting is null)
            return ApiResponse<AppSettingResponse>.Fail($"Setting '{req.Key}' not found.");

        setting.Value = req.Value;
        _uow.Repository<AppSetting>().Update(setting);
        await _uow.SaveChangesAsync();

        return ApiResponse<AppSettingResponse>.Ok(
            new AppSettingResponse(setting.Key, setting.Value, setting.Description));
    }
    public async Task<ApiResponse<bool>> DeleteLanguageAsync(Guid id)
    {
        var lang = (await _uow.Repository<Language>().FindAsync(l => l.Id == id)).FirstOrDefault();
        if (lang is null) return ApiResponse<bool>.Fail("Language not found.");

        var links = await _uow.Repository<LanguageLevel>().FindAsync(ll => ll.LanguageId == id);
        foreach (var link in links)
            await _uow.Repository<LanguageLevel>().DeleteAsync(link);

        await _uow.Repository<Language>().DeleteAsync(lang);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? LEVEL ?????????????????????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<LookupResponse>>> GetLevelsAsync(Guid branchId)
    {
        var levels = await _uow.Repository<Level>().FindAsync(l => l.BranchId == branchId);
        return ApiResponse<IEnumerable<LookupResponse>>.Ok(
            levels.OrderBy(l => l.DisplayOrder).Select(l => new LookupResponse(l.Id, l.Code)));
    }

    public async Task<ApiResponse<IEnumerable<LookupResponse>>> GetLanguageLevelsAsync(Guid languageId)
    {
        var languageLevels = await _uow.LevelRepository.GetByLanguageIdAsync(languageId);
        return ApiResponse<IEnumerable<LookupResponse>>.Ok(
            languageLevels.OrderBy(l => l.DisplayOrder).Select(l => new LookupResponse(l.Id, l.Code)));
    }

    public async Task<ApiResponse<LookupResponse>> CreateLevelAsync(CreateLevelRequest req)
    {
        var level = new Level { BranchId = req.BranchId, Code = req.Code, DisplayOrder = req.DisplayOrder };
        await _uow.Repository<Level>().AddAsync(level);
        await _uow.SaveChangesAsync();
        return ApiResponse<LookupResponse>.Ok(new LookupResponse(level.Id, level.Code));
    }

    public async Task<ApiResponse<LookupResponse>> UpdateLevelAsync(UpdateLevelRequest req)
    {
        var level = (await _uow.Repository<Level>().FindAsync(l => l.Id == req.Id)).FirstOrDefault();
        if (level is null) return ApiResponse<LookupResponse>.Fail("Level not found.");

        level.Code = req.Code;
        level.DisplayOrder = req.DisplayOrder;
        await _uow.SaveChangesAsync();
        return ApiResponse<LookupResponse>.Ok(new LookupResponse(level.Id, level.Code));
    }

    public async Task<ApiResponse<bool>> DeleteLevelAsync(Guid id)
    {
        var level = (await _uow.Repository<Level>().FindAsync(l => l.Id == id)).FirstOrDefault();
        if (level is null) return ApiResponse<bool>.Fail("Level not found.");

        await _uow.Repository<Level>().DeleteAsync(level);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? GOAL ??????????????????????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<GoalResponse>>> GetGoalsAsync(Guid branchId)
    {
        var goals = await _uow.Repository<Goal>().FindAsync(g => g.BranchId == branchId);
        var nested = await _uow.Repository<NestedGoal>().GetAllAsync();
        return ApiResponse<IEnumerable<GoalResponse>>.Ok(
            goals.Select(g => new GoalResponse(g.Id, g.Name,
                nested.Where(n => n.GoalId == g.Id).Select(n => new LookupResponse(n.Id, n.Name)))));
    }

    public async Task<ApiResponse<GoalResponse>> CreateGoalAsync(CreateGoalRequest req)
    {
        var goal = new Goal { BranchId = req.BranchId, Name = req.Name };
        await _uow.Repository<Goal>().AddAsync(goal);
        await _uow.SaveChangesAsync();
        return ApiResponse<GoalResponse>.Ok(
            new GoalResponse(goal.Id, goal.Name, Enumerable.Empty<LookupResponse>()));
    }

    public async Task<ApiResponse<GoalResponse>> UpdateGoalAsync(UpdateGoalRequest req)
    {
        var goal = (await _uow.Repository<Goal>().FindAsync(g => g.Id == req.Id)).FirstOrDefault();
        if (goal is null) return ApiResponse<GoalResponse>.Fail("Goal not found.");

        goal.Name = req.Name;
        await _uow.SaveChangesAsync();

        var nested = await _uow.Repository<NestedGoal>().FindAsync(n => n.GoalId == goal.Id);
        return ApiResponse<GoalResponse>.Ok(new GoalResponse(goal.Id, goal.Name,
            nested.Select(n => new LookupResponse(n.Id, n.Name))));
    }

    public async Task<ApiResponse<bool>> DeleteGoalAsync(Guid id)
    {
        var goal = (await _uow.Repository<Goal>().FindAsync(g => g.Id == id)).FirstOrDefault();
        if (goal is null) return ApiResponse<bool>.Fail("Goal not found.");

        var nested = await _uow.Repository<NestedGoal>().FindAsync(n => n.GoalId == id);
        foreach (var n in nested)
            await _uow.Repository<NestedGoal>().DeleteAsync(n);

        await _uow.Repository<Goal>().DeleteAsync(goal);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? NESTED GOAL ???????????????????????????????????????????????????????????

    public async Task<ApiResponse<LookupResponse>> CreateNestedGoalAsync(CreateNestedGoalRequest req)
    {
        var ng = new NestedGoal { GoalId = req.GoalId, Name = req.Name };
        await _uow.Repository<NestedGoal>().AddAsync(ng);
        await _uow.SaveChangesAsync();
        return ApiResponse<LookupResponse>.Ok(new LookupResponse(ng.Id, ng.Name));
    }

    public async Task<ApiResponse<LookupResponse>> UpdateNestedGoalAsync(UpdateNestedGoalRequest req)
    {
        var ng = (await _uow.Repository<NestedGoal>().FindAsync(n => n.Id == req.Id)).FirstOrDefault();
        if (ng is null) return ApiResponse<LookupResponse>.Fail("Nested goal not found.");

        ng.Name = req.Name;
        await _uow.SaveChangesAsync();
        return ApiResponse<LookupResponse>.Ok(new LookupResponse(ng.Id, ng.Name));
    }

    public async Task<ApiResponse<bool>> DeleteNestedGoalAsync(Guid id)
    {
        var ng = (await _uow.Repository<NestedGoal>().FindAsync(n => n.Id == id)).FirstOrDefault();
        if (ng is null) return ApiResponse<bool>.Fail("Nested goal not found.");

        await _uow.Repository<NestedGoal>().DeleteAsync(ng);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? PAYMENT METHOD ????????????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<LookupResponse>>> GetPaymentMethodsAsync(Guid branchId)
    {
        var methods = await _uow.Repository<PaymentMethod>()
            .FindAsync(m => m.IsActive && m.BranchId == branchId);
        return ApiResponse<IEnumerable<LookupResponse>>.Ok(
            methods.Select(m => new LookupResponse(m.Id, m.Name)));
    }

    public async Task<ApiResponse<LookupResponse>> CreatePaymentMethodAsync(CreatePaymentMethodRequest req)
    {
        var pm = new PaymentMethod { BranchId = req.BranchId, Name = req.Name, IsActive = true };
        await _uow.Repository<PaymentMethod>().AddAsync(pm);
        await _uow.SaveChangesAsync();
        return ApiResponse<LookupResponse>.Ok(new LookupResponse(pm.Id, pm.Name));
    }

    public async Task<ApiResponse<LookupResponse>> UpdatePaymentMethodAsync(UpdatePaymentMethodRequest req)
    {
        var pm = (await _uow.Repository<PaymentMethod>().FindAsync(m => m.Id == req.Id)).FirstOrDefault();
        if (pm is null) return ApiResponse<LookupResponse>.Fail("Payment method not found.");

        pm.Name = req.Name;
        pm.IsActive = req.IsActive;
        await _uow.SaveChangesAsync();
        return ApiResponse<LookupResponse>.Ok(new LookupResponse(pm.Id, pm.Name));
    }

    public async Task<ApiResponse<bool>> DeletePaymentMethodAsync(Guid id)
    {
        var pm = (await _uow.Repository<PaymentMethod>().FindAsync(m => m.Id == id)).FirstOrDefault();
        if (pm is null) return ApiResponse<bool>.Fail("Payment method not found.");

        await _uow.Repository<PaymentMethod>().DeleteAsync(pm);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? BRANCH ????????????????????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<BranchResponse>>> GetBranchesAsync()
    {
        var branches = await _uow.Repository<Branch>().GetAllAsync();
        return ApiResponse<IEnumerable<BranchResponse>>.Ok(
            branches.Select(b => new BranchResponse(b.Id, b.Name, b.Address, b.ModifiedAt)));
    }

    public async Task<ApiResponse<BranchResponse>> CreateBranchAsync(CreateBranchRequest req)
    {
        var b = new Branch
        {
            Name = req.Name,
            Address = req.Address,
            GmailConfig = req.GmailConfig,
            WhatsappConfig = req.WhatsappConfig
        };
        await _uow.Repository<Branch>().AddAsync(b);
        await _uow.SaveChangesAsync();
        return ApiResponse<BranchResponse>.Ok(new BranchResponse(b.Id, b.Name, b.Address, b.ModifiedAt));
    }

    public async Task<ApiResponse<BranchResponse>> UpdateBranchAsync(UpdateBranchRequest req)
    {
        var b = (await _uow.Repository<Branch>().FindAsync(x => x.Id == req.Id)).FirstOrDefault();
        if (b is null) return ApiResponse<BranchResponse>.Fail("Branch not found.");

        b.Name = req.Name;
        b.Address = req.Address;
        b.GmailConfig = req.GmailConfig;
        b.WhatsappConfig = req.WhatsappConfig;
        await _uow.SaveChangesAsync();
        return ApiResponse<BranchResponse>.Ok(new BranchResponse(b.Id, b.Name, b.Address, b.ModifiedAt));
    }

    public async Task<ApiResponse<bool>> DeleteBranchAsync(Guid id)
    {
        var b = (await _uow.Repository<Branch>().FindAsync(x => x.Id == id)).FirstOrDefault();
        if (b is null) return ApiResponse<bool>.Fail("Branch not found.");

        await _uow.Repository<Branch>().DeleteAsync(b);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? HALL ??????????????????????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<HallResponse>>> GetHallsByBranchAsync(Guid branchId)
    {
        var halls = await _uow.Repository<Hall>().FindAsync(h => h.BranchId == branchId);
        return ApiResponse<IEnumerable<HallResponse>>.Ok(
            halls.Select(h => new HallResponse(h.Id, h.BranchId, "", h.Name, h.Capacity, h.IsActive, h.ModifiedAt)));
    }

    public async Task<ApiResponse<HallResponse>> CreateHallAsync(CreateHallRequest req)
    {
        var h = new Hall { BranchId = req.BranchId, Name = req.Name, Capacity = req.Capacity, IsActive = true };
        await _uow.Repository<Hall>().AddAsync(h);
        await _uow.SaveChangesAsync();
        return ApiResponse<HallResponse>.Ok(
            new HallResponse(h.Id, h.BranchId, "", h.Name, h.Capacity, h.IsActive, h.ModifiedAt));
    }

    public async Task<ApiResponse<HallResponse>> UpdateHallAsync(UpdateHallRequest req)
    {
        var h = (await _uow.Repository<Hall>().FindAsync(x => x.Id == req.Id)).FirstOrDefault();
        if (h is null) return ApiResponse<HallResponse>.Fail("Hall not found.");

        h.Name = req.Name;
        h.Capacity = req.Capacity;
        h.IsActive = req.IsActive;
        await _uow.SaveChangesAsync();
        return ApiResponse<HallResponse>.Ok(
            new HallResponse(h.Id, h.BranchId, "", h.Name, h.Capacity, h.IsActive, h.ModifiedAt));
    }

    public async Task<ApiResponse<bool>> DeleteHallAsync(Guid id)
    {
        var h = (await _uow.Repository<Hall>().FindAsync(x => x.Id == id)).FirstOrDefault();
        if (h is null) return ApiResponse<bool>.Fail("Hall not found.");

        await _uow.Repository<Hall>().DeleteAsync(h);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? ZOOM ACCOUNT ??????????????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<ZoomAccountResponse>>> GetZoomAccountsByBranchAsync(Guid branchId)
    {
        var accounts = await _uow.Repository<ZoomAccount>().FindAsync(z => z.BranchId == branchId);
        return ApiResponse<IEnumerable<ZoomAccountResponse>>.Ok(
            accounts.Select(z => new ZoomAccountResponse(
                z.Id, z.BranchId, "", z.AccountEmail, z.DisplayName, z.MaxParticipants, z.IsActive, z.ModifiedAt)));
    }

    public async Task<ApiResponse<ZoomAccountResponse>> CreateZoomAccountAsync(CreateZoomAccountRequest req)
    {
        var z = new ZoomAccount
        {
            BranchId = req.BranchId,
            AccountEmail = req.AccountEmail,
            DisplayName = req.DisplayName,
            MaxParticipants = req.MaxParticipants,
            IsActive = true
        };
        await _uow.Repository<ZoomAccount>().AddAsync(z);
        await _uow.SaveChangesAsync();
        return ApiResponse<ZoomAccountResponse>.Ok(
            new ZoomAccountResponse(z.Id, z.BranchId, "", z.AccountEmail, z.DisplayName, z.MaxParticipants, z.IsActive, z.ModifiedAt));
    }

    public async Task<ApiResponse<ZoomAccountResponse>> UpdateZoomAccountAsync(UpdateZoomAccountRequest req)
    {
        var z = (await _uow.Repository<ZoomAccount>().FindAsync(x => x.Id == req.Id)).FirstOrDefault();
        if (z is null) return ApiResponse<ZoomAccountResponse>.Fail("Zoom account not found.");

        z.AccountEmail = req.AccountEmail;
        z.DisplayName = req.DisplayName;
        z.MaxParticipants = req.MaxParticipants;
        z.IsActive = req.IsActive;
        await _uow.SaveChangesAsync();
        return ApiResponse<ZoomAccountResponse>.Ok(
            new ZoomAccountResponse(z.Id, z.BranchId, "", z.AccountEmail, z.DisplayName, z.MaxParticipants, z.IsActive, z.ModifiedAt));
    }

    public async Task<ApiResponse<bool>> DeleteZoomAccountAsync(Guid id)
    {
        var z = (await _uow.Repository<ZoomAccount>().FindAsync(x => x.Id == id)).FirstOrDefault();
        if (z is null) return ApiResponse<bool>.Fail("Zoom account not found.");

        await _uow.Repository<ZoomAccount>().DeleteAsync(z);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? ROLE ??????????????????????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<RoleResponse>>> GetRolesAsync(Guid branchId)
    {
        var roles = await _uow.Repository<Role>().FindAsync(r => r.BranchId == branchId);
        return ApiResponse<IEnumerable<RoleResponse>>.Ok(
            roles.Select(r => new RoleResponse(r.Id, r.Name, r.IsSystem, r.Permissions)));
    }

    public async Task<ApiResponse<RoleResponse>> CreateRoleAsync(CreateRoleRequest req)
    {
        var r = new Role { BranchId = req.BranchId, Name = req.Name, Permissions = req.Permissions };
        await _uow.Repository<Role>().AddAsync(r);
        await _uow.SaveChangesAsync();
        return ApiResponse<RoleResponse>.Ok(new RoleResponse(r.Id, r.Name, r.IsSystem, r.Permissions));
    }

    public async Task<ApiResponse<RoleResponse>> UpdateRoleAsync(UpdateRoleRequest req)
    {
        var r = (await _uow.Repository<Role>().FindAsync(x => x.Id == req.Id)).FirstOrDefault();
        if (r is null) return ApiResponse<RoleResponse>.Fail("Role not found.");

        r.Name = req.Name;
        r.Permissions = req.Permissions;
        await _uow.SaveChangesAsync();
        return ApiResponse<RoleResponse>.Ok(new RoleResponse(r.Id, r.Name, r.IsSystem, r.Permissions));
    }

    public async Task<ApiResponse<bool>> DeleteRoleAsync(Guid id)
    {
        var r = (await _uow.Repository<Role>().FindAsync(x => x.Id == id)).FirstOrDefault();
        if (r is null) return ApiResponse<bool>.Fail("Role not found.");

        await _uow.Repository<Role>().DeleteAsync(r);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? READ-ONLY ENUM LOOKUPS ????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<LookupResponse>>> GetGroupCategoriesAsync()
        => ApiResponse<IEnumerable<LookupResponse>>.Ok(
            (await _uow.Repository<GroupCategory>().GetAllAsync())
            .Select(x => new LookupResponse(x.Id, x.Name)));

    public async Task<ApiResponse<IEnumerable<LookupResponse>>> GetGroupTypesAsync()
        => ApiResponse<IEnumerable<LookupResponse>>.Ok(
            (await _uow.Repository<GroupType>().GetAllAsync())
            .Select(x => new LookupResponse(x.Id, x.Name)));

    public async Task<ApiResponse<IEnumerable<LookupResponse>>> GetGroupStatusesAsync()
        => ApiResponse<IEnumerable<LookupResponse>>.Ok(
            (await _uow.Repository<GroupStatus>().GetAllAsync())
            .Select(x => new LookupResponse(x.Id, x.Name)));

    public async Task<ApiResponse<IEnumerable<LookupResponse>>> GetDeliveryModesAsync()
        => ApiResponse<IEnumerable<LookupResponse>>.Ok(
            (await _uow.Repository<DeliveryMode>().GetAllAsync())
            .Select(x => new LookupResponse(x.Id, x.Name)));

    public async Task<ApiResponse<IEnumerable<LookupResponse>>> GetEnrollStatusesAsync()
        => ApiResponse<IEnumerable<LookupResponse>>.Ok(
            (await _uow.Repository<EnrollStatus>().GetAllAsync())
            .Select(x => new LookupResponse(x.Id, x.Name)));

    // ?? PERIOD LABEL ??????????????????????????????????????????????????????????

    public async Task<ApiResponse<IEnumerable<LookupResponse>>> GetPeriodLabelsAsync(Guid branchId)
    {
        var sevenMonthsAgo = DateTime.UtcNow.AddMonths(-7);

        var labels = await _uow.Repository<PeriodLabel>()
            .FindAsync(pl => pl.BranchId == branchId &&
                             pl.CreatedAt >= sevenMonthsAgo);

        return ApiResponse<IEnumerable<LookupResponse>>.Ok(
            labels.Select(p=>p).OrderByDescending(p=>p.CreatedAt).Select(pl => new LookupResponse(pl.Id, pl.Name)));
    }

    public async Task<ApiResponse<LookupResponse>> CreatePeriodLabelAsync(CreatePeriodLabelRequest req)
    {
        var pl = new PeriodLabel { BranchId = req.BranchId, Name = req.Name, Description = req.Description };
        await _uow.Repository<PeriodLabel>().AddAsync(pl);
        await _uow.SaveChangesAsync();
        return ApiResponse<LookupResponse>.Ok(new LookupResponse(pl.Id, pl.Name));
    }

    public async Task<ApiResponse<LookupResponse>> UpdatePeriodLabelAsync(UpdatePeriodLabelRequest req)
    {
        var pl = (await _uow.Repository<PeriodLabel>().FindAsync(x => x.Id == req.Id)).FirstOrDefault();
        if (pl is null) return ApiResponse<LookupResponse>.Fail("Period label not found.");

        pl.Name = req.Name;
        pl.Description = req.Description;
        await _uow.SaveChangesAsync();
        return ApiResponse<LookupResponse>.Ok(new LookupResponse(pl.Id, pl.Name));
    }

    public async Task<ApiResponse<bool>> DeletePeriodLabelAsync(Guid id)
    {
        var pl = (await _uow.Repository<PeriodLabel>().FindAsync(x => x.Id == id)).FirstOrDefault();
        if (pl is null) return ApiResponse<bool>.Fail("Period label not found.");

        await _uow.Repository<PeriodLabel>().DeleteAsync(pl);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    // ?? APP SETTINGS ??????????????????????????????????????????????????????????

    //public async Task<ApiResponse<IEnumerable<AppSettingResponse>>> GetSettingsAsync()
    //{
    //    var settings = await _uow.Repository<AppSetting>().GetAllAsync();
    //    return ApiResponse<IEnumerable<AppSettingResponse>>.Ok(
    //        settings.Select(s => new AppSettingResponse(s.Key, s.Value, s.Description)));
    //}

    //public async Task<ApiResponse<bool>> UpdateSettingAsync(string key, string value)
    //{
    //    var s = (await _uow.Repository<AppSetting>().FindAsync(x => x.Key == key)).FirstOrDefault();
    //    if (s is null) return ApiResponse<bool>.Fail("Setting not found.");

    //    s.Value = value;
    //    await _uow.SaveChangesAsync();
    //    return ApiResponse<bool>.Ok(true);
    //}
}