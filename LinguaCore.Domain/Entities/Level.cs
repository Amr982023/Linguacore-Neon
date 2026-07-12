namespace LinguaCore.Domain.Entities;

public class Level : BaseEntity
{
    public string Code { get; set; } = string.Empty;   // A1, A2, B1 ...
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public Guid BranchId { get; set; }

    // Navigation
    public Branch Branch { get; set; } = null!;
    public ICollection<LanguageLevel> LanguageLevels { get; set; } = new List<LanguageLevel>();
    public ICollection<WaitingList> WaitingLists { get; set; } = new List<WaitingList>();
}
