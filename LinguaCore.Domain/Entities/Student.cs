namespace LinguaCore.Domain.Entities;

public class Student : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid PersonId { get; set; }
    public Guid? GoalId { get; set; }
    public Guid? NestedGoalId { get; set; }
    public string AttendanceMode { get; set; } = "OFFLINE";  // OFFLINE | ONLINE
    public string QrCode { get; set; } = Guid.NewGuid().ToString();
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }

    // Navigation
    public Branch Branch { get; set; } = null!;
    public Person Person { get; set; } = null!;
    public Goal? Goal { get; set; }
    public NestedGoal? NestedGoal { get; set; }
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
    public ICollection<ExamResult> ExamResults { get; set; } = new List<ExamResult>();
    public ICollection<Certificate> Certificates { get; set; } = new List<Certificate>();
    public ICollection<RefundRecord> RefundRecords { get; set; } = new List<RefundRecord>();
}
