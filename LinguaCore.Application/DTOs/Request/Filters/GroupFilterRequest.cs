using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request.Filters
{
    public record GroupFilterRequest(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    Guid? LanguageId = null,
    Guid? LevelId = null,
    Guid? InstructorId = null,
    Guid? GroupCategoryId = null,
    Guid? GroupTypeId = null,
    Guid? DeliveryModeId = null,
    Guid? GroupStatusId = null,
    Guid? ZoomAccountId = null,
    Guid? HallId = null
);
}
