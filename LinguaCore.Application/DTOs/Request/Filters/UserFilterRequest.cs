using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request.Filters
{
    public record UserFilterRequest(
        int Page = 1,
        int PageSize = 20,
        string? Search = null,
        Guid? RoleId = null,
        bool? IsActive = null
    );
}
