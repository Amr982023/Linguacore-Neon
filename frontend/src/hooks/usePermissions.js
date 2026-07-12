// src/hooks/usePermissions.js
import { useMemo } from "react";
import { useAuthStore } from "../context/authStore";

export const BITS = {
  StudentsRead: 1 << 1,
  StudentsWrite: 1 << 2,
  InstructorsRead: 1 << 3,
  InstructorsWrite: 1 << 4,
  GroupsRead: 1 << 5,
  GroupsWrite: 1 << 6,
  SessionsRead: 1 << 7,
  SessionsWrite: 1 << 8,
  AttendanceRead: 1 << 9,
  AttendanceWrite: 1 << 10,
  AttendanceRevert: 1 << 11,
  ExamsRead: 1 << 12,
  ExamsWrite: 1 << 13,
  PaymentsRead: 1 << 14,
  PaymentsWrite: 1 << 15,
  ClosingsRead: 1 << 16,
  ClosingsWrite: 1 << 17,
  DashboardRead: 1 << 18,
  SettingsRead: 1 << 19,
  SettingsWrite: 1 << 20,
  RolesManage: 1 << 21,
  CertificatesRead: 1 << 22,
  NotificationsRead: 1 << 23,
  NotificationsWrite: 1 << 24,
  WaitingListRead: 1 << 25,
  WaitingListWrite: 1 << 26,
  UsersManage: 1 << 27,
  SyncManage: 1 << 28,
  BranchOverviewRead: 1 << 29,
  All: 1 << 30,
  ResourceSchedulerRead: 2147483648, // 1 << 31

  // ── Store & Sales ── new. Past bit 31, JS's 32-bit bitwise ops wrap around,
  // so these MUST be compared via BigInt (see `has()` below) — plain `&` would
  // silently collide StoreRead with StudentsRead, etc.
  StoreRead: 4294967296, // 1n << 32n
  StoreWrite: 8589934592, // 1n << 33n
  SalesRead: 17179869184, // 1n << 34n
  SalesWrite: 34359738368, // 1n << 35n
};

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const can = useMemo(() => {
    const isSuperAdmin = user?.roleName === "Super Admin";

    const bits =
      typeof user?.permissions === "number"
        ? user.permissions
        : parseInt(user?.permissions ?? "0", 10) || 0;

    // BigInt-safe bit test — works for every bit including 32+ where plain
    // JS `&` would wrap via ToInt32 and give a wrong answer.
    const bitsBig = BigInt(bits);
    const allBig = BigInt(BITS.All);

    function has(bit) {
      if (isSuperAdmin) return true;
      const bitBig = BigInt(bit);
      if (bitsBig & allBig) return true;
      return (bitsBig & bitBig) !== 0n;
    }

    return {
      has,
      isSuperAdmin,

      studentsRead: has(BITS.StudentsRead),
      studentsWrite: has(BITS.StudentsWrite),
      instructorsRead: has(BITS.InstructorsRead),
      instructorsWrite: has(BITS.InstructorsWrite),
      groupsRead: has(BITS.GroupsRead),
      groupsWrite: has(BITS.GroupsWrite),
      sessionsRead: has(BITS.SessionsRead),
      sessionsWrite: has(BITS.SessionsWrite),
      attendanceRead: has(BITS.AttendanceRead),
      attendanceWrite: has(BITS.AttendanceWrite),
      attendanceRevert: has(BITS.AttendanceRevert),
      examsRead: has(BITS.ExamsRead),
      examsWrite: has(BITS.ExamsWrite),
      paymentsRead: has(BITS.PaymentsRead),
      paymentsWrite: has(BITS.PaymentsWrite),
      closingsRead: has(BITS.ClosingsRead),
      closingsWrite: has(BITS.ClosingsWrite),
      dashboardRead: has(BITS.DashboardRead),
      settingsRead: has(BITS.SettingsRead),
      settingsWrite: has(BITS.SettingsWrite),
      rolesManage: has(BITS.RolesManage),
      certificatesRead: has(BITS.CertificatesRead),
      notificationsRead: has(BITS.NotificationsRead),
      notificationsWrite: has(BITS.NotificationsWrite),
      waitingListRead: has(BITS.WaitingListRead),
      branchOverviewRead: has(BITS.BranchOverviewRead),
      waitingListWrite: has(BITS.WaitingListWrite),
      usersManage: has(BITS.UsersManage),
      syncManage: has(BITS.SyncManage),
      resourceSchedulerRead: has(BITS.ResourceSchedulerRead),

      // ── Store & Sales ── new
      storeRead: has(BITS.StoreRead),
      storeWrite: has(BITS.StoreWrite),
      salesRead: has(BITS.SalesRead),
      salesWrite: has(BITS.SalesWrite),
    };
  }, [user]);

  return { can };
}
