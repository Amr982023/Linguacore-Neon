namespace LinguaCore.Domain.Entities;

public class GroupInstructorHistory : BaseEntity
{
    public Guid GroupId { get; set; }
    public Guid InstructorId { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime? ToDate { get; set; }  // null = current
    public decimal CommissionPct { get; set; }  // snapshot at assignment

    // Navigation
    public Group Group { get; set; } = null!;
    public Instructor Instructor { get; set; } = null!;
}
