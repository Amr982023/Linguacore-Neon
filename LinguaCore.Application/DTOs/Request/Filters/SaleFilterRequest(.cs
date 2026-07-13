using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request.Filters
{
    public record SaleFilterRequest(
         Guid BranchId,
         DateTime? From = null,
         DateTime? To = null,
         int Page = 1,
         int PageSize = 8
     );
}
