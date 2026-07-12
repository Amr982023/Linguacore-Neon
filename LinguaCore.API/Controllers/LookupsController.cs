using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Enums;

namespace LinguaCore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LookupsController : ControllerBase
{
    private readonly ILookupService _service;
    public LookupsController(ILookupService service) => _service = service;

    private Guid CurrentBranchId =>
        Guid.Parse(User.FindFirst("branchId")!.Value);

    // ?? LANGUAGE ??????????????????????????????????????????????????????????????
    [HttpGet("languages")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> Languages()
        => Ok(await _service.GetLanguagesAsync(CurrentBranchId));

    [HttpPost("languages")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreateLanguage([FromBody] CreateLanguageRequest req)
        => Ok(await _service.CreateLanguageAsync(req with { BranchId = CurrentBranchId }));

    [HttpPut("languages")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdateLanguage([FromBody] UpdateLanguageRequest req)
        => Ok(await _service.UpdateLanguageAsync(req));

    [HttpDelete("languages/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeleteLanguage(Guid id)
        => Ok(await _service.DeleteLanguageAsync(id));

    // ?? LEVEL ?????????????????????????????????????????????????????????????????
    [HttpGet("levels")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> Levels()
        => Ok(await _service.GetLevelsAsync(CurrentBranchId));

    [HttpGet("Language-levels/{languageId}")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> LanguageLevels(Guid languageId)
        => Ok(await _service.GetLanguageLevelsAsync(languageId));

    [HttpPost("levels")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreateLevel([FromBody] CreateLevelRequest req)
        => Ok(await _service.CreateLevelAsync(req with { BranchId = CurrentBranchId }));

    [HttpPut("levels")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdateLevel([FromBody] UpdateLevelRequest req)
        => Ok(await _service.UpdateLevelAsync(req));

    [HttpDelete("levels/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeleteLevel(Guid id)
        => Ok(await _service.DeleteLevelAsync(id));

    // ?? GOAL ??????????????????????????????????????????????????????????????????
    [HttpGet("goals")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> Goals()
        => Ok(await _service.GetGoalsAsync(CurrentBranchId));

    [HttpPost("goals")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreateGoal([FromBody] CreateGoalRequest req)
        => Ok(await _service.CreateGoalAsync(req with { BranchId = CurrentBranchId }));

    [HttpPut("goals")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdateGoal([FromBody] UpdateGoalRequest req)
        => Ok(await _service.UpdateGoalAsync(req));

    [HttpDelete("goals/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeleteGoal(Guid id)
        => Ok(await _service.DeleteGoalAsync(id));

    // ?? NESTED GOAL ???????????????????????????????????????????????????????????
    [HttpPost("goals/nested")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreateNestedGoal([FromBody] CreateNestedGoalRequest req)
        => Ok(await _service.CreateNestedGoalAsync(req));

    [HttpPut("goals/nested")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdateNestedGoal([FromBody] UpdateNestedGoalRequest req)
        => Ok(await _service.UpdateNestedGoalAsync(req));

    [HttpDelete("goals/nested/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeleteNestedGoal(Guid id)
        => Ok(await _service.DeleteNestedGoalAsync(id));

    // ?? PAYMENT METHOD ????????????????????????????????????????????????????????
    [HttpGet("payment-methods")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> PaymentMethods()
        => Ok(await _service.GetPaymentMethodsAsync(CurrentBranchId));

    [HttpPost("payment-methods")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreatePaymentMethod([FromBody] CreatePaymentMethodRequest req)
        => Ok(await _service.CreatePaymentMethodAsync(req with { BranchId = CurrentBranchId }));

    [HttpPut("payment-methods")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdatePaymentMethod([FromBody] UpdatePaymentMethodRequest req)
        => Ok(await _service.UpdatePaymentMethodAsync(req));

    [HttpDelete("payment-methods/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeletePaymentMethod(Guid id)
        => Ok(await _service.DeletePaymentMethodAsync(id));

    // ?? BRANCH ????????????????????????????????????????????????????????????????
    [HttpGet("branches")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> Branches()
        => Ok(await _service.GetBranchesAsync());

    [HttpPost("branches")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreateBranch([FromBody] CreateBranchRequest req)
        => Ok(await _service.CreateBranchAsync(req));

    [HttpPut("branches")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdateBranch([FromBody] UpdateBranchRequest req)
        => Ok(await _service.UpdateBranchAsync(req));

    [HttpDelete("branches/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeleteBranch(Guid id)
        => Ok(await _service.DeleteBranchAsync(id));

    // ?? HALL ??????????????????????????????????????????????????????????????????
    [HttpGet("halls/{branchId}")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> Halls(Guid branchId)
        => Ok(await _service.GetHallsByBranchAsync(branchId));

    [HttpPost("halls")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreateHall([FromBody] CreateHallRequest req)
        => Ok(await _service.CreateHallAsync(req));

    [HttpPut("halls")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdateHall([FromBody] UpdateHallRequest req)
        => Ok(await _service.UpdateHallAsync(req));

    [HttpDelete("halls/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeleteHall(Guid id)
        => Ok(await _service.DeleteHallAsync(id));

    // ?? ZOOM ACCOUNT ??????????????????????????????????????????????????????????
    [HttpGet("zoom/{branchId}")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> ZoomAccounts(Guid branchId)
        => Ok(await _service.GetZoomAccountsByBranchAsync(branchId));

    [HttpPost("zoom")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreateZoom([FromBody] CreateZoomAccountRequest req)
        => Ok(await _service.CreateZoomAccountAsync(req));

    [HttpPut("zoom")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdateZoom([FromBody] UpdateZoomAccountRequest req)
        => Ok(await _service.UpdateZoomAccountAsync(req));

    [HttpDelete("zoom/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeleteZoom(Guid id)
        => Ok(await _service.DeleteZoomAccountAsync(id));

    // ?? ROLE ??????????????????????????????????????????????????????????????????
    [HttpGet("roles")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> Roles()
        => Ok(await _service.GetRolesAsync(CurrentBranchId));

    [HttpPost("roles")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest req)
        => Ok(await _service.CreateRoleAsync(req with { BranchId = CurrentBranchId }));

    [HttpPut("roles")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdateRole([FromBody] UpdateRoleRequest req)
        => Ok(await _service.UpdateRoleAsync(req));

    [HttpDelete("roles/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeleteRole(Guid id)
        => Ok(await _service.DeleteRoleAsync(id));

    // ?? READ-ONLY LOOKUPS ?????????????????????????????????????????????????????
    [HttpGet("group-categories")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> GroupCategories()
        => Ok(await _service.GetGroupCategoriesAsync());

    [HttpGet("group-types")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> GroupTypes()
        => Ok(await _service.GetGroupTypesAsync());

    [HttpGet("group-statuses")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> GroupStatuses()
        => Ok(await _service.GetGroupStatusesAsync());

    [HttpGet("delivery-modes")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> DeliveryModes()
        => Ok(await _service.GetDeliveryModesAsync());

    [HttpGet("enroll-statuses")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> EnrollStatuses()
        => Ok(await _service.GetEnrollStatusesAsync());

    // ?? PERIOD LABEL ??????????????????????????????????????????????????????????
    [HttpGet("period-labels")]
    [Authorize(Policy = PermissionPolicies.LookupsRead)]
    public async Task<IActionResult> GetPeriodLabels()
        => Ok(await _service.GetPeriodLabelsAsync(CurrentBranchId));

    [HttpPost("period-labels")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> CreatePeriodLabel([FromBody] CreatePeriodLabelRequest req)
        => Ok(await _service.CreatePeriodLabelAsync(req with { BranchId = CurrentBranchId }));

    [HttpPut("period-labels")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> UpdatePeriodLabel([FromBody] UpdatePeriodLabelRequest req)
        => Ok(await _service.UpdatePeriodLabelAsync(req));

    [HttpDelete("period-labels/{id}")]
    [Authorize(Policy = PermissionPolicies.LookupsWrite)]
    public async Task<IActionResult> DeletePeriodLabel(Guid id)
        => Ok(await _service.DeletePeriodLabelAsync(id));

    [HttpGet("settings")]
    [Authorize(Policy = PermissionPolicies.SettingsRead)]
    public async Task<IActionResult> GetSettings()
    => Ok(await _service.GetAppSettingsAsync());

    [HttpPut("settings")]
    [Authorize(Policy = PermissionPolicies.SettingsWrite)]
    public async Task<IActionResult> UpdateSetting([FromBody] UpdateAppSettingRequest req)
    {
        var result = await _service.UpdateAppSettingAsync(req);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ?? APP SETTINGS ??????????????????????????????????????????????????????????
    //[HttpGet("settings")]
    //[Authorize(Policy = PermissionPolicies.SettingsRead)]
    //public async Task<IActionResult> GetSettings()
    //    => Ok(await _service.GetSettingsAsync());

    //[HttpPut("settings/{key}")]
    //[Authorize(Policy = PermissionPolicies.SettingsWrite)]
    //public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdateSettingRequest req)
    //    => Ok(await _service.UpdateSettingAsync(key, req.Value));
}