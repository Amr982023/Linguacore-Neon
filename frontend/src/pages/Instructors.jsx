import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  instructorsApi,
  lookupsApi,
  paymentsApi,
  closingApi,
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
  SearchInput,
  StatCard,
  Tabs,
  ConfirmDialog,
} from "../components/ui";
import {
  Plus,
  Edit,
  Eye,
  UserCheck,
  BookOpen,
  RotateCcw,
  PowerOff,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 10;
const DEFAULT_FILTERS = { search: "", languageId: "", activeFilter: "" };
const PHONE_RE = /^[0-9+\s\-()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NATIONAL_ID_RE = /^[0-9]{14}$/;

// ── InstructorForm ────────────────────────────────────────────────────────────
function InstructorForm({
  initial,
  onSubmit,
  loading,
  languages = [],
  assignedGroups = [],
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: initial });

  const handleValid = (data) => {
    const languageIds = Array.isArray(data.languageIds)
      ? data.languageIds
      : [data.languageIds].filter(Boolean);

    if (languageIds.length === 0) {
      toast.error("Please select at least one language.");
      return;
    }

    // ── guard: check if any removed language is still used by a group ──
    if (assignedGroups.length > 0) {
      const originalIds = (initial?.languageIds || []).map(String);
      const newIds = languageIds.map(String);
      const removedIds = originalIds.filter((id) => !newIds.includes(id));

      if (removedIds.length > 0) {
        const blockedGroups = assignedGroups.filter((g) =>
          removedIds.includes(String(g.languageId)),
        );

        if (blockedGroups.length > 0) {
          const groupNames = blockedGroups.map((g) => `"${g.name}"`).join(", ");
          toast.error(
            `Cannot remove language — still assigned to group${blockedGroups.length > 1 ? "s" : ""}: ${groupNames}`,
            { duration: 5000 },
          );
          return;
        }
      }
    }

    onSubmit({ ...data, languageIds });
  };

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
            min: { value: 18, message: "Instructor must be at least 18" },
            max: { value: 100, message: "Age seems too high" },
          })}
        />
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

      <div>
        <label className="label">Languages *</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {languages.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <input
                type="checkbox"
                value={l.id}
                {...register("languageIds")}
                className="rounded"
              />
              {l.name}
            </label>
          ))}
        </div>
        {languages.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">No languages available</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          {initial?.id ? "Update" : "Create Instructor"}
        </Button>
      </div>
    </form>
  );
}

// ── InstructorDetail ──────────────────────────────────────────────────────────
function InstructorDetail({ instructor, onClose }) {
  const [tab, setTab] = useState("commissions");

  const { data: commRes } = useQuery({
    queryKey: ["comm", instructor.id],
    queryFn: () => paymentsApi.getCommission(instructor.id, null, null),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const { data: closRes } = useQuery({
    queryKey: ["instructor-closings", instructor.id],
    queryFn: () => closingApi.getByInstructor(instructor.id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const commissions = commRes?.data?.data || [];
  const closings = closRes?.data?.data || [];

  const totalComm = commissions
    .filter((c) => !c.isAdjustment)
    .reduce((s, c) => s + c.commissionAmount, 0);

  const p = instructor.person || {};

  return (
    <Modal
      open
      onClose={onClose}
      title={`${p.firstName} ${p.lastName} — Details`}
      size="lg"
    >
      <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        {[
          ["Branch", instructor.branchName || "—"],
          ["Phone", p.phone || "—"],
          ["Email", p.email || "—"],
          ["Languages", (instructor.languages || []).join(", ") || "—"],
          ["Status", instructor.isActive ? "Active" : "Inactive"],
        ].map(([l, v]) => (
          <div key={l}>
            <p className="text-xs text-gray-500">{l}</p>
            <p className="text-sm font-medium dark:text-gray-200">{v}</p>
          </div>
        ))}
        <div>
          <p className="text-xs text-gray-500">Total Commission</p>
          <p className="text-sm font-bold text-green-600">
            {totalComm.toLocaleString()} EGP
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            key: "commissions",
            label: "Commission Ledger",
            count: commissions.length,
          },
          {
            key: "closings",
            label: "Monthly Closings",
            count: closings.length,
          },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "commissions" && (
        <Table
          columns={[
            { key: "groupName", label: "Group" },
            { key: "periodLabel", label: "Period" },
            {
              key: "grossPayment",
              label: "Gross",
              render: (r) => `${r.grossPayment} EGP`,
            },
            {
              key: "commissionPct",
              label: "%",
              render: (r) => `${r.commissionPct}%`,
            },
            {
              key: "commissionAmount",
              label: "Commission",
              render: (r) => (
                <span
                  className={r.isAdjustment ? "text-red-500" : "text-green-600"}
                >
                  {r.isAdjustment ? "-" : ""}
                  {r.commissionAmount} EGP
                </span>
              ),
            },
            {
              key: "centreAmount",
              label: "Centre",
              render: (r) => `${r.centreAmount} EGP`,
            },
            {
              key: "isAdjustment",
              label: "Type",
              render: (r) => (
                <Badge
                  label={r.isAdjustment ? "ADJUSTMENT" : "NORMAL"}
                  color={
                    r.isAdjustment
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }
                />
              ),
            },
          ]}
          data={commissions}
          emptyMsg="No commission records."
        />
      )}

      {tab === "closings" && (
        <Table
          columns={[
            {
              key: "periodStart",
              label: "Period Start",
              render: (r) => new Date(r.periodStart).toLocaleDateString(),
            },
            {
              key: "periodEnd",
              label: "Period End",
              render: (r) => new Date(r.periodEnd).toLocaleDateString(),
            },
            {
              key: "totalCommission",
              label: "Commission",
              render: (r) => `${r.totalCommission.toLocaleString()} EGP`,
            },
            {
              key: "totalDeductions",
              label: "Deductions",
              render: (r) => `${r.totalDeductions.toLocaleString()} EGP`,
            },
            {
              key: "netPayable",
              label: "Net Payable",
              render: (r) => (
                <span className="font-semibold text-green-600">
                  {r.netPayable.toLocaleString()} EGP
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge label={r.status} />,
            },
          ]}
          data={closings}
          emptyMsg="No closings yet."
        />
      )}
    </Modal>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, totalCount, pageSize, onPageChange }) {
  if (totalPages <= 0) return null;
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
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
export default function Instructors() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();

  // draftFilters: bound to the inputs, no network effect on change.
  // appliedFilters: only updated when the user explicitly hits Apply
  // (or Enter in the search box), or Reset. This is what drives the query.
  const [draftFilters, setDraftFilters] = useState({ ...DEFAULT_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const setDraft = (key, value) =>
    setDraftFilters((prev) => ({ ...prev, [key]: value }));

  const applyFilters = (e) => {
    e?.preventDefault?.();
    setAppliedFilters(draftFilters);
    setPage(1);
  };

  const resetFilters = () => {
    setDraftFilters({ ...DEFAULT_FILTERS });
    setAppliedFilters({ ...DEFAULT_FILTERS });
    setPage(1);
  };

  const isAnyFilterActive = useMemo(
    () =>
      Object.entries(appliedFilters).some(([k, v]) => v !== DEFAULT_FILTERS[k]) ||
      Object.entries(draftFilters).some(([k, v]) => v !== DEFAULT_FILTERS[k]),
    [appliedFilters, draftFilters],
  );

  const hasUnappliedChanges = useMemo(
    () => JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
    [draftFilters, appliedFilters],
  );

  const queryParams = {
    page,
    pageSize: PAGE_SIZE,
    ...(appliedFilters.search && { search: appliedFilters.search }),
    ...(appliedFilters.languageId && { languageId: appliedFilters.languageId }),
    ...(appliedFilters.activeFilter && {
      isActive: appliedFilters.activeFilter === "active",
    }),
  };

  // ── Main paged list — only refetches on branch/page/applied-filter change,
  // never on window focus / remount / reconnect ──────────────────────────────
  const { data: res, isLoading, isFetching } = useQuery({
    queryKey: ["instructors", branchId, queryParams],
    queryFn: () => instructorsApi.getByBranch(branchId, queryParams),
    enabled: !!branchId,
    keepPreviousData: true,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const { data: langRes } = useQuery({
    queryKey: ["languages"],
    queryFn: () => lookupsApi.getLanguages(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // ── Lightweight count queries for the stat cards (pageSize:1, we only need totalCount) ──
  const { data: activeCountRes } = useQuery({
    queryKey: ["instructors-count-active", branchId],
    queryFn: () =>
      instructorsApi.getByBranch(branchId, {
        page: 1,
        pageSize: 1,
        isActive: true,
      }),
    enabled: !!branchId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
  const { data: inactiveCountRes } = useQuery({
    queryKey: ["instructors-count-inactive", branchId],
    queryFn: () =>
      instructorsApi.getByBranch(branchId, {
        page: 1,
        pageSize: 1,
        isActive: false,
      }),
    enabled: !!branchId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const pagedData = res?.data?.data;
  const instructors = pagedData?.items || [];
  const totalCount = pagedData?.totalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;
  const languages = langRes?.data?.data || [];
  const activeCount = activeCountRes?.data?.data?.totalCount ?? 0;
  const inactiveCount = inactiveCountRes?.data?.data?.totalCount ?? 0;

  const invalidate = () => {
    qc.invalidateQueries(["instructors"]);
    qc.invalidateQueries(["instructors-count-active"]);
    qc.invalidateQueries(["instructors-count-inactive"]);
  };

  const createMut = useMutation({
    mutationFn: (d) =>
      instructorsApi.create({
        ...d,
        branchId,
        languageIds: Array.isArray(d.languageIds)
          ? d.languageIds
          : [d.languageIds].filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Instructor created");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const updateMut = useMutation({
    mutationFn: (d) =>
      instructorsApi.update({
        ...d,
        id: selected.id,
        languageIds: Array.isArray(d.languageIds)
          ? d.languageIds
          : [d.languageIds].filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Updated");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => instructorsApi.toggleActive(id),
    onSuccess: (_, id) => {
      const wasActive = instructors.find((i) => i.id === id)?.isActive;
      toast.success(
        wasActive ? "Instructor deactivated" : "Instructor reactivated",
      );
      invalidate();
      setToggleTarget(null);
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || "Failed to update status");
      setToggleTarget(null);
    },
  });

  return (
    <div className="p-6 pb-16 min-h-screen flex flex-col">
      <PageHeader
        title="Instructors"
        subtitle={`${activeCount} active`}
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            Add Instructor
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Active"
          value={activeCount}
          icon={UserCheck}
          color="bg-primary-900"
        />
        <StatCard
          title="Total Inactive"
          value={inactiveCount}
          icon={UserCheck}
          color="bg-red-500"
        />
        <StatCard
          title="Languages Offered"
          value={languages.length}
          icon={BookOpen}
          color="bg-blue-500"
        />
      </div>

      <div className="card">
        <form
          onSubmit={applyFilters}
          className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center gap-3"
        >
          <SearchInput
            value={draftFilters.search}
            onChange={(v) => setDraft("search", v)}
            placeholder="Search instructor… (press Enter or Apply)"
          />
          <select
            className="input w-40 text-sm"
            value={draftFilters.languageId}
            onChange={(e) => setDraft("languageId", e.target.value)}
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
            value={draftFilters.activeFilter}
            onChange={(e) => setDraft("activeFilter", e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <Button
            type="submit"
            icon={Search}
            variant={hasUnappliedChanges ? "primary" : "secondary"}
            loading={isFetching && !isLoading}
          >
            Apply
          </Button>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!isAnyFilterActive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${isAnyFilterActive ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-default"}`}
          >
            <RotateCcw size={12} /> Reset Filters
          </button>

          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records
          </span>
        </form>

        <Table
          loading={isLoading}
          data={instructors}
          emptyMsg="No instructors."
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
              key: "email",
              label: "Email",
              render: (r) => r.person?.email || "—",
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
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelected(r);
                      setModal("detail");
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="View details"
                  >
                    <Eye size={14} />
                  </button>
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
                  <button
                    onClick={() => setToggleTarget(r)}
                    disabled={toggleMut.isPending && toggleTarget?.id === r.id}
                    title={r.isActive ? "Deactivate" : "Reactivate"}
                    className={`p-1.5 rounded transition-colors
                      ${
                        r.isActive
                          ? "hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-700"
                          : "hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 hover:text-green-700"
                      }`}
                  >
                    <PowerOff size={14} />
                  </button>
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

      {/* ── toggle confirm dialog ── */}
      {toggleTarget && (
        <ConfirmDialog
          open
          title={
            toggleTarget.isActive
              ? "Deactivate Instructor"
              : "Reactivate Instructor"
          }
          message={
            toggleTarget.isActive
              ? `Deactivate ${toggleTarget.person?.firstName} ${toggleTarget.person?.lastName}? They will no longer appear in active assignment lists.`
              : `Reactivate ${toggleTarget.person?.firstName} ${toggleTarget.person?.lastName}?`
          }
          confirmLabel={toggleTarget.isActive ? "Deactivate" : "Reactivate"}
          confirmVariant={toggleTarget.isActive ? "danger" : "primary"}
          loading={toggleMut.isPending}
          onConfirm={() => toggleMut.mutate(toggleTarget.id)}
          onCancel={() => setToggleTarget(null)}
        />
      )}

      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Add Instructor"
      >
        <InstructorForm
          languages={languages}
          onSubmit={createMut.mutate}
          loading={createMut.isPending}
        />
      </Modal>

      <Modal
        open={modal === "edit"}
        onClose={() => setModal(null)}
        title="Edit Instructor"
      >
        {selected && (
          <InstructorForm
            languages={languages}
            initial={{
              ...selected,
              ...selected.person,
              languageIds: selected.languageIds || [],
            }}
            assignedGroups={selected.groups || []}
            onSubmit={updateMut.mutate}
            loading={updateMut.isPending}
          />
        )}
      </Modal>

      {modal === "detail" && selected && (
        <InstructorDetail
          instructor={selected}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}