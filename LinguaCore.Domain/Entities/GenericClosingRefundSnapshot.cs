namespace LinguaCore.Domain.Entities;

/// <summary>
/// Snapshot of a RefundRecord that occurred within the closing period.
/// Layer 4 of the closing: money that LEFT the center via early exits.
/// Source: RefundRecord.RefundDate within (PeriodStart, PeriodEnd).
/// </summary>
public class GenericClosingRefundSnapshot : BaseEntity
{
    public Guid GenericClosingId { get; set; }
    public Guid RefundRecordId { get; set; }
    public Guid StudentId { get; set; }
    public Guid GroupId { get; set; }
    public int SessionsAttended { get; set; }
    public int SessionsTotal { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal RefundAmount { get; set; }
    public DateTime RefundDate { get; set; }

    // Navigation
    public GenericClosing GenericClosing { get; set; } = null!;
    public RefundRecord RefundRecord { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public Group Group { get; set; } = null!;
}