namespace LinguaCore.Domain.Entities;

public class Goal : BaseEntity
{
    public Guid BranchId { get; set; }           // ? NEW
    public string Name { get; set; } = string.Empty;

    // Navigation
    public Branch Branch { get; set; } = null!;  // ? NEW
    public ICollection<NestedGoal> NestedGoals { get; set; } = new List<NestedGoal>();
    public ICollection<Student> Students { get; set; } = new List<Student>();
}
