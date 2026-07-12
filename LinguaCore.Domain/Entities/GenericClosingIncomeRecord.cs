// LinguaCore.Domain.Entities/GenericClosingIncomeRecord.cs
namespace LinguaCore.Domain.Entities;

/// <summary>
/// Snapshot of a payment received within the closing period.
/// Source: Payment.PaymentDate within (PeriodStart, PeriodEnd).
/// Independent of CommissionLedger — captures income even when
/// no sessions have happened yet (ProcessedSessionsCount = 0).
/// </summary>
public class GenericClosingIncomeRecord : BaseEntity
{
    public Guid GenericClosingId { get; set; }
    public Guid PaymentId { get; set; }

    // Snapshot values (copied at closing creation time for audit trail)
    public Guid GroupId { get; set; }
    public Guid StudentId { get; set; }
    public Guid PeriodLabelId { get; set; }
    public decimal AmountPaid { get; set; }
    public DateTime PaymentDate { get; set; }

    // Navigation
    public GenericClosing GenericClosing { get; set; } = null!;
    public Payment Payment { get; set; } = null!;
    public Group Group { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public PeriodLabel PeriodLabel { get; set; } = null!;
}