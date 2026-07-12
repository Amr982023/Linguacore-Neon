using System.Data;

namespace LinguaCore.Domain.Entities;

public class Branch : BaseEntity
{
    public string  Name             { get; set; } = string.Empty;
    public string? Address          { get; set; }
    public string? GmailConfig      { get; set; }
    public string? WhatsappConfig   { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<LanguageLevel> LanguageLevels { get; set; } = new List<LanguageLevel>();
    public ICollection<Hall>            Halls           { get; set; } = new List<Hall>();
    public ICollection<Language> Languages { get; set; } = new List<Language>();
    public ICollection<Level> Levels { get; set; } = new List<Level>();
    public ICollection<Goal> Goals { get; set; } = new List<Goal>();
    public ICollection<PaymentMethod> PaymentMethods { get; set; } = new List<PaymentMethod>();
    public ICollection<Role> Roles { get; set; } = new List<Role>();
    public ICollection<PeriodLabel> PeriodLabels { get; set; } = new List<PeriodLabel>();
    public ICollection<ZoomAccount>     ZoomAccounts    { get; set; } = new List<ZoomAccount>();
    public ICollection<Instructor>      Instructors     { get; set; } = new List<Instructor>();
    public ICollection<Student>         Students        { get; set; } = new List<Student>();
    public ICollection<Group>           Groups          { get; set; } = new List<Group>();
    public ICollection<User>            Users           { get; set; } = new List<User>();
    public ICollection<WaitingList>     WaitingLists    { get; set; } = new List<WaitingList>();
    public ICollection<GenericClosing>  GenericClosings { get; set; } = new List<GenericClosing>(); // ← replaces MonthlyClosingRecords
}
