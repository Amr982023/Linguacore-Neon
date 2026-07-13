using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request
{
    public record ExamFilterRequest(
        int Page = 1,
        int PageSize = 15,
        Guid? GroupId = null,
        bool? IsFinalExam = null,
        int? Month = null,
        int? Year = null,
        string? ResultFilter = null // "passed" | "failed" | null
    );

    public record RankingFilterRequest(
    int Page = 1,
    int PageSize = 20,
    Guid? ExamId = null,
    Guid? GroupId = null,
    Guid? LanguageId = null,
    Guid? LevelId = null
);
}
