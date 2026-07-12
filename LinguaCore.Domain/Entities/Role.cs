namespace LinguaCore.Domain.Entities;

public class Role : BaseEntity
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Permissions { get; set; }  // JSON permission flag map
    public bool IsSystem { get; set; } = false;

    // Navigation
    public Branch Branch { get; set; } = null!;
    public ICollection<User> Users { get; set; } = new List<User>();
}
