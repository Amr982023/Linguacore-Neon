import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../context/authStore";
import { lookupsApi } from "../services/endpoints";
import {
  Globe,
  Layers,
  Target,
  CreditCard,
  Building2,
  DoorOpen,
  Video,
  Shield,
  Tag,
  Wrench,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  ChevronRight,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Permissions config ─────────────────────────────────────────────────────────
// IMPORTANT: bit 31 (2147483648) must use a numeric literal, not 1 << 31,
// because JS bitwise ops are 32-bit signed and would produce a negative number.
const PERMISSIONS = [
  { key: "students.read", label: "Students — read", bit: 2 },
  { key: "students.write", label: "Students — write", bit: 4 },
  { key: "instructors.read", label: "Instructors — read", bit: 8 },
  { key: "instructors.write", label: "Instructors — write", bit: 16 },
  { key: "groups.read", label: "Groups — read", bit: 32 },
  { key: "groups.write", label: "Groups — write", bit: 64 },
  { key: "sessions.read", label: "Sessions — read", bit: 128 },
  { key: "sessions.write", label: "Sessions — write", bit: 256 },
  { key: "attendance.read", label: "Attendance — read", bit: 512 },
  { key: "attendance.write", label: "Attendance — write", bit: 1024 },
  { key: "attendance.revert", label: "Attendance — revert", bit: 2048 },
  { key: "exams.read", label: "Exams — read", bit: 4096 },
  { key: "exams.write", label: "Exams — write", bit: 8192 },
  { key: "payments.read", label: "Payments — read", bit: 16384 },
  { key: "payments.write", label: "Payments — write", bit: 32768 },
  { key: "closings.read", label: "Closings — read", bit: 65536 },
  { key: "closings.write", label: "Closings — write", bit: 131072 },
  { key: "dashboard.read", label: "Dashboard — read", bit: 262144 },
  { key: "settings.read", label: "Settings — read", bit: 524288 },
  { key: "settings.write", label: "Settings — write", bit: 1048576 },
  { key: "certificates.read", label: "Certificates — read", bit: 4194304 },
  { key: "notifications.read", label: "Notifications — read", bit: 8388608 },
  { key: "notifications.write", label: "Notifications — write", bit: 16777216 },
  { key: "waitingList.read", label: "Waiting List — read", bit: 33554432 },
  { key: "waitingList.write", label: "Waiting List — write", bit: 67108864 },
  { key: "users.manage", label: "Users — manage", bit: 134217728 },
  { key: "sync.manage", label: "Sync — manage", bit: 268435456 },
  {
    key: "branchOverview.read",
    label: "Branch Overview — read",
    bit: 536870912,
  },
  { key: "all", label: "All permissions", bit: 1073741824 },
  // bit 31 — use numeric literal (JS << is 32-bit signed)
  {
    key: "resourceScheduler.read",
    label: "Resource Scheduler — read",
    bit: 2147483648,
  },
  // ── Store & Sales ── new. Bits 32-35 — plain numbers here are fine since
  // bitsToSet/setToBits already wrap every value in BigInt(...) before any
  // shifting/masking, so these never touch JS's 32-bit signed bitwise ops.
  { key: "store.read", label: "Store — read", bit: 4294967296 },
  { key: "store.write", label: "Store — write", bit: 8589934592 },
  { key: "sales.read", label: "Sales — read", bit: 17179869184 },
  { key: "sales.write", label: "Sales — write", bit: 34359738368 },
];

const PERM_GROUPS = [
  {
    label: "Students",
    keys: ["students.read", "students.write"],
    readKey: "students.read",
    writeKey: "students.write",
  },
  {
    label: "Instructors",
    keys: ["instructors.read", "instructors.write"],
    readKey: "instructors.read",
    writeKey: "instructors.write",
  },
  {
    label: "Groups",
    keys: ["groups.read", "groups.write"],
    readKey: "groups.read",
    writeKey: "groups.write",
  },
  {
    label: "Sessions",
    keys: ["sessions.read", "sessions.write"],
    readKey: "sessions.read",
    writeKey: "sessions.write",
  },
  {
    label: "Attendance",
    keys: ["attendance.read", "attendance.write", "attendance.revert"],
    readKey: "attendance.read",
    writeKey: "attendance.write",
    revertKey: "attendance.revert",
  },
  {
    label: "Exams",
    keys: ["exams.read", "exams.write"],
    readKey: "exams.read",
    writeKey: "exams.write",
  },
  {
    label: "Payments",
    keys: ["payments.read", "payments.write"],
    readKey: "payments.read",
    writeKey: "payments.write",
  },
  {
    // NOTE: Center Deductions page (/center-deductions) is gated by the same
    // ClosingsRead/ClosingsWrite bits as the Closing page — there's no
    // separate "deductions" permission bit, so this label just makes that
    // explicit for whoever is building a role in this checklist.
    label: "Closings & Deductions",
    keys: ["closings.read", "closings.write"],
    readKey: "closings.read",
    writeKey: "closings.write",
  },
  {
    label: "Certificates",
    keys: ["certificates.read"],
  },
  {
    label: "Notifications",
    keys: ["notifications.read", "notifications.write"],
    readKey: "notifications.read",
    writeKey: "notifications.write",
  },
  {
    label: "Waiting List",
    keys: ["waitingList.read", "waitingList.write"],
    readKey: "waitingList.read",
    writeKey: "waitingList.write",
  },
  { label: "Dashboard", keys: ["dashboard.read"] },
  {
    label: "Settings",
    keys: ["settings.read", "settings.write"],
    readKey: "settings.read",
    writeKey: "settings.write",
  },
  { label: "Users", keys: ["users.manage"] },
  { label: "Sync", keys: ["sync.manage"] },
  { label: "Branch Overview", keys: ["branchOverview.read"] },
  { label: "Resource Scheduler", keys: ["resourceScheduler.read"] },
  // ── Store & Sales ── new
  {
    label: "Store",
    keys: ["store.read", "store.write"],
    readKey: "store.read",
    writeKey: "store.write",
  },
  {
    label: "Sales",
    keys: ["sales.read", "sales.write"],
    readKey: "sales.read",
    writeKey: "sales.write",
  },
];
// BigInt-safe bit operations (handles bit 31+)
function bitsToSet(value) {
  const n = BigInt(parseInt(value) || 0);
  return new Set(
    PERMISSIONS.filter((p) => (n & BigInt(p.bit)) !== 0n).map((p) => p.key),
  );
}

function setToBits(keys) {
  const result = PERMISSIONS.filter((p) => keys.has(p.key)).reduce(
    (acc, p) => acc | BigInt(p.bit),
    0n,
  );
  return Number(result);
}

function getReadDep(key) {
  for (const g of PERM_GROUPS) {
    if (g.writeKey === key || g.revertKey === key) return g.readKey;
  }
  return null;
}

function getDependents(readKey) {
  const deps = [];
  for (const g of PERM_GROUPS) {
    if (g.readKey === readKey) {
      if (g.writeKey) deps.push(g.writeKey);
      if (g.revertKey) deps.push(g.revertKey);
    }
  }
  return deps;
}

// ── Permissions checklist ──────────────────────────────────────────────────────
function PermissionsChecklist({ value, onChange }) {
  const selected = bitsToSet(value);

  function toggle(key) {
    const next = new Set(selected);

    if (key === "all") {
      if (next.has("all")) {
        next.clear();
      } else {
        PERMISSIONS.forEach((p) => next.add(p.key));
      }
      onChange(setToBits(next));
      return;
    }

    if (next.has(key)) {
      next.delete(key);
      getDependents(key).forEach((dep) => next.delete(dep));
    } else {
      const readDep = getReadDep(key);
      if (readDep) next.add(readDep);
      next.add(key);
    }

    next.delete("all");
    onChange(setToBits(next));
  }

  return (
    <div className="mt-2 space-y-2">
      <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1A3C6E]/10 dark:bg-[#1A3C6E]/20 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={selected.has("all")}
          onChange={() => toggle("all")}
          style={{ width: "1rem", height: "1rem" }}
          className="accent-[#1A3C6E] cursor-pointer shrink-0"
        />
        <span className="text-xs font-semibold text-[#1A3C6E] dark:text-blue-300">
          All permissions
        </span>
      </label>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pl-1 pt-1">
        {PERM_GROUPS.map((g) => (
          <div key={g.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
              {g.label}
            </p>
            {g.keys.map((k) => {
              const isChecked = selected.has(k);
              const readDep = getReadDep(k);
              const isDisabled = !!readDep && !selected.has(readDep);

              return (
                <label
                  key={k}
                  title={
                    isDisabled
                      ? `Requires "${readDep?.split(".")[0]} — read" to be enabled first`
                      : undefined
                  }
                  className={`flex items-center gap-2 py-0.5 select-none ${
                    isDisabled
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => !isDisabled && toggle(k)}
                    style={{ width: "0.9rem", height: "0.9rem" }}
                    className="accent-[#1A3C6E] cursor-pointer shrink-0 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">
                    {k.split(".")[1]}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
        Bitmask value: <span className="font-mono">{setToBits(selected)}</span>
      </p>
    </div>
  );
}

// ── Role row (view + inline edit) ─────────────────────────────────────────────
function RoleRow({ role, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(role.name);
  const [perms, setPerms] = useState(parseInt(role.permissions) || 0);

  function save() {
    onSave(role.id, { name, permissions: String(perms) });
    setEditing(false);
  }

  if (editing)
    return (
      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Role name"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
        />
        <PermissionsChecklist value={perms} onChange={setPerms} />
        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#1A3C6E] text-white rounded-lg text-xs font-medium hover:bg-[#2E7DBF]"
          >
            <Check size={13} /> Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );

  const permCount = bitsToSet(role.permissions).size;

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 mb-1">
      <div>
        <span className="text-sm text-gray-800 dark:text-gray-200">
          {role.name}
        </span>
        {role.isSystem && (
          <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded">
            System
          </span>
        )}
        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
          {permCount} permission{permCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex gap-1 shrink-0 ml-2">
        {!role.isSystem && (
          <>
            <button
              onClick={() => {
                setName(role.name);
                setPerms(parseInt(role.permissions) || 0);
                setEditing(true);
              }}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
              title="Edit"
            >
              <Edit size={13} />
            </button>
            <button
              onClick={() => {
                if (window.confirm("Delete this role?")) onDelete(role.id);
              }}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Add role form ─────────────────────────────────────────────────────────────
function AddRoleRow({ onAdd }) {
  const [name, setName] = useState("");
  const [perms, setPerms] = useState(0);

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({ name, permissions: String(perms) });
    setName("");
    setPerms(0);
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Role name e.g. Receptionist"
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   placeholder:text-gray-400 dark:placeholder:text-gray-500
                   focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
      />
      <PermissionsChecklist value={perms} onChange={setPerms} />
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A3C6E] text-white rounded-lg text-xs font-medium hover:bg-[#2E7DBF]"
      >
        <Plus size={13} /> Add Role
      </button>
    </div>
  );
}

// ── Generic CRUD helpers ───────────────────────────────────────────────────────
function useSimpleCrud(queryKey, listFn, createFn, updateFn, deleteFn) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: listFn,
    select: (r) => r.data?.data || [],
  });
  const create = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      qc.invalidateQueries(queryKey);
      toast.success("Created");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => updateFn(id, data),
    onSuccess: () => {
      qc.invalidateQueries(queryKey);
      toast.success("Updated");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });
  const remove = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      qc.invalidateQueries(queryKey);
      toast.success("Deleted");
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Cannot delete — may be in use"),
  });
  return { data, isLoading, create, update, remove };
}

// ── Inline edit row ────────────────────────────────────────────────────────────
function InlineRow({ item, fields, onSave, onDelete, renderExtra }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, item[f.key] || ""])),
  );

  function save() {
    onSave(item.id, form);
    setEditing(false);
  }

  if (editing)
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        {fields.map((f) => (
          <input
            key={f.key}
            value={form[f.key]}
            onChange={(e) =>
              setForm((v) => ({ ...v, [f.key]: e.target.value }))
            }
            placeholder={f.label}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
          />
        ))}
        <button
          onClick={save}
          className="p-1.5 rounded-lg bg-[#1A3C6E] text-white hover:bg-[#2E7DBF] shrink-0"
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => setEditing(false)}
          className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    );

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
      <div className="flex-1">
        <span className="text-sm text-gray-800 dark:text-gray-200">
          {fields
            .map((f) => (item[f.key] ? `${item[f.key]}` : null))
            .filter(Boolean)
            .join(" — ")}
        </span>
        {renderExtra && renderExtra(item)}
      </div>
      <div className="flex gap-1 shrink-0 ml-2">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
          title="Edit"
        >
          <Edit size={13} />
        </button>
        <button
          onClick={() => {
            if (window.confirm("Delete this item?")) onDelete(item.id);
          }}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, active, onClick, children }) {
  return (
    <div
      className={`rounded-xl border transition-all ${active ? "border-[#1A3C6E] shadow-md" : "border-gray-200 dark:border-gray-700"}`}
    >
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 rounded-xl
          ${active ? "bg-[#1A3C6E]/10 dark:bg-[#1A3C6E]/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${active ? "bg-[#1A3C6E] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
          >
            <Icon size={16} />
          </div>
          <span
            className={`text-sm font-semibold ${active ? "text-[#1A3C6E] dark:text-blue-300" : "text-gray-700 dark:text-gray-200"}`}
          >
            {title}
          </span>
        </div>
        <ChevronRight
          size={16}
          className={`text-gray-400 dark:text-gray-500 transition-transform ${active ? "rotate-90" : ""}`}
        />
      </button>
      {active && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Add row form ───────────────────────────────────────────────────────────────
function AddRow({ fields, onAdd, buttonLabel = "Add" }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.default || ""])),
  );

  function handleAdd() {
    const allFilled = fields.every(
      (f) => f.required === false || String(form[f.key] || "").trim() !== "",
    );
    if (!allFilled) return;
    onAdd(form);
    setForm(Object.fromEntries(fields.map((f) => [f.key, f.default || ""])));
  }

  function handleKey(e) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      {fields.map((f) => (
        <input
          key={f.key}
          value={form[f.key]}
          onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
          onKeyDown={handleKey}
          placeholder={f.label}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                     focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
        />
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A3C6E] text-white rounded-lg text-xs font-medium hover:bg-[#2E7DBF] whitespace-nowrap shrink-0"
      >
        <Plus size={13} /> {buttonLabel}
      </button>
    </div>
  );
}

// ── Level checkboxes ───────────────────────────────────────────────────────────
function LevelCheckboxes({ allLevels, selectedIds, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-3">
      {allLevels.map((lv) => (
        <label
          key={lv.id}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(lv.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selectedIds, lv.id]
                  : selectedIds.filter((id) => id !== lv.id),
              )
            }
            style={{ width: "1.1rem", height: "1.1rem" }}
            className="accent-[#1A3C6E] cursor-pointer shrink-0"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {lv.name || lv.code || `Level ${lv.id}`}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── App Settings display config ────────────────────────────────────────────────
// Maps raw setting keys to friendly labels + validation rules.
// Any key returned by the backend that's NOT in this map still renders fine
// with its raw key as the label and no special validation.
const APP_SETTING_META = {
  "payment.overdue_days": {
    label: "Payment overdue threshold (days)",
    type: "number",
    min: 1,
    max: 365,
    suffix: "days",
  },
};

function AppSettingRow({ setting, onSave, saving }) {
  const meta = APP_SETTING_META[setting.key] || {
    label: setting.key,
    type: "text",
  };
  const [value, setValue] = useState(setting.value);
  const dirty = value !== setting.value;

  const isInvalid =
    meta.type === "number" &&
    (value === "" ||
      isNaN(Number(value)) ||
      (meta.min !== undefined && Number(value) < meta.min) ||
      (meta.max !== undefined && Number(value) > meta.max));

  function handleSave() {
    if (isInvalid) {
      toast.error(
        meta.min !== undefined && meta.max !== undefined
          ? `Enter a number between ${meta.min} and ${meta.max}.`
          : "Enter a valid value.",
      );
      return;
    }
    onSave(setting.key, value);
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {meta.label}
        </p>
        {setting.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {setting.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <input
            type={meta.type === "number" ? "number" : "text"}
            value={value}
            min={meta.min}
            max={meta.max}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className={`w-24 border rounded-lg px-2 py-1.5 text-sm text-center
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2
                       ${
                         isInvalid
                           ? "border-red-400 focus:ring-red-400"
                           : "border-gray-300 dark:border-gray-600 focus:ring-[#1A3C6E]"
                       }`}
          />
          {meta.suffix && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {meta.suffix}
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          title={dirty ? "Save changes" : "No changes to save"}
          className={`p-1.5 rounded-lg transition-colors ${
            dirty && !saving
              ? "bg-[#1A3C6E] text-white hover:bg-[#2E7DBF] cursor-pointer"
              : "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          }`}
        >
          <Save size={13} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();
  const [active, setActive] = useState(null);

  // ── Languages ──────────────────────────────────────────────────────────────
  const languages = useSimpleCrud(
    ["languages"],
    lookupsApi.getLanguages,
    lookupsApi.createLanguage,
    lookupsApi.updateLanguage,
    lookupsApi.deleteLanguage,
  );
  const { data: allLevels = [] } = useQuery({
    queryKey: ["levels"],
    queryFn: () => lookupsApi.getLevels(),
    select: (r) => r.data?.data || [],
  });
  const [newLangName, setNewLangName] = useState("");
  const [newLangLevels, setNewLangLevels] = useState([]);
  const [editingLangId, setEditingLangId] = useState(null);
  const [editingLangName, setEditingLangName] = useState("");
  const [editingLangLevels, setEditingLangLevels] = useState([]);

  // ── Levels ─────────────────────────────────────────────────────────────────
  const levels = useSimpleCrud(
    ["levels"],
    lookupsApi.getLevels,
    lookupsApi.createLevel,
    lookupsApi.updateLevel,
    lookupsApi.deleteLevel,
  );

  // ── Goals ──────────────────────────────────────────────────────────────────
  const goals = useSimpleCrud(
    ["goals"],
    lookupsApi.getGoals,
    lookupsApi.createGoal,
    lookupsApi.updateGoal,
    lookupsApi.deleteGoal,
  );
  const nestedGoalCreate = useMutation({
    mutationFn: lookupsApi.createNestedGoal,
    onSuccess: () => {
      qc.invalidateQueries(["goals"]);
      toast.success("Sub-goal added");
    },
  });
  const nestedGoalUpdate = useMutation({
    mutationFn: ({ id, data }) => lookupsApi.updateNestedGoal(id, data),
    onSuccess: () => {
      qc.invalidateQueries(["goals"]);
      toast.success("Updated");
    },
  });
  const nestedGoalDelete = useMutation({
    mutationFn: lookupsApi.deleteNestedGoal,
    onSuccess: () => {
      qc.invalidateQueries(["goals"]);
      toast.success("Deleted");
    },
  });

  // ── Payment Methods ─────────────────────────────────────────────────────────
  const payMethods = useSimpleCrud(
    ["paymentMethods"],
    lookupsApi.getPaymentMethods,
    lookupsApi.createPaymentMethod,
    lookupsApi.updatePaymentMethod,
    lookupsApi.deletePaymentMethod,
  );

  // ── Branches ───────────────────────────────────────────────────────────────
  const branches = useSimpleCrud(
    ["branches"],
    lookupsApi.getBranches,
    lookupsApi.createBranch,
    lookupsApi.updateBranch,
    lookupsApi.deleteBranch,
  );

  // ── Halls ──────────────────────────────────────────────────────────────────
  const halls = useSimpleCrud(
    ["halls", branchId],
    () => lookupsApi.getHalls(branchId),
    lookupsApi.createHall,
    lookupsApi.updateHall,
    lookupsApi.deleteHall,
  );

  // ── Zoom Accounts ──────────────────────────────────────────────────────────
  const zooms = useSimpleCrud(
    ["zooms", branchId],
    () => lookupsApi.getZoomAccounts(branchId),
    lookupsApi.createZoomAccount,
    lookupsApi.updateZoomAccount,
    lookupsApi.deleteZoomAccount,
  );

  // ── Roles ──────────────────────────────────────────────────────────────────
  const roles = useSimpleCrud(
    ["roles"],
    lookupsApi.getRoles,
    lookupsApi.createRole,
    lookupsApi.updateRole,
    lookupsApi.deleteRole,
  );

  // ── Period Labels ──────────────────────────────────────────────────────────
  const periodLabels = useSimpleCrud(
    ["periodLabels"],
    lookupsApi.getPeriodLabels,
    lookupsApi.createPeriodLabel,
    lookupsApi.updatePeriodLabel,
    lookupsApi.deletePeriodLabel,
  );

  // Only show period labels created within the last 1 year; anything older
  // is hidden from this list (still exists in the backend, just not shown here).
  const visiblePeriodLabels = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return periodLabels.data.filter((pl) => {
      const created = pl.createdAt || pl.createdOn || pl.dateCreated;
      if (!created) return true; // no timestamp available — don't hide it
      return new Date(created) >= oneYearAgo;
    });
  }, [periodLabels.data]);

  // ── App Settings ───────────────────────────────────────────────────────────
  const { data: appSettings = [] } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => lookupsApi.getSettings(),
    select: (r) => r.data?.data || [],
  });
  const updateSetting = useMutation({
    mutationFn: ({ key, value }) => lookupsApi.updateSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries(["appSettings"]);
      toast.success("Setting saved");
    },
    onError: (e) =>
      toast.error(e.response?.data?.message || "Error saving setting"),
  });

  function toggle(id) {
    setActive((v) => (v === id ? null : id));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Settings & Lookups
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage all system configuration and lookup data
        </p>
      </div>

      <div className="space-y-3">
        {/* ── Languages ── */}
        <Section
          title="Languages"
          icon={Globe}
          active={active === "languages"}
          onClick={() => toggle("languages")}
        >
          {languages.data.map((lang) => {
            const isEditing = editingLangId === lang.id;

            if (isEditing)
              return (
                <div
                  key={lang.id}
                  className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg space-y-3"
                >
                  <input
                    value={editingLangName}
                    onChange={(e) => setEditingLangName(e.target.value)}
                    placeholder="Language name"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
                  />
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Levels
                  </p>
                  <LevelCheckboxes
                    allLevels={allLevels}
                    selectedIds={editingLangLevels}
                    onChange={setEditingLangLevels}
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        languages.update.mutate({
                          id: lang.id,
                          data: {
                            name: editingLangName,
                            levelIds: editingLangLevels,
                          },
                        });
                        setEditingLangId(null);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#1A3C6E] text-white rounded-lg text-xs font-medium hover:bg-[#2E7DBF]"
                    >
                      <Check size={13} /> Save
                    </button>
                    <button
                      onClick={() => setEditingLangId(null)}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );

            return (
              <div
                key={lang.id}
                className="flex items-start justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group mb-1"
              >
                <div className="flex-1">
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {lang.name}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lang.levels?.length ? (
                      lang.levels.map((lv) => (
                        <span
                          key={lv.id}
                          className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded"
                        >
                          {lv.name || lv.code}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        No levels assigned
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 mt-0.5 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      setEditingLangId(lang.id);
                      setEditingLangName(lang.name);
                      setEditingLangLevels(
                        lang.levels?.map((lv) => lv.id) ?? [],
                      );
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                    title="Edit"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this language?"))
                        languages.remove.mutate(lang.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* add new language */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <input
              value={newLangName}
              onChange={(e) => setNewLangName(e.target.value)}
              placeholder="Language name e.g. English"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         placeholder:text-gray-400 dark:placeholder:text-gray-500
                         focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
            />
            {allLevels.length > 0 && (
              <>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Assign levels
                </p>
                <LevelCheckboxes
                  allLevels={allLevels}
                  selectedIds={newLangLevels}
                  onChange={setNewLangLevels}
                />
              </>
            )}
            <button
              onClick={() => {
                if (!newLangName.trim()) return;
                languages.create.mutate({
                  name: newLangName,
                  levelIds: newLangLevels,
                });
                setNewLangName("");
                setNewLangLevels([]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A3C6E] text-white rounded-lg text-xs font-medium hover:bg-[#2E7DBF]"
            >
              <Plus size={13} /> Add Language
            </button>
          </div>
        </Section>

        {/* ── Levels ── */}
        <Section
          title="Levels"
          icon={Layers}
          active={active === "levels"}
          onClick={() => toggle("levels")}
        >
          {levels.data.map((lv) => (
            <InlineRow
              key={lv.id}
              item={lv}
              fields={[
                { key: "name", label: "Code e.g. A1" },
                { key: "displayOrder", label: "Order" },
              ]}
              onSave={(id, data) =>
                levels.update.mutate({
                  id,
                  data: {
                    code: data.name,
                    displayOrder: parseInt(data.displayOrder) || 0,
                  },
                })
              }
              onDelete={(id) => levels.remove.mutate(id)}
            />
          ))}
          <AddRow
            fields={[
              { key: "code", label: "Code e.g. A1, B2" },
              { key: "displayOrder", label: "Display Order e.g. 1" },
            ]}
            onAdd={(form) =>
              levels.create.mutate({
                code: form.code,
                displayOrder: parseInt(form.displayOrder) || 0,
              })
            }
            buttonLabel="Add Level"
          />
        </Section>

        {/* ── Goals ── */}
        <Section
          title="Goals & Sub-goals"
          icon={Target}
          active={active === "goals"}
          onClick={() => toggle("goals")}
        >
          {goals.data.map((g) => (
            <div key={g.id} className="mb-3">
              <InlineRow
                item={g}
                fields={[{ key: "name", label: "Goal name" }]}
                onSave={(id, data) => goals.update.mutate({ id, data })}
                onDelete={(id) => goals.remove.mutate(id)}
              />
              <div className="ml-6 border-l-2 border-gray-200 dark:border-gray-600 pl-3 space-y-1">
                {g.nestedGoals?.map((ng) => (
                  <InlineRow
                    key={ng.id}
                    item={ng}
                    fields={[{ key: "name", label: "Sub-goal" }]}
                    onSave={(id, data) => nestedGoalUpdate.mutate({ id, data })}
                    onDelete={(id) => nestedGoalDelete.mutate(id)}
                  />
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = e.target.name.value.trim();
                    if (name) {
                      nestedGoalCreate.mutate({ goalId: g.id, name });
                      e.target.reset();
                    }
                  }}
                  className="flex items-center gap-2 mt-1"
                >
                  <input
                    name="name"
                    placeholder="Add sub-goal…"
                    className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-xs
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-1 focus:ring-[#1A3C6E]"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Plus size={12} />
                  </button>
                </form>
              </div>
            </div>
          ))}
          <AddRow
            fields={[{ key: "name", label: "Goal name e.g. Travelling" }]}
            onAdd={(form) => goals.create.mutate(form)}
            buttonLabel="Add Goal"
          />
        </Section>

        {/* ── Payment Methods ── */}
        <Section
          title="Payment Methods"
          icon={CreditCard}
          active={active === "paymentMethods"}
          onClick={() => toggle("paymentMethods")}
        >
          {payMethods.data.map((pm) => (
            <InlineRow
              key={pm.id}
              item={pm}
              fields={[{ key: "name", label: "Method name" }]}
              onSave={(id, data) => payMethods.update.mutate({ id, data })}
              onDelete={(id) => payMethods.remove.mutate(id)}
            />
          ))}
          <AddRow
            fields={[{ key: "name", label: "e.g. InstaPay, Vodafone Cash" }]}
            onAdd={(form) => payMethods.create.mutate(form)}
            buttonLabel="Add Method"
          />
        </Section>

        {/* ── Branches ── */}
        <Section
          title="Branches"
          icon={Building2}
          active={active === "branches"}
          onClick={() => toggle("branches")}
        >
          {branches.data.map((b) => (
            <InlineRow
              key={b.id}
              item={b}
              fields={[
                { key: "name", label: "Branch name" },
                { key: "address", label: "Address" },
              ]}
              onSave={(id, data) => branches.update.mutate({ id, data })}
              onDelete={(id) => branches.remove.mutate(id)}
            />
          ))}
          <AddRow
            fields={[
              { key: "name", label: "Branch name" },
              { key: "address", label: "Address", required: false },
            ]}
            onAdd={(form) => branches.create.mutate(form)}
            buttonLabel="Add Branch"
          />
        </Section>

        {/* ── Halls ── */}
        <Section
          title="Halls"
          icon={DoorOpen}
          active={active === "halls"}
          onClick={() => toggle("halls")}
        >
          {halls.data.map((h) => (
            <InlineRow
              key={h.id}
              item={h}
              fields={[
                { key: "name", label: "Hall name" },
                { key: "capacity", label: "Capacity" },
              ]}
              onSave={(id, data) => halls.update.mutate({ id, data })}
              onDelete={(id) => halls.remove.mutate(id)}
              renderExtra={(item) =>
                item.capacity ? (
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                    Cap: {item.capacity}
                  </span>
                ) : null
              }
            />
          ))}
          <AddRow
            fields={[
              { key: "name", label: "Hall name e.g. Hall A" },
              { key: "capacity", label: "Capacity", required: false },
            ]}
            onAdd={(form) => halls.create.mutate({ ...form, branchId })}
            buttonLabel="Add Hall"
          />
        </Section>

        {/* ── Zoom Accounts ── */}
        <Section
          title="Zoom Accounts"
          icon={Video}
          active={active === "zoom"}
          onClick={() => toggle("zoom")}
        >
          {zooms.data.map((z) => (
            <InlineRow
              key={z.id}
              item={z}
              fields={[
                { key: "displayName", label: "Display name" },
                { key: "accountEmail", label: "Email" },
              ]}
              onSave={(id, data) => zooms.update.mutate({ id, data })}
              onDelete={(id) => zooms.remove.mutate(id)}
            />
          ))}
          <AddRow
            fields={[
              { key: "displayName", label: "Display name" },
              { key: "accountEmail", label: "Email" },
            ]}
            onAdd={(form) =>
              zooms.create.mutate({ ...form, branchId, maxParticipants: 100 })
            }
            buttonLabel="Add Zoom"
          />
        </Section>

        {/* ── Roles ── */}
        <Section
          title="Roles"
          icon={Shield}
          active={active === "roles"}
          onClick={() => toggle("roles")}
        >
          {roles.data.map((r) => (
            <RoleRow
              key={r.id}
              role={r}
              onSave={(id, data) => roles.update.mutate({ id, data })}
              onDelete={(id) => roles.remove.mutate(id)}
            />
          ))}
          <AddRoleRow onAdd={(form) => roles.create.mutate(form)} />
        </Section>

        {/* ── Period Labels ── */}
        <Section
          title="Period Labels"
          icon={Tag}
          active={active === "periodLabels"}
          onClick={() => toggle("periodLabels")}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Used on sessions to categorize them by period (e.g. Month 1, Level
            A1, Term 2). Only labels created within the last year are shown
            here.
          </p>
          {visiblePeriodLabels.map((pl) => (
            <InlineRow
              key={pl.id}
              item={pl}
              fields={[{ key: "name", label: "Label name" }]}
              onSave={(id, data) => periodLabels.update.mutate({ id, data })}
              onDelete={(id) => periodLabels.remove.mutate(id)}
            />
          ))}
          {visiblePeriodLabels.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No period labels from the last year
            </p>
          )}
          <AddRow
            fields={[{ key: "name", label: "e.g. Month 1, Term 2, Level A1" }]}
            onAdd={(form) => periodLabels.create.mutate(form)}
            buttonLabel="Add Label"
          />
        </Section>

        {/* ── System Settings ── */}
        <Section
          title="System Settings"
          icon={Wrench}
          active={active === "appSettings"}
          onClick={() => toggle("appSettings")}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Configurable system parameters.
          </p>
          <div className="space-y-3">
            {appSettings.map((s) => (
              <AppSettingRow
                key={s.key}
                setting={s}
                saving={updateSetting.isPending}
                onSave={(key, value) => updateSetting.mutate({ key, value })}
              />
            ))}
            {appSettings.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                No configurable settings found
              </p>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
