namespace LinguaCore.Domain.Entities;

public class Hall : BaseEntity
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? Capacity { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public Branch Branch { get; set; } = null!;
    public ICollection<Group> Groups { get; set; } = new List<Group>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
