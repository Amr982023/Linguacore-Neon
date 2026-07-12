// pages/CenterDeductions.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuthStore } from "../context/authStore";
import { centerDeductionsApi } from "../services/endpoints";
import { Wallet, Plus, Trash2, CalendarRange, X, Loader2 } from "lucide-react";

const fmtEGP = (v) => `${Number(v || 0).toLocaleString()} EGP`;
const fmtDate = (d) => new Date(d).toLocaleDateString();

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function AddDeductionModal({ open, onClose, branchId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    amount: "",
    deductionDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      centerDeductionsApi.create({
        branchId,
        name: form.name.trim(),
        amount: Number(form.amount),
        deductionDate: form.deductionDate,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      toast.success("Deduction added");
      qc.invalidateQueries({ queryKey: ["center-deductions", branchId] });
      setForm({
        name: "",
        amount: "",
        deductionDate: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      onClose();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Failed to add deduction"),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.amount || Number(form.amount) <= 0)
      return toast.error("Amount must be greater than zero");
    mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add center deduction">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Name
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white"
            placeholder="e.g. Rent, Utilities, Supplies"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Amount (EGP)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Date
          </label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={form.deductionDate}
            onChange={(e) =>
              setForm({ ...form, deductionDate: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Notes (optional)
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          Save deduction
        </button>
      </form>
    </Modal>
  );
}

export default function CenterDeductions() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();
  const [range, setRange] = useState({ from: "", to: "" });
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["center-deductions", branchId, range.from, range.to],
    queryFn: () =>
      centerDeductionsApi
        .getByBranch(branchId, range.from || undefined, range.to || undefined)
        .then((r) => r.data?.data ?? []),
    enabled: !!branchId,
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id) => centerDeductionsApi.delete(id),
    onSuccess: () => {
      toast.success("Deduction removed");
      qc.invalidateQueries({ queryKey: ["center-deductions", branchId] });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Delete failed"),
  });

  const total = (data || []).reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={20} className="text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Center Deductions
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Expenses taken from the center. These are swept automatically into
            any closing whose period covers their date.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5"
        >
          <Plus size={16} /> Add deduction
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <CalendarRange size={16} className="text-gray-400 mb-2.5" />
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            From
          </label>
          <input
            type="date"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            To
          </label>
          <input
            type="date"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm text-gray-900 dark:text-white"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </div>
        {(range.from || range.to) && (
          <button
            onClick={() => setRange({ from: "", to: "" })}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            Clear filter
          </button>
        )}
        <div className="ml-auto text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total in range
          </div>
          <div className="text-lg font-semibold text-red-500">
            {fmtEGP(total)}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <tr>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Notes</th>
              <th className="text-left px-5 py-3">Added by</th>
              <th className="text-right px-5 py-3">Amount</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data || []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  No deductions recorded for this range.
                </td>
              </tr>
            )}
            {(data || []).map((d) => (
              <tr
                key={d.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-900/30"
              >
                <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                  {fmtDate(d.deductionDate)}
                </td>
                <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                  {d.name}
                </td>
                <td className="px-5 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                  {d.notes || "—"}
                </td>
                <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                  {d.createdByName}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-red-500">
                  {fmtEGP(d.amount)}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => remove(d.id)}
                    className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddDeductionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        branchId={branchId}
      />
    </div>
  );
}
