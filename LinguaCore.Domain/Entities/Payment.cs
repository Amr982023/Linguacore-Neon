namespace LinguaCore.Domain.Entities;

public class Payment : BaseEntity
{
    public Guid    EnrollmentId    { get; set; }
    public Guid    PaymentMethodId { get; set; }
    public Guid    RecordedBy      { get; set; }
    public Guid    PeriodLabelId   { get; set; }   // ← FK replaces string PeriodLabel (REQUIRED)
    public decimal AmountDue       { get; set; }
    public decimal AmountPaid      { get; set; }
    public DateTime PaymentDate    { get; set; }
    public DateTime DueDate        { get; set; }
    public string? Notes           { get; set; }
    public bool IsCommissionDistributionBlocked { get; set; } = false; //new added


    // ── Commission distribution tracking ─────────────────────────────────
    /// <summary>How many sessions have generated a CommissionLedger entry for this payment.</summary>
    public int ProcessedSessionsCount { get; set; } = 0;
    /// <summary>True when ProcessedSessionsCount == GroupPeriod.ExpectedSessionsCount.</summary>
    public bool CommissionDistributionCompleted { get; set; } = false;

    // Navigation
    public Enrollment             Enrollment      { get; set; } = null!;
    public PaymentMethod          PaymentMethod   { get; set; } = null!;
    public User                   RecordedByUser  { get; set; } = null!;
    public PeriodLabel            PeriodLabel     { get; set; } = null!;
    public ICollection<CommissionLedger> CommissionLedgers { get; set; } = new List<CommissionLedger>();
    public RefundRecord?          RefundRecord    { get; set; }
}
