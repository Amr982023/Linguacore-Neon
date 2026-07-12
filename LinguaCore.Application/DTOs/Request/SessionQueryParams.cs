using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request
{
    public class SessionQueryParams
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? Status { get; set; }
        public Guid? GroupId { get; set; }
        public Guid? PeriodLabelId { get; set; }
        public string? Search { get; set; } // matches group name or topic
    }
}
