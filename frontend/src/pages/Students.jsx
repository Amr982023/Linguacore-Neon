import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  studentsApi,
  lookupsApi,
  enrollmentsApi,
  examsApi,
} from "../services/endpoints";
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
  Award,
  Languages,
  RotateCcw,
} from "lucide-react";

// ── Validation helpers ───────────────────────────────────────────────────────
const PHONE_RE = /^[0-9+\s\-()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NATIONAL_ID_RE = /^[0-9]{14}$/;

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
    setValue, // ← added
    formState: { errors },
  } = useForm({ defaultValues: initial });

  const selectedGoalId = watch("goalId");
  const filteredNested = nestedGoals.filter((n) => n.goalId === selectedGoalId);

  // ← Reset nestedGoalId whenever the parent goal changes
  const handleGoalChange = (e) => {
    setValue("goalId", e.target.value);
    setValue("nestedGoalId", "");
  };

  const handleValid = (data) => {
    onSubmit(data);
  };

  const handleInvalid = () => {
    toast.error("Please fix the highlighted fields before submitting.");
  };

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
        {/* Goal — uses handleGoalChange to reset nestedGoalId */}
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

        {/* Sub-Goal — value is controlled by RHF; cleared on goal change */}
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

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLang, setFilterLang] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterGoal, setFilterGoal] = useState("");
  const [filterNestedGoal, setFilterNestedGoal] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const isAnyFilterActive =
    !!search ||
    !!filterMode ||
    !!filterStatus ||
    !!filterLang ||
    !!filterLevel ||
    !!filterGoal ||
    !!filterNestedGoal;

  const resetFilters = () => {
    setSearch("");
    setFilterMode("");
    setFilterStatus("");
    setFilterLang("");
    setFilterLevel("");
    setFilterGoal("");
    setFilterNestedGoal("");
  };

  const { data: res, isLoading } = useQuery({
    queryKey: ["students", branchId],
    queryFn: () => studentsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const { data: gRes } = useQuery({
    queryKey: ["goals"],
    queryFn: lookupsApi.getGoals,
  });
  const { data: langRes } = useQuery({
    queryKey: ["languages"],
    queryFn: lookupsApi.getLanguages,
  });

  const students = res?.data?.data || [];
  const goals = gRes?.data?.data || [];
  const languages = langRes?.data?.data || [];
  const nestedGoals = goals.flatMap((g) =>
    (g.nestedGoals || []).map((n) => ({ ...n, goalId: g.id })),
  );

  const filteredNestedGoalOptions = filterGoal
    ? nestedGoals.filter((n) => n.goalId === filterGoal)
    : nestedGoals;

  const allLevelOptions = [
    ...new Set(
      students
        .filter(
          (s) => !filterLang || (s.activeLanguages || []).includes(filterLang),
        )
        .flatMap((s) => s.activeLevels || []),
    ),
  ].sort();

  const filtered = students.filter((s) => {
    const name =
      `${s.person?.firstName || ""} ${s.person?.lastName || ""}`.toLowerCase();
    const q = search.toLowerCase();
    if (q && !name.includes(q) && !(s.person?.phone || "").includes(q))
      return false;
    if (filterMode && s.attendanceMode !== filterMode) return false;
    if (filterStatus === "active" && !s.isActive) return false;
    if (filterStatus === "inactive" && s.isActive) return false;
    if (filterLang && !(s.activeLanguages || []).includes(filterLang))
      return false;
    if (filterLevel && !(s.activeLevels || []).includes(filterLevel))
      return false;
    if (filterGoal && s.goalId !== filterGoal) return false;
    if (filterNestedGoal && s.nestedGoalId !== filterNestedGoal) return false;
    return true;
  });

  const invalidate = () => qc.invalidateQueries(["students"]);

  const createMut = useMutation({
    mutationFn: (d) =>
      studentsApi.create({
        ...d,
        branchId,
        goalId: d.goalId || null,
        nestedGoalId: d.nestedGoalId || null,
      }),
    onSuccess: () => {
      toast.success("Student created");
      invalidate();
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
    onSuccess: () => {
      toast.success("Student updated");
      invalidate();
      setModal(null);
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Error updating student"),
  });

  const deactMut = useMutation({
    mutationFn: (id) => studentsApi.deactivate(id),
    onSuccess: (response) => {
      const data = response?.data;
      if (data?.success === false) {
        toast.error(data?.message || "Cannot deactivate student.");
        return;
      }
      toast.success("Student deactivated");
      invalidate();
      setConfirmId(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const qrMut = useMutation({
    mutationFn: (id) => studentsApi.regenerateQr(id),
    onSuccess: () => {
      toast.success("QR regenerated");
      invalidate();
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const scholarCount = students.filter((s) =>
    (s.activeEnrollments || []).some((e) => e.scholarship),
  ).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Students"
        subtitle={`${students.filter((s) => s.isActive).length} active · ${students.filter((s) => !s.isActive).length} inactive`}
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            Add Student
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Active"
          value={students.filter((s) => s.isActive).length}
          icon={Users}
          color="bg-green-600"
        />
        <StatCard
          title="Inactive"
          value={students.filter((s) => !s.isActive).length}
          icon={UserX}
          color="bg-red-500"
        />
        <StatCard
          title="Scholarships"
          value={scholarCount}
          icon={Award}
          color="bg-purple-500"
        />
        <StatCard
          title="Languages"
          value={
            [...new Set(students.flatMap((s) => s.activeLanguages || []))]
              .length
          }
          icon={Languages}
          color="bg-cyan-500"
        />
      </div>

      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
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
            value={filterLang}
            onChange={(e) => {
              setFilterLang(e.target.value);
              setFilterLevel("");
            }}
          >
            <option value="">All Languages</option>
            {languages.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            className="input w-36 text-sm"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="">All Levels</option>
            {allLevelOptions.map((lv) => (
              <option key={lv} value={lv}>
                {lv}
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
            {filtered.length} records
          </span>
        </div>

        <Table
          loading={isLoading}
          data={filtered}
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
