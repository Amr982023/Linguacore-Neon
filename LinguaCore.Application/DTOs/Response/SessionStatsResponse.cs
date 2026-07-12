using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Response
{
    public record SessionStatsResponse(int Scheduled, int Completed, int Cancelled);
}
