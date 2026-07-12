namespace LinguaCore.Domain.Entities;

public class EnrollStatus : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    // PENDING | ACTIVE | SUSPENDED | COMPLETED | DROPPED | EXITED_REFUNDED | PARTIAL | CANCELLED

    // Navigation
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
}
