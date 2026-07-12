namespace LinguaCore.Domain.Entities;

public class Person : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string? SecondName { get; set; }
    public string LastName { get; set; } = string.Empty;
    public string? NationalId { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }   // MALE | FEMALE
    public string? Phone { get; set; }
    public string? WhatsappNumber { get; set; }
    public string? Address { get; set; }
    public string? Email { get; set; }

    // Navigation
    public Student? Student { get; set; }
    public Instructor? Instructor { get; set; }
    public User? User { get; set; }
}
