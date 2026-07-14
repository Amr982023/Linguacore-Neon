import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../context/authStore";
import {
  getOverviewSummary,
  getStudentSummary,
  getGroupSummaryRich,
  getPaymentSummaryRich,
  getInstructorSummaryRich,
  getExamSummaryRich,
  getWaitingSummaryRich,
  getCashDrawer,
} from "../services/Dashboardservice";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  BookOpen,
  DollarSign,
  Clock,
  UserCheck,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wifi,
  BarChart3,
  Target,
  Percent,
  Receipt,
  Building,
  CalendarRange,
  Wallet,
} from "lucide-react";

const P = [
  "#378ADD",
  "#97C459",
  "#EF9F27",
  "#7F77DD",
  "#D85A30",
  "#D4537E",
  "#1D9E75",
  "#E24B4A",
  "#BA7517",
  "#444441",
];

const fmtEGP = (v, smart = false) => {
  if (v == null) return "—";
  if (!smart) return `${Number(v).toLocaleString()} EGP`;
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M EGP`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K EGP`;
  return `${n.toLocaleString()} EGP`;
};
const fmtNum = (v) => (v != null ? v : "—");
const fmtPct = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const pct = (v, tot) => (tot ? Math.round((v / tot) * 100) : 0);

// ══════════════════════════════════════════════════════════════
// PERIOD SELECTOR + BADGE
// ══════════════════════════════════════════════════════════════
// Payments, Instructors, and Exams support a real backend period filter
// today (DashboardService.ResolvePeriod). Other panes (Overview, Students,
// Groups, Waiting) are always a current-state snapshot — they get a static
// label instead so nobody assumes a selector change affects them too.
const PERIOD_OPTIONS = [
  { key: "month", label: "Last month" },
  { key: "3months", label: "Last 3 months" },
  { key: "year", label: "Last year" },
];

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
            ${
              value === opt.key
                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PeriodBadge({ label }) {
  if (!label) return null;
  return (
    <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-medium">
      <CalendarRange size={12} />
      Showing data for: {label}
    </div>
  );
}

function KPI({ label, value, sub, delta, deltaUp, accent, icon: Icon }) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
        style={{ background: accent }}
      />
      <div className="pl-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          {Icon && <Icon size={13} style={{ color: accent }} />}
          {label}
        </div>
        <div className="text-2xl font-semibold text-gray-900 dark:text-white leading-none">
          {value}
        </div>
        {sub && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            {sub}
          </div>
        )}
        {delta && (
          <div
            className={`flex items-center gap-1 text-xs mt-1 ${deltaUp ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
          >
            {deltaUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{" "}
            {delta}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      {title && (
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 text-sm font-semibold text-gray-800 dark:text-gray-100">
          {Icon && <Icon size={15} className="text-blue-500" />} {title}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function SecTitle({ children }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
      {children}
      <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

function G({ cols, children, mb = true }) {
  const colMap = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  };
  return (
    <div
      className={`grid ${colMap[cols] || "grid-cols-1"} gap-3 ${mb ? "mb-3" : ""}`}
    >
      {children}
    </div>
  );
}

function Lgd({ labels, colors, values }) {
  const tot = (values || []).reduce((a, b) => a + b, 0);
  return (
    <div className="flex flex-wrap gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
      {(labels || []).map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
            style={{ background: colors[i % colors.length] }}
          />
          {l}{" "}
          <strong className="ml-0.5 text-gray-700 dark:text-gray-200">
            {pct(values[i], tot)}%
          </strong>
        </span>
      ))}
    </div>
  );
}

// Detects dark mode reactively
function useDarkMode() {
  const [dark, setDark] = useState(
    () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches ||
      document.documentElement.classList.contains("dark"),
  );
  useState(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () =>
      setDark(
        mq.matches || document.documentElement.classList.contains("dark"),
      );
    mq.addEventListener("change", handler);
    // Also watch class changes on <html> for Tailwind dark mode toggle
    const mo = new MutationObserver(handler);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      mq.removeEventListener("change", handler);
      mo.disconnect();
    };
  });
  return dark;
}

// Returns tooltip props adaptive to current color scheme
function useTipProps(extraProps = {}) {
  const dark = useDarkMode();
  return {
    cursor: false, // kills the background highlight on hover
    contentStyle: {
      background: dark ? "#1f2937" : "#ffffff",
      border: `1px solid ${dark ? "#374151" : "#e5e7eb"}`,
      borderRadius: 8,
      fontSize: 12,
      color: dark ? "#f9fafb" : "#111827",
      boxShadow: dark
        ? "0 4px 12px rgba(0,0,0,0.5)"
        : "0 4px 12px rgba(0,0,0,0.1)",
    },
    labelStyle: {
      color: dark ? "#9ca3af" : "#6b7280",
      marginBottom: 2,
    },
    itemStyle: {
      color: dark ? "#f9fafb" : "#111827",
    },
    ...extraProps,
  };
}

function Donut({ labels, values, colors, height = 180 }) {
  const tip = useTipProps();
  if (!values || values.every((v) => v === 0))
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400 dark:text-gray-500"
        style={{ height }}
      >
        No data
      </div>
    );
  const data = labels.map((name, i) => ({ name, value: values[i] }));
  const tot = values.reduce((a, b) => a + b, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={height * 0.24}
          outerRadius={height * 0.4}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip {...tip} formatter={(v, n) => [`${v} (${pct(v, tot)}%)`, n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function VBar({ labels, values, colors, height = 200 }) {
  const tip = useTipProps();
  const data = labels.map((name, i) => ({ name, value: values[i] }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barSize={32}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#374151"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip {...tip} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="default">
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={
                Array.isArray(colors)
                  ? colors[i % colors.length]
                  : colors || "#378ADD"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// HBar: data must arrive pre-sorted descending (highest first).
// Recharts horizontal bar renders top-to-bottom, so we reverse internally
// only for display so rank #1 appears at the top.
function HBar({ labels, values, colors, height }) {
  const tip = useTipProps();
  // Sort descending before display
  const indices = labels.map((_, i) => i).sort((a, b) => values[b] - values[a]);
  const sortedLabels = indices.map((i) => labels[i]);
  const sortedValues = indices.map((i) => values[i]);
  const sortedColors = Array.isArray(colors)
    ? indices.map((i) => colors[i])
    : labels.map(() => "#378ADD");

  const data = sortedLabels.map((name, i) => ({
    name,
    value: sortedValues[i],
    fill: sortedColors[i],
  }));

  const h = height || Math.max(200, data.length * 46 + 60);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" barSize={20}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#374151"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip {...tip} formatter={(v) => [`${v}%`]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="default">
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function MLine({ labels, series, height = 240 }) {
  const tip = useTipProps({
    formatter: (v, n) => [
      n === "Overdue" ? v : `${Number(v).toLocaleString()} EGP`,
      n,
    ],
  });
  const data = labels.map((month, i) => {
    const row = { month };
    series.forEach((s) => {
      row[s.name] = s.data[i];
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#374151"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          yAxisId="left"
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tip} />
        {series.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color}
            strokeDasharray={s.dash || "0"}
            strokeWidth={2.5}
            dot={{ r: 4, fill: s.color }}
            activeDot={{ r: 5, fill: s.color, stroke: "none" }}
            yAxisId={s.name === "Overdue" ? "right" : "left"}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function FRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700/50 text-sm last:border-0">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function MBar({ label, value, max, color }) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className="w-24 text-gray-500 dark:text-gray-400 flex-shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded h-1.5">
        <div
          className="h-1.5 rounded transition-all"
          style={{
            background: color,
            width: `${Math.round((value / max) * 100)}%`,
          }}
        />
      </div>
      <span className="font-semibold text-gray-800 dark:text-gray-100 text-right min-w-[110px]">
        {Number(value).toLocaleString()} EGP
      </span>
    </div>
  );
}

// RankList: items must arrive pre-sorted descending (rank 1 = index 0).
// Uses plain numbered badges matching the HTML design (no gold/silver/bronze).
function RankList({ items }) {
  return (
    <div>
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 py-2 border-b border-gray-50 dark:border-gray-700/50 text-sm last:border-0"
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {i + 1}
          </div>
          <span className="flex-1 text-gray-800 dark:text-gray-100">
            {it.name}
          </span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {it.value} {it.label}{" "}
            <span className="text-blue-500">({it.pct}%)</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Loading() {
  return (
    <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
      <div className="text-2xl mb-2 animate-pulse">⋯</div>Loading…
    </div>
  );
}

function Hint({ children }) {
  return (
    <div className="text-sm text-gray-400 dark:text-gray-500 px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-dashed border-gray-200 dark:border-gray-600 mb-3">
      ⓘ {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════
function OverviewPane({ branchId }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-overview", branchId],
    queryFn: () => getOverviewSummary(branchId),
    enabled: !!branchId,
  });
  if (isLoading) return <Loading />;
  const f = data?.financial ?? {};
  const s = data?.students ?? {};
  const g = data?.groups ?? {};
  const grpLabels = ["Active", "Completed", "Suspended"];
  const grpVals = [
    g.totalActive || 0,
    g.totalCompleted || 0,
    g.totalSuspended || 0,
  ];
  const dlvVals = [g.totalOnline || 0, g.totalOffline || 0];
  return (
    <>
      <PeriodBadge label="This month" />
      <SecTitle>Key metrics — this month</SecTitle>
      <G cols={4}>
        <KPI
          label="Active students"
          value={fmtNum(s.totalActive)}
          accent="#185FA5"
          icon={Users}
          delta={s.newThisMonth ? `+${s.newThisMonth} new this month` : null}
          deltaUp
        />
        <KPI
          label="Active groups"
          value={fmtNum(g.totalActive)}
          accent="#3B6D11"
          icon={BookOpen}
          sub={`${g.totalOnline || 0} online · ${g.totalOffline || 0} offline`}
        />
        <KPI
          label="Revenue collected"
          value={fmtEGP(f.totalCollected, true)}
          accent="#BA7517"
          icon={DollarSign}
          sub={`Net: ${fmtEGP(f.netRevenue, true)}`}
        />
        <KPI
          label="Waiting list"
          value={fmtNum(s.waitingListCount)}
          accent="#854F0B"
          icon={Clock}
        />
      </G>
      <G cols={2}>
        <Card title="Financial summary" icon={DollarSign}>
          <FRow
            label="Collected"
            value={fmtEGP(f.totalCollected)}
            color="#15803d"
          />
          <FRow
            label="Expected"
            value={fmtEGP(f.totalExpected)}
            color="#374151"
          />
          <FRow
            label="Commissions"
            value={fmtEGP(f.totalCommissions)}
            color="#b45309"
          />
          <FRow
            label="Net revenue"
            value={fmtEGP(f.netRevenue)}
            color="#1d4ed8"
          />
          <FRow
            label="Refunds"
            value={fmtEGP(f.totalRefunds)}
            color="#dc2626"
          />
          {f.byPaymentMethod && Object.keys(f.byPaymentMethod).length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                By payment method
              </div>
              {Object.entries(f.byPaymentMethod).map(([m, a]) => (
                <div key={m} className="flex justify-between text-sm py-1">
                  <span className="text-gray-500 dark:text-gray-400">{m}</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                    {Number(a).toLocaleString()} EGP
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Student breakdown" icon={Users}>
          <FRow label="Active" value={fmtNum(s.totalActive)} color="#15803d" />
          <FRow
            label="Left center"
            value={fmtNum(s.totalInactive)}
            color="#dc2626"
          />
          <FRow
            label="New this month"
            value={fmtNum(s.newThisMonth)}
            color="#1d4ed8"
          />

          <FRow
            label="Scholarships"
            value={fmtNum(s.withScholarship)}
            color="#7c3aed"
          />
          <FRow
            label="Discounts"
            value={fmtNum(s.withDiscount)}
            color="#0f766e"
          />
          <FRow
            label="Waiting"
            value={fmtNum(s.waitingListCount)}
            color="#b45309"
          />
        </Card>
      </G>
      <G cols={2}>
        <Card title="Groups by status" icon={BarChart3}>
          <Lgd
            labels={grpLabels}
            colors={["#97C459", "#378ADD", "#EF9F27"]}
            values={grpVals}
          />
          <Donut
            labels={grpLabels}
            values={grpVals}
            colors={["#97C459", "#378ADD", "#EF9F27"]}
          />
        </Card>
        <Card title="Groups by delivery" icon={Wifi}>
          <Lgd
            labels={["Online", "Offline"]}
            colors={["#378ADD", "#444441"]}
            values={dlvVals}
          />
          <Donut
            labels={["Online", "Offline"]}
            values={dlvVals}
            colors={["#378ADD", "#444441"]}
          />
        </Card>
      </G>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// STUDENTS
// ══════════════════════════════════════════════════════════════
function StudentsPane({ branchId, period, onPeriodChange }) {
  const { data: s, isLoading } = useQuery({
    queryKey: ["dash-students", branchId, period],
    queryFn: () => getStudentSummary(branchId, period),
    enabled: !!branchId,
  });
  if (isLoading) return <Loading />;
  const labels = [
    "Active",
    "Inactive",
    "New",
    "Scholar",
    "Discount",
    "Waiting",
  ];
  const vals = [
    s?.totalActive || 0,
    s?.totalInactive || 0,
    s?.newThisMonth || 0,
    s?.withScholarship || 0,
    s?.withDiscount || 0,
    s?.waitingListCount || 0,
  ];
  const colors = [
    "#378ADD",
    "#E24B4A",
    "#97C459",
    "#EF9F27",
    "#7F77DD",
    "#1D9E75",
    "#BA7517",
  ];
  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <PeriodBadge label="All time (snapshot) · early exit rate: selected period" />
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>
      <SecTitle>Student statistics</SecTitle>
      <G cols={4}>
        <KPI
          label="Total active"
          value={fmtNum(s?.totalActive)}
          accent="#185FA5"
          icon={Users}
        />
        <KPI
          label="Left center"
          value={fmtNum(s?.totalInactive)}
          accent="#dc2626"
          icon={XCircle}
        />
        <KPI
          label="New this month"
          value={fmtNum(s?.newThisMonth)}
          accent="#15803d"
          icon={TrendingUp}
        />
        <KPI
          label="Scholarships"
          value={fmtNum(s?.withScholarship)}
          accent="#7c3aed"
          icon={Award}
        />
      </G>
      <G cols={3}>
        <KPI
          label="Discounts"
          value={fmtNum(s?.withDiscount)}
          accent="#0f766e"
          icon={Target}
        />
        <KPI
          label="Waiting list"
          value={fmtNum(s?.waitingListCount)}
          accent="#b45309"
          icon={Clock}
        />
        <KPI
          label="Early exit rate"
          value={fmtPct(s?.earlyExitRate)}
          accent="#dc2626"
          icon={TrendingDown}
        />
      </G>
      <Card title="Student composition" icon={BarChart3}>
        <VBar labels={labels} values={vals} colors={colors} height={210} />
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// GROUPS
// ══════════════════════════════════════════════════════════════
function GroupsPane({ branchId }) {
  const { data: g, isLoading } = useQuery({
    queryKey: ["dash-groups-rich", branchId],
    queryFn: () => getGroupSummaryRich(branchId),
    enabled: !!branchId,
  });
  if (isLoading) return <Loading />;
  const byInstructor = g?.byInstructor || [];
  const byLevel = g?.byLevel || [];
  const byType = g?.byType || [];
  const byCategory = g?.byCategory || [];
  const sl = (arr) => arr.map((x) => x.name);
  const sd = (arr) => arr.map((x) => x.count);
  return (
    <>
      <PeriodBadge label={g?.periodLabel || "All time"} />
      <SecTitle>Group statistics</SecTitle>
      <G cols={5}>
        <KPI
          label="Active"
          value={fmtNum(g?.totalActive)}
          accent="#15803d"
          icon={BookOpen}
        />
        <KPI
          label="Completed"
          value={fmtNum(g?.totalCompleted)}
          accent="#185FA5"
          icon={CheckCircle}
        />
        <KPI
          label="Suspended"
          value={fmtNum(g?.totalSuspended)}
          accent="#b45309"
          icon={AlertCircle}
        />
        <KPI
          label="Online"
          value={fmtNum(g?.totalOnline)}
          accent="#0f766e"
          icon={Wifi}
        />
        <KPI
          label="Offline"
          value={fmtNum(g?.totalOffline)}
          accent="#4b5563"
          icon={Building}
        />
      </G>
      <G cols={2}>
        <Card title="By instructor" icon={UserCheck}>
          {byInstructor.length > 0 ? (
            <>
              <Lgd
                labels={sl(byInstructor)}
                colors={P}
                values={sd(byInstructor)}
              />
              <Donut
                labels={sl(byInstructor)}
                values={sd(byInstructor)}
                colors={P}
              />
            </>
          ) : (
            <Hint>
              Instructor chart appears once groups have instructors assigned.
            </Hint>
          )}
        </Card>
        <Card title="By level" icon={BarChart3}>
          {byLevel.length > 0 ? (
            <>
              <Lgd labels={sl(byLevel)} colors={P} values={sd(byLevel)} />
              <Donut labels={sl(byLevel)} values={sd(byLevel)} colors={P} />
            </>
          ) : (
            <Hint>No level data available.</Hint>
          )}
        </Card>
      </G>
      <G cols={2}>
        <Card title="By type" icon={ClipboardList}>
          {byType.length > 0 ? (
            <>
              <Lgd labels={sl(byType)} colors={P} values={sd(byType)} />
              <Donut labels={sl(byType)} values={sd(byType)} colors={P} />
            </>
          ) : (
            <Hint>
              Type chart appears once groups are created with type assigned.
            </Hint>
          )}
        </Card>
        <Card title="By category" icon={Target}>
          {byCategory.length > 0 ? (
            <>
              <Lgd labels={sl(byCategory)} colors={P} values={sd(byCategory)} />
              <Donut
                labels={sl(byCategory)}
                values={sd(byCategory)}
                colors={P}
              />
            </>
          ) : (
            <Hint>No category data.</Hint>
          )}
        </Card>
      </G>
      <Card title="Groups by status" icon={BarChart3}>
        <VBar
          labels={["Active", "Completed", "Suspended"]}
          values={[
            g?.totalActive || 0,
            g?.totalCompleted || 0,
            g?.totalSuspended || 0,
          ]}
          colors={["#97C459", "#378ADD", "#EF9F27"]}
          height={210}
        />
      </Card>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════
function PaymentsPane({ branchId, period, onPeriodChange }) {
  const { data: f, isLoading } = useQuery({
    queryKey: ["dash-payments-rich", branchId, period],
    queryFn: () => getPaymentSummaryRich(branchId, period),
    enabled: !!branchId,
  });

  // NEW — all-time, cumulative live cash position. Does NOT reset with the
  // period selector above; it accumulates since inception, folding in
  // income, refunds, center deductions, earned commission (even if not yet
  // swept into a closing), instructor bonuses, and salary deductions.
  const { data: drawer, isLoading: drawerLoading } = useQuery({
    queryKey: ["dash-cash-drawer", branchId],
    queryFn: () => getCashDrawer(branchId),
    enabled: !!branchId,
  });

  if (isLoading) return <Loading />;
  const outstanding = Math.max(
    0,
    (f?.totalExpected || 0) - (f?.totalCollected || 0),
  );
  const methods = f?.byPaymentMethod ? Object.entries(f.byPaymentMethod) : [];
  const maxMethod = methods.length ? Math.max(...methods.map(([, v]) => v)) : 1;
  const methodColors = ["#1D9E75", "#378ADD", "#7F77DD", "#EF9F27", "#D85A30"];

  const byGroup = f?.byGroup || [];
  const byClosingType = f?.byClosingType || []; // NEW: { name, amount }[]
  const byMonthYTD = f?.byMonthYTD || []; // NEW: { month, amount }[]  (YTD donuts)
  const byYear = f?.byYear || []; // NEW: { year, amount }[]
  const monthlyTrend = f?.monthlyTrend || [];

  const trendMonths = monthlyTrend.map((x) => x.month);
  const trendSeries = [
    {
      name: "Collected",
      color: "#15803d",
      dash: "0",
      data: monthlyTrend.map((x) => x.collected),
    },
    {
      name: "Outstanding",
      color: "#b45309",
      dash: "5 3",
      data: monthlyTrend.map((x) => x.outstanding),
    },
    {
      name: "Refunds",
      color: "#dc2626",
      dash: "2 2",
      data: monthlyTrend.map((x) => x.refunds),
    },
    {
      name: "Overdue",
      color: "#7c3aed",
      dash: "8 4",
      data: monthlyTrend.map((x) => x.overdueCount),
    },
  ];
  const stVals = [f?.totalCollected || 0, outstanding, f?.totalRefunds || 0];
  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <PeriodBadge label={f?.periodLabel || "This month"} />
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>
      <SecTitle>Payment statistics</SecTitle>
      <G cols={4}>
        <KPI
          label="Total centre revenue"
          value={fmtEGP(f?.netRevenue, true)}
          accent="#15803d"
          icon={DollarSign}
          sub="Net after commissions"
        />
        <KPI
          label="Collected"
          value={fmtEGP(f?.totalCollected, true)}
          accent="#15803d"
          icon={Receipt}
        />
        <KPI
          label="Outstanding"
          value={fmtEGP(outstanding, true)}
          accent="#b45309"
          icon={AlertCircle}
        />
        <KPI
          label="Refunds"
          value={fmtEGP(f?.totalRefunds, true)}
          accent="#dc2626"
          icon={TrendingDown}
        />
      </G>
      <G cols={4}>
        <KPI
          label="Overdue count"
          value={fmtNum(f?.overdueCount)}
          accent="#dc2626"
          icon={XCircle}
        />
        <KPI
          label="Commissions paid"
          value={fmtEGP(f?.totalCommissions, true)}
          accent="#b45309"
          icon={Percent}
        />
        <KPI
          label="Deductions"
          value={fmtEGP(f?.totalDeductions, true)}
          accent="#dc2626"
          icon={Wallet}
          sub="This period"
        />
        <KPI
          label="Collection rate"
          value={
            f?.totalExpected
              ? `${Math.round(((f?.totalCollected || 0) / f.totalExpected) * 100)}%`
              : "—"
          }
          accent="#7c3aed"
          icon={Target}
        />
      </G>

      {/* NEW — live, all-time cash drawer. Not affected by the period selector. */}
      {!drawerLoading && drawer && (
        <Card title="Cash drawer — live, all time" icon={Wallet}>
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border border-green-200 dark:border-green-800/40">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Actual cash in the center right now
            </div>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {fmtEGP(drawer.cashInDrawer, true)}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              As of {new Date(drawer.asOf).toLocaleString()} · cumulative since
              inception, not reset monthly
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total income (all time)
              </div>
              <div className="font-semibold text-green-600 dark:text-green-400">
                {fmtEGP(drawer.totalIncomeAllTime, true)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Refunds (all time)
              </div>
              <div className="font-semibold text-red-500">
                −{fmtEGP(drawer.totalRefundsAllTime, true)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Center deductions (all time)
              </div>
              <div className="font-semibold text-red-500">
                −{fmtEGP(drawer.totalCenterDeductionsAllTime, true)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Commission earned (all time)
              </div>
              <div className="font-semibold text-red-500">
                −{fmtEGP(drawer.totalCommissionEarnedAllTime, true)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Instructor bonuses
              </div>
              <div className="font-semibold text-red-500">
                −{fmtEGP(drawer.totalInstructorBonusesAllTime, true)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Salary deductions (retained)
              </div>
              <div className="font-semibold text-green-600 dark:text-green-400">
                +{fmtEGP(drawer.totalInstructorSalaryDeductionsAllTime, true)}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle size={13} />
              Pending commission not yet swept into a closing
            </div>
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {fmtEGP(drawer.pendingCommissionNotYetClosed, true)}
            </div>
          </div>
          {drawer.outstandingPaymentsCount > 0 && (
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {drawer.outstandingPaymentsCount} payment(s) with sessions still
              incomplete.
            </div>
          )}
        </Card>
      )}

      {trendMonths.length > 1 && (
        <Card
          title="Monthly trend — collected, outstanding, refunds & overdue"
          icon={TrendingUp}
        >
          <div className="flex gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400 mb-3">
            {trendSeries.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5">
                <span
                  className="w-5 h-0.5 rounded inline-block"
                  style={{ background: s.color }}
                />
                {s.name}
              </span>
            ))}
          </div>
          <MLine labels={trendMonths} series={trendSeries} height={240} />
        </Card>
      )}

      {/* Row 1: Revenue per group + Revenue per closing */}
      <G cols={2}>
        <Card title="Revenue per group" icon={BookOpen}>
          {byGroup.length > 0 ? (
            <>
              <Lgd
                labels={byGroup.map((x) => x.name)}
                colors={P}
                values={byGroup.map((x) => x.amount)}
              />
              <Donut
                labels={byGroup.map((x) => x.name)}
                values={byGroup.map((x) => x.amount)}
                colors={P}
              />
            </>
          ) : (
            <Hint>No payments recorded in this period yet.</Hint>
          )}
        </Card>
        <Card title="Revenue per closing" icon={Receipt}>
          {byClosingType.length > 0 ? (
            <>
              <Lgd
                labels={byClosingType.map((x) => x.name)}
                colors={["#378ADD", "#EF9F27", "#D85A30"]}
                values={byClosingType.map((x) => x.amount)}
              />
              <Donut
                labels={byClosingType.map((x) => x.name)}
                values={byClosingType.map((x) => x.amount)}
                colors={["#378ADD", "#EF9F27", "#D85A30"]}
              />
            </>
          ) : (
            <Hint>No closing data available.</Hint>
          )}
        </Card>
      </G>

      {/* Row 2: Revenue per month YTD + Revenue per year */}
      <G cols={2}>
        <Card title="Revenue per month (YTD)" icon={BarChart3}>
          {byMonthYTD.length > 0 ? (
            <>
              <Lgd
                labels={byMonthYTD.map((x) => x.month)}
                colors={[
                  "#185FA5",
                  "#378ADD",
                  "#85B7EB",
                  "#B5D4F4",
                  "#97C459",
                  "#EF9F27",
                ]}
                values={byMonthYTD.map((x) => x.amount)}
              />
              <Donut
                labels={byMonthYTD.map((x) => x.month)}
                values={byMonthYTD.map((x) => x.amount)}
                colors={[
                  "#185FA5",
                  "#378ADD",
                  "#85B7EB",
                  "#B5D4F4",
                  "#97C459",
                  "#EF9F27",
                ]}
              />
            </>
          ) : (
            <Hint>No YTD monthly data available.</Hint>
          )}
        </Card>
        <Card title="Revenue per year" icon={TrendingUp}>
          {byYear.length > 0 ? (
            <>
              <Lgd
                labels={byYear.map((x) => String(x.year))}
                colors={["#185FA5", "#97C459", "#EF9F27"]}
                values={byYear.map((x) => x.amount)}
              />
              <Donut
                labels={byYear.map((x) => String(x.year))}
                values={byYear.map((x) => x.amount)}
                colors={["#185FA5", "#97C459", "#EF9F27"]}
              />
            </>
          ) : (
            <Hint>No yearly revenue data available.</Hint>
          )}
        </Card>
      </G>

      {/* Row 3: Payment method split + Collected vs outstanding vs refund */}
      <G cols={2}>
        {methods.length > 0 && (
          <Card title="Payment method split" icon={Receipt}>
            <Lgd
              labels={methods.map(([m]) => m)}
              colors={methodColors}
              values={methods.map(([, v]) => v)}
            />
            <Donut
              labels={methods.map(([m]) => m)}
              values={methods.map(([, v]) => v)}
              colors={methodColors}
            />
          </Card>
        )}
        <Card title="Collected vs outstanding vs refund" icon={BarChart3}>
          <Lgd
            labels={["Collected", "Outstanding", "Refunds"]}
            colors={["#15803d", "#b45309", "#dc2626"]}
            values={stVals}
          />
          <Donut
            labels={["Collected", "Outstanding", "Refunds"]}
            values={stVals}
            colors={["#15803d", "#b45309", "#dc2626"]}
          />
        </Card>
      </G>

      {/* Payment method collected amounts bar */}
      {methods.length > 0 && (
        <Card title="Payment method — collected amounts" icon={DollarSign}>
          {methods.map(([m, a], i) => (
            <MBar
              key={m}
              label={m}
              value={a}
              max={maxMethod}
              color={methodColors[i % methodColors.length]}
            />
          ))}
        </Card>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// INSTRUCTORS
// ══════════════════════════════════════════════════════════════
// Backed by DashboardService.GetInstructorSummaryRichAsync, which resolves
// the same "month" | "3months" | "year" period as Payments/Exams. Returns:
//   instructorMonthly: [{ name, sessions, commission }]  — sorted by sessions desc
//   instructorClosing: [{ name, sessions }]               — sessions swept into a closing
function InstructorsPane({ branchId, period, onPeriodChange }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dash-instructors-rich", branchId, period],
    queryFn: () => getInstructorSummaryRich(branchId, period),
    enabled: !!branchId,
  });
  if (isLoading) return <Loading />;

  const monthly = data?.instructorMonthly || [];
  const closing = data?.instructorClosing || [];

  // instructorMonthly already arrives sorted by sessions desc from the
  // backend — re-sort a local copy for the commission ranking.
  const bySessions = monthly;
  const byCommission = [...monthly].sort((a, b) => b.commission - a.commission);
  const closingRank = [...closing].sort((a, b) => b.sessions - a.sessions);

  const totSessions = bySessions.reduce((a, x) => a + x.sessions, 0);
  const totCommission = byCommission.reduce((a, x) => a + x.commission, 0);
  const totClosingSessions = closingRank.reduce((a, x) => a + x.sessions, 0);

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <PeriodBadge label={data?.periodLabel || "This month"} />
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>
      <SecTitle>Instructor statistics</SecTitle>
      <G cols={2}>
        <KPI
          label="Total commissions"
          value={fmtEGP(data?.totalCommissions, true)}
          accent="#b45309"
          icon={Percent}
        />
        <KPI
          label="Net revenue"
          value={fmtEGP(data?.netRevenue, true)}
          accent="#15803d"
          icon={DollarSign}
        />
      </G>

      {bySessions.length === 0 ? (
        <Hint>No sessions or commission activity yet for this period.</Hint>
      ) : (
        <>
          <G cols={2}>
            <Card title="Ranking — sessions taught" icon={UserCheck}>
              <RankList
                items={bySessions.map((x) => ({
                  name: x.name,
                  value: x.sessions,
                  label: "sessions",
                  pct: pct(x.sessions, totSessions),
                }))}
              />
            </Card>
            <Card title="Ranking — commission earned" icon={DollarSign}>
              <RankList
                items={byCommission.map((x) => ({
                  name: x.name,
                  value: Number(x.commission).toLocaleString(),
                  label: "EGP",
                  pct: pct(x.commission, totCommission),
                }))}
              />
            </Card>
          </G>

          <Card title="Sessions taught — comparison" icon={BarChart3}>
            <VBar
              labels={bySessions.map((x) => x.name)}
              values={bySessions.map((x) => x.sessions)}
              colors={P}
              height={Math.max(200, bySessions.length * 12)}
            />
          </Card>

          {closingRank.length > 0 && (
            <Card
              title="Sessions fully distributed (closed)"
              icon={CheckCircle}
            >
              <HBar
                labels={closingRank.map((x) => x.name)}
                values={closingRank.map((x) =>
                  Math.round((x.sessions / (totClosingSessions || 1)) * 100),
                )}
                colors={closingRank.map(() => "#378ADD")}
              />
            </Card>
          )}
        </>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// EXAMS
// ══════════════════════════════════════════════════════════════
function ExamsPane({ branchId, period, onPeriodChange }) {
  const { data: g, isLoading } = useQuery({
    queryKey: ["dash-exams-rich", branchId, period],
    queryFn: () => getExamSummaryRich(branchId, period),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
  if (isLoading) return <Loading />;
  const examTypeData = g?.examsByType || [];
  const examResultData = g?.examsByResult || [];

  // Sort group ranking descending by passed count
  const groupRanking = [...(g?.groupExamRank || [])].sort(
    (a, b) => b.passed - a.passed,
  );

  // Sort student pass rate descending
  const studentRank = [...(g?.studentPassRate || [])].sort(
    (a, b) => b.rate - a.rate,
  );

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <PeriodBadge label={g?.periodLabel || "This month"} />
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>
      <SecTitle>Exam statistics</SecTitle>
      <G cols={4}>
        <KPI
          label="Exams in period"
          value={fmtNum(g?.examsThisMonth)}
          accent="#7c3aed"
          icon={ClipboardList}
        />
        <KPI
          label="Avg pass rate"
          value={
            g?.avgPassRate != null ? `${Math.round(g.avgPassRate * 100)}%` : "—"
          }
          accent="#15803d"
          icon={CheckCircle}
        />
        <KPI
          label="Failed finals"
          value={fmtNum(g?.failedFinals)}
          accent="#dc2626"
          icon={XCircle}
        />
        <KPI
          label="Certificates issued"
          value={fmtNum(g?.certificatesIssued)}
          accent="#b45309"
          icon={Award}
        />
      </G>
      {examTypeData.length === 0 ? (
        <Hint>
          No exam results yet for this period. Charts appear once exams are
          created and results recorded.
        </Hint>
      ) : (
        <>
          <G cols={2}>
            <Card title="Final vs regular exams" icon={ClipboardList}>
              <Lgd
                labels={examTypeData.map((x) => x.name)}
                colors={["#7c3aed", "#378ADD"]}
                values={examTypeData.map((x) => x.count)}
              />
              <Donut
                labels={examTypeData.map((x) => x.name)}
                values={examTypeData.map((x) => x.count)}
                colors={["#7c3aed", "#378ADD"]}
              />
            </Card>
            <Card title="Passed vs failed" icon={CheckCircle}>
              <Lgd
                labels={examResultData.map((x) => x.name)}
                colors={["#15803d", "#dc2626"]}
                values={examResultData.map((x) => x.count)}
              />
              <Donut
                labels={examResultData.map((x) => x.name)}
                values={examResultData.map((x) => x.count)}
                colors={["#15803d", "#dc2626"]}
              />
            </Card>
          </G>
          {groupRanking.length > 0 && (
            <G cols={2}>
              <Card title="Groups ranking — passed exams" icon={Award}>
                <Lgd
                  labels={groupRanking.map((x) => x.name)}
                  colors={P}
                  values={groupRanking.map((x) => x.passed)}
                />
                <Donut
                  labels={groupRanking.map((x) => x.name)}
                  values={groupRanking.map((x) => x.passed)}
                  colors={P}
                />
              </Card>
              <Card title="Group pass rate ranking" icon={ClipboardList}>
                {(() => {
                  const tot = groupRanking.reduce((a, x) => a + x.passed, 0);
                  return (
                    <RankList
                      items={groupRanking.map((x) => ({
                        name: x.name,
                        value: x.passed,
                        label: "passed",
                        pct: pct(x.passed, tot),
                      }))}
                    />
                  );
                })()}
              </Card>
            </G>
          )}
          {studentRank.length > 0 && (
            <Card title="Student ranking — average pass rate" icon={TrendingUp}>
              <HBar
                labels={studentRank.map((x) => x.name)}
                values={studentRank.map((x) => Math.round(x.rate * 100))}
                colors={studentRank.map((x) =>
                  x.rate >= 0.9
                    ? "#15803d"
                    : x.rate >= 0.8
                      ? "#378ADD"
                      : "#EF9F27",
                )}
              />
            </Card>
          )}
        </>
      )}
    </>
  );
}

// Dedicated bar chart matching the HTML's Daily waiting list distribution exactly:
// uniform #85B7EB bars, thin barSize, autoSkip x-axis, integer-only y-axis.
function WaitingDayBar({ data }) {
  const tip = useTipProps();
  const chartData = data.map((x) => ({ name: `D${x.days}`, value: x.count }));
  const maxVal = Math.max(...data.map((x) => x.count), 2);
  // Build integer ticks for y-axis (0, 1, 2, …, maxVal)
  const yTicks = Array.from({ length: maxVal + 1 }, (_, i) => i);
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} barSize={18} barCategoryGap="15%">
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(128,128,128,0.15)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          // Show ~10 ticks max across however many days exist
          tickCount={Math.min(10, chartData.length)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          ticks={yTicks}
          allowDecimals={false}
          domain={[0, maxVal]}
        />
        <Tooltip {...tip} />
        <Bar
          dataKey="value"
          fill="#85B7EB"
          radius={[2, 2, 0, 0]}
          cursor="default"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ══════════════════════════════════════════════════════════════
// WAITING
// ══════════════════════════════════════════════════════════════
function WaitingPane({ branchId }) {
  const { data: s, isLoading } = useQuery({
    queryKey: ["dash-waiting-rich", branchId],
    queryFn: () => getWaitingSummaryRich(branchId),
    enabled: !!branchId,
  });
  if (isLoading) return <Loading />;
  const rawDays = s?.waitingByDays || [];
  const buckets = s?.waitingBuckets || [];
  const bucketColors = ["#15803d", "#378ADD", "#EF9F27", "#D85A30", "#dc2626"];
  return (
    <>
      <PeriodBadge label={s?.periodLabel || "Current"} />
      <SecTitle>Waiting list statistics</SecTitle>
      <G cols={4}>
        <KPI
          label="Currently waiting"
          value={fmtNum(s?.waitingListCount)}
          accent="#b45309"
          icon={Clock}
        />
        <KPI
          label="Enrolled this month"
          value={fmtNum(s?.enrolledFromWaiting)}
          accent="#15803d"
          icon={CheckCircle}
        />
        <KPI
          label="Cancelled"
          value={fmtNum(s?.waitingCancelled)}
          accent="#dc2626"
          icon={XCircle}
        />
        <KPI
          label="Avg wait (days)"
          value={fmtNum(s?.avgWaitDays)}
          accent="#185FA5"
          icon={BarChart3}
        />
      </G>
      {buckets.length > 0 || rawDays.length > 0 ? (
        <G cols={2}>
          {buckets.length > 0 && (
            <Card title="Records by days waiting (buckets)" icon={Clock}>
              <Lgd
                labels={buckets.map((x) => x.label)}
                colors={bucketColors}
                values={buckets.map((x) => x.count)}
              />
              <Donut
                labels={buckets.map((x) => x.label)}
                values={buckets.map((x) => x.count)}
                colors={bucketColors}
              />
            </Card>
          )}
          {rawDays.length > 0 && (
            <Card title="Daily waiting list — distribution" icon={BarChart3}>
              <WaitingDayBar data={rawDays} />
            </Card>
          )}
        </G>
      ) : (
        <Hint>
          Waiting-list charts appear once students are added to the list.
        </Hint>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "students", label: "Students", icon: Users },
  { key: "groups", label: "Groups", icon: BookOpen },
  { key: "payments", label: "Payments", icon: DollarSign },
  { key: "instructors", label: "Instructors", icon: UserCheck },
  { key: "exams", label: "Exams", icon: ClipboardList },
  { key: "waiting", label: "Waiting List", icon: Clock },
];

export default function Dashboard() {
  const { branchId } = useAuthStore();
  const [tab, setTab] = useState("overview");
  // Shared period selection for Payments / Instructors / Exams — the only
  // panes whose backend actually filters by date range today. Each pane
  // keeps its own query key so switching tabs doesn't lose other tabs' data.
  const [period, setPeriod] = useState("month");

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={20} className="text-blue-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Overview of branch performance and statistics
        </p>
      </div>
      <div className="card mb-6">
        <div className="flex items-center overflow-x-auto border-b border-gray-100 dark:border-gray-700 px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors outline-none flex-shrink-0
                ${tab === t.key ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "overview" && <OverviewPane branchId={branchId} />}
          {tab === "students" && (
            <StudentsPane
              branchId={branchId}
              period={period}
              onPeriodChange={setPeriod}
            />
          )}
          {tab === "groups" && <GroupsPane branchId={branchId} />}
          {tab === "payments" && (
            <PaymentsPane
              branchId={branchId}
              period={period}
              onPeriodChange={setPeriod}
            />
          )}
          {tab === "instructors" && (
            <InstructorsPane
              branchId={branchId}
              period={period}
              onPeriodChange={setPeriod}
            />
          )}
          {tab === "exams" && (
            <ExamsPane
              branchId={branchId}
              period={period}
              onPeriodChange={setPeriod}
            />
          )}
          {tab === "waiting" && <WaitingPane branchId={branchId} />}
        </div>
      </div>
    </div>
  );
}
