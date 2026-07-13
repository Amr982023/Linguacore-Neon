using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request.Filters
{
    public record StudentFilterRequest(
      int Page = 1,
      int PageSize = 20,
      string? Search = null,
      string? AttendanceMode = null,
      bool? IsActive = null,
      Guid? LanguageId = null,
      Guid? LevelId = null,
      Guid? GoalId = null,
      Guid? NestedGoalId = null
  );
}
