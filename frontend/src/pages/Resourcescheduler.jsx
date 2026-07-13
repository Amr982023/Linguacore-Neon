import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../context/authStore";
import { sessionsApi, lookupsApi } from "../services/endpoints";
import {
  DoorOpen,
  Video,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfDay(d) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function fmtDate(d) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDuration(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// HOUR_START / HOUR_END define the visible timeline window
const HOUR_START = 7;
const HOUR_END = 22;
const TOTAL_HOURS = HOUR_END - HOUR_START;

// ── Occupancy logic ────────────────────────────────────────────────────────

/**
 * For a given resource (hall or zoom), given its sessions on the selected day,
 * compute: isOccupiedNow, currentSession, nextSession, freeUntil / freeFrom
 */
function computeStatus(sessions, now) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate),
  );

  // Each session we treat as 1 hour long (actual duration not stored)
  const SESSION_DURATION_MS = 60 * 60 * 1000;

  const active = sorted.find((s) => {
    const start = new Date(s.scheduledDate);
    const end = new Date(start.getTime() + SESSION_DURATION_MS);
    return now >= start && now < end && s.status !== "CANCELLED";
  });

  if (active) {
    const end = new Date(
      new Date(active.scheduledDate).getTime() + SESSION_DURATION_MS,
    );
    const remaining = end - now;
    const next = sorted.find(
      (s) => new Date(s.scheduledDate) >= end && s.status !== "CANCELLED",
    );
    return {
      isOccupied: true,
      currentSession: active,
      occupiedUntil: end,
      remainingMs: remaining,
      nextSession: next || null,
      freeGapMs: next ? new Date(next.scheduledDate) - end : null,
    };
  }

  // Not occupied now — find next session
  const next = sorted.find(
    (s) => new Date(s.scheduledDate) > now && s.status !== "CANCELLED",
  );
  const lastEnded = (() => {
    const prev = [...sorted]
      .reverse()
      .find(
        (s) =>
          new Date(s.scheduledDate).getTime() + SESSION_DURATION_MS <= now &&
          s.status !== "CANCELLED",
      );
    if (!prev) return null;
    return new Date(
      new Date(prev.scheduledDate).getTime() + SESSION_DURATION_MS,
    );
  })();

  return {
    isOccupied: false,
    currentSession: null,
    occupiedUntil: null,
    remainingMs: null,
    nextSession: next || null,
    freeGapMs: next ? new Date(next.scheduledDate) - now : null,
    freeSinceMs: lastEnded ? now - lastEnded : null,
  };
}

// ── Timeline bar ───────────────────────────────────────────────────────────

function TimelineBar({ sessions, dayStart, dayEnd, now, isToday }) {
  const SESSION_DURATION_MS = 60 * 60 * 1000;
  const dayMs = dayEnd - dayStart;

  const blocks = sessions
    .filter((s) => s.status !== "CANCELLED")
    .map((s) => {
      const start = new Date(s.scheduledDate);
      const end = new Date(start.getTime() + SESSION_DURATION_MS);
      const left = Math.max(0, ((start - dayStart) / dayMs) * 100);
      const right = Math.min(100, ((end - dayStart) / dayMs) * 100);
      const width = right - left;
      if (width <= 0) return null;

      const isActive = isToday && now >= start && now < end;
      const isPast = isToday && end <= now;

      return { s, left, width, isActive, isPast };
    })
    .filter(Boolean);

  // Current time marker
  const nowPct =
    isToday && now >= dayStart && now <= dayEnd
      ? ((now - dayStart) / dayMs) * 100
      : null;

  return (
    <div className="relative h-7 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 select-none">
      {/* Hour grid lines */}
      {Array.from({ length: TOTAL_HOURS - 1 }, (_, i) => i + 1).map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-white/10"
          style={{ left: `${(h / TOTAL_HOURS) * 100}%` }}
        />
      ))}

      {/* Session blocks */}
      {blocks.map(({ s, left, width, isActive, isPast }, i) => (
        <div
          key={i}
          className={`absolute top-1 bottom-1 rounded-md text-[9px] font-semibold
            flex items-center px-1 overflow-hidden whitespace-nowrap truncate
            transition-all duration-300
            ${
              isActive
                ? "bg-gradient-to-r from-[#00d4ff] to-[#0055cc] text-white shadow-md shadow-cyan-500/30"
                : isPast
                  ? "bg-gray-300 dark:bg-white/15 text-gray-500 dark:text-white/40"
                  : "bg-[#0055cc]/25 dark:bg-[#00d4ff]/20 text-[#0055cc] dark:text-[#00d4ff]"
            }`}
          style={{ left: `${left}%`, width: `${width}%` }}
          title={`${s.groupName || "Group"} — ${fmtTime(s.scheduledDate)} (${s.status})`}
        >
          {width > 5 ? s.groupName || "Session" : ""}
        </div>
      ))}

      {/* Now marker */}
      {nowPct !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${nowPct}%` }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 -translate-x-0.5 -translate-y-0.5 absolute top-0" />
        </div>
      )}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status.isOccupied) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
        bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Occupied
      </span>
    );
  }
  if (status.nextSession) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
        bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      >
        <CheckCircle2 size={11} />
        Free
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
      bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    >
      <CheckCircle2 size={11} />
      Free all day
    </span>
  );
}

// ── Resource card ──────────────────────────────────────────────────────────

function ResourceCard({
  name,
  subtitle,
  icon: Icon,
  sessions,
  isToday,
  dayStart,
  dayEnd,
  now,
}) {
  const status = useMemo(
    () => (isToday ? computeStatus(sessions, now) : null),
    [sessions, isToday, now],
  );

  const todaySessions = sessions.filter((s) => s.status !== "CANCELLED");

  return (
    <div
      className={`rounded-2xl border transition-all duration-300
        ${
          status?.isOccupied
            ? "border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5"
            : "border-gray-100 dark:border-white/8 bg-white dark:bg-[#111111]"
        }
        hover:shadow-md dark:hover:shadow-black/30`}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
              ${
                status?.isOccupied
                  ? "bg-red-100 dark:bg-red-500/20 text-red-500"
                  : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-white/50"
              }`}
          >
            <Icon size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">
              {name}
            </p>
            {subtitle && (
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {isToday && status && <StatusBadge status={status} />}
        {!isToday && (
          <span className="text-[11px] text-gray-400 dark:text-white/30 font-medium">
            {todaySessions.length} session
            {todaySessions.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Live info (today only) */}
      {isToday && status && (
        <div className="px-4 pb-3">
          {status.isOccupied ? (
            <div className="flex flex-wrap gap-3 text-[12px]">
              <span className="text-gray-500 dark:text-white/40">
                Free in{" "}
                <span className="font-semibold text-red-500">
                  {fmtDuration(status.remainingMs)}
                </span>
              </span>
              {status.nextSession && (
                <span className="text-gray-500 dark:text-white/40">
                  · Next:{" "}
                  <span className="font-semibold text-gray-700 dark:text-white/70">
                    {fmtTime(status.nextSession.scheduledDate)}
                  </span>
                  {status.freeGapMs !== null && (
                    <span className="text-gray-400 dark:text-white/25">
                      {" "}
                      ({fmtDuration(status.freeGapMs)} gap)
                    </span>
                  )}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 text-[12px]">
              {status.nextSession ? (
                <span className="text-gray-500 dark:text-white/40">
                  Next session at{" "}
                  <span className="font-semibold text-gray-700 dark:text-white/70">
                    {fmtTime(status.nextSession.scheduledDate)}
                  </span>
                  {status.freeGapMs !== null && (
                    <span className="text-gray-400 dark:text-white/25">
                      {" "}
                      — free for {fmtDuration(status.freeGapMs)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-gray-400 dark:text-white/30">
                  No more sessions today
                </span>
              )}
              {status.freeSinceMs !== null && (
                <span className="text-gray-400 dark:text-white/30">
                  · Free for {fmtDuration(status.freeSinceMs)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="px-4 pb-3">
        <TimelineBar
          sessions={sessions}
          dayStart={dayStart}
          dayEnd={dayEnd}
          now={now}
          isToday={isToday}
        />
        {/* Hour labels */}
        <div className="flex justify-between mt-1 px-0.5">
          {[HOUR_START, 9, 12, 15, 18, HOUR_END].map((h) => (
            <span
              key={h}
              className="text-[9px] text-gray-300 dark:text-white/20 font-medium"
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>
      </div>

      {/* Session list */}
      {todaySessions.length > 0 && (
        <div className="border-t border-gray-100 dark:border-white/5 px-4 py-2.5 space-y-1.5">
          {todaySessions.map((s, i) => {
            const start = new Date(s.scheduledDate);
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            const isNowActive = isToday && now >= start && now < end;
            const isPast = isToday && end <= now;
            return (
              <div
                key={i}
                className={`flex items-center justify-between text-[11px] rounded-lg px-2 py-1
                  ${isNowActive ? "bg-gradient-to-r from-[#00d4ff]/10 to-[#0055cc]/10" : ""}
                `}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isNowActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse flex-shrink-0" />
                  )}
                  <span
                    className={`font-medium truncate
                      ${
                        isNowActive
                          ? "text-[#0055cc] dark:text-[#00d4ff]"
                          : isPast
                            ? "text-gray-300 dark:text-white/20"
                            : "text-gray-600 dark:text-white/60"
                      }`}
                  >
                    {s.groupName || "Group"}
                  </span>
                </div>
                <span
                  className={`flex-shrink-0 ml-2 font-mono
                    ${isPast ? "text-gray-300 dark:text-white/20" : "text-gray-400 dark:text-white/30"}`}
                >
                  {fmtTime(s.scheduledDate)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {todaySessions.length === 0 && (
        <div className="border-t border-gray-100 dark:border-white/5 px-4 py-3">
          <p className="text-[11px] text-gray-300 dark:text-white/20 text-center">
            No sessions scheduled
          </p>
        </div>
      )}
    </div>
  );
}

// ── Summary strip ──────────────────────────────────────────────────────────

function SummaryStrip({ halls, zooms, sessions, now, isToday }) {
  const SESSION_DURATION_MS = 60 * 60 * 1000;

  const countOccupied = (resources, type) =>
    resources.filter((r) => {
      const resSessions = sessions.filter(
        (s) =>
          (type === "hall" ? s.hallId === r.id : s.zoomAccountId === r.id) &&
          s.status !== "CANCELLED",
      );
      const status = isToday ? computeStatus(resSessions, now) : null;
      return status?.isOccupied;
    }).length;

  const hallsOccupied = isToday ? countOccupied(halls, "hall") : 0;
  const zoomsOccupied = isToday ? countOccupied(zooms, "zoom") : 0;

  const todaySessions = sessions.filter((s) => s.status !== "CANCELLED").length;
  const nowSessions = isToday
    ? sessions.filter((s) => {
        const start = new Date(s.scheduledDate);
        const end = new Date(start.getTime() + SESSION_DURATION_MS);
        return now >= start && now < end && s.status !== "CANCELLED";
      }).length
    : 0;

  const stats = [
    {
      label: "Halls occupied",
      value: isToday ? `${hallsOccupied} / ${halls.length}` : "—",
      accent: hallsOccupied > 0,
    },
    {
      label: "Zoom in use",
      value: isToday ? `${zoomsOccupied} / ${zooms.length}` : "—",
      accent: zoomsOccupied > 0,
    },
    { label: "Sessions today", value: todaySessions },
    {
      label: "Live now",
      value: isToday ? nowSessions : "—",
      accent: nowSessions > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map(({ label, value, accent }) => (
        <div
          key={label}
          className="rounded-xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5
            px-4 py-3 flex flex-col gap-0.5"
        >
          <span
            className={`text-xl font-bold tabular-nums
              ${accent ? "text-[#0055cc] dark:text-[#00d4ff]" : "text-gray-800 dark:text-white"}`}
          >
            {value}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-white/30 font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ResourceScheduler() {
  const { branchId } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState("all"); // "all" | "halls" | "zooms"

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const dayStart = useMemo(() => {
    const d = startOfDay(selectedDate);
    d.setHours(HOUR_START, 0, 0, 0);
    return d;
  }, [selectedDate]);

  const dayEnd = useMemo(() => {
    const d = startOfDay(selectedDate);
    d.setHours(HOUR_END, 0, 0, 0);
    return d;
  }, [selectedDate]);

  const isToday =
    startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime();

  // Fetch halls & zooms
  const { data: halls = [] } = useQuery({
    queryKey: ["halls", branchId],
    queryFn: () => lookupsApi.getHalls(branchId),
    select: (r) => r.data?.data || [],
    enabled: !!branchId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const { data: zooms = [] } = useQuery({
    queryKey: ["zooms", branchId],
    queryFn: () => lookupsApi.getZoomAccounts(branchId),
    select: (r) => r.data?.data || [],
    enabled: !!branchId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Fetch sessions for the selected day
  const dayParam = startOfDay(selectedDate).toISOString();
  const dayEndParam = endOfDay(selectedDate).toISOString();

  const {
    data: sessions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["sessions-by-branch-day", branchId, dayParam],
    queryFn: () =>
      sessionsApi.getByBranch(branchId, {
        from: dayParam,
        to: dayEndParam,
        pageSize: 200,
        page: 1,
      }),
    select: (r) => r.data?.data?.items || [],
    enabled: !!branchId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  function sessionsFor(type, resourceId) {
    return sessions.filter((s) =>
      type === "hall"
        ? s.hallId === resourceId
        : s.zoomAccountId === resourceId,
    );
  }

  const prevDay = () => setSelectedDate((d) => addDays(d, -1));
  const nextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToday = () => setSelectedDate(new Date());

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
            Resource Scheduler
          </h1>
          <p className="text-sm text-gray-400 dark:text-white/30 mt-0.5">
            Live occupancy for halls &amp; Zoom accounts
          </p>
        </div>

        {/* Date nav */}
        <div className="flex items-center gap-2">
          {isToday && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
              bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400
              text-[11px] font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          )}
          <button
            onClick={prevDay}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5
              text-gray-500 dark:text-white/40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg
            bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5
            text-sm font-semibold text-gray-700 dark:text-white min-w-[140px] justify-center"
          >
            <Calendar size={13} className="text-gray-400 dark:text-white/30" />
            {fmtDate(selectedDate)}
          </div>
          <button
            onClick={nextDay}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5
              text-gray-500 dark:text-white/40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5
                text-gray-600 dark:text-white/50 text-[12px] font-medium
                hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              Today
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5
              text-gray-400 dark:text-white/30 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <SummaryStrip
        halls={halls}
        zooms={zooms}
        sessions={sessions}
        now={now}
        isToday={isToday}
      />

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl bg-gray-100 dark:bg-white/5 w-fit">
        {[
          { id: "all", label: "All Resources" },
          { id: "halls", label: `Halls (${halls.length})`, icon: DoorOpen },
          { id: "zooms", label: `Zoom (${zooms.length})`, icon: Wifi },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all
              ${
                tab === id
                  ? "bg-white dark:bg-[#111111] text-gray-800 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Halls section ── */}
      {(tab === "all" || tab === "halls") && halls.length > 0 && (
        <div className="mb-8">
          {tab === "all" && (
            <div className="flex items-center gap-2 mb-3">
              <DoorOpen
                size={14}
                className="text-gray-400 dark:text-white/30"
              />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 dark:text-white/30">
                Halls
              </h2>
              <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {halls.map((hall) => (
              <ResourceCard
                key={hall.id}
                name={hall.name}
                subtitle={
                  hall.capacity ? `Capacity: ${hall.capacity}` : undefined
                }
                icon={DoorOpen}
                sessions={sessionsFor("hall", hall.id)}
                isToday={isToday}
                dayStart={dayStart}
                dayEnd={dayEnd}
                now={now}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Zoom section ── */}
      {(tab === "all" || tab === "zooms") && zooms.length > 0 && (
        <div className="mb-8">
          {tab === "all" && (
            <div className="flex items-center gap-2 mb-3">
              <Wifi size={14} className="text-gray-400 dark:text-white/30" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 dark:text-white/30">
                Zoom Accounts
              </h2>
              <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {zooms.map((zoom) => (
              <ResourceCard
                key={zoom.id}
                name={zoom.displayName}
                subtitle={zoom.accountEmail}
                icon={Video}
                sessions={sessionsFor("zoom", zoom.id)}
                isToday={isToday}
                dayStart={dayStart}
                dayEnd={dayEnd}
                now={now}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {halls.length === 0 && zooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5
            flex items-center justify-center mb-4"
          >
            <DoorOpen size={24} className="text-gray-300 dark:text-white/20" />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-white/30">
            No resources configured
          </p>
          <p className="text-xs text-gray-400 dark:text-white/20 mt-1">
            Add halls and Zoom accounts in Settings first.
          </p>
        </div>
      )}

      {/* ── Live clock footer ── */}
      {isToday && (
        <div
          className="mt-8 flex items-center justify-center gap-2
          text-[11px] text-gray-300 dark:text-white/20"
        >
          <Clock size={11} />
          <span>Live as of {fmtTime(now)} · refreshes every 60s</span>
        </div>
      )}
    </div>
  );
}
