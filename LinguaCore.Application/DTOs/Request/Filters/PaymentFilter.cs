using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.DTOs.Request.Filters
{
    public record PaymentFilterRequest(
    Guid BranchId,
    DateTime From,
    DateTime To,
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    Guid? LanguageId = null,
    Guid? LevelId = null,
    Guid? PaymentMethodId = null,
    Guid? GroupId = null,
    string? Status = null // "paid" | "unpaid" | null
);

    public record PaymentDebtFilterRequest(
        Guid BranchId,
        DateTime? From = null,
        DateTime? To = null,
        int Page = 1,
        int PageSize = 20,
        string? Search = null,
        Guid? LanguageId = null,
        Guid? LevelId = null,
        bool? OverdueOnly = null
    );

    public record RefundFilterRequest(
        Guid BranchId,
        DateTime? From = null,
        DateTime? To = null,
        int Page = 1,
        int PageSize = 20,
        string? Search = null,
        Guid? LanguageId = null,
        Guid? LevelId = null
    );
}
