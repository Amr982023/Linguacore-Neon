namespace LinguaCore.Domain.Entities;

public class Exam : BaseEntity
{
    public Guid GroupId { get; set; }
    public Guid CreatedBy { get; set; }
    public bool IsFinalExam { get; set; } = false;
    public string Title { get; set; } = string.Empty;
    public decimal TotalMarks { get; set; }
    public decimal PassPercentage { get; set; }
    public DateTime ExamDate { get; set; }
    public int DurationMins { get; set; }
    public bool IsCustom { get; set; } = false;

    // Navigation
    public Group Group { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public ICollection<ExamResult> ExamResults { get; set; } = new List<ExamResult>();
}
