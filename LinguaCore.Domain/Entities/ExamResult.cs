namespace LinguaCore.Domain.Entities;

public class ExamResult : BaseEntity
{
    public Guid ExamId { get; set; }
    public Guid StudentId { get; set; }
    public Guid RecordedBy { get; set; }
    public decimal MarksObtained { get; set; }
    public bool Passed { get; set; }
    public int AttemptNumber { get; set; } = 1;
    public bool IsRetake { get; set; } = false;
    public string? RetakeReason { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    public void ComputePassed(decimal totalMarks, decimal passPercentage)
        => Passed = totalMarks > 0 && (MarksObtained / totalMarks * 100) >= passPercentage;

    // Navigation
    public Exam Exam { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public User RecordedByUser { get; set; } = null!;
    public Certificate? Certificate { get; set; }
}
