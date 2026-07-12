namespace LinguaCore.Domain.Entities;

public class Session : BaseEntity
{
    public Guid GroupId { get; set; }
    public Guid InstructorId { get; set; }
    public Guid? HallId { get; set; }
    public Guid? ZoomAccountId { get; set; }
    public Guid PeriodLabelId { get; set; }
    public int SessionNumber { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? ActualDate { get; set; }
    public string? Topic { get; set; }
    public string Status { get; set; } = "SCHEDULED";
    public string? CancelledReason { get; set; }

    // ── Commission distribution tracking ─────────────────────────────────
    /// <summary>
    /// True when every active-enrolled student in this group+period had a
    /// matching payment at the time this session was created (i.e. no late payers).
    /// </summary>
    public bool IsCommissionFullyDistributed { get; set; } = false;

    // Navigation
    public Group Group { get; set; } = null!;
    public Instructor Instructor { get; set; } = null!;
    public Hall? Hall { get; set; }
    public ZoomAccount? ZoomAccount { get; set; }
    public PeriodLabel PeriodLabel { get; set; } = null!;
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
    public ICollection<CommissionLedger> CommissionLedgers { get; set; } = new List<CommissionLedger>();
}
