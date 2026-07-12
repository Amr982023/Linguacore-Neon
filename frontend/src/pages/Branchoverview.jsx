import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  studentsApi,
  groupsApi,
  instructorsApi,
  sessionsApi,
  paymentsApi,
  waitingListApi,
  examsApi,
  certificatesApi,
  closingApi,
  lookupsApi,
  usersApi,
} from "../services/endpoints";
import { useAuthStore } from "../context/authStore";
import {
  PageHeader,
  Table,
  Badge,
  StatCard,
  SearchInput,
  Button,
  ConfirmDialog,
} from "../components/ui";
import toast from "react-hot-toast";
import {
  Users,
  BookOpen,
  UserCheck,
  CalendarDays,
  DollarSign,
  Clock,
  Building2,
  ShieldAlert,
  ClipboardList,
  Award,
  FileText,
  UserCog,
  Shield,
  Eye,
  CheckCircle,
  ChevronDown,
  Lock,
  Banknote,
  Calendar,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  X,
  ArrowLeftRight,
  Hourglass,
  Info,
  BarChart3,
  ListChecks,
  ReceiptText,
  Gift,
  Wallet,
  PiggyBank,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-EG", { minimumFractionDigits: 2 }) + " EGP";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const TABS = [
  { key: "students", label: "Students", icon: Users },
  { key: "groups", label: "Groups", icon: BookOpen },
  { key: "instructors", label: "Instructors", icon: UserCheck },
  { key: "sessions", label: "Sessions", icon: CalendarDays },
  { key: "payments", label: "Payments", icon: DollarSign },
  { key: "waitinglist", label: "Waiting List", icon: Clock },
  { key: "exams", label: "Exams", icon: ClipboardList },
  { key: "certificates", label: "Certificates", icon: Award },
  { key: "closings", label: "Closings", icon: FileText },
  { key: "users", label: "Users", icon: UserCog },
];

// ── Access guard ──────────────────────────────────────────────────────────────
function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <ShieldAlert size={48} className="text-red-400" />
      <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        Admin Access Required
      </p>
      <p className="text-sm text-gray-400">
        This page is restricted to administrators only.
      </p>
    </div>
  );
}

// ── Closing: Status config ────────────────────────────────────────────────────
const STATUS = {
  DRAFT: {
    label: "Draft",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-400",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500",
    icon: Lock,
  },
  PAID: {
    label: "Paid",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
};

function ClosingStatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.DRAFT;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Audit flag chips ──────────────────────────────────────────────────────────
function AuditChips({ partialCount = 0, crossCount = 0, size = "sm" }) {
  const cls = size === "xs" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  return (
    <div className="flex flex-wrap gap-1">
      {partialCount > 0 && (
        <span
          title={`${partialCount} payment(s) with incomplete commission distribution`}
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ${cls}`}
        >
          <Hourglass size={9} />
          {partialCount} partial
        </span>
      )}
      {crossCount > 0 && (
        <span
          title={`${crossCount} ledger entries from payments made in a previous period`}
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ${cls}`}
        >
          <ArrowLeftRight size={9} />
          {crossCount} cross-period
        </span>
      )}
      {partialCount === 0 && crossCount === 0 && (
        <span className="text-xs text-gray-400">—</span>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — Income Received Panel
// ══════════════════════════════════════════════════════════════════════════════
function IncomeRecordsPanel({ incomeRecords = [], totalIncomeReceived = 0 }) {
  const [open, setOpen] = useState(false);
  if (incomeRecords.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-700/60 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-left"
      >
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Layer 1 — Income Received
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 font-semibold">
            {incomeRecords.length} payment
            {incomeRecords.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {fmt(totalIncomeReceived)}
          </span>
          <ChevronDown
            size={14}
            className={`text-emerald-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div>
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50/60 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-800/40">
            <div className="col-span-3">Student</div>
            <div className="col-span-3">Group</div>
            <div className="col-span-2">Period</div>
            <div className="col-span-2 text-right">Amount Paid</div>
            <div className="col-span-2 text-right">Payment Date</div>
          </div>
          <div className="divide-y divide-emerald-50 dark:divide-emerald-900/20">
            {incomeRecords.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors"
              >
                <div className="col-span-3 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {r.studentName}
                  </p>
                </div>
                <div className="col-span-3 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {r.groupName}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {r.periodLabelName}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {fmt(r.amountPaid)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-xs text-gray-400">
                    {fmtDate(r.paymentDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-emerald-50/60 dark:bg-emerald-900/10 border-t border-emerald-100 dark:border-emerald-800/40">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Info size={11} />
              Payments with PaymentDate within this closing period. Independent
              of session activity.
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {fmt(totalIncomeReceived)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — Outstanding Obligations Panel
// ══════════════════════════════════════════════════════════════════════════════
function PartialPaymentsPanel({ partialPayments = [] }) {
  const [open, setOpen] = useState(false);
  if (partialPayments.length === 0) return null;

  const totalOutstanding = partialPayments.reduce(
    (s, p) => s + p.amountPaid,
    0,
  );

  return (
    <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-700/60 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-left"
      >
        <div className="flex items-center gap-2">
          <Hourglass size={14} className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Layer 3 — Outstanding Commission Obligations
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200 font-semibold">
            {partialPayments.length} payment
            {partialPayments.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
            {fmt(totalOutstanding)}
          </span>
          <ChevronDown
            size={14}
            className={`text-amber-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div>
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-50/60 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/40">
            <div className="col-span-3">Group</div>
            <div className="col-span-2">Period</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-center">Progress</div>
            <div className="col-span-2 text-center">Sessions</div>
            <div className="col-span-1 text-center">Missing</div>
          </div>
          <div className="divide-y divide-amber-50 dark:divide-amber-900/20">
            {partialPayments.map((p) => {
              const pct =
                p.expectedSessionsCount > 0
                  ? Math.round(
                      (p.processedSessionsCount / p.expectedSessionsCount) *
                        100,
                    )
                  : 0;
              const missing =
                p.missingSessinsCount ??
                p.expectedSessionsCount - p.processedSessionsCount;
              const isZero = p.processedSessionsCount === 0;
              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors ${
                    isZero
                      ? "bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50 dark:hover:bg-red-900/20"
                      : "hover:bg-amber-50/30 dark:hover:bg-amber-900/10"
                  }`}
                >
                  <div className="col-span-3 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isZero && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 flex-shrink-0">
                          0 dist.
                        </span>
                      )}
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {p.groupName}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {p.periodLabelName}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {fmt(p.amountPaid)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isZero ? "bg-red-400" : "bg-emerald-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {p.processedSessionsCount} / {p.expectedSessionsCount}
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs font-bold text-amber-700 dark:text-amber-300">
                      {missing}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2.5 bg-amber-50/40 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-800/40 flex items-start gap-2">
            <Info size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              All payments with PaymentDate ≤ period end whose commission
              distribution is incomplete. Commission will accumulate in future
              closings as sessions are created.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYER 4 — Refunds Issued Panel
// ══════════════════════════════════════════════════════════════════════════════
function RefundRecordsPanel({ refundRecords = [], totalRefunded = 0 }) {
  const [open, setOpen] = useState(false);
  if (refundRecords.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-700/60 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-left"
      >
        <div className="flex items-center gap-2">
          <ReceiptText size={14} className="text-rose-500" />
          <span className="text-sm font-semibold text-rose-800 dark:text-rose-300">
            Layer 4 — Refunds Issued
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-800/60 text-rose-800 dark:text-rose-200 font-semibold">
            {refundRecords.length} refund{refundRecords.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-rose-700 dark:text-rose-300">
            -{fmt(totalRefunded)}
          </span>
          <ChevronDown
            size={14}
            className={`text-rose-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div>
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider bg-rose-50/60 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-800/40">
            <div className="col-span-3">Student</div>
            <div className="col-span-3">Group</div>
            <div className="col-span-2 text-center">Sessions Used</div>
            <div className="col-span-2 text-right">Paid</div>
            <div className="col-span-2 text-right">Refunded</div>
          </div>
          <div className="divide-y divide-rose-50 dark:divide-rose-900/20">
            {refundRecords.map((r) => {
              const pct =
                r.sessionsTotal > 0
                  ? Math.round((r.sessionsAttended / r.sessionsTotal) * 100)
                  : 0;
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors"
                >
                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {r.studentName}
                    </p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {r.groupName}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {r.sessionsAttended} / {r.sessionsTotal}
                      </span>
                      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {fmt(r.amountPaid)}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                      -{fmt(r.refundAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-rose-50/60 dark:bg-rose-900/10 border-t border-rose-100 dark:border-rose-800/40">
            <span className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <Info size={11} />
              Early exits with RefundDate within this closing period. Instructor
              commissions for completed sessions remain intact.
            </span>
            <span className="text-sm font-bold text-rose-700 dark:text-rose-300">
              -{fmt(totalRefunded)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Financial Integrity Notice ────────────────────────────────────────────────
function FinancialIntegrityNotice({
  crossPeriodCount,
  partialCount,
  refundCount,
}) {
  if (crossPeriodCount === 0 && partialCount === 0 && refundCount === 0)
    return null;
  return (
    <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
      <ShieldAlert size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        {crossPeriodCount > 0 && (
          <p>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {crossPeriodCount} cross-period{" "}
              {crossPeriodCount === 1 ? "entry" : "entries"}:
            </span>{" "}
            commission earned in this period from payments made in a previous
            one. Expected behaviour — ledger entries are created at session
            time.
          </p>
        )}
        {partialCount > 0 && (
          <p>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {partialCount} outstanding{" "}
              {partialCount === 1 ? "obligation" : "obligations"}:
            </span>{" "}
            not all sessions for these payments have run yet. Commission will
            continue to accumulate in future closings.
          </p>
        )}
        {refundCount > 0 && (
          <p>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {refundCount} early exit refund{refundCount !== 1 ? "s" : ""}:
            </span>{" "}
            cash refunded to students who exited mid-period. Instructor
            commissions for sessions already completed remain earned and
            untouched.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Center Deductions Panel (view-only) ───────────────────────────────────────
function CenterDeductionsPanel({ closing }) {
  const deductions = closing.centerDeductions || [];
  const grandGross =
    closing.instructorRows?.reduce((s, r) => s + r.totalGross, 0) || 0;
  const grandCommissions =
    closing.instructorRows?.reduce((s, r) => s + r.totalCommission, 0) || 0;
  const totalRefunded = closing.totalRefunded || 0;
  const totalBonuses = closing.totalInstructorBonuses || 0;
  const totalSalaryDeductions = closing.totalInstructorSalaryDeductions || 0;

  return (
    <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Center Deductions
          </span>
          {deductions.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold">
              -{fmt(closing.totalCenterDeductions)}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {deductions.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-400 italic">
            No center deductions for this closing.
          </p>
        ) : (
          deductions.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Minus size={11} className="text-red-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {d.name}
                </span>
                <span className="text-xs text-gray-400">
                  {fmtDate(d.createdAt)}
                </span>
              </div>
              <span className="text-sm font-semibold text-red-600 dark:text-red-400 flex-shrink-0">
                -{fmt(d.amount)}
              </span>
            </div>
          ))
        )}
      </div>

      {(deductions.length > 0 || grandGross > 0) && (
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/60 dark:to-gray-800/60 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Total Gross Collected</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {fmt(grandGross)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Instructor Commissions</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              -{fmt(grandCommissions)}
            </span>
          </div>
          {deductions.length > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Center Deductions</span>
              <span className="font-medium text-red-500">
                -{fmt(closing.totalCenterDeductions)}
              </span>
            </div>
          )}
          {totalBonuses > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Instructor Bonuses</span>
              <span className="font-medium text-emerald-500">
                -{fmt(totalBonuses)}
              </span>
            </div>
          )}
          {totalSalaryDeductions > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Instructor Salary Deductions (returned to center)</span>
              <span className="font-medium text-blue-500">
                +{fmt(totalSalaryDeductions)}
              </span>
            </div>
          )}
          {totalRefunded > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Refunds Issued (Layer 4)</span>
              <span className="font-medium text-rose-500">
                -{fmt(totalRefunded)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-gray-200 dark:border-gray-600 pt-2 mt-1">
            <span className="text-gray-700 dark:text-gray-300">
              Center Net Earned
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {fmt(closing.centerNetEarned)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Instructor Accordion (view-only) ─────────────────────────────────────────
function InstructorAccordion({ row, index }) {
  const [open, setOpen] = useState(false);
  const commissionRate =
    row.totalGross > 0
      ? ((row.totalCommission / row.totalGross) * 100).toFixed(1)
      : "0.0";
  const crossPeriodCount = (row.details || []).filter(
    (d) => d.isFromPreviousPeriod,
  ).length;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
      >
        <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {row.instructorName?.charAt(0) || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {row.instructorName}
              </p>
              {crossPeriodCount > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex-shrink-0">
                  <ArrowLeftRight size={9} />
                  {crossPeriodCount} cross-period
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {row.details?.length || 0} entries · {commissionRate}% avg rate
            </p>
            {((row.bonuses || []).length > 0 ||
              (row.salaryDeductions || []).length > 0) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(row.bonuses || []).map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  >
                    <Gift size={9} />
                    {b.name} +{fmt(b.amount)}
                  </span>
                ))}
                {(row.salaryDeductions || []).map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                  >
                    <Wallet size={9} />
                    {d.name} -{fmt(d.amount)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400">Gross</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {fmt(row.totalGross)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Commission</p>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {fmt(row.totalCommission)}
            </p>
          </div>
          {row.totalDeductions > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Deductions</p>
              <p className="text-sm font-medium text-red-500">
                -{fmt(row.totalDeductions)}
              </p>
            </div>
          )}
          {row.totalBonus > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Bonus</p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                +{fmt(row.totalBonus)}
              </p>
            </div>
          )}
          {row.totalSalaryDeductions > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Salary Ded.</p>
              <p className="text-sm font-medium text-orange-500">
                -{fmt(row.totalSalaryDeductions)}
              </p>
            </div>
          )}
          <div className="text-right min-w-[100px]">
            <p className="text-xs text-gray-400">Net Payable</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {fmt(row.netPayable)}
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className="sm:hidden grid grid-cols-2 gap-2 px-4 pb-3 text-sm">
        <div>
          <span className="text-gray-400">Gross: </span>
          <span className="font-medium">{fmt(row.totalGross)}</span>
        </div>
        <div>
          <span className="text-gray-400">Net: </span>
          <span className="font-bold text-emerald-600">
            {fmt(row.netPayable)}
          </span>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40">
          {crossPeriodCount > 0 && (
            <div className="mx-4 mt-3 mb-1 flex items-start gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700/50">
              <ArrowLeftRight
                size={13}
                className="text-purple-500 flex-shrink-0 mt-0.5"
              />
              <p className="text-xs text-purple-700 dark:text-purple-300">
                <strong>{crossPeriodCount} entries</strong> earned from payments
                received before this period. Student paid earlier; session ran
                now. Highlighted in purple below.
              </p>
            </div>
          )}
          <div className="grid grid-cols-12 gap-1 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
            <div className="col-span-3">Group</div>
            <div className="col-span-2">Language</div>
            <div className="col-span-2 text-right">Gross/session</div>
            <div className="col-span-2 text-right">Commission</div>
            <div className="col-span-1 text-center">Type</div>
            <div className="col-span-1 text-center">Origin</div>
            <div className="col-span-1 text-right">Date</div>
          </div>
          {(row.details || []).map((d) => (
            <div
              key={d.id}
              className={`grid grid-cols-12 gap-1 px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors ${
                d.isFromPreviousPeriod
                  ? "bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-50/80 dark:hover:bg-purple-900/20"
                  : "hover:bg-white dark:hover:bg-gray-800/50"
              }`}
            >
              <div className="col-span-3 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-200 truncate text-xs">
                  {d.groupName}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400">
                  {d.languageName} {d.levelCode}
                </p>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {fmt(d.grossPayment)}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {fmt(d.commissionAmount)}
                </span>
              </div>
              <div className="col-span-1 text-center">
                {d.isAdjustment ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    <Minus size={9} /> Adj
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <TrendingUp size={9} /> Pay
                  </span>
                )}
              </div>
              <div className="col-span-1 text-center">
                {d.isFromPreviousPeriod ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    <ArrowLeftRight size={9} /> Prior
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    Now
                  </span>
                )}
              </div>
              <div className="col-span-1 text-right text-xs text-gray-400">
                {fmtDate(d.createdAt)}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-1 px-4 py-3 bg-white dark:bg-gray-800/80 text-sm font-semibold border-t border-gray-200 dark:border-gray-700">
            <div className="col-span-5 text-gray-500">Subtotal</div>
            <div className="col-span-2 text-right text-gray-700 dark:text-gray-300">
              {fmt(row.totalGross)}
            </div>
            <div className="col-span-2 text-right text-blue-600 dark:text-blue-400">
              {fmt(row.totalCommission)}
            </div>
            <div className="col-span-1 text-center">
              {row.totalDeductions > 0 && (
                <span className="text-red-500 text-xs">
                  -{fmt(row.totalDeductions)}
                </span>
              )}
            </div>
            <div className="col-span-1 text-center" />
            <div className="col-span-1 text-right text-emerald-600 dark:text-emerald-400">
              {fmt(row.netPayable)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Closing Detail Modal (view-only, full fidelity) ───────────────────────────
function ClosingDetailModal({ closing, onClose }) {
  const totalGross =
    closing.instructorRows?.reduce((s, r) => s + r.totalGross, 0) || 0;
  const totalCommission =
    closing.instructorRows?.reduce((s, r) => s + r.totalCommission, 0) || 0;
  const instructorCount = closing.instructorRows?.length || 0;
  const totalNet =
    closing.instructorRows?.reduce((s, r) => s + r.netPayable, 0) || 0;
  const crossPeriodTotal = (closing.instructorRows || []).reduce(
    (s, r) =>
      s + (r.details || []).filter((d) => d.isFromPreviousPeriod).length,
    0,
  );
  const partialPayments = closing.partialPayments || [];
  const incomeRecords = closing.incomeRecords || [];
  const refundRecords = closing.refundRecords || [];
  const totalRefunded = closing.totalRefunded || 0;
  const totalInstructorBonuses = closing.totalInstructorBonuses || 0;
  const totalInstructorSalaryDeductions =
    closing.totalInstructorSalaryDeductions || 0;
  const bonusCount = (closing.instructorRows || []).reduce(
    (s, r) => s + (r.bonuses || []).length,
    0,
  );
  const salaryDeductionCount = (closing.instructorRows || []).reduce(
    (s, r) => s + (r.salaryDeductions || []).length,
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <ClosingStatusBadge status={closing.status} />
                <span className="text-slate-400 text-sm">
                  {closing.branchName}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">Period Closing</h2>
              <p className="text-slate-400 text-sm mt-0.5">
                <Calendar size={12} className="inline mr-1" />
                {fmtDate(closing.periodStart)} → {fmtDate(closing.periodEnd)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* 7-KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mt-5">
            {[
              {
                label: "Income Received",
                value: fmt(closing.totalIncomeReceived || 0),
                color: "text-emerald-400",
                sub: `${incomeRecords.length} payment${incomeRecords.length !== 1 ? "s" : ""}`,
                icon: DollarSign,
              },
              {
                label: "Commission Distributed",
                value: fmt(totalCommission),
                color: "text-blue-400",
                sub: `${instructorCount} instructor${instructorCount !== 1 ? "s" : ""}`,
                icon: BarChart3,
              },
              {
                label: "Center Deductions",
                value: fmt(closing.totalCenterDeductions || 0),
                color: "text-red-400",
                sub: `${(closing.centerDeductions || []).length} item${(closing.centerDeductions || []).length !== 1 ? "s" : ""}`,
                icon: TrendingDown,
              },
              {
                label: "Instructor Bonuses",
                value:
                  totalInstructorBonuses > 0
                    ? `+${fmt(totalInstructorBonuses)}`
                    : fmt(0),
                color:
                  totalInstructorBonuses > 0
                    ? "text-emerald-400"
                    : "text-slate-400",
                sub: `${bonusCount} bonus${bonusCount !== 1 ? "es" : ""}`,
                icon: Gift,
              },
              {
                label: "Salary Deductions",
                value:
                  totalInstructorSalaryDeductions > 0
                    ? `-${fmt(totalInstructorSalaryDeductions)}`
                    : fmt(0),
                color:
                  totalInstructorSalaryDeductions > 0
                    ? "text-orange-400"
                    : "text-slate-400",
                sub: `${salaryDeductionCount} item${salaryDeductionCount !== 1 ? "s" : ""}`,
                icon: Wallet,
              },
              {
                label: "Refunds Issued",
                value: totalRefunded > 0 ? `-${fmt(totalRefunded)}` : fmt(0),
                color: totalRefunded > 0 ? "text-rose-400" : "text-slate-400",
                sub: `${refundRecords.length} early exit${refundRecords.length !== 1 ? "s" : ""}`,
                icon: ReceiptText,
              },
              {
                label: "Center Net Earned",
                value: fmt(closing.centerNetEarned || 0),
                color: "text-slate-200",
                sub: "net profit",
                icon: PiggyBank,
              },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="bg-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon size={11} className={k.color} />
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      {k.label}
                    </p>
                  </div>
                  <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{k.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Flags strip */}
          {(crossPeriodTotal > 0 ||
            partialPayments.length > 0 ||
            refundRecords.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {crossPeriodTotal > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-200 border border-purple-500/30">
                  <ArrowLeftRight size={11} />
                  {crossPeriodTotal} cross-period{" "}
                  {crossPeriodTotal === 1 ? "entry" : "entries"}
                </span>
              )}
              {partialPayments.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  <Hourglass size={11} />
                  {partialPayments.length} outstanding{" "}
                  {partialPayments.length === 1 ? "obligation" : "obligations"}
                </span>
              )}
              {refundRecords.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/20 text-rose-200 border border-rose-500/30">
                  <ReceiptText size={11} />
                  {refundRecords.length} refund
                  {refundRecords.length !== 1 ? "s" : ""} · -
                  {fmt(totalRefunded)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Status banners (read-only, no action buttons) ──────────────────── */}
        <div className="px-6 pt-4 space-y-2">
          {closing.status === "DRAFT" && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
              <Clock size={15} className="text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                This closing is currently a <strong>Draft</strong>.
              </span>
            </div>
          )}
          {closing.status === "CONFIRMED" && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl">
              <Lock size={15} className="text-blue-500 flex-shrink-0" />
              <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                Confirmed by <strong>{closing.confirmedByName}</strong> on{" "}
                {fmtDateTime(closing.confirmedAt)}
              </span>
            </div>
          )}
          {closing.status === "PAID" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl">
              <CheckCircle
                size={15}
                className="text-emerald-500 flex-shrink-0"
              />
              <span className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                Paid on {fmtDateTime(closing.paidAt)}
              </span>
            </div>
          )}
        </div>

        {/* ── Meta row ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-3 flex flex-wrap gap-4 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <span className="flex items-center gap-1">
            <Building2 size={12} /> {closing.branchName}
          </span>
          <span className="flex items-center gap-1">
            <User size={12} /> Created by {closing.createdByName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} /> Created {fmtDateTime(closing.createdAt)}
          </span>
          {closing.notes && (
            <span className="flex items-center gap-1">
              <FileText size={12} /> {closing.notes}
            </span>
          )}
        </div>

        {/* ── Scrollable body ────────────────────────────────────────────────── */}
        <div className="px-6 py-4 space-y-2 max-h-[58vh] overflow-y-auto">
          <FinancialIntegrityNotice
            crossPeriodCount={crossPeriodTotal}
            partialCount={partialPayments.length}
            refundCount={refundRecords.length}
          />

          {/* Layer 1 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={13} className="text-emerald-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Layer 1 — Income Received
              </span>
            </div>
            <IncomeRecordsPanel
              incomeRecords={incomeRecords}
              totalIncomeReceived={closing.totalIncomeReceived || 0}
            />
          </div>

          {/* Layer 2 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={13} className="text-blue-500" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Layer 2 — Commission Distributed
                </span>
              </div>
              <div className="flex items-center gap-3">
                {crossPeriodTotal > 0 && (
                  <span className="flex items-center gap-1 text-xs text-purple-500 dark:text-purple-400">
                    <ArrowLeftRight size={10} /> purple = prior-period payment
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {instructorCount} instructor{instructorCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Center deductions — view only */}
            <CenterDeductionsPanel closing={closing} />

            {instructorCount === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 dark:bg-gray-800/40 rounded-xl">
                No commission distributed in this period.
              </div>
            ) : (
              <div className="space-y-3">
                {(closing.instructorRows || []).map((row, i) => (
                  <InstructorAccordion key={row.id} row={row} index={i} />
                ))}
              </div>
            )}

            {instructorCount > 0 && (
              <div className="mt-3 p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/60 dark:to-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      Grand Total Net to Instructors
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {fmt(totalNet)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-400">
                  <span>Gross: {fmt(totalGross)}</span>
                  <span>Commission: {fmt(totalCommission)}</span>
                  {(closing.totalCenterDeductions || 0) > 0 && (
                    <span className="text-orange-400">
                      Deductions: -{fmt(closing.totalCenterDeductions)}
                    </span>
                  )}
                  {(closing.totalInstructorBonuses || 0) > 0 && (
                    <span className="text-emerald-500">
                      Bonuses: +{fmt(closing.totalInstructorBonuses)}
                    </span>
                  )}
                  {(closing.totalInstructorSalaryDeductions || 0) > 0 && (
                    <span className="text-orange-500">
                      Salary deductions: -
                      {fmt(closing.totalInstructorSalaryDeductions)}
                    </span>
                  )}
                  {crossPeriodTotal > 0 && (
                    <span className="text-purple-500">
                      {crossPeriodTotal} cross-period entries included
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Layer 3 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ListChecks size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Layer 3 — Outstanding Commission Obligations
              </span>
            </div>
            {partialPayments.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700/50">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  No outstanding obligations — all payments fully distributed.
                </span>
              </div>
            ) : (
              <PartialPaymentsPanel partialPayments={partialPayments} />
            )}
          </div>

          {/* Layer 4 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ReceiptText size={13} className="text-rose-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Layer 4 — Refunds Issued
              </span>
            </div>
            {refundRecords.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                <CheckCircle size={14} className="text-gray-400" />
                <span className="text-sm text-gray-400">
                  No refunds issued in this period.
                </span>
              </div>
            ) : (
              <RefundRecordsPanel
                refundRecords={refundRecords}
                totalRefunded={totalRefunded}
              />
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Students Section ──────────────────────────────────────────────────────────
function StudentsSection({ branchId }) {
  const [search, setSearch] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["bo-students", branchId],
    queryFn: () => studentsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const students = res?.data?.data || [];

  const filtered = students.filter((s) => {
    const name =
      `${s.person?.firstName || ""} ${s.person?.lastName || ""}`.toLowerCase();
    const q = search.toLowerCase();
    return !q || name.includes(q) || (s.person?.phone || "").includes(q);
  });

  const active = students.filter((s) => s.isActive).length;
  const inactive = students.filter((s) => !s.isActive).length;
  const scholars = students.filter((s) =>
    (s.activeEnrollments || []).some((e) => e.scholarship),
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Active"
          value={active}
          icon={Users}
          color="bg-green-600"
        />
        <StatCard
          title="Inactive"
          value={inactive}
          icon={Users}
          color="bg-red-500"
        />
        <StatCard
          title="Scholarships"
          value={scholars}
          icon={Users}
          color="bg-purple-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name or phone…"
          />
        </div>
        <Table
          loading={isLoading}
          data={filtered}
          emptyMsg="No students for this branch."
          columns={[
            {
              key: "name",
              label: "Name",
              render: (r) =>
                `${r.person?.firstName || ""} ${r.person?.lastName || ""}`,
            },
            {
              key: "phone",
              label: "Phone",
              render: (r) => r.person?.phone || "—",
            },
            {
              key: "mode",
              label: "Mode",
              render: (r) => <Badge label={r.attendanceMode} />,
            },
            {
              key: "langs",
              label: "Languages",
              render: (r) => (r.activeLanguages || []).join(", ") || "—",
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <Badge label={r.isActive ? "ACTIVE" : "INACTIVE"} />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ── Groups Section ────────────────────────────────────────────────────────────
function GroupsSection({ branchId }) {
  const [search, setSearch] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["bo-groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const groups = res?.data?.data || [];

  const filtered = groups.filter(
    (g) => !search || g.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const active = groups.filter((g) => g.groupStatus === "ACTIVE").length;
  const completed = groups.filter((g) => g.groupStatus === "COMPLETED").length;
  const online = groups.filter((g) => g.deliveryMode === "ONLINE").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total"
          value={groups.length}
          icon={BookOpen}
          color="bg-primary-900"
        />
        <StatCard
          title="Active"
          value={active}
          icon={BookOpen}
          color="bg-green-600"
        />
        <StatCard
          title="Completed"
          value={completed}
          icon={BookOpen}
          color="bg-blue-500"
        />
        <StatCard
          title="Online"
          value={online}
          icon={BookOpen}
          color="bg-cyan-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search group…"
          />
        </div>
        <Table
          loading={isLoading}
          data={filtered}
          emptyMsg="No groups for this branch."
          columns={[
            { key: "name", label: "Name" },
            { key: "languageName", label: "Language" },
            { key: "levelCode", label: "Level" },
            { key: "instructorName", label: "Instructor" },
            {
              key: "deliveryMode",
              label: "Mode",
              render: (r) => <Badge label={r.deliveryMode} />,
            },
            {
              key: "feeAmount",
              label: "Fee",
              render: (r) => `${r.feeAmount} EGP`,
            },
            { key: "enrolledCount", label: "Enrolled" },
            {
              key: "groupStatus",
              label: "Status",
              render: (r) => <Badge label={r.groupStatus} />,
            },
          ]}
        />
      </div>
    </div>
  );
}

// ── Instructors Section ───────────────────────────────────────────────────────
function InstructorsSection({ branchId }) {
  const [search, setSearch] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["bo-instructors", branchId],
    queryFn: () => instructorsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const instructors = res?.data?.data || [];

  const filtered = instructors.filter((i) => {
    const n = `${i.person?.firstName} ${i.person?.lastName}`.toLowerCase();
    return !search || n.includes(search.toLowerCase());
  });

  const active = instructors.filter((i) => i.isActive).length;
  const inactive = instructors.filter((i) => !i.isActive).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total"
          value={instructors.length}
          icon={UserCheck}
          color="bg-primary-900"
        />
        <StatCard
          title="Active"
          value={active}
          icon={UserCheck}
          color="bg-green-600"
        />
        <StatCard
          title="Inactive"
          value={inactive}
          icon={UserCheck}
          color="bg-red-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search instructor…"
          />
        </div>
        <Table
          loading={isLoading}
          data={filtered}
          emptyMsg="No instructors for this branch."
          columns={[
            {
              key: "name",
              label: "Name",
              render: (r) =>
                `${r.person?.firstName || ""} ${r.person?.lastName || ""}`,
            },
            {
              key: "phone",
              label: "Phone",
              render: (r) => r.person?.phone || "—",
            },
            {
              key: "languages",
              label: "Languages",
              render: (r) => (r.languages || []).join(", ") || "—",
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <Badge label={r.isActive ? "ACTIVE" : "INACTIVE"} />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ── Sessions Section ──────────────────────────────────────────────────────────
function SessionsSection({ branchId }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: grpRes } = useQuery({
    queryKey: ["bo-groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const groups = grpRes?.data?.data || [];

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["bo-sessions", branchId],
    queryFn: async () => {
      if (!groups.length) return [];
      const results = await Promise.all(
        groups.map((g) => sessionsApi.getByGroup(g.id)),
      );
      return results.flatMap((r) => r.data?.data || []);
    },
    enabled: !!branchId && groups.length > 0,
  });

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    if (
      q &&
      !s.groupName?.toLowerCase().includes(q) &&
      !s.topic?.toLowerCase().includes(q)
    )
      return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  const scheduled = sessions.filter((s) => s.status === "SCHEDULED").length;
  const completed = sessions.filter((s) => s.status === "COMPLETED").length;
  const cancelled = sessions.filter((s) => s.status === "CANCELLED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Scheduled"
          value={scheduled}
          icon={CalendarDays}
          color="bg-blue-600"
        />
        <StatCard
          title="Completed"
          value={completed}
          icon={CalendarDays}
          color="bg-green-600"
        />
        <StatCard
          title="Cancelled"
          value={cancelled}
          icon={CalendarDays}
          color="bg-red-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search group or topic…"
          />
          <select
            className="input w-36 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <Table
          loading={isLoading}
          data={filtered}
          emptyMsg="No sessions for this branch."
          columns={[
            {
              key: "groupName",
              label: "Group",
              render: (r) => r.groupName || "—",
            },
            {
              key: "sessionNumber",
              label: "#",
              render: (r) => `#${r.sessionNumber}`,
            },
            {
              key: "periodLabel",
              label: "Period",
              render: (r) => r.periodLabel || "—",
            },
            {
              key: "instructorName",
              label: "Instructor",
              render: (r) => r.instructorName || "—",
            },
            {
              key: "scheduledDate",
              label: "Date",
              render: (r) =>
                new Date(r.scheduledDate).toLocaleDateString("en-GB"),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge label={r.status} />,
            },
          ]}
        />
      </div>
    </div>
  );
}

// ── Payments Section ──────────────────────────────────────────────────────────
function PaymentsSection({ branchId }) {
  const [statusFilter, setStatusFilter] = useState("");

  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 3);
  const fromISO = fromDate.toISOString();
  const toISO = new Date().toISOString();

  const { data: res, isLoading } = useQuery({
    queryKey: ["bo-payments", branchId],
    queryFn: () => paymentsApi.getByPeriod(branchId, fromISO, toISO),
    enabled: !!branchId,
  });
  const payments = res?.data?.data || [];

  const now = Date.now();
  const collected = payments.filter((p) => p.amountPaid >= p.amountDue);
  const outstanding = payments.filter(
    (p) => p.amountPaid < p.amountDue && new Date(p.dueDate) >= now,
  );
  const overdue = payments.filter(
    (p) => p.amountPaid < p.amountDue && new Date(p.dueDate) < now,
  );

  const getList = () => {
    if (statusFilter === "collected") return collected;
    if (statusFilter === "outstanding") return outstanding;
    if (statusFilter === "overdue") return overdue;
    return payments;
  };

  const totalCollected = collected.reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = outstanding.reduce(
    (s, p) => s + (p.amountDue - p.amountPaid),
    0,
  );
  const totalOverdue = overdue.reduce(
    (s, p) => s + (p.amountDue - p.amountPaid),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Collected"
          value={fmt(totalCollected)}
          icon={DollarSign}
          color="bg-green-600"
        />
        <StatCard
          title="Outstanding"
          value={fmt(totalOutstanding)}
          icon={DollarSign}
          color="bg-yellow-500"
        />
        <StatCard
          title="Overdue"
          value={fmt(totalOverdue)}
          icon={DollarSign}
          color="bg-red-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700">
          <select
            className="input w-40 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="collected">Collected</option>
            <option value="outstanding">Outstanding</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <Table
          loading={isLoading}
          data={getList()}
          emptyMsg="No payments for this branch."
          columns={[
            {
              key: "studentName",
              label: "Student",
              render: (r) => r.studentName || "—",
            },
            {
              key: "groupName",
              label: "Group",
              render: (r) => r.groupName || "—",
            },
            {
              key: "period",
              label: "Period",
              render: (r) => r.periodLabelName || "—",
            },
            { key: "amountDue", label: "Due", render: (r) => fmt(r.amountDue) },
            {
              key: "amountPaid",
              label: "Paid",
              render: (r) => (
                <span className="text-green-600 font-medium">
                  {fmt(r.amountPaid)}
                </span>
              ),
            },
            {
              key: "balance",
              label: "Balance",
              render: (r) => {
                const bal = r.amountDue - r.amountPaid;
                return (
                  <span
                    className={
                      bal > 0 ? "text-red-500 font-medium" : "text-gray-400"
                    }
                  >
                    {bal > 0 ? fmt(bal) : "—"}
                  </span>
                );
              },
            },
            {
              key: "dueDate",
              label: "Due Date",
              render: (r) => fmtDate(r.dueDate),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ── Waiting List Section ──────────────────────────────────────────────────────
function WaitingListSection({ branchId }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["bo-waitinglist", branchId],
    queryFn: () =>
      waitingListApi.getByBranch(branchId, { page: 1, pageSize: 999 }),
    enabled: !!branchId,
  });
  const entries = res?.data?.data?.items || [];

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    if (q && !e.name.toLowerCase().includes(q) && !e.phone.includes(q))
      return false;
    if (statusFilter && e.status !== statusFilter) return false;
    return true;
  });

  const waiting = entries.filter((e) => e.status === "WAITING").length;
  const enrolled = entries.filter((e) => e.status === "ENROLLED").length;
  const cancelled = entries.filter((e) => e.status === "CANCELLED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Waiting"
          value={waiting}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Enrolled"
          value={enrolled}
          icon={Clock}
          color="bg-green-600"
        />
        <StatCard
          title="Cancelled"
          value={cancelled}
          icon={Clock}
          color="bg-gray-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name or phone…"
          />
          <select
            className="input w-36 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="WAITING">Waiting</option>
            <option value="ENROLLED">Enrolled</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        <Table
          loading={isLoading}
          data={filtered}
          emptyMsg="No waiting list entries for this branch."
          columns={[
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "languageName", label: "Language" },
            { key: "levelCode", label: "Level" },
            {
              key: "reservationFee",
              label: "Fee",
              render: (r) => `${r.reservationFee} EGP`,
            },
            {
              key: "waitingDays",
              label: "Days",
              render: (r) => (
                <span
                  className={
                    r.waitingDays >= 14 ? "text-red-500 font-bold" : ""
                  }
                >
                  {r.waitingDays}d
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge label={r.status} />,
            },
          ]}
        />
      </div>
    </div>
  );
}

// ── Exams Section ─────────────────────────────────────────────────────────────
function ExamsSection({ branchId }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: grpRes } = useQuery({
    queryKey: ["bo-groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const groups = grpRes?.data?.data || [];

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["bo-exams", branchId],
    queryFn: async () => {
      if (!groups.length) return [];
      const results = await Promise.all(
        groups.map((g) =>
          examsApi.getByGroup(g.id).then((r) => r.data?.data || []),
        ),
      );
      return results.flat();
    },
    enabled: !!branchId && groups.length > 0,
  });

  const filtered = exams.filter((e) => {
    const q = search.toLowerCase();
    if (
      q &&
      !e.title?.toLowerCase().includes(q) &&
      !e.groupName?.toLowerCase().includes(q)
    )
      return false;
    if (typeFilter === "final" && !e.isFinalExam) return false;
    if (typeFilter === "regular" && e.isFinalExam) return false;
    return true;
  });

  const finals = exams.filter((e) => e.isFinalExam).length;
  const regular = exams.filter((e) => !e.isFinalExam).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total"
          value={exams.length}
          icon={ClipboardList}
          color="bg-primary-900"
        />
        <StatCard
          title="Final Exams"
          value={finals}
          icon={Award}
          color="bg-amber-500"
        />
        <StatCard
          title="Regular Tests"
          value={regular}
          icon={ClipboardList}
          color="bg-blue-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search exam or group…"
          />
          <select
            className="input w-36 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="final">Final Exams</option>
            <option value="regular">Regular Tests</option>
          </select>
        </div>
        <Table
          loading={isLoading}
          data={filtered}
          emptyMsg="No exams for this branch."
          columns={[
            { key: "title", label: "Title" },
            { key: "groupName", label: "Group" },
            {
              key: "isFinalExam",
              label: "Type",
              render: (r) => (
                <Badge
                  label={r.isFinalExam ? "FINAL" : "REGULAR"}
                  color={
                    r.isFinalExam
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }
                />
              ),
            },
            { key: "totalMarks", label: "Total Marks" },
            {
              key: "passPercentage",
              label: "Pass %",
              render: (r) => `${r.passPercentage}%`,
            },
            {
              key: "examDate",
              label: "Date",
              render: (r) => new Date(r.examDate).toLocaleDateString("en-GB"),
            },
            {
              key: "durationMins",
              label: "Duration",
              render: (r) => `${r.durationMins} min`,
            },
          ]}
        />
      </div>
    </div>
  );
}

// ── Certificates Section ──────────────────────────────────────────────────────
function CertificatesSection({ branchId }) {
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["bo-certificates", branchId],
    queryFn: () => certificatesApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const certs = res?.data?.data || [];

  const languages = [
    ...new Map(
      certs
        .filter((c) => c.languageName)
        .map((c) => [c.languageName, c.languageName]),
    ).keys(),
  ];
  const thisMonth = certs.filter(
    (c) => new Date(c.issuedAt) > new Date(new Date().setDate(1)),
  ).length;

  const filtered = certs.filter((c) => {
    const q = search.toLowerCase();
    if (
      q &&
      !c.studentName?.toLowerCase().includes(q) &&
      !c.serialNumber?.toLowerCase().includes(q)
    )
      return false;
    if (langFilter && c.languageName !== langFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total Issued"
          value={certs.length}
          icon={Award}
          color="bg-blue-600"
        />
        <StatCard
          title="Languages"
          value={languages.length}
          icon={Award}
          color="bg-purple-600"
        />
        <StatCard
          title="This Month"
          value={thisMonth}
          icon={Award}
          color="bg-green-600"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name or serial…"
          />
          <select
            className="input w-40 text-sm"
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
          >
            <option value="">All Languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <Table
          loading={isLoading}
          data={filtered}
          emptyMsg="No certificates for this branch."
          columns={[
            { key: "studentName", label: "Student" },
            {
              key: "language",
              label: "Language",
              render: (r) => `${r.languageName} ${r.levelCode}`,
            },
            { key: "serialNumber", label: "Serial No." },
            {
              key: "score",
              label: "Score",
              render: (r) =>
                r.marksObtained ? `${r.marksObtained}/${r.totalMarks}` : "—",
            },
            {
              key: "issuedAt",
              label: "Issued",
              render: (r) => fmtDate(r.issuedAt),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ── Closings Section (view-only, full fidelity) ───────────────────────────────
function ClosingsSection({ branchId }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ["bo-closings", branchId],
    queryFn: () => closingApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const closings = res?.data?.data || [];

  const { data: flagsRes } = useQuery({
    queryKey: ["bo-closing-audit-flags", branchId],
    queryFn: () => closingApi.getAuditFlags(branchId),
    enabled: !!branchId,
    staleTime: 30_000,
  });
  const auditFlags = (flagsRes?.data?.data || []).reduce((m, f) => {
    m[f.closingId] = f;
    return m;
  }, {});

  const { data: detailRes, isLoading: detailLoading } = useQuery({
    queryKey: ["bo-closing-detail", selected?.id],
    queryFn: () => closingApi.getDetails(selected.id),
    enabled: !!selected?.id,
  });
  const detail = detailRes?.data?.data;

  const filtered = statusFilter
    ? closings.filter((c) => c.status === statusFilter)
    : closings;

  const draft = closings.filter((c) => c.status === "DRAFT").length;
  const confirmed = closings.filter((c) => c.status === "CONFIRMED").length;
  const paid = closings.filter((c) => c.status === "PAID").length;

  const grandIncome = closings.reduce(
    (s, c) => s + (c.totalIncomeReceived || 0),
    0,
  );
  const grandCommissions = closings.reduce(
    (s, c) => s + (c.totalNetPayable || 0),
    0,
  );
  const grandDeductions = closings.reduce(
    (s, c) => s + (c.totalCenterDeductions || 0),
    0,
  );
  const grandRefunded = closings.reduce(
    (s, c) => s + (c.totalRefunded || 0),
    0,
  );
  const grandEarned = closings.reduce(
    (s, c) => s + (c.centerNetEarned || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Draft"
          value={draft}
          icon={FileText}
          color="bg-amber-500"
        />
        <StatCard
          title="Confirmed"
          value={confirmed}
          icon={FileText}
          color="bg-blue-600"
        />
        <StatCard
          title="Paid"
          value={paid}
          icon={FileText}
          color="bg-emerald-600"
        />
        <StatCard
          title="Center Net Earned"
          value={fmt(grandEarned)}
          icon={DollarSign}
          color="bg-slate-600"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <select
            className="input w-36 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Loading closings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No closings found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {[
                  "Period",
                  "Branch",
                  "Status",
                  "Income Received",
                  "Commissions",
                  "Deductions",
                  "Refunds",
                  "Center Earned",
                  "Audit Flags",
                  "Created",
                  "",
                ].map((h) => (
                  <th key={h} className="table-th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map((c) => {
                const flags = auditFlags[c.id];
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-8 rounded-full flex-shrink-0"
                          style={{
                            background:
                              c.status === "PAID"
                                ? "#10b981"
                                : c.status === "CONFIRMED"
                                  ? "#3b82f6"
                                  : "#f59e0b",
                          }}
                        />
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {fmtDate(c.periodStart)}
                          </p>
                          <p className="text-xs text-gray-400">
                            → {fmtDate(c.periodEnd)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <Building2 size={13} /> {c.branchName}
                      </span>
                    </td>
                    <td className="table-td">
                      <ClosingStatusBadge status={c.status} />
                    </td>
                    <td className="table-td">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {fmt(c.totalIncomeReceived)}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {fmt(c.totalNetPayable)}
                      </span>
                    </td>
                    <td className="table-td">
                      {c.totalCenterDeductions > 0 ? (
                        <span className="font-semibold text-red-500">
                          -{fmt(c.totalCenterDeductions)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="table-td">
                      {(c.totalRefunded || 0) > 0 ? (
                        <span className="font-semibold text-rose-500">
                          -{fmt(c.totalRefunded)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="table-td">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {fmt(c.centerNetEarned)}
                      </span>
                    </td>
                    <td className="table-td">
                      {flags ? (
                        <AuditChips
                          partialCount={flags.partialPaymentCount}
                          crossCount={flags.crossPeriodEntryCount}
                          size="xs"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">…</span>
                      )}
                    </td>
                    <td className="table-td text-xs text-gray-400">
                      {fmtDate(c.createdAt)}
                    </td>
                    <td className="table-td">
                      <Button
                        variant="secondary"
                        icon={Eye}
                        onClick={() => setSelected(c)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60">
                <td
                  colSpan={3}
                  className="table-td font-semibold text-gray-600 dark:text-gray-400"
                >
                  Grand Total ({closings.length} closing
                  {closings.length !== 1 ? "s" : ""})
                </td>
                <td className="table-td font-bold text-emerald-600 dark:text-emerald-400">
                  {fmt(grandIncome)}
                </td>
                <td className="table-td font-bold text-blue-600 dark:text-blue-400">
                  {fmt(grandCommissions)}
                </td>
                <td className="table-td font-bold text-red-500">
                  {grandDeductions > 0 ? `-${fmt(grandDeductions)}` : "—"}
                </td>
                <td className="table-td font-bold text-rose-500">
                  {grandRefunded > 0 ? `-${fmt(grandRefunded)}` : "—"}
                </td>
                <td className="table-td font-bold text-lg text-slate-700 dark:text-slate-300">
                  {fmt(grandEarned)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && detail && !detailLoading && (
        <ClosingDetailModal
          closing={detail}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Loading spinner while fetching detail */}
      {selected && detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl px-10 py-8 flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading closing details…
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Users Section ─────────────────────────────────────────────────────────────
function UsersSection({ branchId }) {
  const [search, setSearch] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["bo-users", branchId],
    queryFn: () => usersApi.getAll(),
    enabled: !!branchId,
  });

  const allUsers = res?.data?.data || [];
  const users = allUsers.filter((u) => u.branchId === branchId);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.roleName?.toLowerCase().includes(q)
    );
  });

  const active = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;
  const roleCount = [...new Set(users.map((u) => u.roleName))].length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Active"
          value={active}
          icon={UserCog}
          color="bg-green-600"
        />
        <StatCard
          title="Inactive"
          value={inactive}
          icon={UserCog}
          color="bg-red-500"
        />
        <StatCard
          title="Roles"
          value={roleCount}
          icon={Shield}
          color="bg-purple-600"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, email or role…"
          />
        </div>
        <Table
          loading={isLoading}
          data={filtered}
          emptyMsg="No users for this branch."
          columns={[
            {
              key: "name",
              label: "Name",
              render: (r) => (
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {r.name}
                  </p>
                  <p className="text-xs text-gray-400">{r.email}</p>
                </div>
              ),
            },
            {
              key: "roleName",
              label: "Role",
              render: (r) => (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 px-2.5 py-1 rounded-full">
                  <Shield size={11} /> {r.roleName}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <Badge label={r.isActive ? "ACTIVE" : "INACTIVE"} />
              ),
            },
            {
              key: "createdAt",
              label: "Created",
              render: (r) =>
                r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString("en-GB")
                  : "—",
            },
          ]}
        />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BranchOverview() {
  const { user } = useAuthStore();
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [activeTab, setActiveTab] = useState("students");

  const isSuperAdmin = user?.roleName === "Super Admin";

  const { data: branchRes } = useQuery({
    queryKey: ["branches"],
    queryFn: lookupsApi.getBranches,
    enabled: isSuperAdmin,
  });
  const branches = branchRes?.data?.data || [];

  if (!isSuperAdmin)
    return (
      <div className="p-6">
        <NoAccess />
      </div>
    );

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Branch Overview"
        subtitle="Super Admin view — browse any branch's data"
      />

      {/* Branch selector */}
      <div className="card p-4 flex items-center gap-4">
        <Building2 size={20} className="text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Select Branch
          </label>
          <select
            className="input w-full max-w-sm text-sm"
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setActiveTab("students");
            }}
          >
            <option value="">— Choose a branch —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        {selectedBranch && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Viewing</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {selectedBranch.name}
            </p>
          </div>
        )}
      </div>

      {!selectedBranchId ? (
        <div className="card p-16 flex flex-col items-center gap-3 text-center">
          <Building2 size={40} className="text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 font-medium">No branch selected</p>
          <p className="text-sm text-gray-400">
            Choose a branch above to view its data.
          </p>
        </div>
      ) : (
        <>
          {/* Tab switcher */}
          <div className="flex flex-wrap gap-1 border-b dark:border-gray-700 pb-0">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px
                  ${
                    activeTab === key
                      ? "border-primary-600 text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "students" && (
              <StudentsSection branchId={selectedBranchId} />
            )}
            {activeTab === "groups" && (
              <GroupsSection branchId={selectedBranchId} />
            )}
            {activeTab === "instructors" && (
              <InstructorsSection branchId={selectedBranchId} />
            )}
            {activeTab === "sessions" && (
              <SessionsSection branchId={selectedBranchId} />
            )}
            {activeTab === "payments" && (
              <PaymentsSection branchId={selectedBranchId} />
            )}
            {activeTab === "waitinglist" && (
              <WaitingListSection branchId={selectedBranchId} />
            )}
            {activeTab === "exams" && (
              <ExamsSection branchId={selectedBranchId} />
            )}
            {activeTab === "certificates" && (
              <CertificatesSection branchId={selectedBranchId} />
            )}
            {activeTab === "closings" && (
              <ClosingsSection branchId={selectedBranchId} />
            )}
            {activeTab === "users" && (
              <UsersSection branchId={selectedBranchId} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
