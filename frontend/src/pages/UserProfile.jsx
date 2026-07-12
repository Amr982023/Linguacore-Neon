import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { usersApi, lookupsApi } from "../services/endpoints";
import { useAuthStore } from "../context/authStore";
import {
  Button,
  Input,
  Select,
  Badge,
  Modal,
  ConfirmDialog,
} from "../components/ui";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Building2,
  Edit,
  KeyRound,
  UserX,
  UserCheck,
  Save,
  X,
  Eye,
  EyeOff,
  Calendar,
  Hash,
  Users,
} from "lucide-react";

// ── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <Icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">
        {value}
      </span>
    </div>
  );
}

// ── Edit Profile Form ─────────────────────────────────────────────────────────
function EditProfileForm({
  user,
  onSubmit,
  loading,
  branches = [],
  roles = [],
  isSuperAdmin,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      firstName: user.firstName ?? "",
      secondName: user.secondName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
      whatsappNumber: user.whatsappNumber ?? "",
      address: user.address ?? "",
      nationalId: user.nationalId ?? "",
      age: user.age ?? "",
      gender: user.gender ?? "",
      roleId: user.roleId ?? "",
      branchId: user.branchId ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
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

      {/* Contact */}
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

      {/* Personal */}
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

      {/* Role & Branch — Super Admin only */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t dark:border-gray-700">
          <Select label="Role" {...register("roleId")}>
            <option value="">— Keep current —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select label="Branch" {...register("branchId")}>
            <option value="">— Keep current —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={loading} icon={Save}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ── Reset Password Form ───────────────────────────────────────────────────────
function ResetPasswordForm({ onSubmit, loading }) {
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

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading} icon={KeyRound}>
          Reset Password
        </Button>
      </div>
    </form>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: me } = useAuthStore();

  const isSuperAdmin = me?.roleName === "Super Admin";
  const isOwnProfile = me?.id === id;

  const [editModal, setEditModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [toggleConfirm, setToggleConfirm] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: userRes, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
  const { data: branchRes } = useQuery({
    queryKey: ["branches"],
    queryFn: lookupsApi.getBranches,
    enabled: isSuperAdmin,
  });
  const { data: rolesRes } = useQuery({
    queryKey: ["roles"],
    queryFn: lookupsApi.getRoles,
    enabled: isSuperAdmin,
  });

  const user = userRes?.data?.data;
  const branches = branchRes?.data?.data || [];
  const roles = rolesRes?.data?.data || [];

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries(["user", id]);
    qc.invalidateQueries(["users"]);
  };

  const updateMut = useMutation({
    mutationFn: (data) => usersApi.update(id, data),
    onSuccess: () => {
      toast.success("Profile updated successfully");
      invalidate();
      setEditModal(false);
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Failed to update"),
  });

  const resetMut = useMutation({
    mutationFn: (password) =>
      usersApi.resetPassword(id, { newPassword: password }),
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetModal(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const toggleMut = useMutation({
    mutationFn: () => usersApi.toggleActive(id),
    onSuccess: () => {
      toast.success(user?.isActive ? "User deactivated" : "User activated");
      invalidate();
      setToggleConfirm(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">User not found.</p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const fullName = [user.firstName, user.secondName, user.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500
                       hover:text-gray-800 dark:hover:text-gray-200 transition-colors group"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            {isSuperAdmin ? "Back to Users" : "Back"}
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Edit — own profile OR super admin */}
            {(isOwnProfile || isSuperAdmin) && (
              <Button icon={Edit} onClick={() => setEditModal(true)}>
                Edit Profile
              </Button>
            )}

            {/* Reset password — super admin only (or own) */}
            {(isOwnProfile || isSuperAdmin) && (
              <Button
                variant="secondary"
                icon={KeyRound}
                onClick={() => setResetModal(true)}
              >
                Reset Password
              </Button>
            )}

            {/* Toggle active — super admin only, cannot deactivate self */}
            {isSuperAdmin && !isOwnProfile && (
              <Button
                variant={user.isActive ? "danger" : "secondary"}
                icon={user.isActive ? UserX : UserCheck}
                onClick={() => setToggleConfirm(true)}
              >
                {user.isActive ? "Deactivate" : "Activate"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="bg-gradient-to-r from-[#1A3C6E] to-[#2E7DBF] rounded-2xl p-8 text-white shadow-lg mb-6">
          <div className="flex items-center gap-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center
                         text-white text-3xl font-bold flex-shrink-0
                         bg-white/20 ring-2 ring-white/30"
            >
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">
                  {user.name}
                </h1>
                {isOwnProfile && (
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium">
                    You
                  </span>
                )}
                <Badge
                  label={user.isActive ? "ACTIVE" : "INACTIVE"}
                  color={
                    user.isActive
                      ? "bg-green-500/20 text-green-200"
                      : "bg-red-500/20 text-red-200"
                  }
                />
              </div>
              <p className="text-blue-200 mt-1 text-sm">{user.email}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <span
                  className="inline-flex items-center gap-1.5 text-xs
                                 bg-white/15 px-2.5 py-1 rounded-full"
                >
                  <Shield size={11} /> {user.roleName}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-xs
                                 bg-white/15 px-2.5 py-1 rounded-full"
                >
                  <Building2 size={11} /> {user.branchName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Details card ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <User size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm tracking-wide uppercase">
              Personal Information
            </h3>
          </div>

          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow icon={Phone} label="Phone" value={user.phone} />
          <InfoRow icon={Phone} label="WhatsApp" value={user.whatsappNumber} />
          <InfoRow icon={Hash} label="National ID" value={user.nationalId} />
          <InfoRow icon={User} label="Age" value={user.age} />
          <InfoRow icon={User} label="Gender" value={user.gender} />
          <InfoRow icon={MapPin} label="Address" value={user.address} />
          <InfoRow
            icon={Calendar}
            label="Created"
            value={
              user.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-GB")
                : null
            }
          />
        </div>

        {/* ── Account card ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Shield
                size={15}
                className="text-purple-600 dark:text-purple-400"
              />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm tracking-wide uppercase">
              Account
            </h3>
          </div>

          <InfoRow icon={Shield} label="Role" value={user.roleName} />
          <InfoRow icon={Building2} label="Branch" value={user.branchName} />
          <InfoRow
            icon={Users}
            label="Status"
            value={<Badge label={user.isActive ? "ACTIVE" : "INACTIVE"} />}
          />
        </div>
      </div>

      {/* ── Edit Modal ── */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Profile"
        size="lg"
      >
        <EditProfileForm
          user={user}
          branches={branches}
          roles={roles}
          isSuperAdmin={isSuperAdmin}
          onSubmit={(data) => {
            updateMut.mutate({
              firstName: data.firstName,
              secondName: data.secondName || null,
              lastName: data.lastName,
              phone: data.phone || null,
              whatsappNumber: data.whatsappNumber || null,
              address: data.address || null,
              nationalId: data.nationalId || null,
              age: data.age || null,
              gender: data.gender || null,
              roleId: data.roleId || null,
              branchId: data.branchId || null,
            });
          }}
          loading={updateMut.isPending}
        />
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal
        open={resetModal}
        onClose={() => setResetModal(false)}
        title="Reset Password"
        size="sm"
      >
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          Resetting password for <strong>{user.name}</strong>
        </div>
        <ResetPasswordForm
          onSubmit={resetMut.mutate}
          loading={resetMut.isPending}
        />
      </Modal>

      {/* ── Toggle Active Confirm ── */}
      <ConfirmDialog
        open={toggleConfirm}
        title={user.isActive ? "Deactivate User?" : "Activate User?"}
        message={
          user.isActive
            ? `Deactivate ${user.name}? They will lose system access.`
            : `Activate ${user.name}? They will regain system access.`
        }
        onConfirm={() => toggleMut.mutate()}
        onCancel={() => setToggleConfirm(false)}
        loading={toggleMut.isPending}
      />
    </div>
  );
}
