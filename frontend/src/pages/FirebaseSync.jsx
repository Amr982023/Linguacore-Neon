import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { syncApi } from "../services/endpoints";
import toast from "react-hot-toast";
import {
  RefreshCw,
  Upload,
  Send,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Activity,
  GitBranch,
  Inbox,
  History,
  Wrench,
  Shield,
  Radio,
  Clock,
  Pointer,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "—";

  const now = new Date();
  const date = new Date(dateStr + "Z");

  const diff = Math.max(0, (now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

function ttlInfo(lastSeenAt) {
  const TTL_HOURS = 72;
  if (!lastSeenAt) return { label: "—", pct: 100, color: "ok" };
  const offlineHours = (Date.now() - new Date(lastSeenAt)) / 3_600_000;
  const remaining = Math.max(0, TTL_HOURS - offlineHours);
  const pct = Math.round((remaining / TTL_HOURS) * 100);
  const color = pct > 40 ? "ok" : pct > 15 ? "warn" : "err";
  return { label: `${Math.round(remaining)}h / ${TTL_HOURS}h`, pct, color };
}

const STATUS_STYLE = {
  OK: "badge-ok",
  DEGRADED: "badge-warn",
  OUT_OF_SYNC: "badge-err",
  PENDING: "badge-gray",
  SUCCESS: "badge-ok",
  FAILED: "badge-err",
};

// ─── sub-components ───────────────────────────────────────────────────────────

function Badge({ text }) {
  return (
    <span className={`badge ${STATUS_STYLE[text] ?? "badge-gray"}`}>
      {text}
    </span>
  );
}

function Dot({ status }) {
  const cls =
    status === "SUCCESS" || status === "OK"
      ? "dot-ok"
      : status === "FAILED" || status === "OUT_OF_SYNC"
        ? "dot-err"
        : status === "DEGRADED"
          ? "dot-warn"
          : "dot-gray";
  return <span className={`dot ${cls}`} />;
}

function TtlBar({ pct, color }) {
  const fill =
    color === "ok"
      ? "var(--c-ok)"
      : color === "warn"
        ? "var(--c-warn)"
        : "var(--c-err)";
  return (
    <div className="ttl-bar-wrap">
      <div
        className="ttl-bar-fill"
        style={{ width: `${pct}%`, background: fill }}
      />
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="section-title">
      {Icon && (
        <Icon size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
      )}
      {children}
    </div>
  );
}

function ActionBtn({ onClick, disabled, icon: Icon, children, variant }) {
  return (
    <button
      className={`action-btn${variant === "primary" ? " btn-primary" : variant === "danger" ? " btn-danger" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={13} />}
      {children}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function FirebaseSync() {
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);

  // Refresh "time ago" labels every 30 s without a network call
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["syncStatus"] });
    qc.invalidateQueries({ queryKey: ["syncMeta"] });
    qc.invalidateQueries({ queryKey: ["syncHistory"] });
  };

  // ── queries ───────────────────────────────────────────────────────────────

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["syncStatus"],
    queryFn: () => syncApi.getStatus(),
    select: (r) => r?.data?.data ?? r?.data ?? r,
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: meta } = useQuery({
    queryKey: ["syncMeta"],
    queryFn: () => syncApi.getMeta(),
    select: (r) => r?.data?.data ?? r?.data,
    refetchInterval: 60_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["syncHistory"],
    queryFn: () => syncApi.getHistory(),
    select: (r) => r?.data?.data ?? r?.data ?? [],
    refetchInterval: 60_000,
  });

  // ── mutations ─────────────────────────────────────────────────────────────

  // 1. Full state push  →  POST /api/sync/trigger
  const fullSyncMut = useMutation({
    mutationFn: () => syncApi.syncNow(null, true),
    onSuccess: (res) => {
      const d = res?.data;
      toast.success(`Full sync done — ${d?.recordsSynced ?? 0} records`);
      invalidateAll();
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message ?? "Full sync failed"),
  });

  // 2. Publish pending outbox events  →  POST /api/sync/publish-now
  const publishMut = useMutation({
    mutationFn: () => syncApi.publishNow(),
    onSuccess: () => {
      toast.success("Pending outbox events published to Firebase");
      invalidateAll();
    },
    onError: () => toast.error("Publish failed"),
  });

  // 3. Force cleanup  →  POST /api/sync/cleanup
  const cleanupMut = useMutation({
    mutationFn: () => syncApi.cleanup(),
    onSuccess: () =>
      toast.success("Cleanup done — expired and fully-ACK'd events removed"),
    onError: () => toast.error("Cleanup failed"),
  });

  // 4. Reset out-of-sync flag  →  POST /api/sync/reset-out-of-sync
  const resetOosMut = useMutation({
    mutationFn: () => syncApi.resetOutOfSync(),
    onSuccess: (res) => {
      toast.success(
        res?.data?.message ?? "Sync status reset. Cycles resume in ~30 s.",
      );
      invalidateAll();
    },
    onError: () => toast.error("Reset failed — check server logs"),
  });

  // 5. Reset event pointer  →  POST /api/sync/reset-pointer
  const resetPointerMut = useMutation({
    mutationFn: () => syncApi.resetPointer(),
    onSuccess: (res) => {
      toast.success(
        res?.data?.message ??
          "Pointer reset — next cycle will reprocess all Firebase events.",
      );
      invalidateAll();
    },
    onError: () => toast.error("Pointer reset failed — check server logs"),
  });

  // ── derived state ─────────────────────────────────────────────────────────

  const syncStatus = status?.status ?? "OK";
  const isOutOfSync = status?.isOutOfSync ?? false;
  const lastSeenAt = status?.lastSeenAt ?? status?.data?.lastSeenAt;
  const lastEventId = status?.lastEventId;
  const pendingCount = status?.pendingOutboxEvents ?? 0;
  const outOfSyncReason = status?.outOfSyncReason;
  const ttl = ttlInfo(lastSeenAt);

  // Convenience booleans for disabling buttons
  const fullSyncRunning = fullSyncMut.isPending;
  const publishRunning = publishMut.isPending;
  const cleanupRunning = cleanupMut.isPending;
  const resetRunning = resetOosMut.isPending;
  const resetPointerRunning = resetPointerMut.isPending;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <style>{`
        :root {
          --c-ok:   #22c55e;
          --c-warn: #f59e0b;
          --c-err:  #ef4444;
        }
        .page { padding: 1.5rem 0; color: #1a1a1a; max-width: 860px; margin: 0 auto; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; }
        .page-title { font-size: 20px; font-weight: 600; color: #111; display: flex; align-items: center; gap: 8px; }
        .page-sub { font-size: 13px; color: #888; margin-top: 3px; }
        .header-actions { display: flex; gap: 8px; flex-shrink: 0; }

        /* grids */
        .grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 1.25rem; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 1.25rem; }
        @media (max-width: 600px) {
          .grid-4 { grid-template-columns: repeat(2, 1fr); }
          .grid-2 { grid-template-columns: 1fr; }
        }

        /* metric tiles */
        .metric { background: #f7f7f6; border-radius: 10px; padding: 14px 16px; }
        .metric-label { font-size: 11px; font-weight: 500; color: #999; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .metric-value { font-size: 20px; font-weight: 600; color: #111; line-height: 1; }
        .metric-value.sm { font-size: 13px; font-weight: 500; margin-top: 4px; }

        /* cards */
        .card { background: #fff; border: 0.5px solid #e5e5e4; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }

        /* section title */
        .section-title { font-size: 11px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; }

        /* dividers */
        .sep { border: none; border-top: 0.5px solid #f0f0ee; margin: 12px 0; }
        .divider-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 0.5px solid #f0f0ee; }
        .divider-row:last-child { border-bottom: none; }

        /* kv rows */
        .kv { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .kv:last-child { margin-bottom: 0; }
        .kv-label { font-size: 13px; color: #888; display: flex; align-items: center; gap: 5px; }
        .kv-val { font-size: 13px; font-weight: 500; color: #111; }

        /* badges */
        .badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; }
        .badge-ok   { background: #e8f5ee; color: #1a7a40; }
        .badge-warn { background: #fff7e0; color: #92650a; }
        .badge-err  { background: #fde8e8; color: #b92020; }
        .badge-gray { background: #f0f0ee; color: #777; }

        /* operation pills */
        .pill-upsert { background: #e7f0fb; color: #1a4faa; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 5px; }
        .pill-delete { background: #fde8e8; color: #b92020; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 5px; }

        /* dots */
        .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .dot-ok   { background: var(--c-ok); }
        .dot-warn { background: var(--c-warn); }
        .dot-err  { background: var(--c-err); }
        .dot-gray { background: #ccc; }

        /* TTL bar */
        .ttl-bar-wrap { background: #f0f0ee; border-radius: 4px; height: 5px; overflow: hidden; margin-top: 6px; }
        .ttl-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }

        /* buttons */
        .action-btn {
          background: transparent;
          border: 0.5px solid #d5d5d3;
          border-radius: 8px;
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s, opacity 0.15s;
          white-space: nowrap;
        }
        .action-btn:hover:not(:disabled) { background: #f5f5f4; }
        .action-btn:active:not(:disabled) { transform: scale(0.98); }
        .action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-primary { background: #111; color: #fff; border-color: transparent; }
        .btn-primary:hover:not(:disabled) { background: #333; }
        .btn-danger { border-color: #f0a0a0; color: #b92020; }
        .btn-danger:hover:not(:disabled) { background: #fde8e8; }

        /* out-of-sync banner */
        .oos-banner {
          background: #fde8e8;
          border: 0.5px solid #f0a0a0;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .oos-banner-icon { color: #b92020; flex-shrink: 0; margin-top: 1px; }
        .oos-banner-title { font-size: 13px; font-weight: 600; color: #b92020; }
        .oos-banner-body  { font-size: 12px; color: #b92020; margin-top: 3px; opacity: 0.85; line-height: 1.5; }

        /* spin */
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* misc */
        .empty-state { text-align: center; padding: 2rem 0; color: #bbb; font-size: 13px; }
        .hint { font-size: 12px; color: #aaa; margin-top: 10px; line-height: 1.6; }
        code { font-size: 11px; background: #f0f0ee; padding: 1px 5px; border-radius: 4px; }
      `}</style>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">
            <Radio size={16} style={{ color: "#888" }} />
            Sync dashboard
          </div>
          <div className="page-sub">
            Event-driven · 30 s cycle · 3-day TTL · Firebase Realtime DB
          </div>
        </div>
        <div className="header-actions">
          <ActionBtn
            icon={fullSyncRunning ? RefreshCw : Upload}
            onClick={() => fullSyncMut.mutate()}
            disabled={fullSyncRunning}
            variant="primary"
          >
            {fullSyncRunning ? "Syncing…" : "Full sync"}
          </ActionBtn>
        </div>
      </div>

      {/* ── Out-of-sync banner (always visible when OOS) ─────────────────── */}
      {isOutOfSync && (
        <div className="oos-banner">
          <AlertTriangle size={16} className="oos-banner-icon" />
          <div style={{ flex: 1 }}>
            <div className="oos-banner-title">
              Branch is out of sync — sync cycles blocked
            </div>
            <div className="oos-banner-body">
              {outOfSyncReason ??
                "Branch was offline longer than the 3-day TTL. Events may have been deleted from Firebase."}
              <br />
              Complete a manual DB reset / re-seed before resetting this flag.
            </div>
          </div>
          <ActionBtn
            icon={resetRunning ? RefreshCw : RotateCcw}
            onClick={() => resetOosMut.mutate()}
            disabled={resetRunning}
            variant="danger"
          >
            {resetRunning ? "Resetting…" : "Reset flag"}
          </ActionBtn>
        </div>
      )}

      {/* ── Metric tiles ─────────────────────────────────────────────────── */}
      <div className="grid-4">
        <div className="metric">
          <div className="metric-label">Branch status</div>
          <div className="metric-value sm" style={{ marginTop: 6 }}>
            {statusLoading ? "—" : <Badge text={syncStatus} />}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Pending outbox</div>
          <div className="metric-value">
            {statusLoading ? "—" : pendingCount}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Last heartbeat</div>
          <div className="metric-value sm">{timeAgo(lastSeenAt)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Last event applied</div>
          <div
            className="metric-value sm"
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#888",
              marginTop: 4,
            }}
            title={lastEventId ?? ""}
          >
            {lastEventId ? lastEventId.slice(0, 12) + "…" : "—"}
          </div>
        </div>
      </div>

      {/* ── Two-column: Local branch info + Outbox queue ─────────────────── */}
      <div className="grid-2">
        {/* Local branch */}
        <div className="card">
          <div className="card-header">
            <SectionTitle icon={Shield}>Local branch</SectionTitle>
            <Badge text={syncStatus} />
          </div>

          <div className="kv">
            <span className="kv-label">
              <Activity size={12} /> Last seen
            </span>
            <span className="kv-val">{timeAgo(lastSeenAt)}</span>
          </div>
          <div className="kv">
            <span className="kv-label">
              <Clock size={12} /> Out-of-sync flag
            </span>
            <span
              className="kv-val"
              style={{ color: isOutOfSync ? "#b92020" : "#1a7a40" }}
            >
              {isOutOfSync ? "Yes" : "No"}
            </span>
          </div>
          <div className="kv" style={{ marginTop: 4 }}>
            <span className="kv-label">
              <Clock size={12} /> TTL remaining
            </span>
            <span className="kv-val">{ttl.label}</span>
          </div>
          <TtlBar pct={ttl.pct} color={ttl.color} />

          {/* Last full sync (from /sync/meta) */}
          {meta && (
            <>
              <div className="sep" />
              <div className="kv">
                <span className="kv-label">Last full sync</span>
                <span className="kv-val">
                  {new Date(meta.syncedAt).toLocaleString("en-EG")}
                </span>
              </div>
              <div className="kv">
                <span className="kv-label">Records synced</span>
                <span className="kv-val">{meta.recordsSynced ?? "—"}</span>
              </div>
              <div className="kv">
                <span className="kv-label">Status</span>
                <Badge text={meta.status} />
              </div>
            </>
          )}
        </div>

        {/* Outbox queue */}
        <div className="card">
          <div className="card-header">
            <SectionTitle icon={Inbox}>Outbox queue</SectionTitle>
            <ActionBtn
              icon={publishRunning ? RefreshCw : Send}
              onClick={() => publishMut.mutate()}
              disabled={publishRunning || pendingCount === 0}
            >
              {publishRunning ? "Publishing…" : "Publish now"}
            </ActionBtn>
          </div>

          {pendingCount === 0 ? (
            <div className="empty-state">
              <CheckCircle
                size={20}
                style={{
                  margin: "0 auto 6px",
                  display: "block",
                  color: "#22c55e",
                }}
              />
              All events pushed
            </div>
          ) : (
            <>
              <div className="divider-row">
                <div className="dot dot-warn" style={{ marginRight: 10 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {pendingCount} event{pendingCount !== 1 ? "s" : ""} pending
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>
                    Waiting to be pushed to Firebase <code>/events</code>
                  </div>
                </div>
              </div>
              <div className="hint">
                Events publish automatically every 30 s. Each expires after 72 h
                (3-day TTL).
              </div>
            </>
          )}

          <div className="sep" />
          <div className="hint" style={{ marginTop: 0 }}>
            Operations: <span className="pill-upsert">UPSERT</span>{" "}
            <span className="pill-delete" style={{ marginLeft: 4 }}>
              DELETE
            </span>{" "}
            — Last-write-wins applied on receiver.
          </div>
        </div>
      </div>

      {/* ── Full-sync history ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <SectionTitle icon={History}>Full-sync history</SectionTitle>
          <ActionBtn
            icon={RefreshCw}
            onClick={() => qc.invalidateQueries({ queryKey: ["syncHistory"] })}
          >
            Refresh
          </ActionBtn>
        </div>

        {history.length === 0 ? (
          <div className="empty-state">No sync history yet</div>
        ) : (
          history.map((h, i) => (
            <div className="divider-row" key={h.id ?? i}>
              <Dot status={h.status} />
              <div style={{ flex: 1, marginLeft: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {new Date(h.startedAt).toLocaleString("en-EG")}
                  {h.finishedAt && (
                    <span
                      style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}
                    >
                      (
                      {Math.round(
                        (new Date(h.finishedAt) - new Date(h.startedAt)) / 1000,
                      )}
                      s)
                    </span>
                  )}
                </div>
                {h.message && (
                  <div style={{ fontSize: 12, color: "#aaa" }}>{h.message}</div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {h.recordsSynced != null && (
                  <span style={{ fontSize: 12, color: "#aaa" }}>
                    {h.recordsSynced} records
                  </span>
                )}
                <Badge text={h.status} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Maintenance ───────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <SectionTitle icon={Wrench}>Maintenance</SectionTitle>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Cleanup — always visible */}
          <ActionBtn
            icon={cleanupRunning ? RefreshCw : Trash2}
            onClick={() => cleanupMut.mutate()}
            disabled={cleanupRunning}
          >
            {cleanupRunning ? "Cleaning…" : "Force cleanup"}
          </ActionBtn>

          {/* Reset OOS — ALWAYS visible, not gated behind isOutOfSync */}
          <ActionBtn
            icon={resetRunning ? RefreshCw : RotateCcw}
            onClick={() => resetOosMut.mutate()}
            disabled={resetRunning}
            variant={isOutOfSync ? "danger" : undefined}
          >
            {resetRunning ? "Resetting…" : "Reset out-of-sync"}
          </ActionBtn>

          {/* Reset event pointer — POST /api/sync/reset-pointer */}
          <ActionBtn
            icon={resetPointerRunning ? RefreshCw : Pointer}
            onClick={() => resetPointerMut.mutate()}
            disabled={resetPointerRunning}
          >
            {resetPointerRunning ? "Resetting…" : "Reset pointer"}
          </ActionBtn>

          {/* Seed — alias for full sync with since=2000 */}
          <ActionBtn
            icon={fullSyncRunning ? RefreshCw : GitBranch}
            onClick={() => fullSyncMut.mutate()}
            disabled={fullSyncRunning}
          >
            {fullSyncRunning ? "Seeding…" : "Seed full data"}
          </ActionBtn>
        </div>

        <div className="hint">
          <strong>Force cleanup</strong> runs immediately instead of waiting for
          the hourly automatic cycle — removes TTL-expired events and
          fully-ACK'd events from Firebase <code>/events</code> and{" "}
          <code>/acks</code>.
          <br />
          <strong>Reset out-of-sync</strong> clears the <code>IsOutOfSync</code>{" "}
          flag and resets <code>LastSeenAt</code>.{" "}
          <span style={{ color: "#b92020" }}>
            Only call this after completing a full DB wipe and re-seed.
          </span>
          <br />
          <strong>Reset pointer</strong> nulls out{" "}
          <code>LastProcessedEventTime</code> on the local branch — the next 30
          s cycle will reprocess <em>all</em> events currently in Firebase.{" "}
          <span style={{ color: "#92650a" }}>
            Use when the branch missed events but is not fully out-of-sync.
          </span>
          <br />
          <strong>Seed full data</strong> triggers{" "}
          <code>POST /api/sync/trigger</code> — pushes all local records to
          Firebase to bootstrap a new branch.
        </div>
      </div>
    </div>
  );
}
