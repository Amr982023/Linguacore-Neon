import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { studentsApi, lookupsApi } from "../services/endpoints";
import { useAuthStore } from "../context/authStore";
import {
  PageHeader,
  Table,
  Modal,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  SearchInput,
  StatCard,
  ConfirmDialog,
} from "../components/ui";
import {
  Plus,
  Eye,
  Edit,
  QrCode,
  Users,
  UserX,
  Languages,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Validation helpers ───────────────────────────────────────────────────────
const PHONE_RE = /^[0-9+\s\-()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NATIONAL_ID_RE = /^[0-9]{14}$/;
const PAGE_SIZE = 20;

// ── Student Form ─────────────────────────────────────────────────────────────
function StudentForm({
  initial,
  onSubmit,
  loading,
  goals = [],
  nestedGoals = [],
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: initial });

  const selectedGoalId = watch("goalId");
  const filteredNested = nestedGoals.filter((n) => n.goalId === selectedGoalId);

  const handleGoalChange = (e) => {
    setValue("goalId", e.target.value);
    setValue("nestedGoalId", "");
  };

  const handleValid = (data) => onSubmit(data);
  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className="space-y-3"
    >
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="First Name *"
          error={errors.firstName?.message}
          {...register("firstName", {
            required: "First name is required",
            minLength: { value: 2, message: "At least 2 characters" },
            maxLength: { value: 50, message: "Max 50 characters" },
            pattern: {
              value: /^[a-zA-Z\u0600-\u06FF\s]+$/,
              message: "Letters only",
            },
          })}
        />
        <Input
          label="Second Name"
          error={errors.secondName?.message}
          {...register("secondName", {
            maxLength: { value: 50, message: "Max 50 characters" },
          })}
        />
        <Input
          label="Last Name *"
          error={errors.lastName?.message}
          {...register("lastName", {
            required: "Last name is required",
            minLength: { value: 2, message: "At least 2 characters" },
            maxLength: { value: 50, message: "Max 50 characters" },
            pattern: {
              value: /^[a-zA-Z\u0600-\u06FF\s]+$/,
              message: "Letters only",
            },
          })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="National ID"
          error={errors.nationalId?.message}
          {...register("nationalId", {
            pattern: {
              value: NATIONAL_ID_RE,
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
            min: { value: 3, message: "Age must be at least 3" },
            max: { value: 120, message: "Age must be at most 120" },
          })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Gender" {...register("gender")}>
          <option value="">— Select —</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </Select>
        <Select label="Attendance Mode" {...register("attendanceMode")}>
          <option value="OFFLINE">Offline</option>
          <option value="ONLINE">Online</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Phone"
          error={errors.phone?.message}
          {...register("phone", {
            pattern: { value: PHONE_RE, message: "Enter a valid phone number" },
          })}
        />
        <Input
          label="WhatsApp"
          error={errors.whatsappNumber?.message}
          {...register("whatsappNumber", {
            pattern: {
              value: PHONE_RE,
              message: "Enter a valid WhatsApp number",
            },
          })}
        />
      </div>

      <Input
        label="Email"
        type="email"
        error={errors.email?.message}
        {...register("email", {
          pattern: { value: EMAIL_RE, message: "Enter a valid email address" },
        })}
      />

      <Input
        label="Address"
        error={errors.address?.message}
        {...register("address", {
          maxLength: { value: 200, message: "Max 200 characters" },
        })}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Goal"
          {...register("goalId")}
          onChange={handleGoalChange}
        >
          <option value="">— No goal —</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>

        <Select
          label="Sub-Goal"
          {...register("nestedGoalId")}
          disabled={!selectedGoalId || filteredNested.length === 0}
        >
          <option value="">— No sub-goal —</option>
          {filteredNested.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-600 dark:text-blue-300">
        💡 Scholarship and Discount % are set per Enrollment — not on the
        student profile.
      </div>

      <Textarea
        label="Notes"
        rows={2}
        error={errors.notes?.message}
        {...register("notes", {
          maxLength: { value: 500, message: "Max 500 characters" },
        })}
      />

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          {initial?.id ? "Update Student" : "Create Student"}
        </Button>
      </div>
    </form>
  );
}

// ── Main Students page ───────────────────────────────────────────────────────
export default function Students() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();

  // ── Filter/pagination state ────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(""); // raw input, debounced below
  const [search, setSearch] = useState(""); // debounced value actually sent to server
  const [filterMode, setFilterMode] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // "" | "active" | "inactive"
  const [filterLanguageId, setFilterLanguageId] = useState("");
  const [filterLevelId, setFilterLevelId] = useState("");
  const [filterGoal, setFilterGoal] = useState("");
  const [filterNestedGoal, setFilterNestedGoal] = useState("");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // Debounce free-text search so we don't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 whenever any filter (other than search, handled above) changes
  useEffect(() => {
    setPage(1);
  }, [
    filterMode,
    filterStatus,
    filterLanguageId,
    filterLevelId,
    filterGoal,
    filterNestedGoal,
  ]);

  const isAnyFilterActive =
    !!search ||
    !!filterMode ||
    !!filterStatus ||
    !!filterLanguageId ||
    !!filterLevelId ||
    !!filterGoal ||
    !!filterNestedGoal;

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilterMode("");
    setFilterStatus("");
    setFilterLanguageId("");
    setFilterLevelId("");
    setFilterGoal("");
    setFilterNestedGoal("");
    setPage(1);
  };

  // ── Server params for the current page/filter combo ───────────────────
  const queryParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      attendanceMode: filterMode || undefined,
      isActive:
        filterStatus === "active"
          ? true
          : filterStatus === "inactive"
            ? false
            : undefined,
      languageId: filterLanguageId || undefined,
      levelId: filterLevelId || undefined,
      goalId: filterGoal || undefined,
      nestedGoalId: filterNestedGoal || undefined,
    }),
    [
      page,
      search,
      filterMode,
      filterStatus,
      filterLanguageId,
      filterLevelId,
      filterGoal,
      filterNestedGoal,
    ],
  );

  const queryKey = ["students", branchId, queryParams];

  // ── Queries — all automatic refetch triggers OFF. Only the user's own
  // actions (typing a filter, changing page, or a mutation) drive a refetch.
  const {
    data: res,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: () => studentsApi.getByBranchPaged(branchId, queryParams),
    enabled: !!branchId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    keepPreviousData: true,
  });

  const { data: gRes } = useQuery({
    queryKey: ["goals"],
    queryFn: lookupsApi.getGoals,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: langRes } = useQuery({
    queryKey: ["languages"],
    queryFn: lookupsApi.getLanguages,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Levels for the currently selected filter language.
  // Confirmed shape: GetLanguageLevelsAsync returns IEnumerable<LookupResponse>,
  // i.e. plain { id, name } — id here IS the real Level.Id (LevelRepository
  // returns Level entities directly), which is exactly what the backend
  // filter matches against (Group.LanguageLevel.LevelId). No fallback needed.
  const { data: levelsRes } = useQuery({
    queryKey: ["languageLevels", filterLanguageId],
    queryFn: () => lookupsApi.getLanguageLevels(filterLanguageId),
    enabled: !!filterLanguageId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const students = res?.data?.data?.items || [];
  const totalCount = res?.data?.data?.totalCount || 0;
  const totalPages = res?.data?.data?.totalPages || 1;

  const goals = gRes?.data?.data || [];
  const languages = langRes?.data?.data || [];
  const nestedGoals = goals.flatMap((g) =>
    (g.nestedGoals || []).map((n) => ({ ...n, goalId: g.id })),
  );
  const levelOptions = levelsRes?.data?.data || [];

  const filteredNestedGoalOptions = filterGoal
    ? nestedGoals.filter((n) => n.goalId === filterGoal)
    : nestedGoals;

  // ── Cache patching helpers (no invalidateQueries — direct local patch) ─
  const patchStudents = (updater) => {
    qc.setQueryData(queryKey, (old) => {
      if (!old) return old;
      const items = old.data?.data?.items || [];
      return {
        ...old,
        data: {
          ...old.data,
          data: { ...old.data.data, items: updater(items) },
        },
      };
    });
  };

  const createMut = useMutation({
    mutationFn: (d) =>
      studentsApi.create({
        ...d,
        branchId,
        goalId: d.goalId || null,
        nestedGoalId: d.nestedGoalId || null,
      }),
    onSuccess: (response) => {
      const newStudent = response?.data?.data;
      toast.success("Student created");
      if (newStudent) {
        patchStudents((items) => [newStudent, ...items].slice(0, PAGE_SIZE));
      }
      setModal(null);
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Error creating student"),
  });

  const updateMut = useMutation({
    mutationFn: (d) =>
      studentsApi.update({
        ...d,
        id: selected.id,
        goalId: d.goalId || null,
        nestedGoalId: d.nestedGoalId || null,
      }),
    onSuccess: (response) => {
      const updated = response?.data?.data;
      toast.success("Student updated");
      if (updated) {
        patchStudents((items) =>
          items.map((s) => (s.id === updated.id ? updated : s)),
        );
      }
      setModal(null);
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Error updating student"),
  });

  const deactMut = useMutation({
    mutationFn: (id) => studentsApi.deactivate(id),
    onSuccess: (response, id) => {
      const data = response?.data;
      if (data?.success === false) {
        toast.error(data?.message || "Cannot deactivate student.");
        return;
      }
      toast.success("Student deactivated");
      patchStudents((items) =>
        items.map((s) => (s.id === id ? { ...s, isActive: false } : s)),
      );
      setConfirmId(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const qrMut = useMutation({
    mutationFn: (id) => studentsApi.regenerateQr(id),
    onSuccess: (response, id) => {
      const newQr = response?.data?.data;
      toast.success("QR regenerated");
      if (newQr) {
        patchStudents((items) =>
          items.map((s) => (s.id === id ? { ...s, qrCode: newQr } : s)),
        );
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Students"
        subtitle={`${totalCount} matching record${totalCount === 1 ? "" : "s"}`}
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            Add Student
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total (filtered)"
          value={totalCount}
          icon={Users}
          color="bg-green-600"
        />
        <StatCard
          title="Page"
          value={`${page} / ${totalPages}`}
          icon={UserX}
          color="bg-cyan-500"
        />
        <StatCard
          title="Languages"
          value={languages.length}
          icon={Languages}
          color="bg-purple-500"
        />
      </div>
      {/* NOTE: Active/Inactive/Scholarship-wide counts were previously computed
          client-side from the full unpaginated list. With server-side paging
          that data no longer exists on the client — if you need true
          branch-wide totals (not just "matching current filter"), add a
          lightweight dashboard/summary endpoint instead of scanning all rows. */}

      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name or phone…"
          />
          <select
            className="input w-36 text-sm"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
          >
            <option value="">All Modes</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
          <select
            className="input w-36 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="input w-40 text-sm"
            value={filterLanguageId}
            onChange={(e) => {
              setFilterLanguageId(e.target.value);
              setFilterLevelId("");
            }}
          >
            <option value="">All Languages</option>
            {languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            className="input w-36 text-sm"
            value={filterLevelId}
            onChange={(e) => setFilterLevelId(e.target.value)}
            disabled={!filterLanguageId}
          >
            <option value="">All Levels</option>
            {levelOptions.map((lv) => (
              <option key={lv.id} value={lv.id}>
                {lv.name}
              </option>
            ))}
          </select>
          <select
            className="input w-44 text-sm"
            value={filterGoal}
            onChange={(e) => {
              setFilterGoal(e.target.value);
              setFilterNestedGoal("");
            }}
          >
            <option value="">All Goals</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            className="input w-44 text-sm"
            value={filterNestedGoal}
            onChange={(e) => setFilterNestedGoal(e.target.value)}
            disabled={!filterGoal || filteredNestedGoalOptions.length === 0}
          >
            <option value="">
              {filterGoal && filteredNestedGoalOptions.length === 0
                ? "No Sub-Goals"
                : "Sub-Goals"}
            </option>
            {filteredNestedGoalOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <button
            onClick={resetFilters}
            title="Reset all filters"
            disabled={!isAnyFilterActive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${
                isAnyFilterActive
                  ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-default"
              }`}
          >
            <RotateCcw size={12} /> Reset Filters
          </button>
          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>

        <Table
          loading={isLoading}
          data={students}
          emptyMsg="No students found."
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
            { key: "goal", label: "Goal", render: (r) => r.goalName || "—" },
            {
              key: "subgoal",
              label: "Sub-Goal",
              render: (r) => r.nestedGoalName || "—",
            },
            {
              key: "langs",
              label: "Languages",
              render: (r) => {
                const langs = r.activeLanguages || [];
                return langs.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {langs.map((l) => (
                      <span
                        key={l}
                        className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                ) : (
                  "—"
                );
              },
            },
            {
              key: "levels",
              label: "Levels",
              render: (r) => {
                const levels = r.activeLevels || [];
                return levels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {levels.map((l) => (
                      <span
                        key={l}
                        className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                ) : (
                  "—"
                );
              },
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <Badge label={r.isActive ? "ACTIVE" : "INACTIVE"} />
              ),
            },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/students/${r.id}/portfolio`)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="Portfolio"
                  >
                    <Eye size={14} />
                  </button>
                  {r.isActive && (
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
                  {r.isActive && (
                    <button
                      onClick={() => qrMut.mutate(r.id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Regenerate QR"
                    >
                      <QrCode size={14} />
                    </button>
                  )}
                  {r.isActive && (
                    <button
                      onClick={() => setConfirmId(r.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                      title="Deactivate"
                    >
                      <UserX size={14} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />

        <div className="flex items-center justify-between p-3 border-t dark:border-gray-700 text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Add New Student"
      >
        <StudentForm
          goals={goals}
          nestedGoals={nestedGoals}
          onSubmit={createMut.mutate}
          loading={createMut.isPending}
        />
      </Modal>

      <Modal
        open={modal === "edit"}
        onClose={() => setModal(null)}
        title="Edit Student"
      >
        {selected && (
          <StudentForm
            goals={goals}
            nestedGoals={nestedGoals}
            initial={{ ...selected, ...selected.person }}
            onSubmit={updateMut.mutate}
            loading={updateMut.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="Deactivate Student"
        message="Deactivate this student? They will lose access to active groups."
        danger
        onConfirm={() => deactMut.mutate(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
