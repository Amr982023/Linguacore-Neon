using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request
{
    public record InstructorFilterRequest(
        int Page = 1,
        int PageSize = 10,
        string? Search = null,
        Guid? LanguageId = null,
        bool? IsActive = null
    );
}
