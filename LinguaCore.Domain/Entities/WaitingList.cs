namespace LinguaCore.Domain.Entities;

public class WaitingList : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid LanguageId { get; set; }
    public Guid LevelId { get; set; }
    public Guid? AssignedTo { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public decimal ReservationFee { get; set; }
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "WAITING";  // WAITING | ENROLLED | CANCELLED | EXPIRED
    public string? Notes { get; set; }

    // Navigation
    public Branch Branch { get; set; } = null!;
    public Language Language { get; set; } = null!;
    public Level Level { get; set; } = null!;
    public User? AssignedToUser { get; set; }
}
