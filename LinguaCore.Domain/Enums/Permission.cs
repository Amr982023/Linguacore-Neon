// LinguaCore.Domain/Enums/Permissions.cs
namespace LinguaCore.Domain.Enums;

[Flags]
public enum Permission : long
{
    None = 0,

    // ── Students ─────────────────────────────────────────────────────────────
    StudentsRead = 1L << 1,
    StudentsWrite = 1L << 2,

    // ── Instructors ───────────────────────────────────────────────────────────
    InstructorsRead = 1L << 3,
    InstructorsWrite = 1L << 4,

    // ── Groups ────────────────────────────────────────────────────────────────
    GroupsRead = 1L << 5,
    GroupsWrite = 1L << 6,

    // ── Sessions ──────────────────────────────────────────────────────────────
    SessionsRead = 1L << 7,
    SessionsWrite = 1L << 8,

    // ── Attendance ────────────────────────────────────────────────────────────
    AttendanceRead = 1L << 9,
    AttendanceWrite = 1L << 10,
    AttendanceRevert = 1L << 11,

    // ── Exams ─────────────────────────────────────────────────────────────────
    ExamsRead = 1L << 12,
    ExamsWrite = 1L << 13,

    // ── Payments ─────────────────────────────────────────────────────────────
    PaymentsRead = 1L << 14,
    PaymentsWrite = 1L << 15,

    // ── Closings ─────────────────────────────────────────────────────────────
    ClosingsRead = 1L << 16,
    ClosingsWrite = 1L << 17,

    // ── Dashboard ────────────────────────────────────────────────────────────
    DashboardRead = 1L << 18,

    // ── Settings (Lookups) ────────────────────────────────────────────────────
    SettingsRead = 1L << 19,
    SettingsWrite = 1L << 20,

    // ── Roles management ─────────────────────────────────────────────────────
    RolesManage = 1L << 21,

    // ── Certificates ─────────────────────────────────────────────────────────
    CertificatesRead = 1L << 22,

    // ── Notifications ────────────────────────────────────────────────────────
    NotificationsRead = 1L << 23,
    NotificationsWrite = 1L << 24,

    // ── Waiting List ─────────────────────────────────────────────────────────
    WaitingListRead = 1L << 25,
    WaitingListWrite = 1L << 26,

    // ── Users management ─────────────────────────────────────────────────────
    UsersManage = 1L << 27,

    // ── Sync (Super Admin only) ───────────────────────────────────────────────
    SyncManage = 1L << 28,

    // ── Branch overview ───────────────────────────────────────────────────────
    BranchOverviewRead = 1L << 29,

    // ── Super permission — bypasses all checks ────────────────────────────────
    All = 1L << 30,

    // ── Resource Scheduler ────────────────────────────────────────────────────
    ResourceSchedulerRead = 1L << 31,

    // ── Store (inventory) ─────────────────────────────────────────────────────
    /// <summary>
    /// Bits 32-33 use 1L to stay long-safe past the 32-bit boundary, same
    /// convention as ResourceSchedulerRead.
    /// </summary>
    StoreRead = 1L << 32,
    StoreWrite = 1L << 33,

    // ── Sales ─────────────────────────────────────────────────────────────────
    SalesRead = 1L << 34,
    SalesWrite = 1L << 35,
}

public static class PermissionPolicies
{
    private const string Prefix = "Permission:";

    public const string LookupsRead = Prefix + nameof(Permission.SettingsRead);
    public const string LookupsWrite = Prefix + nameof(Permission.SettingsWrite);

    public const string StudentsRead = Prefix + nameof(Permission.StudentsRead);
    public const string StudentsWrite = Prefix + nameof(Permission.StudentsWrite);

    public const string InstructorsRead = Prefix + nameof(Permission.InstructorsRead);
    public const string InstructorsWrite = Prefix + nameof(Permission.InstructorsWrite);

    public const string GroupsRead = Prefix + nameof(Permission.GroupsRead);
    public const string GroupsWrite = Prefix + nameof(Permission.GroupsWrite);

    public const string SessionsRead = Prefix + nameof(Permission.SessionsRead);
    public const string SessionsWrite = Prefix + nameof(Permission.SessionsWrite);

    public const string AttendanceRead = Prefix + nameof(Permission.AttendanceRead);
    public const string AttendanceWrite = Prefix + nameof(Permission.AttendanceWrite);
    public const string AttendanceRevert = Prefix + nameof(Permission.AttendanceRevert);

    public const string ExamsRead = Prefix + nameof(Permission.ExamsRead);
    public const string ExamsWrite = Prefix + nameof(Permission.ExamsWrite);

    public const string PaymentsRead = Prefix + nameof(Permission.PaymentsRead);
    public const string PaymentsWrite = Prefix + nameof(Permission.PaymentsWrite);

    public const string ClosingsRead = Prefix + nameof(Permission.ClosingsRead);
    public const string ClosingsWrite = Prefix + nameof(Permission.ClosingsWrite);

    public const string DashboardRead = Prefix + nameof(Permission.DashboardRead);

    public const string SettingsRead = Prefix + nameof(Permission.SettingsRead);
    public const string SettingsWrite = Prefix + nameof(Permission.SettingsWrite);

    public const string RolesManage = Prefix + nameof(Permission.RolesManage);
    public const string CertificatesRead = Prefix + nameof(Permission.CertificatesRead);

    public const string NotificationsRead = Prefix + nameof(Permission.NotificationsRead);
    public const string NotificationsWrite = Prefix + nameof(Permission.NotificationsWrite);

    public const string WaitingListRead = Prefix + nameof(Permission.WaitingListRead);
    public const string WaitingListWrite = Prefix + nameof(Permission.WaitingListWrite);

    public const string UsersManage = Prefix + nameof(Permission.UsersManage);
    public const string SyncManage = Prefix + nameof(Permission.SyncManage);

    public const string BranchOverviewRead = Prefix + nameof(Permission.BranchOverviewRead);

    public const string ResourceSchedulerRead = Prefix + nameof(Permission.ResourceSchedulerRead);

    // ── Store & Sales ── new
    public const string StoreRead = Prefix + nameof(Permission.StoreRead);
    public const string StoreWrite = Prefix + nameof(Permission.StoreWrite);
    public const string SalesRead = Prefix + nameof(Permission.SalesRead);
    public const string SalesWrite = Prefix + nameof(Permission.SalesWrite);
}