namespace LinguaCore.Domain.Entities;

public class PaymentMethod : BaseEntity
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Navigation
    public Branch Branch { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<RefundRecord> RefundRecords { get; set; } = new List<RefundRecord>();
}
