namespace LinguaCore.Domain.Entities;

public class InstructorLanguage : BaseEntity
{
    public Guid InstructorId { get; set; }
    public Guid LanguageId { get; set; }
    public bool Certified { get; set; }

    // Navigation
    public Instructor Instructor { get; set; } = null!;
    public Language Language { get; set; } = null!;
}
