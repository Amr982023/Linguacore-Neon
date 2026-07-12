// LinguaCore.API.Controllers/GroupPeriodController.cs
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Enums;
using LinguaCore.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/group-periods")]
[Authorize]
public class GroupPeriodController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    public GroupPeriodController(IUnitOfWork uow) => _uow = uow;

    /// <summary>
    /// Override expected session count for a specific group+period.
    /// Use this for the final short period of a level-based group.
    /// </summary>
    [HttpPut]
    [Authorize(Policy = PermissionPolicies.GroupsWrite)]
    public async Task<IActionResult> Upsert([FromBody] UpsertGroupPeriodRequest req)
    {
        var gp = await _uow.GroupPeriods.GetAsync(req.GroupId, req.PeriodLabelId);
        if (gp is null)
        {
            gp = new GroupPeriod
            {
                GroupId = req.GroupId,
                PeriodLabelId = req.PeriodLabelId,
                ExpectedSessionsCount = req.ExpectedSessionsCount,
            };
            await _uow.GroupPeriods.AddAsync(gp);
        }
        else
        {
            gp.ExpectedSessionsCount = req.ExpectedSessionsCount;
            _uow.GroupPeriods.Update(gp);
        }
        await _uow.SaveChangesAsync();
        return Ok(new { gp.GroupId, gp.PeriodLabelId, gp.ExpectedSessionsCount });
    }

    [HttpGet("{groupId:guid}")]
    [Authorize(Policy = PermissionPolicies.GroupsRead)]
    public async Task<IActionResult> GetByGroup(Guid groupId)
    {
        var periods = await _uow.GroupPeriods.GetByGroupAsync(groupId);
        return Ok(periods.Select(gp => new
        {
            gp.GroupId,
            gp.PeriodLabelId,
            PeriodLabelName = gp.PeriodLabel?.Name ?? "",
            gp.ExpectedSessionsCount,
        }));
    }
}

public record UpsertGroupPeriodRequest(
    Guid GroupId,
    Guid PeriodLabelId,
    int ExpectedSessionsCount);