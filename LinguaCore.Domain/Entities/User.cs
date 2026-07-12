namespace LinguaCore.Domain.Entities;

public class User : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid RoleId { get; set; }
    public Guid PersonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Navigation
    public Branch Branch { get; set; } = null!;
    public Role Role { get; set; } = null!;
    public Person Person { get; set; } = null!;
}
