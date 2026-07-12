namespace LinguaCore.Domain.Entities;

public class Certificate : BaseEntity
{
    public Guid StudentId { get; set; }
    public Guid LanguageLevelId { get; set; }
    public Guid? ExamResultId { get; set; }
    public string SerialNumber { get; set; } = Guid.NewGuid().ToString("N").ToUpper();
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Student Student { get; set; } = null!;
    public LanguageLevel LanguageLevel { get; set; } = null!;
    public ExamResult? ExamResult { get; set; }
}
