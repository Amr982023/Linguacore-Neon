namespace LinguaCore.Domain.Entities;

/// <summary>
/// Master closing record for a calendar period.
/// Replaces instructor-scoped MonthlyClosingRecord.
/// One GenericClosing covers ALL instructors for the period.
/// Status flow: DRAFT → CONFIRMED → PAID
/// CONFIRMED = locked (no edit allowed).
/// No overlapping periods are permitted (enforced at service layer).
/// </summary>
public class GenericClosing : BaseEntity
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Status { get; set; } = "DRAFT";
    public Guid CreatedBy { get; set; }
    public Guid BranchId { get; set; }
    public Guid? ConfirmedBy { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? Notes { get; set; }
    public decimal TotalCenterDeductions { get; set; }
    public decimal CenterNetEarned { get; set; }
    public decimal TotalIncomeReceived { get; set; }
    public decimal TotalRefunded { get; set; }          // ← NEW
    public decimal TotalInstructorBonuses { get; set; }            // ← NEW (sum across all instructor rows)
    public decimal TotalInstructorSalaryDeductions { get; set; }   // ← NEW (sum across all instructor rows)

    public ICollection<GenericClosingIncomeRecord> IncomeRecords { get; set; } = new List<GenericClosingIncomeRecord>();
    public ICollection<GenericClosingPartialPayment> PartialPayments { get; set; } = new List<GenericClosingPartialPayment>();
    public ICollection<GenericClosingCenterDeduction> CenterDeductions { get; set; } = new List<GenericClosingCenterDeduction>();
    public ICollection<GenericClosingRefundSnapshot> RefundSnapshots { get; set; } = new List<GenericClosingRefundSnapshot>(); // ← NEW
    public Branch Branch { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public User? ConfirmedByUser { get; set; }
    public ICollection<GenericClosingInstructor> InstructorRows { get; set; } = new List<GenericClosingInstructor>();
}