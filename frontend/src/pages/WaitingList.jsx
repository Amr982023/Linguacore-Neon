import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  waitingListApi,
  lookupsApi,
  groupsApi,
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
  SearchInput,
  ConfirmDialog,
} from "../components/ui";
import WaButton from "../components/WaButton";
import GmailButton from "../components/GmailButton";
import {
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";

const PAGE_SIZE = 10;
const ALARM_DAYS = 14;
const PHONE_RE = /^[0-9+\s\-()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_LABELS = {
  WAITING: "WAITING",
  ENROLLED: "ENROLLED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
};

// ── WaitingForm ───────────────────────────────────────────────────────────────
function WaitingForm({ initial, onSubmit, loading, languages = [] }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: initial });
  const selectedLanguageId = watch("languageId");

  const { data: lvlRes, isLoading: levelsLoading } = useQuery({
    queryKey: ["language-levels", selectedLanguageId],
    queryFn: () => lookupsApi.getLanguageLevels(selectedLanguageId),
    enabled: !!selectedLanguageId,
  });
  const levels = lvlRes?.data?.data || [];

  const handleValid = (data) => onSubmit(data);
  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className="space-y-3"
    >
      <Input
        label="Full Name *"
        error={errors.name?.message}
        {...register("name", {
          required: "Full name is required",
          minLength: { value: 2, message: "At least 2 characters" },
          maxLength: { value: 100, message: "Max 100 characters" },
          pattern: {
            value: /^[a-zA-Z\u0600-\u06FF\s]+$/,
            message: "Letters only",
          },
        })}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Phone *"
          error={errors.phone?.message}
          {...register("phone", {
            required: "Phone number is required",
            pattern: { value: PHONE_RE, message: "Enter a valid phone number" },
          })}
        />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email", {
            pattern: {
              value: EMAIL_RE,
              message: "Enter a valid email address",
            },
          })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Language *"
          error={errors.languageId?.message}
          {...register("languageId", { required: "Language is required" })}
        >
          <option value="">— Select —</option>
          {languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Select
          label="Level *"
          error={errors.levelId?.message}
          disabled={!selectedLanguageId || levelsLoading}
          {...register("levelId", { required: "Level is required" })}
        >
          <option value="">
            {!selectedLanguageId
              ? "Select Language First"
              : levelsLoading
                ? "Loading..."
                : "— Select —"}
          </option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Reservation Fee (EGP)"
          type="number"
          step="0.01"
          defaultValue={0}
          error={errors.reservationFee?.message}
          {...register("reservationFee", {
            valueAsNumber: true,
            min: { value: 0, message: "Cannot be negative" },
            max: { value: 100000, message: "Amount seems too high" },
          })}
        />
      </div>

      <Input
        label="Notes"
        error={errors.notes?.message}
        {...register("notes", {
          maxLength: { value: 500, message: "Max 500 characters" },
        })}
      />

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          {initial?.id ? "Save Changes" : "Add to Waiting List"}
        </Button>
      </div>
    </form>
  );
}

// ── ConvertForm ───────────────────────────────────────────────────────────────
function ConvertForm({ entry, onSubmit, loading, goals = [] }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      attendanceMode: "OFFLINE",
    },
  });

  const selectedGoalId = watch("goalId");
  const selectedGoal = goals.find(
    (g) => String(g.id) === String(selectedGoalId),
  );
  const subGoals = selectedGoal?.nestedGoals || [];
  const hasSubGoals = subGoals.length > 0;

  const handleValid = (d) => {
    onSubmit({
      ...d,
      waitingListId: entry.id,
      goalId: d.goalId || null,
      nestedGoalId: d.nestedGoalId || null,
    });
  };

  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className="space-y-3"
    >
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
        Converting <strong>{entry.name}</strong> —{" "}
        <span className="font-medium">
          {entry.languageName} · {entry.levelCode}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="National ID"
          error={errors.nationalId?.message}
          {...register("nationalId", {
            pattern: {
              value: /^[0-9]{14}$/,
              message: "Must be exactly 14 digits",
            },
          })}
        />
        <Input
          label="Age"
          type="number"
          error={errors.age?.message}
          {...register("age", {
            valueAsNumber: true,
            min: { value: 3, message: "At least 3 years old" },
            max: { value: 120, message: "Age seems too high" },
          })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Gender" {...register("gender")}>
          <option value="">—</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </Select>
        <Select label="Attendance Mode" {...register("attendanceMode")}>
          <option value="OFFLINE">Offline</option>
          <option value="ONLINE">Online</option>
        </Select>
      </div>

      <Input
        label="WhatsApp Number"
        error={errors.whatsappNumber?.message}
        {...register("whatsappNumber", {
          pattern: {
            value: PHONE_RE,
            message: "Enter a valid WhatsApp number",
          },
        })}
      />

      <Select label="Goal" {...register("goalId")}>
        <option value="">— No goal —</option>
        {goals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>

      {hasSubGoals && (
        <Select label="Sub-Goal" {...register("nestedGoalId")}>
          <option value="">— No sub-goal —</option>
          {subGoals.map((sg) => (
            <option key={sg.id} value={sg.id}>
              {sg.name}
            </option>
          ))}
        </Select>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          Convert &amp; Enroll
        </Button>
      </div>
    </form>
  );
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WaitingList() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("WAITING");
  const [languageFilter, setLanguageFilter] = useState("");
  const [feeFilter, setFeeFilter] = useState("");
  const [page, setPage] = useState(1);

  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const queryParams = {
    page,
    pageSize: PAGE_SIZE,
    ...(statusFilter && { status: statusFilter }),
    ...(languageFilter && { languageId: languageFilter }),
    ...(feeFilter && { hasReservationFee: feeFilter === "WITH" }),
  };

  const { data: res, isLoading } = useQuery({
    queryKey: ["waitinglist", branchId, queryParams],
    queryFn: () => waitingListApi.getByBranch(branchId, queryParams),
    enabled: !!branchId,
    keepPreviousData: true,
  });
  const { data: alarmRes } = useQuery({
    queryKey: ["wl-alarm"],
    queryFn: () =>
      waitingListApi.getExceeding(ALARM_DAYS, {
        branchId,
        page: 1,
        pageSize: 999,
      }),
  });
  const { data: langRes } = useQuery({
    queryKey: ["languages"],
    queryFn: () => lookupsApi.getLanguages(),
  });
  const { data: goalRes } = useQuery({
    queryKey: ["goals"],
    queryFn: () => lookupsApi.getGoals(),
  });

  const pagedData = res?.data?.data;
  const entries = pagedData?.items || [];
  const totalCount = pagedData?.totalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;
  const alarms = alarmRes?.data?.data?.items || alarmRes?.data?.data || [];
  const languages = langRes?.data?.data || [];
  const goals = goalRes?.data?.data || [];

  const filtered = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search),
  );

  const isAnyFilterActive =
    search !== "" ||
    statusFilter !== "WAITING" ||
    languageFilter !== "" ||
    feeFilter !== "";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("WAITING");
    setLanguageFilter("");
    setFeeFilter("");
    setPage(1);
  };

  const { data: waitingRes } = useQuery({
    queryKey: ["wl-count-waiting", branchId],
    queryFn: () =>
      waitingListApi.getByBranch(branchId, {
        page: 1,
        pageSize: 1,
        status: "WAITING",
      }),
    enabled: !!branchId,
  });
  const { data: enrolledRes } = useQuery({
    queryKey: ["wl-count-enrolled", branchId],
    queryFn: () =>
      waitingListApi.getByBranch(branchId, {
        page: 1,
        pageSize: 1,
        status: "ENROLLED",
      }),
    enabled: !!branchId,
  });
  const { data: cancelledRes } = useQuery({
    queryKey: ["wl-count-cancelled", branchId],
    queryFn: () =>
      waitingListApi.getByBranch(branchId, {
        page: 1,
        pageSize: 1,
        status: "CANCELLED",
      }),
    enabled: !!branchId,
  });

  const waiting = waitingRes?.data?.data?.totalCount ?? 0;
  const enrolled = enrolledRes?.data?.data?.totalCount ?? 0;
  const cancelled = cancelledRes?.data?.data?.totalCount ?? 0;
  const alarmed = alarmRes?.data?.data?.totalCount ?? 0;

  const invalidate = () => {
    qc.invalidateQueries(["waitinglist"]);
    qc.invalidateQueries(["wl-count-waiting"]);
    qc.invalidateQueries(["wl-count-enrolled"]);
    qc.invalidateQueries(["wl-count-cancelled"]);
    qc.invalidateQueries(["wl-alarm"]);
  };

  const createMut = useMutation({
    mutationFn: (d) =>
      waitingListApi.create({
        ...d,
        branchId,
      }),
    onSuccess: () => {
      toast.success("Added to waiting list");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const editMut = useMutation({
    mutationFn: (d) =>
      waitingListApi.update({
        id: selected.id,
        name: d.name,
        phone: d.phone,
        email: d.email || null,
        languageId: d.languageId,
        levelId: d.levelId,
        reservationFee: parseFloat(d.reservationFee) || 0,
        notes: d.notes || null,
      }),
    onSuccess: () => {
      toast.success("Entry updated");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const statusMut = useMutation({
    mutationFn: (d) =>
      waitingListApi.updateStatus({ id: selected.id, status: d.status }),
    onSuccess: () => {
      toast.success("Status updated");
      invalidate();
      setModal(null);
    },
  });

  const convertMut = useMutation({
    mutationFn: (d) => waitingListApi.convert(d),
    onSuccess: () => {
      toast.success("Converted to student!");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  return (
    <div className="p-6 pb-16 min-h-screen flex flex-col">
      <PageHeader
        title="Waiting List"
        subtitle={`${waiting} waiting · ${alarmed} exceeded ${ALARM_DAYS} days`}
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            Add to List
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Waiting"
          value={waiting}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Enrolled"
          value={enrolled}
          icon={CheckCircle}
          color="bg-green-600"
        />
        <StatCard
          title="Cancelled"
          value={cancelled}
          icon={XCircle}
          color="bg-gray-500"
        />
        <StatCard
          title="Alarmed"
          value={alarmed}
          icon={AlertCircle}
          color="bg-red-500"
        />
      </div>

      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={handleFilterChange(setSearch)}
            placeholder="Search name or phone…"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              handleFilterChange(setStatusFilter)(e.target.value)
            }
            className="input w-36 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_LABELS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={languageFilter}
            onChange={(e) =>
              handleFilterChange(setLanguageFilter)(e.target.value)
            }
            className="input w-36 text-sm"
          >
            <option value="">All Languages</option>
            {languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={feeFilter}
            onChange={(e) => handleFilterChange(setFeeFilter)(e.target.value)}
            className="input w-40 text-sm"
          >
            <option value="">All Fees</option>
            <option value="WITH">With Reservation Fee</option>
            <option value="WITHOUT">Without Reservation Fee</option>
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
          data={filtered}
          emptyMsg="No waiting list entries."
          columns={[
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email", render: (r) => r.email || "—" },
            { key: "languageName", label: "Language" },
            { key: "levelCode", label: "Level" },
            {
              key: "reservationFee",
              label: "Reservation Fee",
              render: (r) => `${r.reservationFee} EGP`,
            },
            {
              key: "registeredAt",
              label: "Registered",
              render: (r) => new Date(r.registeredAt).toLocaleDateString(),
            },
            {
              key: "waitingDays",
              label: "Days",
              render: (r) => (
                <span
                  className={
                    r.waitingDays >= ALARM_DAYS ? "text-red-500 font-bold" : ""
                  }
                >
                  {r.waitingDays}d
                </span>
              ),
            },
            {
              key: "assignedToName",
              label: "Assigned To",
              render: (r) => r.assignedToName || "—",
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge label={r.status} />,
            },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {r.status === "WAITING" && (
                    <button
                      onClick={() => {
                        setSelected(r);
                        setModal("edit");
                      }}
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-500"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                  )}

                  {r.status === "WAITING" && (
                    <>
                      <button
                        onClick={() => {
                          setSelected(r);
                          setModal("convert");
                        }}
                        className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded text-green-600"
                        title="Convert to Student"
                      >
                        <UserPlus size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setSelected(r);
                          setModal("cancel");
                        }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                        title="Cancel"
                      >
                        <XCircle size={14} />
                      </button>
                    </>
                  )}

                  {/* ── NEW: WhatsApp + Gmail alarm buttons ──────────────── */}
                  {r.status === "WAITING" && r.waitingDays >= ALARM_DAYS && (
                    <>
                      <WaButton
                        label="Remind"
                        onSend={() =>
                          notificationsApi.waitingListAlarmWhatsApp(r.id)
                        }
                      />
                      <GmailButton
                        label="Remind"
                        onSend={() =>
                          notificationsApi.waitingListAlarmGmail(r.id)
                        }
                      />
                    </>
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

      {/* Create modal */}
      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Add to Waiting List"
      >
        <WaitingForm
          languages={languages}
          onSubmit={createMut.mutate}
          loading={createMut.isPending}
        />
      </Modal>

      {/* Edit modal */}
      {modal === "edit" && selected && (
        <Modal
          open
          onClose={() => setModal(null)}
          title="Edit Waiting List Entry"
        >
          <WaitingForm
            initial={{
              name: selected.name,
              phone: selected.phone,
              email: selected.email,
              languageId: selected.languageId,
              levelId: selected.levelId,
              reservationFee: selected.reservationFee,
              notes: selected.notes,
              id: selected.id,
            }}
            languages={languages}
            onSubmit={editMut.mutate}
            loading={editMut.isPending}
          />
        </Modal>
      )}

      {/* Convert modal */}
      {modal === "convert" && selected && (
        <Modal open onClose={() => setModal(null)} title="Convert to Student">
          <ConvertForm
            entry={selected}
            goals={goals}
            onSubmit={convertMut.mutate}
            loading={convertMut.isPending}
          />
        </Modal>
      )}

      {/* Cancel confirm */}
      <ConfirmDialog
        open={modal === "cancel"}
        title="Cancel Waiting Entry"
        message={`Cancel ${selected?.name}'s waiting list entry?`}
        danger
        onConfirm={() => statusMut.mutate({ status: "CANCELLED" })}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}
