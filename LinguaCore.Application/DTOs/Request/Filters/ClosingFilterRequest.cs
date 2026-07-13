using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request.Filters
{
    public record ClosingFilterRequest(
     int Page = 1,
     int PageSize = 20,
     string? Status = null
 );
}
