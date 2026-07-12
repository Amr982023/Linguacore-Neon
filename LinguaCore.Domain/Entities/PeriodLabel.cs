namespace LinguaCore.Domain.Entities;

/// <summary>
/// Lookup entity for period labels (e.g. "Month 1", "Level A1").
/// Replaces the plain string PeriodLabel on Payment and Session.
/// Managed exclusively from the Lookups settings page.
/// </summary>
public class PeriodLabel : BaseEntity
{
    public Guid BranchId { get; set; }
    public string Name        { get; set; } = string.Empty;  // e.g. "Month 1", "Level A1"
    public string? Description { get; set; }

    // Navigation (reverse FKs — do NOT load these eagerly in general queries)
    public Branch Branch { get; set; } = null!;
    public ICollection<Payment> Payments  { get; set; } = new List<Payment>();
    public ICollection<Session> Sessions  { get; set; } = new List<Session>();
}
