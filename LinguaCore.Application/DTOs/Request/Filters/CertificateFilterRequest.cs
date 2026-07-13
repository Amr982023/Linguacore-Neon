using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request.Filters
{
    public record CertificateFilterRequest(
        Guid BranchId,
        string? Search = null,
        Guid? LanguageId = null,
        Guid? LevelId = null,
        Guid? GroupId = null,
        int Page = 1,
        int PageSize = 10
    );
}
