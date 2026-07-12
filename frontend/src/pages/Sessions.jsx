import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  sessionsApi,
  groupsApi,
  lookupsApi,
  notificationsApi,
  instructorsApi,
} from "../services/endpoints";
import { useAuthStore } from "../context/authStore";
import { Html5Qrcode } from "html5-qrcode";
import {
  PageHeader,
  Table,
  Modal,
  Button,
  Input,
  Select,
  Badge,
  SearchInput,
  StatCard,
} from "../components/ui";
import WaButton from "../components/WaButton";
import {
  Plus,
  Eye,
  Edit,
  QrCode,
  CalendarDays,
  RotateCcw,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const DEFAULT_FILTERS = {
  search: "",
  groupFilter: "",
  statusFilter: "",
  periodLabelFilter: "",
};

// ── useDebounce ───────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, totalCount, pageSize, onPageChange }) {
  if (totalPages <= 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  return (
    <div className="fixed bottom-0 left-72 right-5 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center justify-between px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
        <span>
          {from}–{to} of {totalCount} records
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-2.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={24} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
            )
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`e-${i}`} className="px-1">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-2.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        <span className="text-xs text-gray-400">
          Page {page} of {totalPages}
        </span>
      </div>
    </div>
  );
}

// ── SessionForm ───────────────────────────────────────────────────────────────
function SessionForm({
  initial,
  onSubmit,
  loading,
  groups = [],
  halls = [],
  zooms = [],
  periodLabels = [],
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: initial });

  const selectedGroupId = watch("groupId");
  const selectedPeriodLabelId = watch("periodLabelId");
  const sessionNumber = watch("sessionNumber");
  const [manualMode, setManualMode] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [instructors, setInstructors] = useState([]);

  // ── First-period-session gate (MONTHLY groups only) ──────────────────────
  // When the auto-computed next session number for this group+period is 1,
  // it means no GroupPeriod/session exists yet for this pair. The backend
  // will lazily create GroupPeriod.ExpectedSessionsCount = Group.SessionsPerMonth
  // at that moment, so we force a confirm-or-edit step on SessionsPerMonth /
  // FeeAmount *before* allowing the session itself to be submitted.
  const [periodGate, setPeriodGate] = useState({
    show: false,
    confirmed: false,
    sessionsPerMonth: "",
    feeAmount: "",
  });
  const updateGroupMut = useMutation({
    mutationFn: (d) => groupsApi.update(d),
  });

  const selectedGroup = groups.find(
    (g) => String(g.id) === String(selectedGroupId),
  );

  const isMonthly = selectedGroup?.paymentStrategy === "PER_MONTH";

  useEffect(() => {
    if (!selectedGroup?.languageId) {
      setInstructors([]);
      return;
    }
    instructorsApi
      .getByLanguage(selectedGroup.languageId)
      .then((res) => setInstructors(res.data?.data || []))
      .catch(() => setInstructors([]));
  }, [selectedGroupId]);

  useEffect(() => {
    if (instructors.length === 0) {
      if (!initial?.id) setValue("instructorId", "");
      return;
    }
    if (initial?.id) {
      setValue(
        "instructorId",
        initial.instructorId ? String(initial.instructorId) : "",
      );
      return;
    }
    if (!selectedGroup) return;
    const defaultId = selectedGroup.instructorId
      ? String(selectedGroup.instructorId)
      : "";
    const existsInList = instructors.some((i) => String(i.id) === defaultId);
    setValue("instructorId", existsInList ? defaultId : "");
  }, [instructors, selectedGroup, initial, setValue]);

  useEffect(() => {
    if (initial?.id) return; // don't override on edit
    if (!selectedGroup) return;

    const defaultHallId = selectedGroup.hallId
      ? String(selectedGroup.hallId)
      : "";
    const hallExists = halls.some((h) => String(h.id) === defaultHallId);
    setValue("hallId", hallExists ? defaultHallId : "");

    const defaultZoomId = selectedGroup.zoomAccountId
      ? String(selectedGroup.zoomAccountId)
      : "";
    const zoomExists = zooms.some((z) => String(z.id) === defaultZoomId);
    setValue("zoomAccountId", zoomExists ? defaultZoomId : "");
  }, [selectedGroupId, halls, zooms]);

  // Stable key so the gate effect doesn't re-fire on every parent re-render
  // (the `groups` array reference changes every time Sessions.jsx re-renders,
  // since it's derived inline from query data with `|| []`).
  const groupsKey = useMemo(
    () =>
      groups
        .map(
          (g) =>
            `${g.id}:${g.paymentStrategy}:${g.sessionsPerMonth}:${g.feeAmount}`,
        )
        .join("|"),
    [groups],
  );

  useEffect(() => {
    if (initial?.id) return;
    if (!selectedGroupId || !selectedPeriodLabelId || manualMode) {
      setPeriodGate((p) =>
        p.show || p.confirmed
          ? {
              show: false,
              confirmed: false,
              sessionsPerMonth: "",
              feeAmount: "",
            }
          : p,
      );
      return;
    }

    let cancelled = false;
    setAutoLoading(true);

    sessionsApi
      .getNextSessionNumber(selectedGroupId, selectedPeriodLabelId)
      .then((res) => {
        if (cancelled) return;

        const num = res.data?.data;
        if (num !== undefined) setValue("sessionNumber", num);

        const grp = groups.find(
          (g) => String(g.id) === String(selectedGroupId),
        );
        const monthly = grp?.paymentStrategy === "PER_MONTH";
        const isFirstOfPeriod = Number(num) === 1;

        if (isFirstOfPeriod && monthly) {
          setPeriodGate({
            show: true,
            confirmed: false,
            sessionsPerMonth: grp?.sessionsPerMonth ?? "",
            feeAmount: grp?.feeAmount ?? "",
          });
        } else {
          setPeriodGate({
            show: false,
            confirmed: false,
            sessionsPerMonth: "",
            feeAmount: "",
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAutoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, selectedPeriodLabelId, manualMode, groupsKey]);

  const handleConfirmPeriodSetup = () => {
    const newSessionsPerMonth = Number(periodGate.sessionsPerMonth);
    const newFeeAmount = Number(periodGate.feeAmount);

    if (!newSessionsPerMonth || newSessionsPerMonth < 1) {
      toast.error("Sessions per month must be at least 1");
      return;
    }
    if (newFeeAmount < 0) {
      toast.error("Fee amount cannot be negative");
      return;
    }

    const noChange =
      newSessionsPerMonth === selectedGroup.sessionsPerMonth &&
      newFeeAmount === selectedGroup.feeAmount;

    if (noChange) {
      setPeriodGate((p) => ({ ...p, confirmed: true }));
      return;
    }

    updateGroupMut.mutate(
      {
        id: selectedGroup.id,
        name: selectedGroup.name,
        languageLevelId: selectedGroup.languageLevelId,
        groupCategoryId: selectedGroup.groupCategoryId,
        groupTypeId: selectedGroup.groupTypeId,
        deliveryModeId: selectedGroup.deliveryModeId,
        groupStatusId: selectedGroup.groupStatusId,
        hallId: selectedGroup.hallId || null,
        zoomAccountId: selectedGroup.zoomAccountId || null,
        paymentStrategy: selectedGroup.paymentStrategy,
        feeAmount: newFeeAmount,
        instructorCommissionPct: selectedGroup.instructorCommissionPct,
        sessionsPerMonth: newSessionsPerMonth,
        gracePeriodDays: selectedGroup.gracePeriodDays,
        startDate: selectedGroup.startDate,
        maxCapacity: selectedGroup.maxCapacity ?? null,
      },
      {
        onSuccess: () => {
          toast.success("Group's period setup updated");
          // Reflect locally so the rest of this form session sees the new values
          selectedGroup.sessionsPerMonth = newSessionsPerMonth;
          selectedGroup.feeAmount = newFeeAmount;
          setPeriodGate((p) => ({ ...p, confirmed: true }));
        },
        onError: (e) =>
          toast.error(e.response?.data?.message || "Failed to update group"),
      },
    );
  };

  const periodGateBlocking = periodGate.show && !periodGate.confirmed;

  const handleValid = (data) => {
    if (periodGateBlocking) {
      toast.error(
        "Please confirm the period setup above before creating this session.",
      );
      return;
    }
    onSubmit({
      ...data,
      hallId: data.hallId || null,
      zoomAccountId: data.zoomAccountId || null,
    });
  };

  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className="space-y-3"
    >
      <Select
        label="Group *"
        error={errors.groupId?.message}
        {...register("groupId", { required: "Please select a group" })}
      >
        <option value="">— Select Group —</option>
        {groups.map((g) => (
          <option key={g.id} value={String(g.id)}>
            {g.name} ({g.languageName} {g.levelCode}) ·{" "}
            {g.paymentStrategy || "MONTHLY"}
          </option>
        ))}
      </Select>

      {selectedGroupId && (
        <Select
          label="Instructor *"
          error={errors.instructorId?.message}
          {...register("instructorId", {
            required: "Please select an instructor",
          })}
        >
          <option value="">— Select Instructor —</option>
          {instructors.map((i) => (
            <option key={i.id} value={String(i.id)}>
              {[i.person?.firstName, i.person?.secondName, i.person?.lastName]
                .filter(Boolean)
                .join(" ")}
              {String(i.id) === String(selectedGroup?.instructorId)
                ? " (Group Default)"
                : ""}
            </option>
          ))}
        </Select>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Session Number *
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={manualMode}
              onChange={(e) => setManualMode(e.target.checked)}
              className="rounded"
            />
            Enter manually
          </label>
          <div className="relative">
            <Input
              type="number"
              error={errors.sessionNumber?.message}
              disabled={!manualMode}
              {...register("sessionNumber", {
                required: "Session number is required",
                valueAsNumber: true,
                min: { value: 1, message: "Must be at least 1" },
                max: { value: 9999, message: "Too large" },
              })}
            />
            {autoLoading && (
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 animate-pulse">
                Loading…
              </span>
            )}
          </div>
          {!initial?.id && sessionNumber > 8 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              ⚠️ Session #{sessionNumber} exceeds 8 sessions for this period.
            </p>
          )}
        </div>

        <Select
          label="Period Label *"
          error={errors.periodLabelId?.message}
          {...register("periodLabelId", {
            required: "Period label is required",
          })}
        >
          <option value="">— Select Period —</option>
          {periodLabels.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {/* ── First-session-of-period setup gate ──────────────────────────── */}
      {periodGate.show && (
        <div
          className={`p-3 rounded-lg border text-sm space-y-2.5 ${
            periodGate.confirmed
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          }`}
        >
          {periodGate.confirmed ? (
            <p className="text-green-700 dark:text-green-300 font-medium flex items-center gap-1.5">
              ✓ Period setup confirmed — {selectedGroup?.sessionsPerMonth}{" "}
              sessions · {selectedGroup?.feeAmount} EGP
            </p>
          ) : (
            <>
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                ⚠ First session of this period
              </p>
              <p className="text-amber-700 dark:text-amber-400 text-xs">
                This will lock in the expected session count for this period
                from the group's "Sessions/Month" value. If this period has a
                different number of sessions (e.g. a short final period) or a
                different fee, update them now — this updates the Group itself.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Sessions This Period *"
                  type="number"
                  min="1"
                  max="60"
                  value={periodGate.sessionsPerMonth}
                  onChange={(e) =>
                    setPeriodGate((p) => ({
                      ...p,
                      sessionsPerMonth: e.target.value,
                    }))
                  }
                />
                <Input
                  label="Fee Amount (EGP) *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={periodGate.feeAmount}
                  onChange={(e) =>
                    setPeriodGate((p) => ({ ...p, feeAmount: e.target.value }))
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  loading={updateGroupMut.isPending}
                  onClick={handleConfirmPeriodSetup}
                >
                  Confirm &amp; Continue
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <Input
        label="Scheduled Date *"
        type="datetime-local"
        error={errors.scheduledDate?.message}
        {...register("scheduledDate", {
          required: "Scheduled date is required",
          validate: (v) => !!v || "Invalid date/time",
        })}
      />

      <Input
        label="Topic"
        error={errors.topic?.message}
        {...register("topic", {
          maxLength: { value: 200, message: "Max 200 characters" },
        })}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Hall Override"
          error={errors.hallId?.message || errors.zoomAccountId?.message}
          {...register("hallId", {
            validate: (val, formValues) =>
              !!val ||
              !!formValues.zoomAccountId ||
              "Please select at least a Hall or Zoom",
          })}
        >
          <option value="">— Select Hall —</option>
          {halls.map((h) => (
            <option key={h.id} value={String(h.id)}>
              {h.name}
              {String(h.id) === String(selectedGroup?.hallId)
                ? " (Group Default)"
                : ""}
            </option>
          ))}
        </Select>
        <Select label="Zoom Override" {...register("zoomAccountId")}>
          <option value="">— Select Zoom —</option>
          {zooms.map((z) => (
            <option key={z.id} value={String(z.id)}>
              {z.displayName || z.name}
              {String(z.id) === String(selectedGroup?.zoomAccountId)
                ? " (Group Default)"
                : ""}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading} disabled={periodGateBlocking}>
          {initial?.id ? "Update Session" : "Create Session"}
        </Button>
      </div>
    </form>
  );
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmClass = "bg-red-600 hover:bg-red-700 text-white",
  loading,
}) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={onConfirm}
            className={confirmClass}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── SessionViewModal ──────────────────────────────────────────────────────────
function SessionViewModal({ session, onClose }) {
  const { data: attRes } = useQuery({
    queryKey: ["att", session.id],
    queryFn: () => sessionsApi.getAttendance(session.id),
    enabled: session.status !== "CANCELLED",
  });

  const attendance = attRes?.data?.data || [];
  const presentCount = attendance.filter(
    (a) => a.status === "PRESENT" && !a.reverted,
  ).length;
  const absentCount = attendance.filter(
    (a) => a.status === "ABSENT" || a.reverted,
  ).length;
  const totalCount = attendance.length;

  const InfoRow = ({ label, value }) => (
    <div className="flex items-start gap-2 py-2.5 border-b dark:border-gray-700 last:border-0">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-32 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
        {value || "—"}
      </span>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Session #${session.sessionNumber} — Details`}
      size="lg"
    >
      <div
        className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2
        ${
          session.status === "COMPLETED"
            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
            : session.status === "CANCELLED"
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
        }`}
      >
        <Badge label={session.status} />
        <span className="text-xs opacity-70">
          {session.status === "COMPLETED" && "This session has been completed."}
          {session.status === "CANCELLED" &&
            (session.cancelledReason || "This session was cancelled.")}
        </span>
      </div>

      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Session Info
        </p>
        <InfoRow label="Group" value={session.groupName} />
        <InfoRow label="Instructor" value={session.instructorName} />
        <InfoRow label="Period" value={session.periodLabel} />
        <InfoRow label="Session #" value={`#${session.sessionNumber}`} />
        <InfoRow
          label="Strategy"
          value={session.paymentStrategy || "MONTHLY"}
        />
        <InfoRow
          label="Scheduled Date"
          value={new Date(session.scheduledDate).toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        />
        <InfoRow label="Topic" value={session.topic} />
        <InfoRow label="Hall" value={session.hallName} />
        <InfoRow label="Zoom" value={session.zoomName} />
      </div>

      {session.status !== "CANCELLED" && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Attendance Summary
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                {totalCount}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Total</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {presentCount}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Present</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-500 dark:text-red-400">
                {absentCount}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Absent</p>
            </div>
          </div>
          {attendance.length > 0 && (
            <div className="space-y-1.5">
              {attendance.map((a) => (
                <div
                  key={a.studentId}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {a.studentName}
                  </span>
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge
                      label={a.reverted ? "REVERTED" : a.status}
                      color={
                        a.reverted
                          ? "bg-gray-100 text-gray-500"
                          : a.status === "PRESENT"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                      }
                    />
                    {a.reverted && a.revertReason && (
                      <span className="text-xs text-gray-400 italic">
                        {a.revertReason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── AttendanceModal ───────────────────────────────────────────────────────────
function AttendanceModal({ session, onClose }) {
  const qc = useQueryClient();
  const { userId } = useAuthStore();
  const [qrMode, setQrMode] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const isScanning = useRef(false);
  const [revertTarget, setRevertTarget] = useState(null);
  const [revertReason, setRevertReason] = useState("");

  const isCompleted = session.status === "COMPLETED";

  const playSound = (ok) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      if (ok) {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
      }
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const showFeedback = (ok, msg) => {
    setFeedback({ ok, msg });
    playSound(ok);
    setTimeout(() => setFeedback(null), 2500);
  };

  const { data: attRes, refetch } = useQuery({
    queryKey: ["att", session.id],
    queryFn: () => sessionsApi.getAttendance(session.id),
  });

  const markMut = useMutation({
    mutationFn: (d) => sessionsApi.markManual(d),
    onSuccess: (res) => {
      qc.removeQueries(["att", session.id]);
      refetch();
      showFeedback(
        true,
        `✓ ${res.data?.data?.studentName || ""} marked present`,
      );
    },
    onError: (e) => showFeedback(false, e.response?.data?.message || "Failed"),
  });

  const qrMut = useMutation({
    mutationFn: (d) => sessionsApi.markQr(d),
    onSuccess: (res) => {
      qc.removeQueries(["att", session.id]);
      refetch();
      isScanning.current = false;
      showFeedback(
        true,
        `✓ ${res.data?.data?.studentName || "Student"} marked present`,
      );
      setTimeout(() => {
        isScanning.current = false;
      }, 2500);
    },
    onError: (e) => {
      isScanning.current = false;
      showFeedback(false, e.response?.data?.message || "Invalid QR");
    },
  });

  const revertMut = useMutation({
    mutationFn: (d) => sessionsApi.revertAttendance(d),
    onSuccess: () => {
      toast.success("Reverted");
      refetch();
      setRevertTarget(null);
      setRevertReason("");
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to revert"),
  });

  useEffect(() => {
    if (!qrMode) {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
      return;
    }
    setCameraError(null);
    const timeout = setTimeout(() => {
      if (!scannerRef.current)
        setCameraError("Camera not available or permission denied.");
    }, 5000);
    const el = document.getElementById("qr-reader");
    if (!el) {
      clearTimeout(timeout);
      setCameraError("Scanner element not found.");
      return;
    }
    const scanner = new Html5Qrcode("qr-reader");
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (isScanning.current) return;
          isScanning.current = true;
          clearTimeout(timeout);
          qrMut.mutate({
            qrCode: decodedText,
            sessionId: session.id,
            recordedBy: userId,
          });
        },
        () => {},
      )
      .then(() => {
        clearTimeout(timeout);
        scannerRef.current = scanner;
      })
      .catch((err) => {
        clearTimeout(timeout);
        setCameraError(
          err?.message?.includes("Permission")
            ? "Camera permission denied. Please allow camera access."
            : err?.message?.includes("No cameras")
              ? "No camera found on this device."
              : "Camera not available: " + (err?.message || err),
        );
      });
    return () => {
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, [qrMode]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, []);

  const attendance = useMemo(() => {
    const raw = attRes?.data?.data || [];
    const byStudent = new Map();
    for (const a of raw) {
      const existing = byStudent.get(a.studentId);
      if (!existing) {
        byStudent.set(a.studentId, a);
        continue;
      }
      const score = (r) => {
        if (r.reverted) return 2;
        if (r.id && r.status === "PRESENT") return 3;
        if (r.id) return 1;
        return 0;
      };
      if (score(a) > score(existing)) byStudent.set(a.studentId, a);
    }
    return Array.from(byStudent.values());
  }, [attRes]);

  const presentCount = attendance.filter(
    (a) => a.status === "PRESENT" && !a.reverted,
  ).length;

  return (
    <Modal
      open
      onClose={() => {
        if (scannerRef.current) scannerRef.current.stop().catch(() => {});
        onClose();
      }}
      title={`Attendance — Session #${session.sessionNumber}`}
      size="lg"
    >
      {isCompleted && (
        <div className="mb-3 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <CheckCircle size={15} />
          This session is completed — attendance is read-only.
        </div>
      )}

      {feedback && (
        <div
          className={`mb-3 px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium ${
            feedback.ok
              ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300"
              : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          <span className="text-lg">{feedback.ok ? "✅" : "❌"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <Button
          variant={!qrMode ? "primary" : "secondary"}
          onClick={() => setQrMode(false)}
        >
          Manual
        </Button>
        {!isCompleted && (
          <Button
            variant={qrMode ? "primary" : "secondary"}
            icon={QrCode}
            onClick={() => setQrMode(true)}
          >
            QR Scanner
          </Button>
        )}
        <span className="text-sm text-gray-500 ml-auto font-medium">
          {presentCount} / {attendance.length} present
        </span>
      </div>

      {qrMode && !isCompleted && (
        <div className="mb-4">
          {cameraError ? (
            <div className="flex flex-col items-center gap-3 p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <span className="text-3xl">📷</span>
              <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">
                {cameraError}
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setCameraError(null);
                  setQrMode(false);
                  setTimeout(() => setQrMode(true), 100);
                }}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                id="qr-reader"
                className="w-full max-w-sm rounded-xl overflow-hidden border-2 border-blue-200 dark:border-blue-800"
              />
              <p className="text-xs text-gray-400">
                Point camera at student QR code
              </p>
            </div>
          )}
        </div>
      )}

      {!qrMode && (
        <Table
          columns={[
            { key: "studentName", label: "Student" },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <div className="flex flex-col items-start gap-1">
                  <Badge
                    label={r.reverted ? "REVERTED" : r.status}
                    color={
                      r.reverted
                        ? "bg-gray-100 text-gray-500"
                        : r.status === "PRESENT"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    }
                  />
                  {r.reverted && r.revertReason && (
                    <span className="text-xs text-gray-400 italic">
                      {r.revertReason}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex gap-2">
                  {!isCompleted && !r.reverted && r.status === "ABSENT" && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        markMut.mutate({
                          studentId: r.studentId,
                          sessionId: session.id,
                          status: "PRESENT",
                          method: "MANUAL",
                          recordedBy: userId,
                        })
                      }
                    >
                      Mark Present
                    </Button>
                  )}
                  {!isCompleted && !r.reverted && r.status === "PRESENT" && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRevertTarget(r);
                        setRevertReason("");
                      }}
                    >
                      Revert
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={attendance}
        />
      )}

      {revertTarget && (
        <Modal
          open
          onClose={() => setRevertTarget(null)}
          title={`Revert attendance — ${revertTarget.studentName}`}
        >
          <div className="space-y-3">
            <Input
              label="Reason for reverting *"
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              placeholder="e.g. Marked present by mistake"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setRevertTarget(null)}>
                Cancel
              </Button>
              <Button
                loading={revertMut.isPending}
                onClick={() =>
                  revertMut.mutate({
                    attendanceId: revertTarget.id,
                    revertReason: revertReason.trim(),
                  })
                }
              >
                Confirm Revert
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Sessions() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Debounce only the search to avoid an API call on every keystroke
  const debouncedSearch = useDebounce(filters.search, SEARCH_DEBOUNCE_MS);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setPage(1);
  };

  const isAnyFilterActive = useMemo(
    () => Object.entries(filters).some(([k, v]) => v !== DEFAULT_FILTERS[k]),
    [filters],
  );

  // Use debouncedSearch in query params so the API call waits for the user to stop typing
  const queryParams = {
    page,
    pageSize: PAGE_SIZE,
    ...(filters.statusFilter && { status: filters.statusFilter }),
    ...(filters.groupFilter && { groupId: filters.groupFilter }),
    ...(filters.periodLabelFilter && {
      periodLabelId: filters.periodLabelFilter,
    }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: res, isLoading } = useQuery({
    queryKey: ["sessions", "list", branchId, queryParams],
    queryFn: () => sessionsApi.getByBranch(branchId, queryParams),
    enabled: !!branchId,
    keepPreviousData: true,
  });

  // Single stats query — one DB call via GroupBy on the backend
  const { data: statsRes } = useQuery({
    queryKey: ["sessions", "stats", branchId],
    queryFn: () => sessionsApi.getStats(branchId),
    enabled: !!branchId,
  });

  const { data: grpRes } = useQuery({
    queryKey: ["groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
  });

  const { data: hallRes } = useQuery({
    queryKey: ["halls", branchId],
    queryFn: () => lookupsApi.getHalls(branchId),
    enabled: !!branchId,
  });

  const { data: zoomRes } = useQuery({
    queryKey: ["zoom", branchId],
    queryFn: () => lookupsApi.getZoomAccounts(branchId),
    enabled: !!branchId,
  });

  const { data: periodRes } = useQuery({
    queryKey: ["period-labels"],
    queryFn: lookupsApi.getPeriodLabels,
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const pagedData = res?.data?.data;
  const sessions = pagedData?.items || [];
  const totalCount = pagedData?.totalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;

  const stats = statsRes?.data?.data;
  const scheduled = stats?.scheduled ?? 0;
  const completed = stats?.completed ?? 0;
  const cancelled = stats?.cancelled ?? 0;

  const groups = grpRes?.data?.data || [];
  const halls = hallRes?.data?.data || [];
  const zooms = zoomRes?.data?.data || [];
  const periodLabels = periodRes?.data?.data || [];

  // ── Single invalidation covers all session queries ────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sessions"], refetchType: "active" });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (d) => sessionsApi.create(d),
    onSuccess: () => {
      toast.success("Session created");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const updateMut = useMutation({
    mutationFn: (d) => sessionsApi.update({ ...d, id: selected.id }),
    onSuccess: () => {
      toast.success("Updated");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const cancelMut = useMutation({
    mutationFn: (s) =>
      sessionsApi.update({
        id: s.id,
        instructorId: s.instructorId,
        scheduledDate: s.scheduledDate,
        topic: s.topic,
        hallId: s.hallId || null,
        zoomAccountId: s.zoomAccountId || null,
        status: "CANCELLED",
        cancelledReason: "Cancelled by admin",
      }),
    onSuccess: () => {
      toast.success("Session cancelled");
      invalidate();
      setConfirmDialog(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const completeMut = useMutation({
    mutationFn: (s) =>
      sessionsApi.update({
        id: s.id,
        instructorId: s.instructorId,
        scheduledDate: s.scheduledDate,
        topic: s.topic,
        hallId: s.hallId || null,
        zoomAccountId: s.zoomAccountId || null,
        status: "COMPLETED",
      }),
    onSuccess: () => {
      toast.success("Session marked as completed");
      invalidate();
      setConfirmDialog(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  return (
    <div className="p-6 pb-16 min-h-screen flex flex-col">
      <PageHeader
        title="Sessions"
        subtitle={`${totalCount} total`}
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            Add Session
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Scheduled"
          value={scheduled}
          color="bg-blue-600"
          icon={CalendarDays}
        />
        <StatCard
          title="Completed"
          value={completed}
          color="bg-green-600"
          icon={CalendarDays}
        />
        <StatCard
          title="Cancelled"
          value={cancelled}
          color="bg-red-500"
          icon={CalendarDays}
        />
      </div>

      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center gap-3">
          <SearchInput
            value={filters.search}
            onChange={(v) => setFilter("search", v)}
            placeholder="Search group or topic…"
          />
          <select
            className="input w-48 text-sm"
            value={filters.groupFilter}
            onChange={(e) => setFilter("groupFilter", e.target.value)}
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            className="input w-36 text-sm"
            value={filters.statusFilter}
            onChange={(e) => setFilter("statusFilter", e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            className="input w-44 text-sm"
            value={filters.periodLabelFilter}
            onChange={(e) => setFilter("periodLabelFilter", e.target.value)}
          >
            <option value="">All Periods</option>
            {periodLabels.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={resetFilters}
            title="Reset all filters"
            disabled={!isAnyFilterActive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isAnyFilterActive
                ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-default"
            }`}
          >
            <RotateCcw size={12} /> Reset Filters
          </button>
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records
          </span>
        </div>

        <Table
          loading={isLoading}
          data={sessions}
          emptyMsg="No sessions found."
          columns={[
            {
              key: "groupName",
              label: "Group",
              render: (r) => r.groupName || "—",
            },
            {
              key: "strategy",
              label: "Strategy",
              render: (r) => <Badge label={r.paymentStrategy || "MONTHLY"} />,
            },
            { key: "num", label: "#", render: (r) => `#${r.sessionNumber}` },
            {
              key: "periodLabel",
              label: "Period",
              render: (r) => r.periodLabel || "—",
            },
            {
              key: "instructor",
              label: "Instructor",
              render: (r) => r.instructorName || "—",
            },
            {
              key: "topic",
              label: "Topic",
              render: (r) => r.topic || "—",
            },
            {
              key: "date",
              label: "Date & Time",
              render: (r) =>
                new Date(r.scheduledDate).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <Badge
                  label={r.status}
                  color={
                    r.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : r.status === "CANCELLED"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                  }
                />
              ),
            },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelected(r);
                      setModal("view");
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="View Details"
                  >
                    <Eye size={14} />
                  </button>
                  {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                    <button
                      onClick={() => {
                        setSelected(r);
                        setModal("attendance");
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 rounded-md"
                      title="Open Attendance"
                    >
                      <QrCode size={13} /> Attendance
                    </button>
                  )}
                  {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                    <button
                      onClick={() => {
                        setSelected(r);
                        setModal("edit");
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                  {r.status === "SCHEDULED" && (
                    <button
                      onClick={() =>
                        setConfirmDialog({ type: "complete", session: r })
                      }
                      className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 rounded"
                      title="Complete Session"
                    >
                      <CheckCircle size={14} />
                    </button>
                  )}
                  {r.status !== "CANCELLED" && r.status !== "COMPLETED" && (
                    <button
                      onClick={() =>
                        setConfirmDialog({ type: "cancel", session: r })
                      }
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded"
                      title="Cancel Session"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  {r.status === "CANCELLED" && (
                    <WaButton
                      label="Notify group"
                      onSend={() =>
                        notificationsApi.sessionCancelledWhatsApp(r.id)
                      }
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* ── Confirm modals ── */}
      <ConfirmModal
        open={confirmDialog?.type === "cancel"}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => cancelMut.mutate(confirmDialog.session)}
        loading={cancelMut.isPending}
        title="Cancel Session"
        message={`Are you sure you want to cancel session #${confirmDialog?.session?.sessionNumber}? This action cannot be undone.`}
        confirmLabel="Yes, Cancel Session"
      />
      <ConfirmModal
        open={confirmDialog?.type === "complete"}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => completeMut.mutate(confirmDialog.session)}
        loading={completeMut.isPending}
        title="Complete Session"
        message={`Mark session #${confirmDialog?.session?.sessionNumber} as completed? Attendance and edits will be locked.`}
        confirmLabel="Yes, Complete Session"
        confirmClass="bg-green-600 hover:bg-green-700 text-white"
      />

      {/* ── Create / Edit modals ── */}
      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="New Session"
      >
        <SessionForm
          groups={groups}
          halls={halls}
          zooms={zooms}
          periodLabels={periodLabels}
          onSubmit={createMut.mutate}
          loading={createMut.isPending}
        />
      </Modal>

      <Modal
        open={modal === "edit"}
        onClose={() => setModal(null)}
        title="Edit Session"
      >
        {selected && (
          <SessionForm
            groups={groups}
            halls={halls}
            zooms={zooms}
            periodLabels={periodLabels}
            initial={{
              ...selected,
              groupId: String(selected.groupId ?? ""),
              instructorId: selected.instructorId
                ? String(selected.instructorId)
                : "",
              periodLabelId: String(selected.periodLabelId ?? ""),
              hallId: selected.hallId ? String(selected.hallId) : "",
              zoomAccountId: selected.zoomAccountId
                ? String(selected.zoomAccountId)
                : "",
              scheduledDate: selected.scheduledDate
                ? new Date(
                    new Date(selected.scheduledDate).getTime() -
                      new Date(selected.scheduledDate).getTimezoneOffset() *
                        60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : "",
            }}
            onSubmit={updateMut.mutate}
            loading={updateMut.isPending}
          />
        )}
      </Modal>

      {modal === "attendance" && selected && (
        <AttendanceModal session={selected} onClose={() => setModal(null)} />
      )}
      {modal === "view" && selected && (
        <SessionViewModal session={selected} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
