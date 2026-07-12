namespace LinguaCore.Domain.Entities;

public class Enrollment : BaseEntity
{
    public Guid StudentId { get; set; }
    public Guid GroupId { get; set; }
    public Guid EnrollStatusId { get; set; }
    public DateTime EnrollDate { get; set; }
    public decimal EffectiveFee { get; set; }   // after discount/scholarship
    public bool IsPartial { get; set; } = false;
    public DateTime? PartialStart { get; set; }
    public DateTime? PartialEnd { get; set; }
    public decimal? PartialCost { get; set; }
    public bool Scholarship { get; set; } = false;
    public decimal DiscountPct { get; set; } = 0;

    // Navigation
    public Student Student { get; set; } = null!;
    public Group Group { get; set; } = null!;
    public EnrollStatus EnrollStatus { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<RefundRecord> RefundRecords { get; set; } = new List<RefundRecord>();
}
