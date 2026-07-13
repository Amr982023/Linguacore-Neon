using Microsoft.EntityFrameworkCore;
using LinguaCore.Domain.Entities;
using Google.Api;

namespace LinguaCore.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public bool IsSyncApply { get; set; } = false;

    // Core academic
    public DbSet<Language> Languages => Set<Language>();
    public DbSet<Level> Levels => Set<Level>();
    public DbSet<LanguageLevel> LanguageLevels => Set<LanguageLevel>();


    // Person generalization
    public DbSet<Person> Persons => Set<Person>();
    public DbSet<Instructor> Instructors => Set<Instructor>();
    public DbSet<InstructorLanguage> InstructorLanguages => Set<InstructorLanguage>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();

    // Goals
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<NestedGoal> NestedGoals => Set<NestedGoal>();

    // Branch / Infrastructure
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Hall> Halls => Set<Hall>();
    public DbSet<ZoomAccount> ZoomAccounts => Set<ZoomAccount>();

    // Lookups
    public DbSet<GroupCategory> GroupCategories => Set<GroupCategory>();
    public DbSet<GroupType> GroupTypes => Set<GroupType>();
    public DbSet<GroupStatus> GroupStatuses => Set<GroupStatus>();
    public DbSet<DeliveryMode> DeliveryModes => Set<DeliveryMode>();
    public DbSet<EnrollStatus> EnrollStatuses => Set<EnrollStatus>();
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
    public DbSet<PeriodLabel> PeriodLabels => Set<PeriodLabel>();

    // Group
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupInstructorHistory> GroupInstructorHistories => Set<GroupInstructorHistory>();

    // Enrollment
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();

    // Sessions & Attendance
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();

    // Exams
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<ExamResult> ExamResults => Set<ExamResult>();
    public DbSet<Certificate> Certificates => Set<Certificate>();

    // Finance
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<RefundRecord> RefundRecords => Set<RefundRecord>();
    public DbSet<CommissionLedger> CommissionLedgers => Set<CommissionLedger>();

    // Generic Closing
    public DbSet<GenericClosing> GenericClosings => Set<GenericClosing>();
    public DbSet<GenericClosingInstructor> GenericClosingInstructors => Set<GenericClosingInstructor>();
    public DbSet<GenericClosingDetail> GenericClosingDetails => Set<GenericClosingDetail>();
    public DbSet<GenericClosingCenterDeduction> GenericClosingCenterDeductions => Set<GenericClosingCenterDeduction>();
    public DbSet<GenericClosingPartialPayment> GenericClosingPartialPayments => Set<GenericClosingPartialPayment>();
    public DbSet<GenericClosingIncomeRecord> GenericClosingIncomeRecords => Set<GenericClosingIncomeRecord>();

    // Firebase sync tracking


    // Misc
    public DbSet<WaitingList> WaitingLists => Set<WaitingList>();

    public DbSet<BranchRegistry> BranchRegistries => Set<BranchRegistry>();
    public DbSet<GroupPeriod> GroupPeriods => Set<GroupPeriod>();
    public DbSet<CenterDeduction> CenterDeduction => Set<CenterDeduction>();

    public DbSet<ItemCategory> ItemCategories => Set<ItemCategory>();
    public DbSet<StoreItem> StoreItems => Set<StoreItem>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();




    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<GenericClosingRefundSnapshot> GenericClosingRefundSnapshots => Set<GenericClosingRefundSnapshot>();
    public DbSet<GenericClosingInstructorBonus> GenericClosingInstructorBonuses => Set<GenericClosingInstructorBonus>();
    public DbSet<GenericClosingInstructorSalaryDeduction> GenericClosingInstructorSalaryDeductions => Set<GenericClosingInstructorSalaryDeduction>();


    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured) return;
        optionsBuilder.ConfigureWarnings(warnings =>
            warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<LanguageLevel>()
    .HasOne(ll => ll.Branch).WithMany(b => b.LanguageLevels)
    .HasForeignKey(ll => ll.BranchId).OnDelete(DeleteBehavior.Restrict);
        // ── Unique indexes ────────────────────────────────────────────────────
        modelBuilder.Entity<LanguageLevel>()
            .HasIndex(x => new {
                x.BranchId,
                x.LanguageId,
                x.LevelId
            }).IsUnique();
        modelBuilder.Entity<InstructorLanguage>()
            .HasIndex(x => new { x.InstructorId, x.LanguageId }).IsUnique();
        modelBuilder.Entity<Student>()
            .HasIndex(x => x.QrCode).IsUnique();
        modelBuilder.Entity<Certificate>()
            .HasIndex(x => x.SerialNumber).IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<AttendanceRecord>()
            .HasIndex(x => new { x.SessionId, x.StudentId }).IsUnique();
        // PostgreSQL: filtered index predicates use double-quoted identifiers,
        // not SQL Server's bracket syntax.
        modelBuilder.Entity<CommissionLedger>()
            .HasIndex(x => new { x.PaymentId, x.SessionId })
            .IsUnique()
            .HasFilter("\"SessionId\" IS NOT NULL");
        modelBuilder.Entity<GroupPeriod>()
            .HasIndex(x => new { x.GroupId, x.PeriodLabelId }).IsUnique();

        // ── Decimal precision ─────────────────────────────────────────────────
        modelBuilder.Entity<Group>()
            .Property(x => x.InstructorCommissionPct).HasPrecision(5, 2);
        modelBuilder.Entity<Group>()
            .Property(x => x.FeeAmount).HasPrecision(10, 2);
        modelBuilder.Entity<Enrollment>()
            .Property(x => x.EffectiveFee).HasPrecision(10, 2);
        modelBuilder.Entity<Enrollment>()
            .Property(x => x.PartialCost).HasPrecision(10, 2);
        modelBuilder.Entity<Enrollment>()
            .Property(x => x.DiscountPct).HasPrecision(5, 2);
        modelBuilder.Entity<Payment>()
            .Property(x => x.AmountDue).HasPrecision(10, 2);
        modelBuilder.Entity<Payment>()
            .Property(x => x.AmountPaid).HasPrecision(10, 2);
        modelBuilder.Entity<RefundRecord>()
            .Property(x => x.AmountPaid).HasPrecision(10, 2);
        modelBuilder.Entity<RefundRecord>()
            .Property(x => x.RefundAmount).HasPrecision(10, 2);
        modelBuilder.Entity<CommissionLedger>()
            .Property(x => x.CommissionPct).HasPrecision(5, 2);
        modelBuilder.Entity<CommissionLedger>()
            .Property(x => x.GrossPayment).HasPrecision(10, 2);
        modelBuilder.Entity<CommissionLedger>()
            .Property(x => x.CommissionAmount).HasPrecision(10, 2);
        modelBuilder.Entity<CommissionLedger>()
            .Property(x => x.CentreAmount).HasPrecision(10, 2);
        modelBuilder.Entity<WaitingList>()
            .Property(x => x.ReservationFee).HasPrecision(10, 2);
        modelBuilder.Entity<ExamResult>()
            .Property(x => x.MarksObtained).HasPrecision(7, 2);
        modelBuilder.Entity<Exam>()
            .Property(x => x.TotalMarks).HasPrecision(7, 2);
        modelBuilder.Entity<Exam>()
            .Property(x => x.PassPercentage).HasPrecision(5, 2);
        modelBuilder.Entity<GroupInstructorHistory>()
            .Property(x => x.CommissionPct).HasPrecision(5, 2);
        modelBuilder.Entity<GenericClosingInstructor>()
            .Property(x => x.TotalGross).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingInstructor>()
            .Property(x => x.TotalCommission).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingInstructor>()
            .Property(x => x.TotalDeductions).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingInstructor>()
            .Property(x => x.NetPayable).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingDetail>()
            .Property(x => x.GrossPayment).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingDetail>()
            .Property(x => x.CommissionAmount).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosing>()
            .Property(x => x.TotalCenterDeductions).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosing>()
            .Property(x => x.CenterNetEarned).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosing>()
            .Property(x => x.TotalIncomeReceived).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingCenterDeduction>()
            .Property(x => x.Amount).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingPartialPayment>()
            .Property(x => x.AmountPaid).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingIncomeRecord>()
            .Property(x => x.AmountPaid).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingInstructorBonus>()
            .Property(x => x.Amount).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingInstructorSalaryDeduction>()
            .Property(x => x.Amount).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingInstructor>()
            .Property(x => x.TotalBonus).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingInstructor>()
            .Property(x => x.TotalSalaryDeductions).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosing>()
            .Property(x => x.TotalInstructorBonuses).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosing>()
            .Property(x => x.TotalInstructorSalaryDeductions).HasPrecision(10, 2);

        // ── FK relationships ──────────────────────────────────────────────────

        // Language (branch-scoped)
        modelBuilder.Entity<Language>()
            .HasOne(l => l.Branch).WithMany(b => b.Languages)
            .HasForeignKey(l => l.BranchId).OnDelete(DeleteBehavior.Restrict);

        // Level (branch-scoped)
        modelBuilder.Entity<Level>()
            .HasOne(l => l.Branch).WithMany(b => b.Levels)
            .HasForeignKey(l => l.BranchId).OnDelete(DeleteBehavior.Restrict);

        // Goal (branch-scoped)
        modelBuilder.Entity<Goal>()
            .HasOne(g => g.Branch).WithMany(b => b.Goals)
            .HasForeignKey(g => g.BranchId).OnDelete(DeleteBehavior.Restrict);

        // PaymentMethod (branch-scoped)
        modelBuilder.Entity<PaymentMethod>()
            .HasOne(pm => pm.Branch).WithMany(b => b.PaymentMethods)
            .HasForeignKey(pm => pm.BranchId).OnDelete(DeleteBehavior.Restrict);

        // Role (branch-scoped)
        modelBuilder.Entity<Role>()
            .HasOne(r => r.Branch).WithMany(b => b.Roles)
            .HasForeignKey(r => r.BranchId).OnDelete(DeleteBehavior.Restrict);

        // PeriodLabel (branch-scoped)
        modelBuilder.Entity<PeriodLabel>()
            .HasOne(pl => pl.Branch).WithMany(b => b.PeriodLabels)
            .HasForeignKey(pl => pl.BranchId).OnDelete(DeleteBehavior.Restrict);

        // CommissionLedger
        modelBuilder.Entity<CommissionLedger>()
            .HasOne(c => c.Instructor).WithMany(i => i.CommissionLedgers)
            .HasForeignKey(c => c.InstructorId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CommissionLedger>()
            .HasOne(c => c.Group).WithMany(g => g.CommissionLedgers)
            .HasForeignKey(c => c.GroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CommissionLedger>()
            .HasOne(c => c.Payment).WithMany(p => p.CommissionLedgers)
            .HasForeignKey(c => c.PaymentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CommissionLedger>()
            .HasOne(c => c.Session).WithMany(s => s.CommissionLedgers)
            .HasForeignKey(c => c.SessionId).OnDelete(DeleteBehavior.Restrict);

        // GenericClosing
        modelBuilder.Entity<GenericClosing>()
            .HasOne(c => c.Branch).WithMany(b => b.GenericClosings)
            .HasForeignKey(c => c.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosing>()
            .HasOne(c => c.CreatedByUser).WithMany()
            .HasForeignKey(c => c.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosing>()
            .HasOne(c => c.ConfirmedByUser).WithMany()
            .HasForeignKey(c => c.ConfirmedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosing>()
            .HasIndex(c => new { c.BranchId, c.Status });

        // GenericClosingInstructor
        modelBuilder.Entity<GenericClosingInstructor>()
            .HasOne(ir => ir.GenericClosing).WithMany(c => c.InstructorRows)
            .HasForeignKey(ir => ir.GenericClosingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingInstructor>()
            .HasOne(ir => ir.Instructor).WithMany(i => i.ClosingRows)
            .HasForeignKey(ir => ir.InstructorId).OnDelete(DeleteBehavior.Restrict);

        // GenericClosingInstructorBonus
        modelBuilder.Entity<GenericClosingInstructorBonus>()
            .HasOne(b => b.GenericClosingInstructor).WithMany(ir => ir.Bonuses)
            .HasForeignKey(b => b.GenericClosingInstructorId).OnDelete(DeleteBehavior.Restrict);

        // GenericClosingInstructorSalaryDeduction
        modelBuilder.Entity<GenericClosingInstructorSalaryDeduction>()
            .HasOne(d => d.GenericClosingInstructor).WithMany(ir => ir.SalaryDeductions)
            .HasForeignKey(d => d.GenericClosingInstructorId).OnDelete(DeleteBehavior.Restrict);

        // GenericClosingDetail
        modelBuilder.Entity<GenericClosingDetail>()
            .HasOne(d => d.GenericClosingInstructor).WithMany(ir => ir.Details)
            .HasForeignKey(d => d.GenericClosingInstructorId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingDetail>()
            .HasOne(d => d.CommissionLedger).WithMany()
            .HasForeignKey(d => d.CommissionLedgerId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingDetail>()
            .HasOne(d => d.Group).WithMany()
            .HasForeignKey(d => d.GroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingDetail>()
            .HasOne(d => d.Payment).WithMany()
            .HasForeignKey(d => d.PaymentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingDetail>()
            .HasOne(d => d.Session).WithMany()
            .HasForeignKey(d => d.SessionId).OnDelete(DeleteBehavior.Restrict);

        // GenericClosingCenterDeduction
        modelBuilder.Entity<GenericClosingCenterDeduction>()
            .HasOne(d => d.GenericClosing).WithMany(c => c.CenterDeductions)
            .HasForeignKey(d => d.GenericClosingId).OnDelete(DeleteBehavior.Restrict);


        modelBuilder.Entity<GenericClosingCenterDeduction>()
                .HasOne(d => d.CenterDeduction).WithMany()
                .HasForeignKey(d => d.CenterDeductionId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

        // GenericClosingPartialPayment
        modelBuilder.Entity<GenericClosingPartialPayment>()
            .HasOne(p => p.GenericClosing).WithMany(c => c.PartialPayments)
            .HasForeignKey(p => p.GenericClosingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingPartialPayment>()
            .HasOne(p => p.Payment).WithMany()
            .HasForeignKey(p => p.PaymentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingPartialPayment>()
            .HasOne(p => p.Group).WithMany()
            .HasForeignKey(p => p.GroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingPartialPayment>()
            .HasOne(p => p.PeriodLabel).WithMany()
            .HasForeignKey(p => p.PeriodLabelId).OnDelete(DeleteBehavior.Restrict);

        // GenericClosingIncomeRecord
        modelBuilder.Entity<GenericClosingIncomeRecord>()
            .HasOne(r => r.GenericClosing).WithMany(c => c.IncomeRecords)
            .HasForeignKey(r => r.GenericClosingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingIncomeRecord>()
            .HasOne(r => r.Payment).WithMany()
            .HasForeignKey(r => r.PaymentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingIncomeRecord>()
            .HasOne(r => r.Group).WithMany()
            .HasForeignKey(r => r.GroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingIncomeRecord>()
            .HasOne(r => r.Student).WithMany()
            .HasForeignKey(r => r.StudentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingIncomeRecord>()
            .HasOne(r => r.PeriodLabel).WithMany()
            .HasForeignKey(r => r.PeriodLabelId).OnDelete(DeleteBehavior.Restrict);

        // Payment → PeriodLabel
        modelBuilder.Entity<Payment>()
            .HasOne(p => p.PeriodLabel).WithMany(pl => pl.Payments)
            .HasForeignKey(p => p.PeriodLabelId).OnDelete(DeleteBehavior.Restrict);

        // Session → PeriodLabel
        modelBuilder.Entity<Session>()
            .HasOne(s => s.PeriodLabel).WithMany(pl => pl.Sessions)
            .HasForeignKey(s => s.PeriodLabelId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Session>()
            .HasIndex(s => new { s.GroupId, s.PeriodLabelId })
            .HasDatabaseName("IX_Session_GroupId_PeriodLabelId");

        // Group
        modelBuilder.Entity<Group>()
            .HasOne(g => g.Branch).WithMany(b => b.Groups)
            .HasForeignKey(g => g.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Group>()
            .HasOne(g => g.LanguageLevel).WithMany(ll => ll.Groups)
            .HasForeignKey(g => g.LanguageLevelId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Group>()
            .HasOne(g => g.Hall).WithMany(h => h.Groups)
            .HasForeignKey(g => g.HallId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Group>()
            .HasOne(g => g.ZoomAccount).WithMany(z => z.Groups)
            .HasForeignKey(g => g.ZoomAccountId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Group>()
            .HasOne(g => g.Instructor).WithMany(i => i.Groups)
            .HasForeignKey(g => g.InstructorId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Group>()
            .HasIndex(g => new { g.BranchId, g.GroupStatusId });

        // GroupPeriod
        modelBuilder.Entity<GroupPeriod>()
            .HasOne(gp => gp.Group).WithMany(g => g.GroupPeriods)
            .HasForeignKey(gp => gp.GroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GroupPeriod>()
            .HasOne(gp => gp.PeriodLabel).WithMany()
            .HasForeignKey(gp => gp.PeriodLabelId).OnDelete(DeleteBehavior.Restrict);

        // Session
        modelBuilder.Entity<Session>()
            .HasOne(s => s.Group).WithMany(g => g.Sessions)
            .HasForeignKey(s => s.GroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Session>()
            .HasOne(s => s.Instructor).WithMany(i => i.Sessions)
            .HasForeignKey(s => s.InstructorId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Session>()
            .HasOne(s => s.Hall).WithMany(h => h.Sessions)
            .HasForeignKey(s => s.HallId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Session>()
            .HasOne(s => s.ZoomAccount).WithMany(z => z.Sessions)
            .HasForeignKey(s => s.ZoomAccountId).OnDelete(DeleteBehavior.Restrict);

        // Enrollment
        modelBuilder.Entity<Enrollment>()
            .HasOne(e => e.Student).WithMany(s => s.Enrollments)
            .HasForeignKey(e => e.StudentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Enrollment>()
            .HasOne(e => e.Group).WithMany(g => g.Enrollments)
            .HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Enrollment>()
            .HasIndex(e => e.GroupId)
             .HasDatabaseName("IX_Enrollment_GroupId");

        // Payment
        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Enrollment).WithMany(e => e.Payments)
            .HasForeignKey(p => p.EnrollmentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Payment>()
            .HasOne(p => p.RecordedByUser).WithMany()
            .HasForeignKey(p => p.RecordedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Payment>()
            .HasIndex(p => new { p.PaymentDate, p.Id })
            .HasDatabaseName("IX_Payment_PaymentDate_Id");
        modelBuilder.Entity<Payment>()
            .HasIndex(p => new { p.EnrollmentId, p.PeriodLabelId })
            .HasDatabaseName("IX_Payment_EnrollmentId_PeriodLabelId");
        modelBuilder.Entity<Payment>()
            .HasIndex(p => p.PaymentMethodId)
            .HasDatabaseName("IX_Payment_PaymentMethodId");

        // RefundRecord
        modelBuilder.Entity<RefundRecord>()
            .HasOne(r => r.Student).WithMany(s => s.RefundRecords)
            .HasForeignKey(r => r.StudentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<RefundRecord>()
            .HasOne(r => r.Payment).WithMany()
            .HasForeignKey(r => r.PaymentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<RefundRecord>()
            .HasOne(r => r.ProcessedByUser).WithMany()
            .HasForeignKey(r => r.ProcessedBy).OnDelete(DeleteBehavior.Restrict);

        // AttendanceRecord
        modelBuilder.Entity<AttendanceRecord>()
            .HasOne(a => a.Session).WithMany(s => s.AttendanceRecords)
            .HasForeignKey(a => a.SessionId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<AttendanceRecord>()
            .HasOne(a => a.Student).WithMany(s => s.AttendanceRecords)
            .HasForeignKey(a => a.StudentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<AttendanceRecord>()
            .HasOne(a => a.RecordedByUser).WithMany()
            .HasForeignKey(a => a.RecordedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<AttendanceRecord>()
            .HasOne(a => a.RevertedByUser).WithMany()
            .HasForeignKey(a => a.RevertedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<AttendanceRecord>()
            .HasIndex(a => new { a.StudentId, a.Status, a.Reverted })
            .HasDatabaseName("IX_AttendanceRecord_StudentId_Status_Reverted");

        // ExamResult
        modelBuilder.Entity<ExamResult>()
            .HasOne(e => e.Exam).WithMany(ex => ex.ExamResults)
            .HasForeignKey(e => e.ExamId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ExamResult>()
            .HasOne(e => e.Student).WithMany(s => s.ExamResults)
            .HasForeignKey(e => e.StudentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ExamResult>()
            .HasOne(e => e.RecordedByUser).WithMany()
            .HasForeignKey(e => e.RecordedBy).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ExamResult>()
            .HasIndex(x => new { x.ExamId, x.Passed });

        // Exam
        modelBuilder.Entity<Exam>()
            .HasOne(e => e.Group).WithMany(g => g.Exams)
            .HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Exam>()
            .HasOne(e => e.CreatedByUser).WithMany()
            .HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.Restrict);

        // Certificate
        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.Student).WithMany(s => s.Certificates)
            .HasForeignKey(c => c.StudentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.LanguageLevel).WithMany(ll => ll.Certificates)
            .HasForeignKey(c => c.LanguageLevelId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.ExamResult).WithOne(er => er.Certificate)
            .HasForeignKey<Certificate>(c => c.ExamResultId).OnDelete(DeleteBehavior.Restrict);

        // GroupInstructorHistory
        modelBuilder.Entity<GroupInstructorHistory>()
            .HasOne(h => h.Group).WithMany(g => g.GroupInstructorHistories)
            .HasForeignKey(h => h.GroupId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GroupInstructorHistory>()
            .HasOne(h => h.Instructor).WithMany(i => i.GroupInstructorHistories)
            .HasForeignKey(h => h.InstructorId).OnDelete(DeleteBehavior.Restrict);

        // Student
        modelBuilder.Entity<Student>()
            .HasOne(s => s.Branch).WithMany(b => b.Students)
            .HasForeignKey(s => s.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Student>()
            .HasOne(s => s.Person).WithOne(p => p.Student)
            .HasForeignKey<Student>(s => s.PersonId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Student>()
            .HasOne(s => s.Goal).WithMany(g => g.Students)
            .HasForeignKey(s => s.GoalId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Student>()
            .HasOne(s => s.NestedGoal).WithMany()
            .HasForeignKey(s => s.NestedGoalId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Student>()
            .HasIndex(s => new { s.BranchId, s.IsActive });
        modelBuilder.Entity<Enrollment>()
            .HasIndex(e => new { e.StudentId, e.EnrollStatusId });



        // Instructor
        modelBuilder.Entity<Instructor>()
            .HasOne(i => i.Branch).WithMany(b => b.Instructors)
            .HasForeignKey(i => i.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Instructor>()
            .HasOne(i => i.Person).WithOne(p => p.Instructor)
            .HasForeignKey<Instructor>(i => i.PersonId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Instructor>()
            .HasIndex(x => new { x.BranchId, x.IsActive });

        modelBuilder.Entity<InstructorLanguage>()
            .HasIndex(x => x.LanguageId); // existing unique index is (InstructorId, LanguageId) — doesn't help a reverse lookup by LanguageId alone

        // User
        modelBuilder.Entity<User>()
            .HasOne(u => u.Branch).WithMany(b => b.Users)
            .HasForeignKey(u => u.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<User>()
            .HasOne(u => u.Person).WithOne(p => p.User)
            .HasForeignKey<User>(u => u.PersonId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<User>()
            .HasOne(u => u.Role).WithMany(r => r.Users)
            .HasForeignKey(u => u.RoleId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<User>()
    .HasIndex(u => new { u.BranchId, u.IsActive });

        // InstructorLanguage
        modelBuilder.Entity<InstructorLanguage>()
            .HasOne(il => il.Instructor).WithMany(i => i.InstructorLanguages)
            .HasForeignKey(il => il.InstructorId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<InstructorLanguage>()
            .HasOne(il => il.Language).WithMany(l => l.InstructorLanguages)
            .HasForeignKey(il => il.LanguageId).OnDelete(DeleteBehavior.Restrict);

        // LanguageLevel
        modelBuilder.Entity<LanguageLevel>()
            .HasOne(ll => ll.Language).WithMany(l => l.LanguageLevels)
            .HasForeignKey(ll => ll.LanguageId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<LanguageLevel>()
            .HasOne(ll => ll.Level).WithMany(lv => lv.LanguageLevels)
            .HasForeignKey(ll => ll.LevelId).OnDelete(DeleteBehavior.Restrict);



        // CenterDeduction
        modelBuilder.Entity<CenterDeduction>()
            .HasOne(d => d.Branch).WithMany()
            .HasForeignKey(d => d.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CenterDeduction>()
            .HasOne(d => d.CreatedByUser).WithMany()
            .HasForeignKey(d => d.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CenterDeduction>()
            .Property(x => x.Amount).HasPrecision(10, 2);




        // Hall / ZoomAccount
        modelBuilder.Entity<Hall>()
            .HasOne(h => h.Branch).WithMany(b => b.Halls)
            .HasForeignKey(h => h.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ZoomAccount>()
            .HasOne(z => z.Branch).WithMany(b => b.ZoomAccounts)
            .HasForeignKey(z => z.BranchId).OnDelete(DeleteBehavior.Restrict);

        // NestedGoal
        modelBuilder.Entity<NestedGoal>()
            .HasOne(ng => ng.Goal).WithMany(g => g.NestedGoals)
            .HasForeignKey(ng => ng.GoalId).OnDelete(DeleteBehavior.Restrict);

        // WaitingList
        modelBuilder.Entity<WaitingList>()
            .HasOne(w => w.Branch).WithMany(b => b.WaitingLists)
            .HasForeignKey(w => w.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<WaitingList>()
            .HasOne(w => w.Language).WithMany(l => l.WaitingLists)
            .HasForeignKey(w => w.LanguageId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<WaitingList>()
            .HasOne(w => w.Level).WithMany(lv => lv.WaitingLists)
            .HasForeignKey(w => w.LevelId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<WaitingList>()
            .HasOne(w => w.AssignedToUser).WithMany()
            .HasForeignKey(w => w.AssignedTo).OnDelete(DeleteBehavior.Restrict);


        // Precision
        modelBuilder.Entity<GenericClosingRefundSnapshot>()
            .Property(x => x.AmountPaid).HasPrecision(10, 2);
        modelBuilder.Entity<GenericClosingRefundSnapshot>()
            .Property(x => x.RefundAmount).HasPrecision(10, 2);

        // FK
        modelBuilder.Entity<GenericClosingRefundSnapshot>()
            .HasOne(r => r.GenericClosing).WithMany(c => c.RefundSnapshots)
            .HasForeignKey(r => r.GenericClosingId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingRefundSnapshot>()
            .HasOne(r => r.RefundRecord).WithMany()
            .HasForeignKey(r => r.RefundRecordId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingRefundSnapshot>()
            .HasOne(r => r.Student).WithMany()
            .HasForeignKey(r => r.StudentId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<GenericClosingRefundSnapshot>()
            .HasOne(r => r.Group).WithMany()
            .HasForeignKey(r => r.GroupId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<GenericClosing>()
    .Property(x => x.TotalRefunded).HasPrecision(10, 2);

        modelBuilder.Entity<RefundRecord>()
    .Property(x => x.CalculatedRefundAmount).HasPrecision(10, 2);
        modelBuilder.Entity<RefundRecord>()
            .Property(x => x.ActualRefundAmount).HasPrecision(10, 2);

        modelBuilder.Entity<AppSetting>()
    .HasIndex(x => x.Key).IsUnique();


        // ── Store & Sales module ────────────────────────────────────────────────

        modelBuilder.Entity<ItemCategory>()
            .HasIndex(x => x.Name).IsUnique();

        modelBuilder.Entity<StoreItem>()
            .Property(x => x.Price).HasPrecision(10, 2);
        // PostgreSQL has no SQL Server `rowversion`/`timestamp` binary type.
        // Use the built-in `xmin` system column as the concurrency token instead.
        // NOTE: this requires the `RowVersion` property on the StoreItem entity
        // to be typed as `uint` (not `byte[]`) — update Domain.Entities.StoreItem accordingly.
        modelBuilder.Entity<StoreItem>()
            .Property(x => x.RowVersion)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsConcurrencyToken();
        modelBuilder.Entity<StoreItem>()
            .HasOne(x => x.Branch).WithMany()
            .HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StoreItem>()
            .HasOne(x => x.Category).WithMany(c => c.StoreItems)
            .HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StoreItem>()
            .HasOne(x => x.CreatedByUser).WithMany()
            .HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StoreItem>()
            .HasIndex(x => new { x.BranchId, x.CategoryId });

        modelBuilder.Entity<Sale>()
            .Property(x => x.TotalAmount).HasPrecision(10, 2);
        modelBuilder.Entity<Sale>()
            .HasOne(x => x.Branch).WithMany()
            .HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Sale>()
            .HasOne(x => x.CreatedByUser).WithMany()
            .HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Sale>()
            .HasIndex(x => new { x.BranchId, x.SaleDate });

        modelBuilder.Entity<SaleItem>()
            .Property(x => x.UnitPriceSnapshot).HasPrecision(10, 2);
        modelBuilder.Entity<SaleItem>()
            .Property(x => x.LineTotal).HasPrecision(10, 2);
        modelBuilder.Entity<SaleItem>()
            .HasOne(x => x.Sale).WithMany(s => s.SaleItems)
            .HasForeignKey(x => x.SaleId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<SaleItem>()
            .HasOne(x => x.StoreItem).WithMany()
            .HasForeignKey(x => x.StoreItemId).OnDelete(DeleteBehavior.Restrict);




        // ── GLOBAL PASS: Restrict all remaining FKs ───────────────────────────
        foreach (var fk in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Restrict;

        // ── Seed static lookup data (no BranchId dependency) ──────────────────
        SeedStaticLookups(modelBuilder);

        // ── GLOBAL PASS 2: Restrict after seed ───────────────────────────────
        foreach (var fk in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Restrict;
    }

    /// <summary>
    /// Only seeds entities that have NO BranchId dependency.
    /// Branch-scoped lookups (Language, Level, Goal, PaymentMethod, Role, PeriodLabel)
    /// are seeded at runtime by DatabaseSeeder after the branch is created.
    /// </summary>
    private static void SeedStaticLookups(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppSetting>().HasData(
          new AppSetting
          {
              Id = Guid.Parse("30000001-0000-0000-0000-000000000001"),
              Key = "payment.overdue_days",
              Value = "6",
              Description = "Days after the first session of a period before unpaid enrollments are considered overdue",
              CreatedAt = DateTime.UtcNow,
              ModifiedAt = DateTime.UtcNow,
          }
      );
        modelBuilder.Entity<GroupCategory>().HasData(
            new GroupCategory { Id = Guid.Parse("10000001-0000-0000-0000-000000000001"), Name = "BASIC", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new GroupCategory { Id = Guid.Parse("10000001-0000-0000-0000-000000000002"), Name = "ADDITIONAL", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<GroupType>().HasData(
            new GroupType { Id = Guid.Parse("10000002-0000-0000-0000-000000000001"), Name = "PUBLIC", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new GroupType { Id = Guid.Parse("10000002-0000-0000-0000-000000000002"), Name = "PRIVATE", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<GroupStatus>().HasData(
            new GroupStatus { Id = Guid.Parse("10000003-0000-0000-0000-000000000001"), Name = "ACTIVE", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new GroupStatus { Id = Guid.Parse("10000003-0000-0000-0000-000000000002"), Name = "COMPLETED", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new GroupStatus { Id = Guid.Parse("10000003-0000-0000-0000-000000000003"), Name = "SUSPENDED", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<DeliveryMode>().HasData(
            new DeliveryMode { Id = Guid.Parse("10000004-0000-0000-0000-000000000001"), Name = "OFFLINE", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new DeliveryMode { Id = Guid.Parse("10000004-0000-0000-0000-000000000002"), Name = "ONLINE", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<EnrollStatus>().HasData(
            new EnrollStatus { Id = Guid.Parse("10000005-0000-0000-0000-000000000001"), Name = "PENDING", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new EnrollStatus { Id = Guid.Parse("10000005-0000-0000-0000-000000000002"), Name = "ACTIVE", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new EnrollStatus { Id = Guid.Parse("10000005-0000-0000-0000-000000000003"), Name = "SUSPENDED", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new EnrollStatus { Id = Guid.Parse("10000005-0000-0000-0000-000000000004"), Name = "COMPLETED", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new EnrollStatus { Id = Guid.Parse("10000005-0000-0000-0000-000000000005"), Name = "DROPPED", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new EnrollStatus { Id = Guid.Parse("10000005-0000-0000-0000-000000000006"), Name = "EXITED_REFUNDED", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new EnrollStatus { Id = Guid.Parse("10000005-0000-0000-0000-000000000007"), Name = "PARTIAL", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow },
            new EnrollStatus { Id = Guid.Parse("10000005-0000-0000-0000-000000000008"), Name = "CANCELLED", CreatedAt = DateTime.UtcNow, ModifiedAt = DateTime.UtcNow }
        );

    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        if (!IsSyncApply)
        {
            var entries = ChangeTracker.Entries<BaseEntity>()
                .Where(e => e.State == EntityState.Modified);
            foreach (var entry in entries)
                entry.Entity.ModifiedAt = DateTime.UtcNow;
        }

        ConvertDateTimesToUtc();

        return await base.SaveChangesAsync(cancellationToken);
    }

    private void ConvertDateTimesToUtc()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            foreach (var property in entry.Properties)
            {
                if (property.Metadata.ClrType == typeof(DateTime))
                {
                    var value = (DateTime)property.CurrentValue!;
                    property.CurrentValue = NormalizeToUtc(value);
                }
                else if (property.Metadata.ClrType == typeof(DateTime?))
                {
                    var value = (DateTime?)property.CurrentValue;
                    if (value.HasValue)
                        property.CurrentValue = NormalizeToUtc(value.Value);
                }
            }
        }
    }

    private static DateTime NormalizeToUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
            _ => value
        };
    }
}