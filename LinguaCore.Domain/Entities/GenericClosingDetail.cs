namespace LinguaCore.Domain.Entities;

/// <summary>
/// One detail row per CommissionLedger entry within a GenericClosingInstructor.
/// Enables full drill-down: closing → instructor → payment/group breakdown.
/// Source: CommissionLedger ONLY — never calculated from Payment.
/// </summary>
public class GenericClosingDetail : BaseEntity
{
    public Guid GenericClosingInstructorId { get; set; }
    public Guid CommissionLedgerId { get; set; }
    public Guid GroupId { get; set; }
    public Guid PaymentId { get; set; }
    public Guid? SessionId { get; set; }  // ← NEW

    // Snapshot values
    public decimal GrossPayment { get; set; }
    public decimal CommissionAmount { get; set; }
    public bool IsAdjustment { get; set; }

    /// <summary>
    /// True when the Payment.PaymentDate falls OUTSIDE this closing's period window.
    /// Means: the student paid in a previous closing period, but the session
    /// that generated this ledger entry happened in THIS closing's period.
    /// </summary>
    public bool IsFromPreviousPeriod { get; set; }  // ← NEW

    // Navigation
    public GenericClosingInstructor GenericClosingInstructor { get; set; } = null!;
    public CommissionLedger CommissionLedger { get; set; } = null!;
    public Group Group { get; set; } = null!;
    public Payment Payment { get; set; } = null!;
    public Session? Session { get; set; }  // ← NEW
}