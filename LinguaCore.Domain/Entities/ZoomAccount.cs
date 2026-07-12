namespace LinguaCore.Domain.Entities;

public class ZoomAccount : BaseEntity
{
    public Guid BranchId { get; set; }
    public string AccountEmail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int MaxParticipants { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public Branch Branch { get; set; } = null!;
    public ICollection<Group> Groups { get; set; } = new List<Group>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
