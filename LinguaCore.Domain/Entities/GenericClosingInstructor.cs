namespace LinguaCore.Domain.Entities;

/// <summary>
/// Per-instructor summary row within a GenericClosing period.
/// Aggregated exclusively from CommissionLedger — never from Payment directly.
/// Commission  = SUM(CommissionAmount) where !IsAdjustment
/// Deductions  = SUM(ABS(CommissionAmount)) where IsAdjustment
/// NetPayable  = Commission - Deductions
/// </summary>
public class GenericClosingInstructor : BaseEntity
{
    public Guid GenericClosingId { get; set; }
    public Guid InstructorId { get; set; }

    // Aggregated totals (denormalized for dashboard performance)
    public decimal TotalGross { get; set; }
    public decimal TotalCommission { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal TotalBonus { get; set; }   // ← NEW
    public decimal TotalSalaryDeductions { get; set; }   // ← NEW
    public decimal NetPayable { get; set; }

    // Navigation
    public GenericClosing GenericClosing { get; set; } = null!;
    public Instructor Instructor { get; set; } = null!;
    public ICollection<GenericClosingDetail> Details { get; set; } = new List<GenericClosingDetail>();
    public ICollection<GenericClosingInstructorBonus> Bonuses { get; set; } = new List<GenericClosingInstructorBonus>();                         // ← NEW
    public ICollection<GenericClosingInstructorSalaryDeduction> SalaryDeductions { get; set; } = new List<GenericClosingInstructorSalaryDeduction>(); // ← NEW
}
