namespace LinguaCore.Application.DTOs.Request;

public record CreateEnrollmentRequest(
    Guid StudentId,
    Guid GroupId,
    DateTime EnrollDate,
    decimal EffectiveFee,
    bool Scholarship,      // ? moved from Student
    decimal DiscountPct);     // ? moved from Student

public record CreatePartialEnrollmentRequest(
    Guid StudentId,
    Guid GroupId,
    DateTime PartialStart,
    DateTime PartialEnd,
    decimal PartialCost,
    bool Scholarship,      // ? moved from Student
    decimal DiscountPct);     // ? moved from Student

public record UpdateEnrollmentStatusRequest(Guid EnrollmentId, Guid EnrollStatusId);

public class EarlyExitRefundRequest
{
    public Guid EnrollmentId { get; set; }
    public Guid PaymentMethodId { get; set; }
    public decimal ActualRefundAmount { get; set; }
    public string? AdjustmentReason { get; set; }
}

