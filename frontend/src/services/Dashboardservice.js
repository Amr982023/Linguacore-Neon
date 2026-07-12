/**
 * dashboardService.js
 *
 * Aggregates data for the Analytics Dashboard from the real REST APIs.
 * The three /dashboard/* endpoints return only basic totals; all the
 * chart-level breakdowns are computed here from the existing domain APIs.
 *
 * Strategy per pane
 * ─────────────────
 * Overview    → /dashboard/financial + /dashboard/students + /dashboard/groups
 * Students    → /dashboard/students  (already rich enough)
 * Groups      → /groups/branch/:id   (full list → group-by in JS)
 * Payments    → /payments/period     (full list → aggregate in JS)
 *               /closing/branch/:id  (for byClosingType breakdown)
 *               /centerdeduction/branch/:id (for totalDeductions / cash drawer)
 * Instructors → /instructors/branch + /payments/commission per instructor
 * Exams       → /exams/group per group (fan-out, then aggregate)
 * Waiting     → /waitinglist/branch  (full list → bucket in JS)
 * Cash drawer → /dashboard/cash-drawer (all-time, cumulative — backend-computed)
 */

import api from "./api";

// ─── thin wrappers for the three existing dashboard endpoints ─────────────────
const _fin = (branchId, from, to) =>
  api.get("/dashboard/financial", { params: { branchId, from, to } });
const _stu = (branchId) =>
  api.get("/dashboard/students", { params: { branchId } });
const _grp = (branchId) =>
  api.get("/dashboard/groups", { params: { branchId } });
const _ded = (branchId, from, to) =>
  api
    .get(`/centerdeduction/branch/${branchId}`, { params: { from, to } })
    .catch(() => ({ data: null }));

// ─── helpers ──────────────────────────────────────────────────────────────────
const startOfMonth = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), 1).toISOString();

const endOfNow = () => new Date().toISOString();

/**
 * Resolves the shared period selector ("month" | "3months" | "year") into a
 * concrete from/to range + display label. Mirrors DashboardService.ResolvePeriod
 * on the backend so the KPI cards and the period badge stay in sync with what
 * the selector says, instead of always silently showing "this month."
 */
function resolvePeriod(period = "month") {
  const now = new Date();
  if (period === "3months") {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { from: from.toISOString(), to: endOfNow(), label: "Last 3 months" };
  }
  if (period === "year") {
    const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return { from: from.toISOString(), to: endOfNow(), label: "Last year" };
  }
  return { from: startOfMonth(), to: endOfNow(), label: "This month" };
}

/** Group an array by a key fn → Map<key, item[]> */
const groupBy = (arr, keyFn) =>
  arr.reduce((m, x) => {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
    return m;
  }, new Map());

/** Sum a numeric field across an array */
const sum = (arr, fn) => arr.reduce((a, x) => a + (fn(x) || 0), 0);

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
export async function getOverviewSummary(branchId) {
  const [finRes, stuRes, grpRes] = await Promise.all([
    _fin(branchId, startOfMonth(), endOfNow()),
    _stu(branchId),
    _grp(branchId),
  ]);
  return {
    financial: finRes.data?.data ?? {},
    students: stuRes.data?.data ?? {},
    groups: grpRes.data?.data ?? {},
  };
}

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
export async function getStudentSummary(branchId) {
  const res = await _stu(branchId);
  return res.data?.data ?? {};
}

// ─── GROUPS (rich) ────────────────────────────────────────────────────────────
export async function getGroupSummaryRich(branchId) {
  const [dashRes, listRes] = await Promise.all([
    _grp(branchId),
    api.get(`/groups/branch/${branchId}`),
  ]);

  const dash = dashRes.data?.data ?? {};
  const groups = listRes.data?.data ?? [];

  const active = groups.filter(
    (g) => g.groupStatus?.toUpperCase() === "ACTIVE" || true,
  );

  const instrMap = groupBy(active, (g) => g.instructorName || "Unknown");
  const byInstructor = [...instrMap.entries()]
    .map(([name, gs]) => ({ name, count: gs.length }))
    .sort((a, b) => b.count - a.count);

  const levelMap = groupBy(active, (g) => g.levelCode || g.level || "—");
  const byLevel = [...levelMap.entries()]
    .map(([name, gs]) => ({ name, count: gs.length }))
    .sort((a, b) => b.count - a.count);

  const typeMap = groupBy(active, (g) => g.groupType || "—");
  const byType = [...typeMap.entries()]
    .map(([name, gs]) => ({ name, count: gs.length }))
    .sort((a, b) => b.count - a.count);

  const catMap = groupBy(active, (g) => g.groupCategory || "—");
  const byCategory = [...catMap.entries()]
    .map(([name, gs]) => ({ name, count: gs.length }))
    .sort((a, b) => b.count - a.count);

  return {
    ...dash,
    byInstructor,
    byLevel,
    byType,
    byCategory,
    _groups: groups,
  };
}

// ─── PAYMENTS (rich) ──────────────────────────────────────────────────────────
// period: "month" | "3months" | "year" — drives the KPI-card totals, the
// deductions figure, and the period badge. The YTD/year/6-month-trend
// charts below are intentionally fixed views and don't move with this
// selector (matches the original design of those sections).
export async function getPaymentSummaryRich(branchId, period = "month") {
  const now = new Date();
  const { from, to, label } = resolvePeriod(period);

  // ── 1. Payments + dashboard totals + closing list + deductions, for the
  //       selected period ──────────────────────────────────────────────────
  const [dashRes, periodRes, closingRes, dedRes] = await Promise.all([
    _fin(branchId, from, to),
    api.get("/payments/period", { params: { branchId, from, to } }),
    // Closing list — used for byClosingType breakdown
    api.get(`/closing/branch/${branchId}`).catch(() => ({ data: null })),
    // Center deductions — standalone table, filtered by DeductionDate
    _ded(branchId, from, to),
  ]);

  const dash = dashRes.data?.data ?? {};
  const payments = periodRes.data?.data ?? [];
  const closings = closingRes.data?.data ?? [];
  const deductions = dedRes.data?.data ?? [];

  // ── 2. byGroup ───────────────────────────────────────────────────────────────
  const grpMap = groupBy(payments, (p) => p.groupName || "Unknown");
  const byGroup = [...grpMap.entries()]
    .map(([name, ps]) => ({ name, amount: sum(ps, (p) => p.amountPaid) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // ── 3. byPaymentMethod ───────────────────────────────────────────────────────
  const methodMap = groupBy(payments, (p) => p.paymentMethod || "Unknown");
  const byPaymentMethod = {};
  for (const [m, ps] of methodMap.entries())
    byPaymentMethod[m] = sum(ps, (p) => p.amountPaid);

  // ── 4. byClosingType ─────────────────────────────────────────────────────────
  // The closing API has no type field — group by status (PAID, PENDING, etc.)
  // Amount field is `totalNetPayable`.
  let byClosingType = [];
  if (closings.length > 0) {
    const ctMap = groupBy(closings, (c) => {
      const s = (c.status || "Unknown").toUpperCase();
      if (s === "PAID") return "Paid";
      if (s === "PENDING") return "Pending";
      if (s === "CONFIRMED") return "Confirmed";
      return c.status || "Other";
    });
    byClosingType = [...ctMap.entries()]
      .map(([name, cs]) => ({
        name,
        amount: sum(cs, (c) => c.totalNetPayable ?? 0),
      }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  // ── 5. Last 6 months trend + byMonthYTD ──────────────────────────────────────
  // Deliberately fixed ranges — independent of the period selector.
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mFrom = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const mTo = new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0,
      23,
      59,
      59,
    ).toISOString();

    try {
      const r = await api.get("/payments/period", {
        params: { branchId, from: mFrom, to: mTo },
      });
      const ps = r.data?.data ?? [];

      const mRefundsRes = await api
        .get(`/enrollments/refunds/branch/${branchId}`, {
          params: { from: mFrom, to: mTo },
        })
        .catch(() => ({ data: null }));
      const mRefunds = mRefundsRes.data?.data ?? [];

      monthlyTrend.push({
        month: d.toLocaleString("default", { month: "short" }),
        collected: sum(ps, (p) => p.amountPaid),
        outstanding: sum(ps, (p) =>
          Math.max(0, (p.amountDue || 0) - (p.amountPaid || 0)),
        ),
        refunds: sum(mRefunds, (r) => r.refundAmount ?? r.amount ?? 0),
        overdueCount: ps.filter(
          (p) =>
            p.dueDate &&
            new Date(p.dueDate) < now &&
            p.amountPaid < p.amountDue,
        ).length,
      });
    } catch {
      monthlyTrend.push({
        month: d.toLocaleString("default", { month: "short" }),
        collected: 0,
        outstanding: 0,
        refunds: 0,
        overdueCount: 0,
      });
    }
  }

  // byMonthYTD: all months from Jan of this year up to current month
  // Uses the monthlyTrend data (which already covers up to 6 months).
  // For a full YTD we fetch Jan→now if not already covered.
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();
  let byMonthYTD = [];

  if (currentMonth <= 5) {
    // monthlyTrend already covers the full YTD (≤6 months since Jan)
    // Slice from index that corresponds to January
    const janIndex = 5 - currentMonth; // how far back Jan is in the trend array
    byMonthYTD = monthlyTrend.slice(janIndex).map((m) => ({
      month: m.month,
      amount: m.collected,
    }));
  } else {
    // Need more than 6 months — fetch Jan→now separately
    const ytdFetches = [];
    for (let m = 0; m <= currentMonth; m++) {
      const yFrom = new Date(currentYear, m, 1).toISOString();
      const yTo = new Date(currentYear, m + 1, 0, 23, 59, 59).toISOString();
      ytdFetches.push(
        api
          .get("/payments/period", {
            params: { branchId, from: yFrom, to: yTo },
          })
          .catch(() => ({ data: null })),
      );
    }
    const ytdResults = await Promise.all(ytdFetches);
    byMonthYTD = ytdResults.map((r, idx) => {
      const d = new Date(currentYear, idx, 1);
      const ps = r.data?.data ?? [];
      return {
        month: d.toLocaleString("default", { month: "short" }),
        amount: sum(ps, (p) => p.amountPaid),
      };
    });
  }

  // ── 6. byYear — last 3 calendar years ────────────────────────────────────────
  const yearFetches = [0, 1, 2].map((offset) => {
    const y = currentYear - offset;
    const yFrom = new Date(y, 0, 1).toISOString();
    // For current year cap at today; for past years use Dec 31
    const yTo =
      offset === 0 ? endOfNow() : new Date(y, 11, 31, 23, 59, 59).toISOString();
    return api
      .get("/payments/period", { params: { branchId, from: yFrom, to: yTo } })
      .then((r) => ({
        year: y,
        amount: sum(r.data?.data ?? [], (p) => p.amountPaid),
      }))
      .catch(() => ({ year: y, amount: 0 }));
  });
  // Reverse so oldest year is first (e.g. 2024, 2025, 2026)
  const byYear = (await Promise.all(yearFetches))
    .reverse()
    .filter((x) => x.amount > 0);

  // ── 7. Outstanding & overdue from current-period payments ────────────────────
  const totalCollected = sum(payments, (p) => p.amountPaid);
  const totalExpected = sum(payments, (p) => p.amountDue);
  const overdueCount = payments.filter(
    (p) => p.dueDate && new Date(p.dueDate) < now && p.amountPaid < p.amountDue,
  ).length;

  // ── 8. NEW — center deductions for the selected period ───────────────────────
  const totalDeductions =
    dash.totalDeductions ?? sum(deductions, (d) => d.amount);

  const totalRefunds = dash.totalRefunds ?? 0;
  const totalCommissions = dash.totalCommissions ?? 0;

  // ── 9. NEW — cash position for just this period (not cumulative — see
  //       getCashDrawer() below for the all-time, cumulative live figure) ──────
  const cashInDrawerAfterPeriod =
    dash.cashInDrawerAfterPeriod ??
    totalCollected - totalDeductions - totalRefunds - totalCommissions;

  return {
    totalCollected: dash.totalCollected ?? totalCollected,
    totalExpected: dash.totalExpected ?? totalExpected,
    totalRefunds,
    totalCommissions,
    totalDeductions, // ← NEW
    cashInDrawerAfterPeriod, // ← NEW
    netRevenue: dash.netRevenue ?? totalCollected - totalCommissions,
    overdueCount: dash.overdueCount ?? overdueCount,
    pendingClosings: dash.pendingClosings,
    periodLabel: label, // ← NEW: feeds PeriodBadge, now reflects the selector
    byGroup,
    byPaymentMethod,
    monthlyTrend,
    byMonthYTD,
    byYear,
    byClosingType,
  };
}

// ─── CASH DRAWER (all-time, live) ──────────────────────────────────────────────
// Cumulative since inception — does NOT reset month to month, and does NOT
// take the period selector. Backend-computed: income - refunds - center
// deductions - commission earned (whether or not swept into a closing yet)
// - instructor bonuses + salary deductions retained.
export async function getCashDrawer(branchId) {
  const res = await api.get("/dashboard/cash-drawer", { params: { branchId } });
  return res.data?.data;
}

// ─── INSTRUCTORS (rich) ───────────────────────────────────────────────────────
export async function getInstructorSummaryRich(branchId) {
  const now = new Date();
  const from = startOfMonth();
  const to = endOfNow();

  const [dashRes, instrRes, closingRes] = await Promise.all([
    _fin(branchId, from, to),
    api.get(`/instructors/branch/${branchId}`),
    api.get(`/closing/branch/${branchId}`).catch(() => ({ data: null })),
  ]);

  const dash = dashRes.data?.data ?? {};
  const instructors = instrRes.data?.data ?? [];
  const closings = closingRes.data?.data ?? [];

  // Fan-out: commission ledger for each instructor this month
  const commissionResults = await Promise.allSettled(
    instructors.map((inst) =>
      api.get(`/payments/commission/instructor/${inst.id}`, {
        params: { from, to },
      }),
    ),
  );

  const instructorMonthly = [];
  commissionResults.forEach((res, idx) => {
    if (res.status === "fulfilled") {
      const ledgers = res.value.data?.data ?? [];
      const sessions = ledgers.length;
      if (sessions > 0) {
        instructorMonthly.push({
          name: instructors[idx].person
            ? `${instructors[idx].person.firstName} ${instructors[idx].person.lastName}`
            : "Unknown",
          sessions,
          commission: sum(ledgers, (l) => l.commissionAmount),
          gross: sum(ledgers, (l) => l.grossPayment),
        });
      }
    }
  });

  // instructorClosing: sessions per instructor across all closings
  // Each closing has an instructorId (or instructorName). Group by instructor.
  let instructorClosing = [];
  if (closings.length > 0) {
    const instrClosingMap = groupBy(
      closings,
      (c) =>
        c.instructorName ||
        (c.instructorId
          ? instructors.find((i) => i.id === c.instructorId)?.person
            ? `${instructors.find((i) => i.id === c.instructorId).person.firstName} ${instructors.find((i) => i.id === c.instructorId).person.lastName}`
            : "Unknown"
          : "Unknown"),
    );
    instructorClosing = [...instrClosingMap.entries()]
      .map(([name, cs]) => ({
        name,
        sessions: sum(cs, (c) => c.sessionCount ?? c.sessions ?? 1),
        commission: sum(
          cs,
          (c) => c.commissionAmount ?? c.totalNetPayable ?? 0,
        ),
      }))
      .filter((x) => x.sessions > 0)
      .sort((a, b) => b.sessions - a.sessions);
  }

  return {
    totalCommissions: dash.totalCommissions ?? 0,
    netRevenue: dash.netRevenue ?? 0,
    pendingClosings: dash.pendingClosings,
    instructorMonthly,
    instructorClosing,
  };
}

// ─── EXAMS (rich) ─────────────────────────────────────────────────────────────
export async function getExamSummaryRich(branchId) {
  const [dashRes, groupsRes] = await Promise.all([
    _grp(branchId),
    api.get(`/groups/branch/${branchId}`),
  ]);

  const dash = dashRes.data?.data ?? {};
  const groups = groupsRes.data?.data ?? [];
  const activeGroups = groups.filter(
    (g) => (g.groupStatus || "").toUpperCase() === "ACTIVE",
  );

  if (activeGroups.length === 0) {
    return {
      ...dash,
      examsByType: [],
      examsByResult: [],
      groupExamRank: [],
      studentPassRate: [],
    };
  }

  const examResults = await Promise.allSettled(
    activeGroups.map((g) => api.get(`/exams/group/${g.id}`)),
  );

  const allExams = [];
  examResults.forEach((res, idx) => {
    if (res.status === "fulfilled") {
      const exams = res.value.data?.data ?? [];
      exams.forEach((e) =>
        allExams.push({ ...e, _groupName: activeGroups[idx].name }),
      );
    }
  });

  const resultFetches = await Promise.allSettled(
    allExams.map((e) => api.get(`/exams/${e.id}/results`)),
  );

  const allResults = [];
  resultFetches.forEach((res, idx) => {
    if (res.status === "fulfilled") {
      const results = res.value.data?.data ?? [];
      results.forEach((r) =>
        allResults.push({
          ...r,
          _examGroupName: allExams[idx]._groupName,
          _isFinal: allExams[idx].isFinalExam,
        }),
      );
    }
  });

  const finalCount = allExams.filter((e) => e.isFinalExam).length;
  const regularCount = allExams.length - finalCount;
  const examsByType =
    finalCount + regularCount > 0
      ? [
          { name: "Final", count: finalCount },
          { name: "Regular", count: regularCount },
        ].filter((x) => x.count > 0)
      : [];

  const passedCount = allResults.filter((r) => r.passed).length;
  const failedCount = allResults.length - passedCount;
  const examsByResult =
    passedCount + failedCount > 0
      ? [
          { name: "Passed", count: passedCount },
          { name: "Failed", count: failedCount },
        ].filter((x) => x.count > 0)
      : [];

  const groupPassMap = groupBy(
    allResults.filter((r) => r.passed),
    (r) => r._examGroupName,
  );
  const groupExamRank = [...groupPassMap.entries()]
    .map(([name, rs]) => ({ name, passed: rs.length }))
    .sort((a, b) => b.passed - a.passed)
    .slice(0, 8);

  const studentMap = groupBy(allResults, (r) => r.studentId);
  const studentPassRate = [...studentMap.entries()]
    .map(([, rs]) => ({
      name: rs[0].studentName || "Unknown",
      rate: rs.filter((r) => r.passed).length / rs.length,
      total: rs.length,
    }))
    .filter((s) => s.total >= 1)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);

  const now = new Date();
  const thisMonthExams = allExams.filter((e) => {
    const d = new Date(e.examDate);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const avgPassRate =
    allResults.length > 0 ? passedCount / allResults.length : null;
  const failedFinals = allResults.filter((r) => !r.passed && r._isFinal).length;

  return {
    ...dash,
    examsThisMonth: thisMonthExams.length,
    avgPassRate,
    failedFinals,
    certificatesIssued: dash.certificatesIssued,
    examsByType,
    examsByResult,
    groupExamRank,
    studentPassRate,
  };
}

// ─── WAITING LIST (rich) ──────────────────────────────────────────────────────
export async function getWaitingSummaryRich(branchId) {
  const [dashRes, listRes] = await Promise.all([
    _stu(branchId),
    api.get(`/waitinglist/branch/${branchId}`, {
      params: { page: 1, pageSize: 500 },
    }),
  ]);

  const dash = dashRes.data?.data ?? {};
  const items = listRes.data?.data?.items ?? listRes.data?.data ?? [];

  const now = new Date();
  const waiting = items.filter(
    (w) => (w.status || "").toUpperCase() === "WAITING",
  );
  const enrolled = items.filter(
    (w) => (w.status || "").toUpperCase() === "ENROLLED",
  );
  const cancelled = items.filter(
    (w) => (w.status || "").toUpperCase() === "CANCELLED",
  );

  const daysMap = new Map();
  waiting.forEach((w) => {
    const days =
      w.daysWaiting ??
      Math.floor((now - new Date(w.registeredAt)) / 86_400_000);
    daysMap.set(days, (daysMap.get(days) || 0) + 1);
  });
  const waitingByDays = [...daysMap.entries()]
    .map(([days, count]) => ({ days, count }))
    .sort((a, b) => a.days - b.days);

  const buckets = [
    { label: "1–7 days", min: 0, max: 7, count: 0 },
    { label: "8–14 days", min: 8, max: 14, count: 0 },
    { label: "15–21 days", min: 15, max: 21, count: 0 },
    { label: "22–30 days", min: 22, max: 30, count: 0 },
    { label: "30+ days", min: 31, max: Infinity, count: 0 },
  ];
  waiting.forEach((w) => {
    const days =
      w.daysWaiting ??
      Math.floor((now - new Date(w.registeredAt)) / 86_400_000);
    const b = buckets.find((bk) => days >= bk.min && days <= bk.max);
    if (b) b.count++;
  });
  const waitingBuckets = buckets
    .filter((b) => b.count > 0)
    .map(({ label, count }) => ({ label, count }));

  const avgWaitDays =
    waiting.length > 0
      ? Math.round(
          waiting.reduce((a, w) => {
            const d =
              w.daysWaiting ??
              Math.floor((now - new Date(w.registeredAt)) / 86_400_000);
            return a + d;
          }, 0) / waiting.length,
        )
      : null;

  return {
    waitingListCount: dash.waitingListCount ?? waiting.length,
    enrolledFromWaiting: enrolled.length,
    waitingCancelled: cancelled.length,
    avgWaitDays,
    waitingByDays,
    waitingBuckets,
  };
}
