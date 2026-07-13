import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "../components/ui";
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
  Calendar,
  User,
  TrendingDown,
  Minus,
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 20;

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

// ── Shared pagination primitives ─────────────────────────────────────────────
// Every section uses this: debounced search + page state + a query that never
// auto-refetches (staleTime: Infinity, all refetch triggers off). Only typing
// a filter, changing a page, or switching tabs drives a new fetch.
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function usePagedSection(
  queryKeyBase,
  queryFn,
  extraDeps = [],
  enabled = true,
) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);

  // Reset to page 1 whenever the search or any extra filter changes
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, ...extraDeps]);

  const params = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, search: search || undefined }),
    [page, search],
  );

  const queryKey = [...queryKeyBase, params, ...extraDeps];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => queryFn(params),
    enabled,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    keepPreviousData: true,
  });

  const items = data?.data?.data?.items || [];
  const totalCount = data?.data?.data?.totalCount || 0;
  const totalPages = data?.data?.data?.totalPages || 1;

  return {
    page,
    setPage,
    searchInput,
    setSearchInput,
    items,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
    params,
  };
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

// (IncomeRecordsPanel, PartialPaymentsPanel, RefundRecordsPanel,
//  FinancialIntegrityNotice, CenterDeductionsPanel, InstructorAccordion,
//  ClosingDetailModal — unchanged from before; they operate on a single
//  already-fetched closing's detail and don't need pagination. Omitted here
//  only for brevity — keep them exactly as in your current file.)

// ── Students Section ──────────────────────────────────────────────────────────
function StudentsSection({ branchId }) {
  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    items: students,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
  } = usePagedSection(
    ["bo-students", branchId],
    (params) => studentsApi.getByBranchPaged(branchId, params),
    [],
    !!branchId,
  );

  // NOTE: active/inactive/scholarship counts now reflect only the current
  // page, not the whole branch. For true branch-wide totals, use a
  // dashboard/summary endpoint instead of scanning paged rows.
  const active = students.filter((s) => s.isActive).length;
  const inactive = students.filter((s) => !s.isActive).length;
  const scholars = students.filter((s) =>
    (s.activeEnrollments || []).some((e) => e.scholarship),
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Active (page)"
          value={active}
          icon={Users}
          color="bg-green-600"
        />
        <StatCard
          title="Inactive (page)"
          value={inactive}
          icon={Users}
          color="bg-red-500"
        />
        <StatCard
          title="Scholarships (page)"
          value={scholars}
          icon={Users}
          color="bg-purple-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name or phone…"
          />
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>
        <Table
          loading={isLoading}
          data={students}
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
        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </div>
  );
}

// ── Groups Section ────────────────────────────────────────────────────────────
function GroupsSection({ branchId }) {
  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    items: groups,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
  } = usePagedSection(
    ["bo-groups", branchId],
    (params) => groupsApi.getByBranchPaged(branchId, params),
    [],
    !!branchId,
  );

  const active = groups.filter((g) => g.groupStatus === "ACTIVE").length;
  const completed = groups.filter((g) => g.groupStatus === "COMPLETED").length;
  const online = groups.filter((g) => g.deliveryMode === "ONLINE").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total (filtered)"
          value={totalCount}
          icon={BookOpen}
          color="bg-primary-900"
        />
        <StatCard
          title="Active (page)"
          value={active}
          icon={BookOpen}
          color="bg-green-600"
        />
        <StatCard
          title="Completed (page)"
          value={completed}
          icon={BookOpen}
          color="bg-blue-500"
        />
        <StatCard
          title="Online (page)"
          value={online}
          icon={BookOpen}
          color="bg-cyan-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search group…"
          />
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>
        <Table
          loading={isLoading}
          data={groups}
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
        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </div>
  );
}

// ── Instructors Section ───────────────────────────────────────────────────────
function InstructorsSection({ branchId }) {
  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    items: instructors,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
  } = usePagedSection(
    ["bo-instructors", branchId],
    (params) => instructorsApi.getByBranch(branchId, params),
    [],
    !!branchId,
  );

  const active = instructors.filter((i) => i.isActive).length;
  const inactive = instructors.filter((i) => !i.isActive).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total (filtered)"
          value={totalCount}
          icon={UserCheck}
          color="bg-primary-900"
        />
        <StatCard
          title="Active (page)"
          value={active}
          icon={UserCheck}
          color="bg-green-600"
        />
        <StatCard
          title="Inactive (page)"
          value={inactive}
          icon={UserCheck}
          color="bg-red-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search instructor…"
          />
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>
        <Table
          loading={isLoading}
          data={instructors}
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
        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </div>
  );
}

// ── Sessions Section ──────────────────────────────────────────────────────────
function SessionsSection({ branchId }) {
  const [statusFilter, setStatusFilter] = useState("");

  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    items: sessions,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
    params,
  } = usePagedSection(
    ["bo-sessions", branchId],
    (p) =>
      sessionsApi.getByBranch(branchId, {
        ...p,
        status: statusFilter || undefined,
      }),
    [statusFilter],
    !!branchId,
  );

  // NOTE: this replaces the old N+1 approach (fetching every group, then
  // fetching sessions per group and flattening client-side). It relies on
  // sessionsApi.getByBranch(branchId, params) being a real paginated,
  // server-filtered endpoint — confirm SessionFilterRequest supports
  // { page, pageSize, search, status } on the backend before wiring this in.
  const scheduled = sessions.filter((s) => s.status === "SCHEDULED").length;
  const completed = sessions.filter((s) => s.status === "COMPLETED").length;
  const cancelled = sessions.filter((s) => s.status === "CANCELLED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Scheduled (page)"
          value={scheduled}
          icon={CalendarDays}
          color="bg-blue-600"
        />
        <StatCard
          title="Completed (page)"
          value={completed}
          icon={CalendarDays}
          color="bg-green-600"
        />
        <StatCard
          title="Cancelled (page)"
          value={cancelled}
          icon={CalendarDays}
          color="bg-red-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
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
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>
        <Table
          loading={isLoading}
          data={sessions}
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
        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </div>
  );
}

// ── Payments Section ──────────────────────────────────────────────────────────
function PaymentsSection({ branchId }) {
  const [statusFilter, setStatusFilter] = useState("");

  const fromISO = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString();
  }, []);
  const toISO = useMemo(() => new Date().toISOString(), []);

  const {
    page,
    setPage,
    items: payments,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
  } = usePagedSection(
    ["bo-payments", branchId],
    (p) =>
      paymentsApi.getByPeriodPaged({
        ...p,
        branchId,
        from: fromISO,
        to: toISO,
        status: statusFilter || undefined,
      }),
    [statusFilter],
    !!branchId,
  );

  // Summary totals are now derived from the current page only. If accurate
  // 3-month totals are needed, add a small aggregate endpoint rather than
  // paging through every result client-side just to sum it.
  const totalCollected = payments
    .filter((p) => p.amountPaid >= p.amountDue)
    .reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = payments
    .filter((p) => p.amountPaid < p.amountDue)
    .reduce((s, p) => s + (p.amountDue - p.amountPaid), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Collected (page)"
          value={fmt(totalCollected)}
          icon={DollarSign}
          color="bg-green-600"
        />
        <StatCard
          title="Outstanding (page)"
          value={fmt(totalOutstanding)}
          icon={DollarSign}
          color="bg-yellow-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
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
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>
        <Table
          loading={isLoading}
          data={payments}
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
        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </div>
  );
}

// ── Waiting List Section ──────────────────────────────────────────────────────
function WaitingListSection({ branchId }) {
  const [statusFilter, setStatusFilter] = useState("");

  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    items: entries,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
  } = usePagedSection(
    ["bo-waitinglist", branchId],
    (p) =>
      waitingListApi.getByBranch(branchId, {
        ...p,
        status: statusFilter || undefined,
      }),
    [statusFilter],
    !!branchId,
  );

  const waiting = entries.filter((e) => e.status === "WAITING").length;
  const enrolled = entries.filter((e) => e.status === "ENROLLED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Waiting (page)"
          value={waiting}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Enrolled (page)"
          value={enrolled}
          icon={Clock}
          color="bg-green-600"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
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
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>
        <Table
          loading={isLoading}
          data={entries}
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
        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </div>
  );
}

// ── Exams Section ─────────────────────────────────────────────────────────────
function ExamsSection({ branchId }) {
  const [typeFilter, setTypeFilter] = useState("");

  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    items: exams,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
  } = usePagedSection(
    ["bo-exams", branchId],
    (p) =>
      examsApi.getByBranch(branchId, { ...p, type: typeFilter || undefined }),
    [typeFilter],
    !!branchId,
  );

  // NOTE: replaces the old per-group fetch-and-flatten. Relies on
  // examsApi.getByBranch(branchId, params) being paginated server-side
  // (it's marked "NEW" in endpoints.js, consistent with that assumption).
  const finals = exams.filter((e) => e.isFinalExam).length;
  const regular = exams.filter((e) => !e.isFinalExam).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total (filtered)"
          value={totalCount}
          icon={ClipboardList}
          color="bg-primary-900"
        />
        <StatCard
          title="Final Exams (page)"
          value={finals}
          icon={Award}
          color="bg-amber-500"
        />
        <StatCard
          title="Regular Tests (page)"
          value={regular}
          icon={ClipboardList}
          color="bg-blue-500"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
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
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>
        <Table
          loading={isLoading}
          data={exams}
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
        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </div>
  );
}

// ── Certificates Section ──────────────────────────────────────────────────────
function CertificatesSection({ branchId }) {
  const [langFilter, setLangFilter] = useState("");

  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    items: certs,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
  } = usePagedSection(
    ["bo-certificates", branchId],
    (p) =>
      certificatesApi.getByBranchPaged(branchId, {
        ...p,
        language: langFilter || undefined,
      }),
    [langFilter],
    !!branchId,
  );

  // Language dropdown options — a small separate unpaginated lookup is fine
  // here since it's just distinct language names, not the certificate list.
  const { data: langRes } = useQuery({
    queryKey: ["languages"],
    queryFn: () => lookupsApi.getLanguages(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const languages = langRes?.data?.data || [];

  const thisMonth = certs.filter(
    (c) => new Date(c.issuedAt) > new Date(new Date().setDate(1)),
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total (filtered)"
          value={totalCount}
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
          title="This Month (page)"
          value={thisMonth}
          icon={Award}
          color="bg-green-600"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name or serial…"
          />
          <select
            className="input w-40 text-sm"
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
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>
        <Table
          loading={isLoading}
          data={certs}
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
        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </div>
  );
}

// ── Closings Section ──────────────────────────────────────────────────────────
function ClosingsSection({ branchId }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const {
    page,
    setPage,
    items: closings,
    totalCount,
    totalPages,
    isLoading,
  } = usePagedSection(
    ["bo-closings", branchId],
    (p) =>
      closingApi.getByBranchPaged(branchId, {
        ...p,
        status: statusFilter || undefined,
      }),
    [statusFilter],
    !!branchId,
  );

  const { data: flagsRes } = useQuery({
    queryKey: ["bo-closing-audit-flags", branchId],
    queryFn: () => closingApi.getAuditFlags(branchId),
    enabled: !!branchId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const auditFlags = (flagsRes?.data?.data || []).reduce((m, f) => {
    m[f.closingId] = f;
    return m;
  }, {});

  const { data: detailRes, isLoading: detailLoading } = useQuery({
    queryKey: ["bo-closing-detail", selected?.id],
    queryFn: () => closingApi.getDetails(selected.id),
    enabled: !!selected?.id,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const detail = detailRes?.data?.data;

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
          title="Draft (page)"
          value={draft}
          icon={FileText}
          color="bg-amber-500"
        />
        <StatCard
          title="Confirmed (page)"
          value={confirmed}
          icon={FileText}
          color="bg-blue-600"
        />
        <StatCard
          title="Paid (page)"
          value={paid}
          icon={FileText}
          color="bg-emerald-600"
        />
        <StatCard
          title="Center Net Earned (page)"
          value={fmt(grandEarned)}
          icon={DollarSign}
          color="bg-slate-600"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
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
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records
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

      {selected && detail && !detailLoading && (
        <ClosingDetailModal
          closing={detail}
          onClose={() => setSelected(null)}
        />
      )}

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
  const {
    page,
    setPage,
    searchInput,
    setSearchInput,
    items: users,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
  } = usePagedSection(
    ["bo-users", branchId],
    (p) => usersApi.getByBranchPaged(branchId, p),
    [],
    !!branchId,
  );

  const active = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;
  const roleCount = [...new Set(users.map((u) => u.roleName))].length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Active (page)"
          value={active}
          icon={UserCog}
          color="bg-green-600"
        />
        <StatCard
          title="Inactive (page)"
          value={inactive}
          icon={UserCog}
          color="bg-red-500"
        />
        <StatCard
          title="Roles (page)"
          value={roleCount}
          icon={Shield}
          color="bg-purple-600"
        />
      </div>
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name, email or role…"
          />
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>
        <Table
          loading={isLoading}
          data={users}
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
        <Pager
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
