import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { usersApi, lookupsApi } from "../services/endpoints";
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
  ConfirmDialog,
} from "../components/ui";
import {
  Plus,
  UserCheck,
  UserX,
  Users,
  Shield,
  KeyRound,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";

const PAGE_SIZE = 20;

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

// ── Create User Form ──────────────────────────────────────────────────────────
function CreateUserForm({ onSubmit, loading, branches = [], roles = [] }) {
  const [showPwd, setShowPwd] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const password = watch("password");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="First Name *"
          error={errors.firstName?.message}
          {...register("firstName", { required: "Required" })}
        />
        <Input label="Middle Name" {...register("secondName")} />
        <Input
          label="Last Name *"
          error={errors.lastName?.message}
          {...register("lastName", { required: "Required" })}
        />
      </div>

      <Input
        label="Email *"
        type="email"
        placeholder="user@linguacore.com"
        error={errors.email?.message}
        {...register("email", { required: "Required" })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Phone"
          placeholder="+20 1xx xxx xxxx"
          {...register("phone")}
        />
        <Input
          label="WhatsApp"
          placeholder="+20 1xx xxx xxxx"
          {...register("whatsappNumber")}
        />
      </div>

      <Input
        label="Address"
        placeholder="Street, City, Country"
        {...register("address")}
      />

      <div className="grid grid-cols-3 gap-3">
        <Input label="National ID" {...register("nationalId")} />
        <Input
          label="Age"
          type="number"
          {...register("age", { valueAsNumber: true })}
        />
        <Select label="Gender" {...register("gender")}>
          <option value="">— Select —</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t dark:border-gray-700">
        <div className="relative">
          <Input
            label="Password *"
            type={showPwd ? "text" : "password"}
            placeholder="Min 8 characters"
            error={errors.password?.message}
            {...register("password", {
              required: "Required",
              minLength: { value: 8, message: "Minimum 8 characters" },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
          >
            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <div className="relative">
          <Input
            label="Confirm Password *"
            type={showPwd ? "text" : "password"}
            placeholder="Repeat password"
            error={errors.confirm?.message}
            {...register("confirm", {
              required: "Required",
              validate: (v) => v === password || "Passwords do not match",
            })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Branch *"
          error={errors.branchId?.message}
          {...register("branchId", { required: "Required" })}
        >
          <option value="">— Select Branch —</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select
          label="Role *"
          error={errors.roleId?.message}
          {...register("roleId", { required: "Required" })}
        >
          <option value="">— Select Role —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading} icon={Plus}>
          Create User
        </Button>
      </div>
    </form>
  );
}

// ── Reset Password Form ───────────────────────────────────────────────────────
function ResetPasswordForm({ user, onSubmit, loading }) {
  const [showPwd, setShowPwd] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const password = watch("newPassword");

  return (
    <form
      onSubmit={handleSubmit((d) => onSubmit(d.newPassword))}
      className="space-y-4"
    >
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
        Resetting password for <strong>{user.name}</strong>
      </div>
      <div className="relative">
        <Input
          label="New Password *"
          type={showPwd ? "text" : "password"}
          placeholder="Min 8 characters"
          error={errors.newPassword?.message}
          {...register("newPassword", {
            required: "Required",
            minLength: { value: 8, message: "Minimum 8 characters" },
          })}
        />
        <button
          type="button"
          onClick={() => setShowPwd((v) => !v)}
          className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
        >
          {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <Input
        label="Confirm Password *"
        type={showPwd ? "text" : "password"}
        placeholder="Repeat password"
        error={errors.confirm?.message}
        {...register("confirm", {
          required: "Required",
          validate: (v) => v === password || "Passwords do not match",
        })}
      />
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading} icon={KeyRound}>
          Reset Password
        </Button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user: me, branchId: myBranchId } = useAuthStore();

  const [modal, setModal] = useState(null); // "create" | "reset"
  const [selected, setSelected] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewBranchId, setViewBranchId] = useState(myBranchId || "");
  const [page, setPage] = useState(1);

  // Debounce free-text search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [viewBranchId]);

  // ── Lookups — branches (for the branch selector) and roles (for create form)
  const { data: branchRes } = useQuery({
    queryKey: ["branches"],
    queryFn: lookupsApi.getBranches,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const { data: rolesRes } = useQuery({
    queryKey: ["roles"],
    queryFn: lookupsApi.getRoles,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const branches = branchRes?.data?.data || [];
  const roles = rolesRes?.data?.data || [];

  // ── Paged, branch-scoped user list ─────────────────────────────────────
  // NOTE: usersApi.getByBranchPaged is branch-scoped by design — there is no
  // "all branches at once" paged endpoint on the backend yet (the old
  // usersApi.getAll() fetched literally every user, unscoped, which is what
  // this replaces). The branch selector below lets an admin switch which
  // branch's users they're viewing/paging through. If a true cross-branch
  // view is needed, that requires a new backend GetAllPagedAsync method —
  // this page does not attempt to fake that client-side.
  const queryParams = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, search: search || undefined }),
    [page, search],
  );
  const queryKey = ["users", viewBranchId, queryParams];

  const {
    data: usersRes,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: () => usersApi.getByBranchPaged(viewBranchId, queryParams),
    enabled: !!viewBranchId,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    keepPreviousData: true,
  });

  const users = usersRes?.data?.data?.items || [];
  const totalCount = usersRes?.data?.data?.totalCount || 0;
  const totalPages = usersRes?.data?.data?.totalPages || 1;

  // These now describe only the current page, not the branch as a whole.
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;
  const roleCount = [...new Set(users.map((u) => u.roleName))].length;

  // ── Cache patch helper — mutate a row in the current page's cache ─────
  const patchUsers = (updater) => {
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
    mutationFn: (d) => usersApi.create(d),
    onSuccess: (response) => {
      const newUser = response?.data?.data;
      toast.success("User created");
      // Only splice into the visible list if it belongs to the branch
      // currently being viewed — otherwise leave the list as-is.
      if (newUser && newUser.branchId === viewBranchId) {
        patchUsers((items) => [newUser, ...items].slice(0, PAGE_SIZE));
      }
      setModal(null);
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to create user"),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => usersApi.toggleActive(id),
    onSuccess: (_response, id) => {
      const u = users.find((x) => x.id === id);
      toast.success(`${u?.name} ${u?.isActive ? "deactivated" : "activated"}`);
      patchUsers((items) =>
        items.map((x) => (x.id === id ? { ...x, isActive: !x.isActive } : x)),
      );
      setToggleTarget(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, password }) =>
      usersApi.resetPassword(id, { newPassword: password }),
    onSuccess: () => {
      toast.success("Password reset successfully");
      setModal(null);
      setSelected(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  return (
    <div className="p-6">
      <PageHeader
        title="User Management"
        subtitle="Manage system users, roles and access"
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            Add User
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total (filtered)"
          value={totalCount}
          icon={Users}
          color="bg-primary-900"
        />
        <StatCard
          title="Active (page)"
          value={activeCount}
          icon={UserCheck}
          color="bg-green-600"
        />
        <StatCard
          title="Inactive (page)"
          value={inactiveCount}
          icon={UserX}
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
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-gray-400" />
            <select
              value={viewBranchId}
              onChange={(e) => setViewBranchId(e.target.value)}
              className="input w-48 text-sm"
            >
              <option value="">— Select Branch —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or role…"
            className="input flex-1 min-w-[200px] text-sm"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                         bg-red-50 text-red-600 hover:bg-red-100
                         dark:bg-red-900/20 dark:text-red-400
                         border border-red-200 dark:border-red-800"
            >
              <RotateCcw size={12} /> Clear
            </button>
          )}
          <span className="text-xs text-gray-500">
            {totalCount} records{isFetching ? " · updating…" : ""}
          </span>
        </div>

        {!viewBranchId ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Select a branch above to view its users.
          </div>
        ) : (
          <>
            <Table
              loading={isLoading}
              data={users}
              emptyMsg="No users found."
              columns={[
                {
                  key: "name",
                  label: "Name",
                  render: (r) => (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center
                                   text-white text-sm font-bold flex-shrink-0 cursor-pointer
                                   hover:opacity-80 transition-opacity"
                        style={{
                          background:
                            r.id === me?.id
                              ? "linear-gradient(135deg,#00d4ff,#0055cc)"
                              : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                        }}
                        onClick={() => navigate(`/users/${r.id}`)}
                      >
                        {r.name?.[0]?.toUpperCase() ?? "U"}
                      </div>

                      <div>
                        <button
                          onClick={() => navigate(`/users/${r.id}`)}
                          className="text-sm font-medium text-gray-900 dark:text-white
                                     hover:text-blue-600 dark:hover:text-blue-400
                                     transition-colors text-left"
                        >
                          {r.name}
                          {r.id === me?.id && (
                            <span
                              className="ml-2 text-[10px] bg-blue-100 text-blue-700
                                              dark:bg-blue-900/30 dark:text-blue-300
                                              px-1.5 py-0.5 rounded-full font-semibold"
                            >
                              You
                            </span>
                          )}
                        </button>
                        <p className="text-xs text-gray-400">{r.email}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "roleName",
                  label: "Role",
                  render: (r) => (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium
                                     bg-purple-50 text-purple-700
                                     dark:bg-purple-900/20 dark:text-purple-300
                                     px-2.5 py-1 rounded-full"
                    >
                      <Shield size={11} /> {r.roleName}
                    </span>
                  ),
                },
                {
                  key: "branchName",
                  label: "Branch",
                  render: (r) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {r.branchName ?? "—"}
                    </span>
                  ),
                },
                {
                  key: "isActive",
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
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelected(r);
                          setModal("reset");
                        }}
                        title="Reset password"
                        className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20
                                   text-amber-500 rounded transition-colors"
                      >
                        <KeyRound size={14} />
                      </button>

                      {r.id !== me?.id && (
                        <button
                          onClick={() => setToggleTarget(r)}
                          title={r.isActive ? "Deactivate" : "Activate"}
                          className={`p-1.5 rounded transition-colors ${
                            r.isActive
                              ? "hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                              : "hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                          }`}
                        >
                          {r.isActive ? (
                            <UserX size={14} />
                          ) : (
                            <UserCheck size={14} />
                          )}
                        </button>
                      )}
                    </div>
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
          </>
        )}
      </div>

      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Add New User"
        size="md"
      >
        <CreateUserForm
          branches={branches}
          roles={roles}
          onSubmit={createMut.mutate}
          loading={createMut.isPending}
        />
      </Modal>

      {modal === "reset" && selected && (
        <Modal
          open
          onClose={() => {
            setModal(null);
            setSelected(null);
          }}
          title="Reset Password"
          size="sm"
        >
          <ResetPasswordForm
            user={selected}
            onSubmit={(password) =>
              resetMut.mutate({ id: selected.id, password })
            }
            loading={resetMut.isPending}
          />
        </Modal>
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.isActive ? "Deactivate User?" : "Activate User?"}
        message={
          toggleTarget?.isActive
            ? `Deactivate ${toggleTarget?.name}? They will lose system access.`
            : `Activate ${toggleTarget?.name}? They will regain system access.`
        }
        onConfirm={() => toggleMut.mutate(toggleTarget.id)}
        onCancel={() => setToggleTarget(null)}
        loading={toggleMut.isPending}
      />
    </div>
  );
}
