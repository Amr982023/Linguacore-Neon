namespace LinguaCore.Domain.Entities;

public class Language : BaseEntity
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;

    // Navigation
    public Branch Branch { get; set; } = null!;
    public ICollection<LanguageLevel> LanguageLevels { get; set; } = new List<LanguageLevel>();
    public ICollection<InstructorLanguage> InstructorLanguages { get; set; } = new List<InstructorLanguage>();
    public ICollection<WaitingList> WaitingLists { get; set; } = new List<WaitingList>();
}
