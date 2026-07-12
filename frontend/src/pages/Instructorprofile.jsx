import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../context/authStore";
import {
  instructorsApi,
  groupsApi,
  sessionsApi,
  examsApi,
  paymentsApi,
} from "../services/endpoints";
import {
  UserCheck,
  BookOpen,
  CalendarDays,
  ClipboardList,
  DollarSign,
  ChevronDown,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  CalendarRange,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

const instructorName = (i) =>
  i?.person
    ? `${i.person.firstName ?? ""} ${i.person.lastName ?? ""}`.trim()
    : (i?.fullName ?? i?.name ?? "—");

const instructorInitial = (i) =>
  (i?.person?.firstName ?? i?.fullName ?? i?.name ?? "?")[0]?.toUpperCase() ??
  "?";

const instructorPhone = (i) => i?.person?.phone ?? i?.phone ?? null;
const instructorEmail = (i) => i?.person?.email ?? i?.email ?? null;

const fmt = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-EG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const STATUS_STYLE = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/40",
  Completed: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/40",
  CANCELLED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  Cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  INACTIVE: "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/20",
  Inactive: "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/20",
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const statusBadge = (status) => {
  if (!status)
    return <span className="text-gray-300 dark:text-white/20">—</span>;
  const cls =
    STATUS_STYLE[status] ??
    "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-white/30";
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}
    >
      {status}
    </span>
  );
};

const TABS = [
  { key: "groups", label: "Groups", icon: BookOpen },
  { key: "sessions", label: "Sessions", icon: CalendarDays },
  { key: "exams", label: "Exams", icon: ClipboardList },
  { key: "commission", label: "Commission", icon: DollarSign },
];

// unwrap { data: [...] } envelope or plain array
const unwrap = (r) => (Array.isArray(r) ? r : (r?.data ?? []));

// ── shared UI ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent }}
      >
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30">
          {label}
        </p>
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-300 dark:text-white/20 gap-3">
      <AlertCircle size={32} strokeWidth={1.5} />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function TableShell({ heads, children, isEmpty, emptyMsg, loading }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#111]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-white/5">
            {heads.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/25 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2
            size={20}
            className="animate-spin text-gray-300 dark:text-white/20"
          />
        </div>
      )}
      {!loading && isEmpty && <EmptyState message={emptyMsg} />}
    </div>
  );
}

// plain table cell — bold variant for primary columns
function Td({ children, bold, center }) {
  return (
    <td
      className={`px-4 py-3 ${
        bold
          ? "font-semibold text-gray-800 dark:text-white/80"
          : "text-gray-500 dark:text-white/40"
      } ${center ? "text-center" : ""}`}
    >
      {children ?? "—"}
    </td>
  );
}

function Loader() {
  return (
    <div className="flex justify-center py-16">
      <Loader2
        size={22}
        className="animate-spin text-gray-300 dark:text-white/20"
      />
    </div>
  );
}

// ── Groups tab ─────────────────────────────────────────────────────────────
// GroupResponse: Id, Name, LanguageName, LevelCode, GroupCategory,
//   GroupType, DeliveryMode, GroupStatus, EnrolledCount, InstructorId
function GroupsTab({ instructorId, branchId }) {
  const { data, isLoading } = useQuery({
    queryKey: ["groups-branch", branchId],
    queryFn: () => groupsApi.getByBranch(branchId).then((r) => r.data),
    enabled: !!branchId,
  });

  const groups = useMemo(
    () => unwrap(data).filter((g) => g.instructorId === instructorId),
    [data, instructorId],
  );

  if (isLoading) return <Loader />;

  return (
    <TableShell
      heads={[
        "Name",
        "Language",
        "Level",
        "Category",
        "Type",
        "Mode",
        "Status",
        "Enrolled",
      ]}
      isEmpty={!groups.length}
      emptyMsg="No groups assigned to this instructor"
    >
      {groups.map((g) => (
        <tr
          key={g.id}
          className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <Td bold>{g.name}</Td>
          <Td>{g.languageName}</Td>
          <Td>{g.levelCode}</Td>
          <Td>{g.groupCategory}</Td>
          <Td>{g.groupType}</Td>
          <Td>{g.deliveryMode}</Td>
          <td className="px-4 py-3">{statusBadge(g.groupStatus)}</td>
          <Td>{g.enrolledCount ?? 0}</Td>
        </tr>
      ))}
    </TableShell>
  );
}

// ── Sessions tab ───────────────────────────────────────────────────────────
// SessionResponse: Id, GroupId, GroupName, InstructorId, HallName,
//   ZoomAccountName, SessionNumber, PeriodLabel, ScheduledDate,
//   ActualDate, Topic, Status, CancelledReason
function SessionsTab({ instructorId, branchId }) {
  // We need groups both to filter by instructor AND as a name lookup fallback
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups-branch", branchId],
    queryFn: () => groupsApi.getByBranch(branchId).then((r) => r.data),
    enabled: !!branchId,
  });

  const instructorGroups = useMemo(
    () => unwrap(groupsData).filter((g) => g.instructorId === instructorId),
    [groupsData, instructorId],
  );

  // Build a quick id→name map so we can fill in groupName when it's blank
  const groupNameById = useMemo(() => {
    const map = {};
    unwrap(groupsData).forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  }, [groupsData]);

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: [
      "instructor-sessions",
      instructorId,
      instructorGroups.map((g) => g.id).join(","),
    ],
    queryFn: async () => {
      const results = await Promise.all(
        instructorGroups.map((g) =>
          sessionsApi.getByGroup(g.id).then((r) => unwrap(r.data)),
        ),
      );
      return results.flat();
    },
    enabled: instructorGroups.length > 0,
  });

  const sessions = useMemo(
    () =>
      [...(sessionsData ?? [])].sort(
        (a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate),
      ),
    [sessionsData],
  );

  const loading = groupsLoading || sessionsLoading;

  return (
    <TableShell
      heads={[
        "#",
        "Date",
        "Time",
        "Group",
        "Period",
        "Hall / Zoom",
        "Topic",
        "Status",
      ]}
      isEmpty={!loading && !sessions.length}
      emptyMsg="No sessions found for this instructor"
      loading={loading}
    >
      {sessions.map((s) => {
        // GroupName comes from SessionResponse; fall back to our map if empty
        const grpName =
          s.groupName && s.groupName.trim()
            ? s.groupName
            : (groupNameById[s.groupId] ?? "—");

        return (
          <tr
            key={s.id}
            className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          >
            <Td>{s.sessionNumber}</Td>
            <Td>{fmtDate(s.scheduledDate)}</Td>
            <Td>{fmtTime(s.scheduledDate)}</Td>
            <Td bold>{grpName}</Td>
            {/* PeriodLabel is a plain string on SessionResponse */}
            <Td>{s.periodLabel}</Td>
            {/* HallName and ZoomAccountName are both nullable; show whichever is set */}
            <td className="px-4 py-3 text-gray-500 dark:text-white/40">
              {s.hallName ? (
                s.hallName
              ) : s.zoomAccountName ? (
                s.zoomAccountName
              ) : (
                <span className="text-gray-300 dark:text-white/20">—</span>
              )}
            </td>
            <Td>{s.topic}</Td>
            <td className="px-4 py-3">{statusBadge(s.status)}</td>
          </tr>
        );
      })}
    </TableShell>
  );
}

// ── Exams tab ──────────────────────────────────────────────────────────────
// ExamResponse: Id, GroupId, GroupName, LanguageName, LevelCode,
//   IsFinalExam, Title, TotalMarks, PassPercentage,
//   ExamDate, DurationMins, IsCustom, CreatedAt, ModifiedAt
function ExamsTab({ instructorId, branchId }) {
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups-branch", branchId],
    queryFn: () => groupsApi.getByBranch(branchId).then((r) => r.data),
    enabled: !!branchId,
  });

  const instructorGroups = useMemo(
    () => unwrap(groupsData).filter((g) => g.instructorId === instructorId),
    [groupsData, instructorId],
  );

  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: [
      "instructor-exams",
      instructorId,
      instructorGroups.map((g) => g.id).join(","),
    ],
    queryFn: async () => {
      const results = await Promise.all(
        instructorGroups.map((g) =>
          examsApi.getByGroup(g.id).then((r) => unwrap(r.data)),
        ),
      );
      return results.flat();
    },
    enabled: instructorGroups.length > 0,
  });

  const exams = examsData ?? [];
  const loading = groupsLoading || examsLoading;

  return (
    <TableShell
      heads={[
        "Title",
        "Group",
        "Language",
        "Level",
        "Date",
        "Duration",
        "Total Marks",
        "Pass %",
        "Final",
        "Custom",
      ]}
      isEmpty={!loading && !exams.length}
      emptyMsg="No exams found for this instructor"
      loading={loading}
    >
      {exams.map((e) => (
        <tr
          key={e.id}
          className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <Td bold>{e.title}</Td>
          <Td>{e.groupName}</Td>
          <Td>{e.languageName}</Td>
          <Td>{e.levelCode}</Td>
          <Td>{fmtDate(e.examDate)}</Td>
          <Td>{e.durationMins != null ? `${e.durationMins} min` : null}</Td>
          <Td>{e.totalMarks != null ? e.totalMarks : null}</Td>
          <Td>{e.passPercentage != null ? `${e.passPercentage}%` : null}</Td>
          <td className="px-4 py-3">
            {e.isFinalExam ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <XCircle size={16} className="text-gray-300 dark:text-white/20" />
            )}
          </td>
          <td className="px-4 py-3">
            {e.isCustom ? (
              <CheckCircle2 size={16} className="text-blue-500" />
            ) : (
              <XCircle size={16} className="text-gray-300 dark:text-white/20" />
            )}
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

// ── Commission tab ─────────────────────────────────────────────────────────
// CommissionLedgerResponse: Id, InstructorName, GroupName, PaymentStrategy,
//   CommissionPct, GrossPayment, CommissionAmount, CentreAmount,
//   PeriodLabelName, IsAdjustment, CreatedAt
// NOTE: CommissionPct is already a plain percentage (e.g. 30 = 30%)
function CommissionTab({ instructorId }) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["commission", instructorId, from, to],
    queryFn: () =>
      paymentsApi
        .getCommission(
          instructorId,
          new Date(from).toISOString(),
          new Date(to + "T23:59:59").toISOString(),
        )
        .then((r) => unwrap(r.data)),
    enabled: !!instructorId,
  });

  const entries = data ?? [];
  const total = entries.reduce((s, e) => s + (e.commissionAmount ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Date range */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-2">
          <CalendarRange
            size={14}
            className="text-gray-400 dark:text-white/30"
          />
          <label className="text-[11px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-sm text-gray-700 dark:text-white/70 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-2">
          <CalendarRange
            size={14}
            className="text-gray-400 dark:text-white/30"
          />
          <label className="text-[11px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-sm text-gray-700 dark:text-white/70 outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#00d4ff]/10 to-[#0055cc]/10 border border-[#0055cc]/20 rounded-xl px-4 py-2">
          <TrendingUp
            size={14}
            className="text-[#0055cc] dark:text-[#00d4ff]"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0055cc] dark:text-[#00d4ff]">
            Total: {fmt(total)}
          </span>
        </div>
      </div>

      <TableShell
        heads={[
          "Date",
          "Group",
          "Period",
          "Strategy",
          "Gross",
          "Commission %",
          "Commission",
          "Centre",
          "Adjustment",
        ]}
        isEmpty={!isLoading && !entries.length}
        emptyMsg="No commission records in this period"
        loading={isLoading}
      >
        {entries.map((e, i) => (
          <tr
            key={e.id ?? i}
            className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          >
            <Td>{fmtDate(e.createdAt)}</Td>
            <Td bold>{e.groupName}</Td>
            {/* CommissionLedger stores period as a plain string field called PeriodLabel */}
            <Td>{e.periodLabel ?? e.periodLabelName}</Td>
            <Td>{e.paymentStrategy}</Td>
            <Td>{fmt(e.grossPayment)}</Td>
            {/* commissionPct is already a plain % value e.g. 30 → "30%" */}
            <Td>{e.commissionPct != null ? `${e.commissionPct}%` : "—"}</Td>
            <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white/80">
              {fmt(e.commissionAmount)}
            </td>
            <Td>{fmt(e.centreAmount)}</Td>
            <td className="px-4 py-3">
              {e.isAdjustment ? (
                <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Adjustment
                </span>
              ) : (
                <span className="text-gray-300 dark:text-white/20">—</span>
              )}
            </td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function InstructorProfile() {
  const { user } = useAuthStore();
  const branchId = user?.branchId;

  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState("groups");

  const { data: instructorsData, isLoading: instructorsLoading } = useQuery({
    queryKey: ["instructors-branch", branchId],
    queryFn: () => instructorsApi.getByBranch(branchId).then((r) => r.data),
    enabled: !!branchId,
  });

  const instructors = unwrap(instructorsData);
  const selected = instructors.find((i) => i.id === selectedId);

  const { data: groupsData } = useQuery({
    queryKey: ["groups-branch", branchId],
    queryFn: () => groupsApi.getByBranch(branchId).then((r) => r.data),
    enabled: !!branchId && !!selectedId,
  });

  const instructorGroups = useMemo(
    () => unwrap(groupsData).filter((g) => g.instructorId === selectedId),
    [groupsData, selectedId],
  );

  const activeGroups = instructorGroups.filter(
    (g) => (g.groupStatus ?? "").toLowerCase() === "active",
  ).length;

  const languagesLabel = selected?.languages?.length
    ? selected.languages.join(", ")
    : "—";

  return (
    <div className="min-h-full bg-[#f0f0f0] dark:bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #00d4ff, #0055cc)" }}
        >
          <UserCheck size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">
            Instructor Profile
          </h1>
          <p className="text-[12px] text-gray-400 dark:text-white/30 mt-0.5">
            View groups, sessions, exams and commission for any instructor in
            your branch
          </p>
        </div>
      </div>

      {/* Dropdown */}
      <div className="relative w-full max-w-sm">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <UserCheck size={15} className="text-gray-400 dark:text-white/25" />
        </div>
        <select
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setActiveTab("groups");
          }}
          className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5
                     rounded-xl pl-10 pr-10 py-3 text-sm font-medium
                     text-gray-800 dark:text-white/80
                     focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/30
                     shadow-sm transition-all"
        >
          <option value="">
            {instructorsLoading
              ? "Loading instructors…"
              : "— Select an instructor —"}
          </option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {instructorName(i)}
              {i.languages?.length ? ` · ${i.languages.join(", ")}` : ""}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <ChevronDown size={14} className="text-gray-400 dark:text-white/25" />
        </div>
      </div>

      {/* Content */}
      {selectedId && selected && (
        <>
          {/* Instructor card */}
          <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-2xl p-5 flex items-center gap-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #0055cc)",
              }}
            >
              {instructorInitial(selected)}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {instructorName(selected)}
              </h2>
              <div className="flex items-center gap-4 flex-wrap">
                {selected.languages?.length > 0 && (
                  <span className="flex items-center gap-1 text-[12px] text-gray-400 dark:text-white/30">
                    <Globe size={12} />
                    <span className="text-gray-600 dark:text-white/50 font-medium">
                      {languagesLabel}
                    </span>
                  </span>
                )}
                {instructorPhone(selected) && (
                  <span className="flex items-center gap-1 text-[12px] text-gray-400 dark:text-white/30">
                    <Phone size={12} />
                    <span className="text-gray-600 dark:text-white/50 font-medium">
                      {instructorPhone(selected)}
                    </span>
                  </span>
                )}
                {instructorEmail(selected) && (
                  <span className="flex items-center gap-1 text-[12px] text-gray-400 dark:text-white/30 truncate">
                    <Mail size={12} />
                    <span className="text-gray-600 dark:text-white/50 font-medium truncate">
                      {instructorEmail(selected)}
                    </span>
                  </span>
                )}
                {selected.branchName && (
                  <span className="text-[12px] text-gray-400 dark:text-white/30">
                    Branch:{" "}
                    <span className="text-gray-600 dark:text-white/50 font-medium">
                      {selected.branchName}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              {statusBadge(selected.isActive === false ? "Inactive" : "Active")}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={BookOpen}
              label="Total Groups"
              value={instructorGroups.length}
              accent="linear-gradient(135deg,#00d4ff,#0055cc)"
            />
            <StatCard
              icon={Users}
              label="Active Groups"
              value={activeGroups}
              accent="linear-gradient(135deg,#10b981,#059669)"
            />
            <StatCard
              icon={Globe}
              label="Languages"
              value={languagesLabel}
              accent="linear-gradient(135deg,#f59e0b,#d97706)"
            />
            <StatCard
              icon={Clock}
              label="Joined"
              value={fmtDate(selected.createdAt)}
              accent="linear-gradient(135deg,#8b5cf6,#6d28d9)"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-2xl p-1.5 w-fit">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150
                  ${
                    activeTab === key
                      ? "bg-gray-900 dark:bg-white/10 text-white dark:text-white shadow-sm"
                      : "text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pb-6">
            {activeTab === "groups" && (
              <GroupsTab instructorId={selectedId} branchId={branchId} />
            )}
            {activeTab === "sessions" && (
              <SessionsTab instructorId={selectedId} branchId={branchId} />
            )}
            {activeTab === "exams" && (
              <ExamsTab instructorId={selectedId} branchId={branchId} />
            )}
            {activeTab === "commission" && (
              <CommissionTab instructorId={selectedId} />
            )}
          </div>
        </>
      )}

      {/* Nothing selected */}
      {!selectedId && !instructorsLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <UserCheck
            size={48}
            strokeWidth={1}
            className="text-gray-200 dark:text-white/10"
          />
          <p className="text-sm font-medium text-gray-400 dark:text-white/20">
            Select an instructor above to view their profile
          </p>
        </div>
      )}
    </div>
  );
}
