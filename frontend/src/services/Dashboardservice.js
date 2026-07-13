/**
 * dashboardService.js
 *
 * Thin wrappers around the backend's /dashboard/* endpoints. Grouping,
 * ranking, and breakdowns happen server-side in DashboardService.cs — but
 * date-range resolution happens HERE, in JS, and is sent as explicit
 * from/to ISO strings.
 *
 * Why: `new DateTime(y, m, 1)` in C# produces DateTimeKind.Unspecified,
 * which Npgsql refuses to write to a `timestamp with time zone` column.
 * `.toISOString()` always emits a trailing "Z", and ASP.NET Core's DateTime
 * model binder parses a "Z"-suffixed string as Kind=Utc automatically — so
 * sending from/to explicitly sidesteps the backend's date construction
 * entirely for the common case. `period` is still sent alongside for the
 * on-screen label and as a fallback if from/to are ever omitted.
 */

import api from "./api";

// ─── period resolution (client-side, source of truth) ─────────────────────────
const startOfMonthUtc = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();

const nowIso = () => new Date().toISOString();

/**
 * Resolves "month" | "3months" | "year" into a concrete {from, to, label}.
 * Mirrors DashboardService.ResolvePeriod on the backend, but is now the
 * actual source of truth — the backend just uses whatever we send.
 */
function resolvePeriod(period = "month") {
  const now = new Date();
  if (period === "3months") {
    const from = new Date(now);
    from.setUTCMonth(from.getUTCMonth() - 3);
    return { from: from.toISOString(), to: nowIso(), label: "Last 3 months" };
  }
  if (period === "year") {
    const from = new Date(now);
    from.setUTCFullYear(from.getUTCFullYear() - 1);
    return { from: from.toISOString(), to: nowIso(), label: "Last year" };
  }
  return { from: startOfMonthUtc(), to: nowIso(), label: "This month" };
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
export const getOverviewSummary = async (branchId) => {
  const { from, to } = resolvePeriod("month");
  const [financial, students, groups] = await Promise.all([
    api.get("/dashboard/financial", { params: { branchId, from, to } }),
    api.get("/dashboard/students", {
      params: { branchId, period: "month", from, to },
    }),
    api.get("/dashboard/groups", { params: { branchId } }),
  ]);
  return {
    financial: financial.data?.data,
    students: students.data?.data,
    groups: groups.data?.data,
  };
};

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
export const getStudentSummary = async (branchId, period = "month") => {
  const { from, to } = resolvePeriod(period);
  const res = await api.get("/dashboard/students", {
    params: { branchId, period, from, to },
  });
  return res.data?.data;
};

// ─── GROUPS (rich) ────────────────────────────────────────────────────────────
export const getGroupSummaryRich = async (branchId) => {
  const res = await api.get("/dashboard/groups-rich", { params: { branchId } });
  return res.data?.data;
};

// ─── PAYMENTS (rich) ──────────────────────────────────────────────────────────
export const getPaymentSummaryRich = async (branchId, period = "month") => {
  const { from, to } = resolvePeriod(period);
  const res = await api.get("/dashboard/payments-rich", {
    params: { branchId, period, from, to },
  });
  return res.data?.data;
};

// ─── INSTRUCTORS (rich) ───────────────────────────────────────────────────────
export const getInstructorSummaryRich = async (branchId, period = "month") => {
  const { from, to } = resolvePeriod(period);
  const res = await api.get("/dashboard/instructors-rich", {
    params: { branchId, period, from, to },
  });
  return res.data?.data;
};

// ─── EXAMS (rich) ─────────────────────────────────────────────────────────────
export const getExamSummaryRich = async (branchId, period = "month") => {
  const { from, to } = resolvePeriod(period);
  const res = await api.get("/dashboard/exams-rich", {
    params: { branchId, period, from, to },
  });
  return res.data?.data;
};

// ─── WAITING LIST (rich) ──────────────────────────────────────────────────────
export const getWaitingSummaryRich = async (branchId) => {
  const res = await api.get("/dashboard/waiting-rich", {
    params: { branchId },
  });
  return res.data?.data;
};

// ─── CASH DRAWER (all-time, live) ──────────────────────────────────────────────
export const getCashDrawer = async (branchId) => {
  const res = await api.get("/dashboard/cash-drawer", { params: { branchId } });
  return res.data?.data;
};
