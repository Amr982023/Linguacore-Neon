namespace LinguaCore.Domain.Entities;

public class Instructor : BaseEntity
{
    public Guid BranchId { get; set; }
    public Guid PersonId { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public Branch       Branch      { get; set; } = null!;
    public Person       Person      { get; set; } = null!;
    public ICollection<InstructorLanguage>      InstructorLanguages      { get; set; } = new List<InstructorLanguage>();
    public ICollection<Group>                   Groups                   { get; set; } = new List<Group>();
    public ICollection<GroupInstructorHistory>  GroupInstructorHistories { get; set; } = new List<GroupInstructorHistory>();
    public ICollection<Session>                 Sessions                 { get; set; } = new List<Session>();
    public ICollection<CommissionLedger>         CommissionLedgers        { get; set; } = new List<CommissionLedger>();
    public ICollection<GenericClosingInstructor> ClosingRows              { get; set; } = new List<GenericClosingInstructor>(); // ← replaces MonthlyClosingRecords
}
