namespace LinguaCore.Domain.Entities;

public class GroupCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;  // BASIC | ADDITIONAL

    // Navigation
    public ICollection<Group> Groups { get; set; } = new List<Group>();
}
