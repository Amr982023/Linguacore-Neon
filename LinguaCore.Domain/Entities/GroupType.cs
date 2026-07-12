namespace LinguaCore.Domain.Entities;

public class GroupType : BaseEntity
{
    public string Name { get; set; } = string.Empty;  // PUBLIC | PRIVATE

    // Navigation
    public ICollection<Group> Groups { get; set; } = new List<Group>();
}
