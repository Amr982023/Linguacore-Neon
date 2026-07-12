namespace LinguaCore.Application.DTOs.Response;

public record EnrollmentResponse(
    Guid Id,
    Guid StudentId,
    string StudentName,
    Guid GroupId,
    string GroupName,
    string PaymentStrategy,   // MONTHLY | LEVEL_BASED — from Group
    string LanguageName,      // derived: Group ? LanguageLevel ? Language
    string LevelCode,         // derived: Group ? LanguageLevel ? Level
    string Status,
    bool Scholarship,       // ? moved from Student
    decimal DiscountPct,       // ? moved from Student
    DateTime EnrollDate,
    decimal EffectiveFee,
    bool IsPartial,
    DateTime? PartialStart,
    DateTime? PartialEnd,
    decimal? PartialCost,
    DateTime CreatedAt,
    DateTime ModifiedAt);

public record RefundListResponse(
    Guid Id,
    Guid StudentId,
    string StudentName,
    Guid PaymentId,
    Guid EnrollmentId,
    string GroupName,
    string LanguageName,
    string LevelCode,
    string PaymentMethod,
    int SessionsAttended,
    int SessionsTotal,
    decimal AmountPaid,
    decimal CalculatedRefundAmount,
    decimal ActualRefundAmount,
    string? AdjustmentReason,
    DateTime RefundDate);

