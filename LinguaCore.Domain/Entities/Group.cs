namespace LinguaCore.Domain.Entities;

/// <summary>
/// PaymentStrategy controls how payments and session counts are structured:
///   Monthly    — fees tied to time periods (months); sessions counted within the month.
///   LevelBased — fees tied to level completion; sessions tied to level progression.
/// CommissionLedger works identically for both strategies via the existing
/// Payment → CommissionLedger flow. No commission logic changes required.
/// </summary>
public class Group : BaseEntity
{
    public Guid   BranchId               { get; set; }
    public Guid   LanguageLevelId        { get; set; }
    public Guid   InstructorId           { get; set; }   // current instructor
    public Guid?  HallId                 { get; set; }
    public Guid?  ZoomAccountId          { get; set; }
    public Guid   GroupCategoryId        { get; set; }
    public Guid   GroupTypeId            { get; set; }
    public Guid   DeliveryModeId         { get; set; }
    public Guid   GroupStatusId          { get; set; }

    public int ExpectedSessionsCount { get; set; } = 0;

    public string  Name                   { get; set; } = string.Empty;
    public decimal InstructorCommissionPct { get; set; }   // locked at creation
    public string  PaymentStrategy        { get; set; } = "MONTHLY";  // MONTHLY | LEVEL_BASED
    public decimal FeeAmount              { get; set; }
    public int     SessionsPerMonth       { get; set; } = 8;
    public int     GracePeriodDays        { get; set; }
    public DateTime StartDate             { get; set; }
    public int?    MaxCapacity            { get; set; }

    // Navigation
    public Branch        Branch        { get; set; } = null!;
    public LanguageLevel LanguageLevel { get; set; } = null!;
    public Instructor    Instructor    { get; set; } = null!;
    public Hall?         Hall          { get; set; }
    public ZoomAccount?  ZoomAccount   { get; set; }
    public GroupCategory GroupCategory { get; set; } = null!;
    public GroupType     GroupType     { get; set; } = null!;
    public DeliveryMode  DeliveryMode  { get; set; } = null!;
    public GroupStatus   GroupStatus   { get; set; } = null!;
    public ICollection<Session>                Sessions                { get; set; } = new List<Session>();
    public ICollection<GroupPeriod> GroupPeriods { get; set; } = new List<GroupPeriod>();

    public ICollection<Enrollment>             Enrollments             { get; set; } = new List<Enrollment>();
    public ICollection<Exam>                   Exams                   { get; set; } = new List<Exam>();
    public ICollection<GroupInstructorHistory> GroupInstructorHistories { get; set; } = new List<GroupInstructorHistory>();
    public ICollection<CommissionLedger>       CommissionLedgers        { get; set; } = new List<CommissionLedger>();
}
