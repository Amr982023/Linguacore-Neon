using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Projections
{
    public record RankingAggregateRow(Guid StudentId, string StudentName, decimal TotalMarks, decimal AverageMark, decimal BestMark, int Attempts, bool Passed);
}
