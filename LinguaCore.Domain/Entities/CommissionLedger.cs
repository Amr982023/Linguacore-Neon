namespace LinguaCore.Domain.Entities;

public class CommissionLedger : BaseEntity
{
    public Guid PaymentId { get; set; }
    public Guid InstructorId { get; set; }
    public Guid GroupId { get; set; }
    public Guid? SessionId { get; set; }    // nullable — for per-session attribution when instructor changed
    public decimal CommissionPct { get; set; }
    public decimal GrossPayment { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal CentreAmount { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public bool IsAdjustment { get; set; } = false;   // true = refund deduction

    // Navigation
    public Payment Payment { get; set; } = null!;
    public Instructor Instructor { get; set; } = null!;
    public Group Group { get; set; } = null!;
    public Session? Session { get; set; }
}
