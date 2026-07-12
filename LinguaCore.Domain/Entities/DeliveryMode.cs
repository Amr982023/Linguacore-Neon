namespace LinguaCore.Domain.Entities;

public class DeliveryMode : BaseEntity
{
    public string Name { get; set; } = string.Empty;  // OFFLINE | ONLINE

    // Navigation
    public ICollection<Group> Groups { get; set; } = new List<Group>();
}
