import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  paymentsApi,
  enrollmentsApi,
  groupsApi,
  lookupsApi,
  notificationsApi,
} from "../services/endpoints";
import { useAuthStore } from "../context/authStore";
import {
  PageHeader,
  Table,
  Modal,
  Button,
  Input,
  Select,
  Badge,
  StatCard,
  Tabs,
} from "../components/ui";
import WaButton from "../components/WaButton";
import GmailButton from "../components/GmailButton";
import {
  Plus,
  AlertCircle,
  CheckCircle,
  Search,
  ChevronDown,
  X,
  RotateCcw,
  Clock,
  Wallet,
} from "lucide-react";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-EG", { minimumFractionDigits: 2 }) + " EGP";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

// ── Month / Year filter constants ─────────────────────────────────────────────
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CURRENT_YEAR = new Date().getFullYear();
// Last 4 years, most recent first (e.g. 2026, 2025, 2024, 2023)
const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

// Builds an ISO from/to range for the given year + optional month.
// month === "" means "whole year" (Jan 1 -> Dec 31).
// month is 0-11 when a specific month is selected.
function buildDateRange(year, month) {
  const y = Number(year);

  if (month === "" || month === null || month === undefined) {
    const from = new Date(y, 0, 1, 0, 0, 0);
    const to = new Date(y, 11, 31, 23, 59, 59);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }

  const m = Number(month);
  const from = new Date(y, m, 1, 0, 0, 0);
  // day 0 of next month = last day of this month
  const to = new Date(y, m + 1, 0, 23, 59, 59);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

// ── Group Combobox ────────────────────────────────────────────────────────────
function GroupCombobox({ groups = [], value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = groups.find((g) => String(g.id) === String(value)) || null;

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.languageName?.toLowerCase().includes(q) ||
        g.levelCode?.toLowerCase().includes(q) ||
        g.language?.toLowerCase().includes(q) ||
        g.level?.toLowerCase().includes(q) ||
        g.code?.toLowerCase().includes(q),
    );
  }, [groups, search]);

  const handleOpen = () => {
    if (disabled) return;
    setSearch("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (group) => {
    onChange(group.id);
    setSearch("");
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`input w-full text-sm text-left flex items-center gap-2 pr-8 ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        {selected ? (
          <span className="flex-1 truncate text-gray-800 dark:text-gray-100">
            {selected.name}{" "}
            <span className="text-gray-400 text-xs">
              ({selected.languageName ?? selected.language ?? ""}{" "}
              {selected.levelCode ?? selected.level ?? ""}) ·{" "}
              {selected.paymentStrategy || "MONTHLY"}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-gray-400">
            — Select Group ({groups.length} available) —
          </span>
        )}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selected && (
            <span
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-0.5"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={13}
            className={`text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search ${groups.length} groups…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input w-full pl-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setSearch("");
                  }
                  if (e.key === "Enter" && filtered.length === 1)
                    handleSelect(filtered[0]);
                }}
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {groups.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">
                No groups loaded yet
              </li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">
                No groups match "{search}"
              </li>
            ) : (
              filtered.map((g) => (
                <li
                  key={g.id}
                  onClick={() => handleSelect(g)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    String(g.id) === String(value)
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-xs text-gray-400 ml-1.5">
                      {g.languageName ?? g.language ?? ""}{" "}
                      {g.levelCode ?? g.level ?? ""}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {g.paymentStrategy || "MONTHLY"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Payment Form ──────────────────────────────────────────────────────────────
function PaymentForm({
  onSubmit,
  loading,
  groups = [],
  methods = [],
  periodLabels = [],
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupEnrollments, setGroupEnrollments] = useState([]);
  const [loadingEnr, setLoadingEnr] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [enrollSearch, setEnrollSearch] = useState("");

  const loadEnrollments = async (groupId) => {
    if (!groupId) {
      setGroupEnrollments([]);
      return;
    }
    setLoadingEnr(true);
    try {
      const res = await enrollmentsApi.getByGroup(groupId);
      setGroupEnrollments(res.data?.data || []);
    } finally {
      setLoadingEnr(false);
    }
  };

  const handleGroupChange = (groupId) => {
    setSelectedGroupId(groupId);
    loadEnrollments(groupId);
    setValue("enrollmentId", "");
    setSelectedEnrollment(null);
    setValue("amountDue", "");
    setEnrollSearch("");
  };

  const handleEnrollmentChange = (e) => {
    const enr = groupEnrollments.find(
      (en) => String(en.id) === String(e.target.value),
    );
    setSelectedEnrollment(enr || null);
    setValue("amountDue", enr ? enr.effectiveFee : "");
  };

  const filteredEnrollments = groupEnrollments.filter(
    (e) =>
      !enrollSearch ||
      e.studentName?.toLowerCase().includes(enrollSearch.toLowerCase()),
  );

  const handleValid = (data) => {
    const due = Number(data.amountDue);
    const paid = Number(data.amountPaid);
    if (paid < 0) {
      toast.error("Amount paid cannot be negative.");
      return;
    }
    if (due > 0 && paid > due * 2) {
      toast.error("Amount paid seems too high — please double-check.");
      return;
    }
    onSubmit(data);
  };

  return (
    <form
      onSubmit={handleSubmit(handleValid, () =>
        toast.error("Please fix the highlighted fields."),
      )}
      className="space-y-3"
    >
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Group
        </label>
        <GroupCombobox
          groups={groups}
          value={selectedGroupId}
          onChange={handleGroupChange}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Enrollment *
        </label>
        {groupEnrollments.length > 5 && (
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search students…"
              value={enrollSearch}
              onChange={(e) => setEnrollSearch(e.target.value)}
              className="input w-full pl-8 text-sm mb-1"
            />
          </div>
        )}
        <select
          className={`input w-full text-sm ${errors.enrollmentId ? "border-red-400" : ""}`}
          disabled={!selectedGroupId}
          {...register("enrollmentId", {
            required: "Please select an enrollment",
          })}
          onChange={(e) => {
            register("enrollmentId").onChange(e);
            handleEnrollmentChange(e);
          }}
        >
          <option value="">
            {!selectedGroupId
              ? "— Select a group first —"
              : loadingEnr
                ? "Loading…"
                : "— Select Enrollment —"}
          </option>
          {!loadingEnr &&
            filteredEnrollments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.studentName} — {e.effectiveFee} EGP
              </option>
            ))}
        </select>
        {errors.enrollmentId && (
          <p className="text-xs text-red-500">{errors.enrollmentId.message}</p>
        )}
      </div>

      <Select
        label="Payment Method *"
        error={errors.paymentMethodId?.message}
        {...register("paymentMethodId", {
          required: "Payment method is required",
        })}
      >
        <option value="">— Select Method —</option>
        {methods.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Amount Due (EGP) *
          </label>
          <input
            type="number"
            step="0.01"
            readOnly
            className="input w-full text-sm bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-500"
            {...register("amountDue", {
              required: "Please select an enrollment first",
              valueAsNumber: true,
            })}
          />
          {selectedEnrollment && (
            <p className="text-xs text-gray-400">
              Auto-filled from enrollment fee
            </p>
          )}
          {errors.amountDue && (
            <p className="text-xs text-red-500">{errors.amountDue.message}</p>
          )}
        </div>
        <Input
          label="Amount Paid (EGP) *"
          type="number"
          step="0.01"
          error={errors.amountPaid?.message}
          {...register("amountPaid", {
            required: "Amount paid is required",
            valueAsNumber: true,
            min: { value: 0, message: "Cannot be negative" },
          })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Due Date *"
          type="datetime-local"
          error={errors.dueDate?.message}
          {...register("dueDate", {
            required: "Due date is required",
            validate: (v) => !!v || "Invalid date/time",
          })}
        />
        <Select
          label="Period Label *"
          error={errors.periodLabelId?.message}
          {...register("periodLabelId", {
            required: "Period label is required",
          })}
        >
          <option value="">— Select Period —</option>
          {periodLabels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <Input
        label="Notes"
        error={errors.notes?.message}
        {...register("notes", {
          maxLength: { value: 300, message: "Max 300 characters" },
        })}
      />

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          Record Payment
        </Button>
      </div>
    </form>
  );
}

// ── Settle Balance Form ───────────────────────────────────────────────────────
function SettleBalanceForm({ debt, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      additionalAmount: debt?.balance ?? 0,
      notes: "",
    },
  });

  const handleValid = (data) => {
    const amt = Number(data.additionalAmount);
    if (amt <= 0) {
      toast.error("Additional amount must be greater than zero.");
      return;
    }
    if (debt && amt > debt.balance) {
      toast.error(
        `Additional amount cannot exceed the outstanding balance (${fmt(debt.balance)}).`,
      );
      return;
    }
    onSubmit(data);
  };

  if (!debt) return null;

  return (
    <form
      onSubmit={handleSubmit(handleValid, () =>
        toast.error("Please fix the highlighted fields."),
      )}
      className="space-y-3"
    >
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Student</span>
          <span className="font-medium">{debt.studentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Group</span>
          <span className="font-medium">{debt.groupName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Period</span>
          <span className="font-medium">{debt.periodLabelName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Fee / Paid</span>
          <span className="font-medium">
            {fmt(debt.effectiveFee)} / {fmt(debt.amountPaid)}
          </span>
        </div>
        <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
          <span className="text-gray-500">Outstanding Balance</span>
          <span className="font-semibold text-red-500">
            {fmt(debt.balance)}
          </span>
        </div>
      </div>

      <Input
        label="Additional Amount (EGP) *"
        type="number"
        step="0.01"
        error={errors.additionalAmount?.message}
        {...register("additionalAmount", {
          required: "Additional amount is required",
          valueAsNumber: true,
          min: { value: 0.01, message: "Must be greater than zero" },
          max: {
            value: debt.balance,
            message: `Cannot exceed outstanding balance (${fmt(debt.balance)})`,
          },
        })}
      />

      <Input
        label="Notes"
        error={errors.notes?.message}
        {...register("notes", {
          maxLength: { value: 300, message: "Max 300 characters" },
        })}
      />

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          Settle Balance
        </Button>
      </div>
    </form>
  );
}

// ── Debt table (shared by Outstanding + Overdue tabs) ─────────────────────────
function DebtTable({ data, loading, emptyMsg, onSettle }) {
  return (
    <Table
      loading={loading}
      data={data}
      emptyMsg={emptyMsg}
      columns={[
        {
          key: "student",
          label: "Student",
          render: (r) => r.studentName || "—",
        },
        { key: "group", label: "Group", render: (r) => r.groupName || "—" },
        {
          key: "strategy",
          label: "Strategy",
          render: (r) => <Badge label={r.paymentStrategy || "MONTHLY"} />,
        },
        {
          key: "period",
          label: "Period",
          render: (r) => r.periodLabelName || "—",
        },
        { key: "fee", label: "Fee", render: (r) => fmt(r.effectiveFee) },
        {
          key: "paid",
          label: "Paid",
          render: (r) => (
            <span
              className={
                r.amountPaid > 0
                  ? "text-green-600 font-medium"
                  : "text-gray-400"
              }
            >
              {r.amountPaid > 0 ? fmt(r.amountPaid) : "—"}
            </span>
          ),
        },
        {
          key: "balance",
          label: "Balance",
          render: (r) => (
            <span className="font-semibold text-red-500">{fmt(r.balance)}</span>
          ),
        },
        {
          key: "firstSession",
          label: "First Session",
          render: (r) => fmtDate(r.firstSessionDate),
        },
        {
          key: "days",
          label: "Days",
          render: (r) => (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                r.isOverdue
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
              }`}
            >
              {r.daysSinceFirstSession}d
            </span>
          ),
        },
        {
          key: "settle",
          label: "Settle",
          render: (r) => {
            const hasValidPeriod =
              r.periodLabelId &&
              r.periodLabelId !== "00000000-0000-0000-0000-000000000000";
            const isPartialDebt = r.balance < r.effectiveFee;
            const canSettle = hasValidPeriod && isPartialDebt;

            return (
              <button
                type="button"
                onClick={() => onSettle(r)}
                disabled={!canSettle}
                title={
                  !hasValidPeriod
                    ? "No period assigned — cannot settle"
                    : !isPartialDebt
                      ? "No partial payment recorded — use Record Payment instead"
                      : "Settle outstanding balance"
                }
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                  canSettle
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
                }`}
              >
                <Wallet size={12} />
                Settle Balance
              </button>
            );
          },
        },
        {
          key: "gmail",
          label: "Gmail",
          render: (r) => (
            <GmailButton
              label={r.isOverdue ? "Overdue" : "Due"}
              onSend={() =>
                r.isOverdue
                  ? notificationsApi.paymentOverdueGmail(r.enrollmentId)
                  : notificationsApi.paymentDueGmail(r.enrollmentId)
              }
            />
          ),
        },
        {
          key: "whatsapp",
          label: "WhatsApp",
          render: (r) => (
            <WaButton
              label={r.isOverdue ? "Overdue" : "Due"}
              onSend={() =>
                r.isOverdue
                  ? notificationsApi.paymentOverdueWhatsApp(r.enrollmentId)
                  : notificationsApi.paymentDueWhatsApp(r.enrollmentId)
              }
            />
          ),
        },
      ]}
    />
  );
}

// ── Main Payments Page ────────────────────────────────────────────────────────
export default function Payments() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [modal, setModal] = useState(null);
  const [settleTarget, setSettleTarget] = useState(null);
  const [langFilter, setLangFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── Month / Year date filters ──────────────────────────────────────────────
  // Default to the current month/year. monthFilter === "" means "whole year".
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth());

  const { fromIso: FROM_ISO, toIso: TO_ISO } = useMemo(
    () => buildDateRange(yearFilter, monthFilter),
    [yearFilter, monthFilter],
  );

  const isDebtTab = tab === "outstanding" || tab === "overdue";
  const isRefundTab = tab === "refunds";

  // ── Queries ───────────────────────────────────────────────────────────────
  // All primary data queries fire together as soon as branchId is known
  // (i.e. on page mount), regardless of which tab is active. Tabs just
  // toggle which already-loaded dataset is rendered — they no longer
  // gate the network request itself. The date window (FROM_ISO/TO_ISO) is
  // now driven by the month/year filters below, so changing either
  // automatically refetches all three period-scoped queries.
  const { data: pmtRes, isLoading: pmtLoading } = useQuery({
    queryKey: ["payments-period", branchId, FROM_ISO, TO_ISO],
    queryFn: () => paymentsApi.getByPeriod(branchId, FROM_ISO, TO_ISO),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: debtRes, isLoading: debtLoading } = useQuery({
    queryKey: ["payment-debts", branchId, FROM_ISO, TO_ISO],
    queryFn: () => paymentsApi.getDebts(branchId, FROM_ISO, TO_ISO),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: refundRes, isLoading: refundLoading } = useQuery({
    queryKey: ["refunds-branch", branchId, FROM_ISO, TO_ISO],
    queryFn: () =>
      enrollmentsApi.getRefundsByBranch(branchId, FROM_ISO, TO_ISO),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: grpRes } = useQuery({
    queryKey: ["groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const { data: mthRes } = useQuery({
    queryKey: ["pay-methods"],
    queryFn: lookupsApi.getPaymentMethods,
  });
  const { data: langRes } = useQuery({
    queryKey: ["languages"],
    queryFn: lookupsApi.getLanguages,
  });
  const { data: levelsRes } = useQuery({
    queryKey: ["levels"],
    queryFn: lookupsApi.getLevels,
  });
  const { data: periodRes } = useQuery({
    queryKey: ["period-labels"],
    queryFn: lookupsApi.getPeriodLabels,
  });

  const payments = pmtRes?.data?.data || [];
  const allDebts = debtRes?.data?.data || [];
  const refundRecords = refundRes?.data?.data || [];
  const groups = grpRes?.data?.data || [];
  const methods = mthRes?.data?.data || [];
  const languages = langRes?.data?.data || [];
  const levels = levelsRes?.data?.data || [];
  const periodLabels = periodRes?.data?.data || [];

  // ── Derived lists ─────────────────────────────────────────────────────────
  const collected = payments.filter((p) => p.amountPaid >= p.amountDue);
  const outstanding = allDebts.filter((d) => !d.isOverdue);
  const overdue = allDebts.filter((d) => d.isOverdue);

  const filterDebts = (list) =>
    list.filter((d) => {
      if (langFilter && d.languageName !== langFilter) return false;
      if (levelFilter && d.levelCode !== levelFilter) return false;
      return true;
    });

  const getPaymentList = () => {
    const base = tab === "collected" ? collected : payments;
    return base.filter((p) => {
      if (langFilter && p.languageName !== langFilter) return false;
      if (levelFilter && p.levelCode !== levelFilter) return false;
      if (statusFilter === "paid" && p.amountPaid < p.amountDue) return false;
      if (statusFilter === "unpaid" && p.amountPaid >= p.amountDue)
        return false;
      return true;
    });
  };

  const getRefundList = () =>
    refundRecords.filter((r) => {
      if (langFilter && r.languageName !== langFilter) return false;
      if (levelFilter && r.levelCode !== levelFilter) return false;
      return true;
    });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCollected = collected.reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = outstanding.reduce((s, d) => s + d.balance, 0);
  const totalOverdue = overdue.reduce((s, d) => s + d.balance, 0);
  const totalRefunded = refundRecords.reduce(
    (s, r) => s + r.actualRefundAmount,
    0,
  );

  const invalidate = () => {
    qc.invalidateQueries(["payments-period"]);
    qc.invalidateQueries(["payment-debts"]);
    qc.invalidateQueries(["refunds-branch"]);
  };

  const getGmailAction = (row) => ({
    label: "Received",
    onSend: () => notificationsApi.paymentReceivedGmail(row.id),
  });
  const getWaAction = (row) => ({
    label: "Received",
    onSend: () => notificationsApi.paymentReceivedWhatsApp(row.id),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (d) => paymentsApi.create(d),
    onSuccess: () => {
      toast.success("Payment recorded");
      invalidate();
      setModal(null);
    },
    onError: (e) => {
      const msg = e.response?.data?.message || e.response?.data?.Message;
      if (msg?.toLowerCase().includes("session"))
        toast.error(
          "No sessions found for selected period and group. Ensure sessions exist first.",
        );
      else toast.error(msg || "Error recording payment");
    },
  });

  const settleMut = useMutation({
    mutationFn: (d) => paymentsApi.settleBalance(d),
    onSuccess: () => {
      toast.success("Balance settled successfully");
      invalidate();
      setSettleTarget(null);
    },
    onError: (e) => {
      const msg = e.response?.data?.message || e.response?.data?.Message;
      toast.error(msg || "Error settling balance");
    },
  });

  const handlePaymentSubmit = (data) => {
    data.dueDate = new Date(data.dueDate).toISOString();
    createMut.mutate(data);
  };

  const handleSettleSubmit = (data) => {
    if (!settleTarget) return;
    settleMut.mutate({
      enrollmentId: settleTarget.enrollmentId,
      periodLabelId: settleTarget.periodLabelId,
      additionalAmount: Number(data.additionalAmount),
      notes: data.notes || null,
    });
  };

  // ── Payment columns ───────────────────────────────────────────────────────
  const paymentColumns = [
    { key: "student", label: "Student", render: (r) => r.studentName || "—" },
    { key: "group", label: "Group", render: (r) => r.groupName || "—" },
    {
      key: "strategy",
      label: "Strategy",
      render: (r) => <Badge label={r.paymentStrategy || "MONTHLY"} />,
    },
    { key: "period", label: "Period", render: (r) => r.periodLabelName || "—" },
    { key: "method", label: "Method", render: (r) => r.paymentMethod || "—" },
    { key: "amountDue", label: "Due", render: (r) => fmt(r.amountDue) },
    {
      key: "amountPaid",
      label: "Paid",
      render: (r) => (
        <span className="font-medium text-green-600">{fmt(r.amountPaid)}</span>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      render: (r) => {
        const bal = r.amountDue - r.amountPaid;
        return (
          <span
            className={`font-medium ${bal > 0 ? "text-red-500" : "text-gray-400"}`}
          >
            {bal > 0 ? fmt(bal) : "—"}
          </span>
        );
      },
    },
    {
      key: "payDate",
      label: "Pay Date",
      render: (r) => fmtDate(r.paymentDate),
    },
    {
      key: "gmail",
      label: "Gmail",
      render: (r) => {
        const { label, onSend } = getGmailAction(r);
        return <GmailButton label={label} onSend={onSend} />;
      },
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      render: (r) => {
        const { label, onSend } = getWaAction(r);
        return <WaButton label={label} onSend={onSend} />;
      },
    },
  ];

  // ── Refund columns ────────────────────────────────────────────────────────
  const refundColumns = [
    { key: "student", label: "Student", render: (r) => r.studentName || "—" },
    { key: "group", label: "Group", render: (r) => r.groupName || "—" },
    { key: "method", label: "Method", render: (r) => r.paymentMethod || "—" },
    {
      key: "attended",
      label: "Sessions",
      render: (r) => `${r.sessionsAttended} / ${r.sessionsTotal}`,
    },
    {
      key: "amountPaid",
      label: "Orig. Paid",
      render: (r) => fmt(r.amountPaid),
    },
    {
      key: "calculated",
      label: "Calc. Refund",
      render: (r) => (
        <span className="text-gray-500">{fmt(r.calculatedRefundAmount)}</span>
      ),
    },
    {
      key: "actual",
      label: "Actual Refund",
      render: (r) => (
        <span className="font-semibold text-orange-600 dark:text-orange-400">
          {fmt(r.actualRefundAmount)}
        </span>
      ),
    },
    {
      key: "adjustment",
      label: "Adjustment",
      render: (r) =>
        r.adjustmentReason ? (
          <span
            className="text-xs text-gray-500 italic truncate max-w-[160px] block"
            title={r.adjustmentReason}
          >
            {r.adjustmentReason}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "refundDate",
      label: "Refund Date",
      render: (r) => fmtDate(r.refundDate),
    },
    {
      key: "gmail",
      label: "Gmail",
      render: (r) => (
        <GmailButton
          label="Refund"
          onSend={() => notificationsApi.earlyExitRefundGmail(r.id)}
        />
      ),
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      render: (r) => (
        <WaButton
          label="Refund"
          onSend={() => notificationsApi.earlyExitRefundWhatsApp(r.id)}
        />
      ),
    },
  ];

  const resetFilters = (t) => {
    setTab(t);
    setLangFilter("");
    setLevelFilter("");
    setStatusFilter("");
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Payments"
        subtitle="Fully Collected · Outstanding · Overdue · Refunds"
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            Record Payment
          </Button>
        }
      />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Fully Collected"
          value={fmt(totalCollected)}
          color="bg-green-600"
          icon={CheckCircle}
        />
        <StatCard
          title="Outstanding"
          value={fmt(totalOutstanding)}
          color="bg-yellow-500"
          icon={Clock}
        />
        <StatCard
          title="Overdue"
          value={fmt(totalOverdue)}
          color="bg-red-500"
          icon={AlertCircle}
        />
        <StatCard
          title="Refunded"
          value={fmt(totalRefunded)}
          color="bg-orange-500"
          icon={RotateCcw}
        />
      </div>

      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 space-y-3">
          <Tabs
            tabs={[
              { key: "all", label: "All", count: payments.length },
              {
                key: "collected",
                label: "Fully Collected",
                count: collected.length,
              },
              {
                key: "outstanding",
                label: "Outstanding",
                count: outstanding.length,
              },
              { key: "overdue", label: "Overdue", count: overdue.length },
              { key: "refunds", label: "Refunds", count: refundRecords.length },
            ]}
            active={tab}
            onChange={resetFilters}
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              className="input w-32 text-sm"
              value={monthFilter}
              onChange={(e) =>
                setMonthFilter(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            >
              <option value="">All Months</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="input w-24 text-sm"
              value={yearFilter}
              onChange={(e) => setYearFilter(Number(e.target.value))}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="input w-36 text-sm"
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
            >
              <option value="">All Languages</option>
              {languages.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
            <select
              className="input w-28 text-sm"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="">All Levels</option>
              {levels.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
            {!isDebtTab && !isRefundTab && (
              <select
                className="input w-32 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            )}
          </div>
        </div>

        {/* ── Tab content ── */}
        {isDebtTab ? (
          <>
            <div
              className={`mx-4 mt-4 mb-2 rounded-lg border p-4 text-sm ${
                tab === "overdue"
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                  : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
              }`}
            >
              <h3 className="font-semibold mb-2">
                {tab === "overdue"
                  ? "Overdue Determination Rules"
                  : "Outstanding Balance Calculation"}
              </h3>

              <p className="mb-2 text-gray-700 dark:text-gray-300">
                The period start date is determined using the following
                priority:
              </p>

              <ol className="list-decimal ml-5 space-y-1 text-gray-700 dark:text-gray-300">
                <li>
                  Student's <strong>first attended session</strong> (Present and
                  not reverted) within the selected period.
                </li>
                <li>
                  If no attendance exists, the system uses the{" "}
                  <strong>first scheduled session</strong> for that period and
                  group.
                </li>
                <li>
                  If no sessions exist, the system falls back to the{" "}
                  <strong>Group Period creation date</strong>.
                </li>
                <li>
                  If no Group Period exists, the{" "}
                  <strong>Enrollment Date</strong> is used as the final
                  fallback.
                </li>
              </ol>

              <p className="mt-3 text-gray-700 dark:text-gray-300">
                For enrollments with <strong>Pending</strong> status,
                calculation starts from the student's{" "}
                <strong>first attendance date</strong>.
              </p>
            </div>

            <DebtTable
              loading={debtLoading}
              data={filterDebts(tab === "outstanding" ? outstanding : overdue)}
              emptyMsg={
                tab === "outstanding"
                  ? "No outstanding payments."
                  : "No overdue payments."
              }
              onSettle={(row) => setSettleTarget(row)}
            />
          </>
        ) : isRefundTab ? (
          <Table
            loading={refundLoading}
            data={getRefundList()}
            emptyMsg="No refunds found."
            columns={refundColumns}
          />
        ) : (
          <Table
            loading={pmtLoading}
            data={getPaymentList()}
            emptyMsg="No payments found."
            columns={paymentColumns}
          />
        )}
      </div>

      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Record Payment"
      >
        <PaymentForm
          groups={groups}
          methods={methods}
          periodLabels={periodLabels}
          onSubmit={handlePaymentSubmit}
          loading={createMut.isPending}
        />
      </Modal>

      <Modal
        open={!!settleTarget}
        onClose={() => setSettleTarget(null)}
        title="Settle Outstanding Balance"
      >
        <SettleBalanceForm
          debt={settleTarget}
          onSubmit={handleSettleSubmit}
          loading={settleMut.isPending}
        />
      </Modal>
    </div>
  );
}
