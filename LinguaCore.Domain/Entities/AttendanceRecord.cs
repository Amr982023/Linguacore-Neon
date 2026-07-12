namespace LinguaCore.Domain.Entities;

public class AttendanceRecord : BaseEntity
{
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public Guid RecordedBy { get; set; }
    public Guid? RevertedBy { get; set; }
    public string Method { get; set; } = "MANUAL";   // MANUAL | QR_SCAN
    public string Status { get; set; } = "PRESENT";  // PRESENT | ABSENT | EXCUSED
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public bool Reverted { get; set; } = false;
    public string? RevertReason { get; set; }

    // Navigation
    public Session Session { get; set; } = null!;
    public Student Student { get; set; } = null!;
    public User RecordedByUser { get; set; } = null!;
    public User? RevertedByUser { get; set; }
}
