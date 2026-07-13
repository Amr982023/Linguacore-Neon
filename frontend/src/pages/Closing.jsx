import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { closingApi } from "../services/endpoints";
import { useAuthStore } from "../context/authStore";
import {
  PageHeader,
  Modal,
  Button,
  Input,
  StatCard,
  ConfirmDialog,
} from "../components/ui";
import {
  Plus,
  Eye,
  CheckCircle,
  ChevronDown,
  Lock,
  Banknote,
  Clock,
  Building2,
  Calendar,
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  AlertCircle,
  Trash2,
  PiggyBank,
  ArrowLeftRight,
  Hourglass,
  Info,
  ShieldAlert,
  DollarSign,
  BarChart3,
  ListChecks,
  ReceiptText,
  Gift,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 20;

// ── Formatters ─────────────────────────────────────────────────────────────
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

// ── Status config ──────────────────────────────────────────────────────────
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

function StatusBadge({ status }) {
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

// ── Audit flag chips ───────────────────────────────────────────────────────
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

function Pager({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between p-3 border-t dark:border-gray-700 text-sm">
      <span className="text-gray-500">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LAYER 1 — Income Received Panel
// ══════════════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════════════
// LAYER 3 — Outstanding Obligations Panel
// ══════════════════════════════════════════════════════════════════════════
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
                        <span
                          title="No sessions distributed yet"
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 flex-shrink-0"
                        >
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
              distribution is incomplete, including payments with zero sessions
              distributed. Commission will accumulate in future closings as
              sessions are created.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LAYER 4 — Refunds Issued Panel
// ══════════════════════════════════════════════════════════════════════════
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
              Early exits with RefundDate within this closing period. Reduces
              center net earned. Instructor commissions for completed sessions
              remain intact.
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

// ── Financial Integrity Notice ─────────────────────────────────────────────
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
            one. The student paid earlier; the session ran now. Expected
            behaviour — ledger entries are created at session time.
          </p>
        )}
        {partialCount > 0 && (
          <p>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {partialCount} outstanding{" "}
              {partialCount === 1 ? "obligation" : "obligations"}:
            </span>{" "}
            not all sessions for these payments have run yet. Commission will
            continue to accumulate in future closings. Session records with
            ledger entries are financially locked and cannot be cancelled.
          </p>
        )}
        {refundCount > 0 && (
          <p>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {refundCount} early exit refund{refundCount !== 1 ? "s" : ""}:
            </span>{" "}
            cash refunded to students who exited mid-period. Instructor
            commissions for sessions already completed remain earned and
            untouched. Future sessions from refunded payments are
            commission-blocked.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Create Closing Modal ───────────────────────────────────────────────────
function CreateClosingModal({ onClose, branchId, onCreated }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const periodStart = watch("periodStart");

  const handleValid = (d) => {
    const start = new Date(d.periodStart);
    const end = new Date(d.periodEnd);
    if (end <= start) {
      toast.error("Period end must be after period start.");
      return;
    }
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    if (diffDays > 93)
      toast("Period is longer than 3 months — double-check the dates.", {
        icon: "⚠️",
      });
    mut.mutate(d);
  };

  const mut = useMutation({
    mutationFn: (d) =>
      closingApi.create({
        branchId,
        periodStart: new Date(d.periodStart).toISOString(),
        periodEnd: new Date(d.periodEnd).toISOString(),
        notes: d.notes,
      }),
    onSuccess: (response) => {
      toast.success("Closing created successfully");
      onCreated(response?.data?.data);
      onClose();
    },
    onError: (e) =>
      toast.error(
        e.response?.data?.message ||
          e.response?.data?.Message ||
          "Failed to create closing",
      ),
  });

  return (
    <Modal open onClose={onClose} title="New Period Closing" size="sm">
      <form
        onSubmit={handleSubmit(handleValid, () =>
          toast.error("Fix highlighted fields first."),
        )}
        className="space-y-4"
      >
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
          <AlertCircle
            size={15}
            className="text-blue-500 flex-shrink-0 mt-0.5"
          />
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p>Creates a four-layer closing snapshot:</p>
            <p>
              <strong>Layer 1</strong> — Income received (PaymentDate within
              period)
            </p>
            <p>
              <strong>Layer 2</strong> — Commission distributed (ledger entries
              within period)
            </p>
            <p>
              <strong>Layer 3</strong> — Outstanding obligations (incomplete
              distributions up to period end)
            </p>
            <p>
              <strong>Layer 4</strong> — Refunds issued (early exits with
              RefundDate within period)
            </p>
          </div>
        </div>
        <Input
          label="Period Start *"
          type="datetime-local"
          error={errors.periodStart?.message}
          {...register("periodStart", { required: "Period start is required" })}
        />
        <Input
          label="Period End *"
          type="datetime-local"
          error={errors.periodEnd?.message}
          {...register("periodEnd", {
            required: "Period end is required",
            validate: (v) => {
              if (!v) return "Invalid date/time";
              if (periodStart && new Date(v) <= new Date(periodStart))
                return "Period end must be after period start";
              return true;
            },
          })}
        />
        <Input
          label="Notes (optional)"
          error={errors.notes?.message}
          {...register("notes", {
            maxLength: { value: 500, message: "Max 500 characters" },
          })}
        />
        <div className="flex justify-end pt-1">
          <Button type="submit" loading={mut.isPending} icon={Plus}>
            Create Closing
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Center Deductions Panel ────────────────────────────────────────────────
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
        <Link
          to="/center-deductions"
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Wallet size={11} /> Manage Deductions
        </Link>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {deductions.length === 0 && (
          <p className="px-4 py-3 text-xs text-gray-400 italic">
            No center deductions fell within this closing's period (
            {fmtDate(closing.periodStart)} – {fmtDate(closing.periodEnd)}). Add
            deductions from the Center Deductions page — if this closing is
            still a draft, delete and recreate it to pick up deductions added
            afterward.
          </p>
        )}
        {deductions.map((d) => (
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
                {fmtDate(d.deductionDate)}
              </span>
            </div>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400 flex-shrink-0">
              -{fmt(d.amount)}
            </span>
          </div>
        ))}
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

// ── Per-instructor Bonus / Salary Deduction Panel ──────────────────────────
function InstructorAdjustmentsPanel({ closing, row, onUpdate }) {
  const canEdit = closing.status === "DRAFT";
  const bonuses = row.bonuses || [];
  const salaryDeductions = row.salaryDeductions || [];

  const [addingBonus, setAddingBonus] = useState(false);
  const [bonusName, setBonusName] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");

  const [addingDeduction, setAddingDeduction] = useState(false);
  const [deductionName, setDeductionName] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");

  const addBonusMut = useMutation({
    mutationFn: () =>
      closingApi.addInstructorBonus(closing.id, {
        genericClosingInstructorId: row.id,
        name: bonusName.trim(),
        amount: parseFloat(bonusAmount),
      }),
    onSuccess: () => {
      toast.success("Bonus added");
      setBonusName("");
      setBonusAmount("");
      setAddingBonus(false);
      onUpdate();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to add bonus"),
  });

  const removeBonusMut = useMutation({
    mutationFn: (bonusId) =>
      closingApi.removeInstructorBonus(closing.id, bonusId),
    onSuccess: () => {
      toast.success("Bonus removed");
      onUpdate();
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to remove bonus"),
  });

  const addDeductionMut = useMutation({
    mutationFn: () =>
      closingApi.addInstructorSalaryDeduction(closing.id, {
        genericClosingInstructorId: row.id,
        name: deductionName.trim(),
        amount: parseFloat(deductionAmount),
      }),
    onSuccess: () => {
      toast.success("Salary deduction added");
      setDeductionName("");
      setDeductionAmount("");
      setAddingDeduction(false);
      onUpdate();
    },
    onError: (e) =>
      toast.error(
        e.response?.data?.message || "Failed to add salary deduction",
      ),
  });

  const removeDeductionMut = useMutation({
    mutationFn: (deductionId) =>
      closingApi.removeInstructorSalaryDeduction(closing.id, deductionId),
    onSuccess: () => {
      toast.success("Salary deduction removed");
      onUpdate();
    },
    onError: (e) =>
      toast.error(
        e.response?.data?.message || "Failed to remove salary deduction",
      ),
  });

  if (!canEdit && bonuses.length === 0 && salaryDeductions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 bg-white dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-700/50 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Gift size={12} /> Bonuses
            {bonuses.length > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                (+{fmt(row.totalBonus)})
              </span>
            )}
          </span>
          {canEdit && !addingBonus && (
            <button
              onClick={() => setAddingBonus(true)}
              className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
        <div className="divide-y divide-emerald-50 dark:divide-emerald-900/20">
          {bonuses.length === 0 && !addingBonus && (
            <p className="px-3 py-2 text-xs text-gray-400 italic">
              No bonuses for this instructor.
            </p>
          )}
          {bonuses.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between px-3 py-2 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10"
            >
              <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                {b.name}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  +{fmt(b.amount)}
                </span>
                {canEdit && (
                  <button
                    onClick={() => removeBonusMut.mutate(b.id)}
                    disabled={
                      removeBonusMut.isPending &&
                      removeBonusMut.variables === b.id
                    }
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {addingBonus && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50/50 dark:bg-emerald-900/10">
              <input
                type="text"
                placeholder="e.g. Performance bonus"
                value={bonusName}
                onChange={(e) => setBonusName(e.target.value)}
                className="flex-1 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-emerald-500 outline-none py-1 text-gray-800 dark:text-gray-200 placeholder-gray-400 min-w-0"
              />
              <input
                type="number"
                placeholder="Amount"
                min="0.01"
                step="0.01"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                className="w-20 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-emerald-500 outline-none py-1 text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
              <button
                onClick={() => {
                  if (!bonusName.trim()) {
                    toast.error("Name is required");
                    return;
                  }
                  const amt = parseFloat(bonusAmount);
                  if (!amt || amt <= 0) {
                    toast.error("Enter a valid amount");
                    return;
                  }
                  addBonusMut.mutate();
                }}
                disabled={addBonusMut.isPending}
                className="text-xs px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex-shrink-0"
              >
                {addBonusMut.isPending ? "…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setAddingBonus(false);
                  setBonusName("");
                  setBonusAmount("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-orange-200 dark:border-orange-700/50 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/20">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
            <Wallet size={12} /> Salary Deductions
            {salaryDeductions.length > 0 && (
              <span className="text-orange-600 dark:text-orange-400">
                (-{fmt(row.totalSalaryDeductions)})
              </span>
            )}
          </span>
          {canEdit && !addingDeduction && (
            <button
              onClick={() => setAddingDeduction(true)}
              className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
        <div className="divide-y divide-orange-50 dark:divide-orange-900/20">
          {salaryDeductions.length === 0 && !addingDeduction && (
            <p className="px-3 py-2 text-xs text-gray-400 italic">
              No salary deductions for this instructor.
            </p>
          )}
          {salaryDeductions.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between px-3 py-2 hover:bg-orange-50/40 dark:hover:bg-orange-900/10"
            >
              <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                {d.name}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  -{fmt(d.amount)}
                </span>
                {canEdit && (
                  <button
                    onClick={() => removeDeductionMut.mutate(d.id)}
                    disabled={
                      removeDeductionMut.isPending &&
                      removeDeductionMut.variables === d.id
                    }
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {addingDeduction && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-orange-50/50 dark:bg-orange-900/10">
              <input
                type="text"
                placeholder="e.g. Late penalty"
                value={deductionName}
                onChange={(e) => setDeductionName(e.target.value)}
                className="flex-1 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-orange-500 outline-none py-1 text-gray-800 dark:text-gray-200 placeholder-gray-400 min-w-0"
              />
              <input
                type="number"
                placeholder="Amount"
                min="0.01"
                step="0.01"
                value={deductionAmount}
                onChange={(e) => setDeductionAmount(e.target.value)}
                className="w-20 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-orange-500 outline-none py-1 text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
              <button
                onClick={() => {
                  if (!deductionName.trim()) {
                    toast.error("Name is required");
                    return;
                  }
                  const amt = parseFloat(deductionAmount);
                  if (!amt || amt <= 0) {
                    toast.error("Enter a valid amount");
                    return;
                  }
                  addDeductionMut.mutate();
                }}
                disabled={addDeductionMut.isPending}
                className="text-xs px-2 py-1 rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 flex-shrink-0"
              >
                {addDeductionMut.isPending ? "…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setAddingDeduction(false);
                  setDeductionName("");
                  setDeductionAmount("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Instructor Accordion (Layer 2) ─────────────────────────────────────────
function InstructorAccordion({ row, index, closing, onUpdate }) {
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
                <span
                  title={`${crossPeriodCount} entries from payments in a previous period`}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex-shrink-0"
                >
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
                    title={`Bonus: ${b.name}`}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  >
                    <Gift size={9} />
                    {b.name} +{fmt(b.amount)}
                  </span>
                ))}
                {(row.salaryDeductions || []).map((d) => (
                  <span
                    key={d.id}
                    title={`Salary deduction: ${d.name}`}
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
                  <span
                    title="Payment from a previous closing period"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                  >
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

          <InstructorAdjustmentsPanel
            closing={closing}
            row={row}
            onUpdate={onUpdate}
          />
        </div>
      )}
    </div>
  );
}

// ── Closing Detail Modal ───────────────────────────────────────────────────
function ClosingDetailModal({
  closing,
  onClose,
  onConfirm,
  onPaid,
  confirmLoading,
  paidLoading,
}) {
  const [confirmAction, setConfirmAction] = useState(null);
  const qc = useQueryClient();

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

  // Explicit, user-triggered refetch of just this detail — this is not "auto
  // reload", it's the direct result of the admin adding/removing a bonus or
  // deduction inside this modal, so refetching the detail (and the summary
  // list, since totals changed) is exactly what should happen.
  const handleUpdate = () => {
    qc.invalidateQueries({ queryKey: ["closing-detail", closing.id] });
    qc.invalidateQueries({ queryKey: ["closings"] });
    qc.invalidateQueries({ queryKey: ["closing-audit-flags"] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <StatusBadge status={closing.status} />
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

        <div className="px-6 pt-4 space-y-2">
          {closing.status === "DRAFT" && (
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-amber-500" />
                <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                  Draft — deductions are swept in automatically for this period.
                  Confirm to lock.
                </span>
              </div>
              <Button
                onClick={() => setConfirmAction("confirm")}
                loading={confirmLoading}
              >
                <Lock size={14} className="mr-1" /> Confirm &amp; Lock
              </Button>
            </div>
          )}
          {closing.status === "CONFIRMED" && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl">
              <div className="flex items-center gap-2">
                <User size={15} className="text-blue-500" />
                <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                  Confirmed by <strong>{closing.confirmedByName}</strong> on{" "}
                  {fmtDateTime(closing.confirmedAt)}
                </span>
              </div>
              <Button
                onClick={() => setConfirmAction("paid")}
                loading={paidLoading}
              >
                <Banknote size={14} className="mr-1" /> Mark as Paid
              </Button>
            </div>
          )}
          {closing.status === "PAID" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl">
              <CheckCircle size={15} className="text-emerald-500" />
              <span className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                Paid on {fmtDateTime(closing.paidAt)}
              </span>
            </div>
          )}
        </div>

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

        <div className="px-6 py-4 space-y-2 max-h-[58vh] overflow-y-auto">
          <FinancialIntegrityNotice
            crossPeriodCount={crossPeriodTotal}
            partialCount={partialPayments.length}
            refundCount={refundRecords.length}
          />

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

            <CenterDeductionsPanel closing={closing} />

            {instructorCount === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 dark:bg-gray-800/40 rounded-xl">
                No commission distributed in this period.
              </div>
            ) : (
              <div className="space-y-3">
                {(closing.instructorRows || []).map((row, i) => (
                  <InstructorAccordion
                    key={row.id}
                    row={row}
                    index={i}
                    closing={closing}
                    onUpdate={handleUpdate}
                  />
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

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === "confirm"}
        title="Confirm & Lock Closing?"
        message="This will LOCK the closing permanently. No further edits will be allowed after confirmation."
        onConfirm={() => {
          onConfirm(closing.id);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "paid"}
        title="Mark as Paid?"
        message="This marks all instructor commissions for this period as disbursed. This action cannot be undone."
        onConfirm={() => {
          onPaid(closing.id);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Closing() {
  const { branchId, user } = useAuthStore();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const queryParams = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, status: statusFilter || undefined }),
    [page, statusFilter],
  );
  const queryKey = ["closings", branchId, queryParams];

  const {
    data: res,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: () => closingApi.getByBranchPaged(branchId, queryParams),
    enabled: !!branchId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    keepPreviousData: true,
  });

  const { data: flagsRes } = useQuery({
    queryKey: ["closing-audit-flags", branchId],
    queryFn: () => closingApi.getAuditFlags(branchId),
    enabled: !!branchId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const { data: detailRes, isLoading: detailLoading } = useQuery({
    queryKey: ["closing-detail", selected?.id],
    queryFn: () => closingApi.getDetails(selected.id),
    enabled: !!selected?.id,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const closings = res?.data?.data?.items || [];
  const totalCount = res?.data?.data?.totalCount || 0;
  const totalPages = res?.data?.data?.totalPages || 1;

  const auditFlags = (flagsRes?.data?.data || []).reduce((m, f) => {
    m[f.closingId] = f;
    return m;
  }, {});
  const detail = detailRes?.data?.data;

  // ── Cache patch helper: mutate the row inside the current paged cache ─
  const patchClosingRow = (id, updater) => {
    qc.setQueryData(queryKey, (old) => {
      if (!old) return old;
      const items = old.data?.data?.items || [];
      return {
        ...old,
        data: {
          ...old.data,
          data: {
            ...old.data.data,
            items: items.map((c) => (c.id === id ? updater(c) : c)),
          },
        },
      };
    });
  };

  const confirmMut = useMutation({
    mutationFn: (id) => closingApi.confirm({ closingId: id }),
    onSuccess: () => {
      toast.success("Closing confirmed and locked");
      patchClosingRow(selected?.id, (c) => ({ ...c, status: "CONFIRMED" }));
      // Detail modal reflects a status transition the admin just triggered —
      // refetching the open detail here is a direct result of their action,
      // not an unrelated auto-reload.
      qc.invalidateQueries({ queryKey: ["closing-detail", selected?.id] });
    },
    onError: (e) =>
      toast.error(
        e.response?.data?.message || e.response?.data?.Message || "Error",
      ),
  });
  const paidMut = useMutation({
    mutationFn: (id) => closingApi.markPaid({ closingId: id }),
    onSuccess: () => {
      toast.success("Marked as Paid");
      patchClosingRow(selected?.id, (c) => ({ ...c, status: "PAID" }));
      qc.invalidateQueries({ queryKey: ["closing-detail", selected?.id] });
    },
    onError: (e) =>
      toast.error(
        e.response?.data?.message || e.response?.data?.Message || "Error",
      ),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => closingApi.delete(id),
    onSuccess: (_response, id) => {
      toast.success("Closing deleted");
      qc.setQueryData(queryKey, (old) => {
        if (!old) return old;
        const items = old.data?.data?.items || [];
        return {
          ...old,
          data: {
            ...old.data,
            data: {
              ...old.data.data,
              items: items.filter((c) => c.id !== id),
              totalCount: Math.max(0, (old.data.data.totalCount || 1) - 1),
            },
          },
        };
      });
      qc.invalidateQueries({ queryKey: ["closing-audit-flags"] });
      setDeleteTarget(null);
    },
    onError: (e) =>
      toast.error(
        e.response?.data?.message ||
          e.response?.data?.Message ||
          "Failed to delete",
      ),
  });

  const paidCount = closings.filter((c) => c.status === "PAID").length;
  const draftCount = closings.filter((c) => c.status === "DRAFT").length;
  const confirmedCount = closings.filter(
    (c) => c.status === "CONFIRMED",
  ).length;

  // NOTE: these are page-level totals now, not branch-wide across all
  // closings — same tradeoff applied on the other paginated pages.
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
    <div className="p-6">
      <PageHeader
        title="Period Closings"
        subtitle="Four-layer closing · Income · Commission · Outstanding obligations · Refunds"
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            New Closing
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total (filtered)"
          value={totalCount}
          color="bg-slate-600"
          icon={FileText}
        />
        <StatCard
          title="Draft (page)"
          value={draftCount}
          color="bg-amber-500"
          icon={Clock}
        />
        <StatCard
          title="Confirmed (page)"
          value={confirmedCount}
          color="bg-blue-600"
          icon={Lock}
        />
        <StatCard
          title="Paid (page)"
          value={paidCount}
          color="bg-emerald-600"
          icon={CheckCircle}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
          <select
            className="input w-40 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
          </select>
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Loading closings…
          </div>
        ) : closings.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No closings found</p>
            <p className="text-gray-400 text-sm mt-1">
              Create a new period closing to get started.
            </p>
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
              {closings.map((c) => {
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
                      <StatusBadge status={c.status} />
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
                      <div className="flex items-center gap-2">
                        {c.status === "DRAFT" && (
                          <Button
                            variant="danger"
                            icon={Trash2}
                            loading={
                              deleteMut.isPending &&
                              deleteMut.variables === c.id
                            }
                            onClick={() => setDeleteTarget(c)}
                          >
                            Delete
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          icon={Eye}
                          onClick={() => setSelected(c)}
                        >
                          View
                        </Button>
                      </div>
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
                  Page Total ({closings.length} closing
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

        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>

      {modal === "create" && (
        <CreateClosingModal
          onClose={() => setModal(null)}
          branchId={branchId}
          userId={user?.id}
          onCreated={(newClosing) => {
            // Prepend the new closing into the current page's cache directly
            // rather than invalidating and refetching the whole list.
            qc.setQueryData(queryKey, (old) => {
              if (!old) return old;
              const items = old.data?.data?.items || [];
              return {
                ...old,
                data: {
                  ...old.data,
                  data: {
                    ...old.data.data,
                    items: [newClosing, ...items].slice(0, PAGE_SIZE),
                    totalCount: (old.data.data.totalCount || 0) + 1,
                  },
                },
              };
            });
            qc.invalidateQueries({ queryKey: ["closing-audit-flags"] });
          }}
        />
      )}
      {selected && detail && !detailLoading && (
        <ClosingDetailModal
          closing={detail}
          onClose={() => setSelected(null)}
          onConfirm={(id) => confirmMut.mutate(id)}
          onPaid={(id) => paidMut.mutate(id)}
          confirmLoading={confirmMut.isPending}
          paidLoading={paidMut.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Closing?"
        message={`Permanently delete the DRAFT closing for ${fmtDate(deleteTarget?.periodStart)} → ${fmtDate(deleteTarget?.periodEnd)}? This cannot be undone.`}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
