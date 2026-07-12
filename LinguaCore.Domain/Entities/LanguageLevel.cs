namespace LinguaCore.Domain.Entities;

public class LanguageLevel : BaseEntity
{
    public Guid BranchId { get; set; }  // ADD
    public Guid LanguageId { get; set; }
    public Guid LevelId { get; set; }
    // Navigation
    public Branch Branch { get; set; } = null!;  // ADD
    public Language Language { get; set; } = null!;
    public Level Level { get; set; } = null!;
    public ICollection<Group> Groups { get; set; } = new List<Group>();
    public ICollection<Certificate> Certificates { get; set; } = new List<Certificate>();
}