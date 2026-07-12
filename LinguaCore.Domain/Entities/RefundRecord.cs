namespace LinguaCore.Domain.Entities;

public class RefundRecord : BaseEntity
{
    public Guid StudentId { get; set; }
    public Guid PaymentId { get; set; }
    public Guid PaymentMethodId { get; set; }
    public Guid ProcessedBy { get; set; }
    public int SessionsAttended { get; set; }
    public int SessionsTotal { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal RefundAmount { get; set; }          // keep for migration safety
    public decimal CalculatedRefundAmount { get; set; }
    public decimal ActualRefundAmount { get; set; }
    public string? AdjustmentReason { get; set; }
    public DateTime RefundDate { get; set; }

    public static decimal Calculate(decimal amountPaid, int attended, int total)
        => total == 0 ? 0 : amountPaid - (amountPaid * attended / total);

    // Navigation
    public Student Student { get; set; } = null!;
    public Payment Payment { get; set; } = null!;
    public PaymentMethod PaymentMethod { get; set; } = null!;
    public User ProcessedByUser { get; set; } = null!;
}
