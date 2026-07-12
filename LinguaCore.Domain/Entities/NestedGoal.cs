namespace LinguaCore.Domain.Entities;

public class NestedGoal : BaseEntity
{
    public Guid GoalId { get; set; }
    public string Name { get; set; } = string.Empty;

    // Navigation
    public Goal Goal { get; set; } = null!;
}
