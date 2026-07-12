namespace LinguaCore.Domain.Entities;

public class GroupStatus : BaseEntity
{
    public string Name { get; set; } = string.Empty;  // ACTIVE | COMPLETED | SUSPENDED

    // Navigation
    public ICollection<Group> Groups { get; set; } = new List<Group>();
}
