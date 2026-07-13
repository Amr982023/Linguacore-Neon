using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Response
{
    public record CenterDeductionPagedResponse(
        IEnumerable<CenterDeductionResponse> Items,
        int TotalCount,
        int Page,
        int PageSize,
        decimal TotalAmountInRange)
    {
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalCount / (double)PageSize) : 0;
    }
}
