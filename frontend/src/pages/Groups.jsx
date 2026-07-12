import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  groupsApi,
  lookupsApi,
  enrollmentsApi,
  sessionsApi,
  instructorsApi,
  studentsApi,
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
  SearchInput,
  StatCard,
  Tabs,
  ConfirmDialog,
} from "../components/ui";
import WaButton from "../components/WaButton";
import GmailButton from "../components/GmailButton";
import {
  Plus,
  Edit,
  Eye,
  BookOpen,
  RefreshCw,
  RotateCcw,
  Trash2,
  UserPlus,
  LogOut,
  UserX,
} from "lucide-react";

const DEFAULT_FILTERS = {
  search: "",
  filterStatus: "",
  filterCat: "",
  filterType: "",
  filterLang: "",
  filterLevel: "",
  filterInstructor: "",
  filterMode: "",
  filterZoom: "",
};

// ── GroupForm ─────────────────────────────────────────────────────────────────
function GroupForm({
  initial,
  onSubmit,
  loading,
  languages = [],
  instructors = [],
  halls = [],
  zooms = [],
  statuses = [],
  categories = [],
  types = [],
  modes = [],
  existingGroups = [],
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: initial });

  const deliveryMode = watch("deliveryModeId");
  const languageLevelId = watch("languageLevelId");
  const selectedMode = modes.find((m) => m.id == deliveryMode);

  const selectedLanguageId = useMemo(() => {
    if (!languageLevelId) return null;
    for (const lang of languages) {
      if (
        (lang.levels || []).some(
          (lv) => String(lv.languageLevelId) === String(languageLevelId),
        )
      )
        return lang.id;
    }
    return null;
  }, [languageLevelId, languages]);

  const filteredInstructors = useMemo(() => {
    if (!selectedLanguageId) return [];
    return instructors.filter((i) => {
      if (Array.isArray(i.languageIds))
        return i.languageIds.some(
          (id) => String(id) === String(selectedLanguageId),
        );
      if (Array.isArray(i.languages))
        return i.languages.some(
          (l) => String(l.id) === String(selectedLanguageId),
        );
      return false;
    });
  }, [instructors, selectedLanguageId]);

  const handleValid = (data) => onSubmit(data);
  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className="space-y-3"
    >
      <Input
        label="Group Name *"
        error={errors.name?.message}
        {...register("name", {
          required: "Group name is required",
          minLength: { value: 2, message: "At least 2 characters" },
          maxLength: { value: 100, message: "Max 100 characters" },
          validate: (value) => {
            if (!value) return true;
            const normalized = value.trim().toLowerCase();
            const duplicate = existingGroups.some(
              (g) =>
                g.name.trim().toLowerCase() === normalized &&
                g.id !== initial?.id,
            );
            return duplicate ? "A group with this name already exists." : true;
          },
        })}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Language Level *"
          error={errors.languageLevelId?.message}
          {...register("languageLevelId", {
            required: "Language level is required",
          })}
        >
          <option value="">— Select —</option>
          {languages.flatMap((l) =>
            (l.levels || []).map((lv) => (
              <option key={lv.languageLevelId} value={lv.languageLevelId}>
                {l.name} — {lv.name}
              </option>
            )),
          )}
        </Select>

        <div className="space-y-1">
          <Select
            label={
              selectedLanguageId
                ? `Instructor * (${filteredInstructors.length} available)`
                : "Instructor * — pick a language first"
            }
            error={errors.instructorId?.message}
            disabled={!selectedLanguageId}
            {...register("instructorId", {
              required: "Instructor is required",
            })}
          >
            <option value="">— Select —</option>
            {filteredInstructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.person?.firstName} {i.person?.lastName}
              </option>
            ))}
          </Select>
          {selectedLanguageId && filteredInstructors.length === 0 && (
            <p className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
              ⚠ No instructors are qualified for this language.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Category *"
          error={errors.groupCategoryId?.message}
          {...register("groupCategoryId", { required: "Category is required" })}
        >
          <option value="">— Select —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Type *"
          error={errors.groupTypeId?.message}
          {...register("groupTypeId", { required: "Type is required" })}
        >
          <option value="">— Select —</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          label="Delivery *"
          error={errors.deliveryModeId?.message}
          {...register("deliveryModeId", {
            required: "Delivery mode is required",
          })}
        >
          <option value="">— Select —</option>
          {modes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {selectedMode?.name === "OFFLINE" ? (
          <Select label="Hall" {...register("hallId")}>
            <option value="">— No hall —</option>
            {halls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} (cap:{h.capacity})
              </option>
            ))}
          </Select>
        ) : (
          <Select label="Zoom Account" {...register("zoomAccountId")}>
            <option value="">— No Zoom —</option>
            {zooms.map((z) => (
              <option key={z.id} value={z.id}>
                {z.displayName}
              </option>
            ))}
          </Select>
        )}
        <Select
          label="Status *"
          error={errors.groupStatusId?.message}
          {...register("groupStatusId", { required: "Status is required" })}
        >
          <option value="">— Select —</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Payment Strategy *"
          error={errors.paymentStrategy?.message}
          {...register("paymentStrategy", {
            required: "Payment strategy is required",
          })}
        >
          <option value="PER_MONTH">Per Month</option>
          <option value="PER_LEVEL">Per Level</option>
        </Select>
        <Input
          label="Fee Amount (EGP) *"
          type="number"
          step="0.01"
          error={errors.feeAmount?.message}
          {...register("feeAmount", {
            required: "Fee amount is required",
            valueAsNumber: true,
            min: { value: 0, message: "Fee cannot be negative" },
            max: { value: 1000000, message: "Fee seems too large" },
          })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Commission % *"
          type="number"
          step="0.01"
          error={errors.instructorCommissionPct?.message}
          {...register("instructorCommissionPct", {
            required: "Commission % is required",
            valueAsNumber: true,
            min: { value: 0, message: "Cannot be negative" },
            max: { value: 100, message: "Cannot exceed 100%" },
          })}
        />
        <Input
          label="Sessions/(Month/Level)"
          type="number"
          defaultValue={8}
          error={errors.sessionsPerMonth?.message}
          {...register("sessionsPerMonth", {
            valueAsNumber: true,
            min: { value: 1, message: "At least 1 session" },
            max: { value: 60, message: "Max 60 sessions per month" },
          })}
        />
        <Input
          label="Grace Period (days)"
          type="number"
          defaultValue={7}
          error={errors.gracePeriodDays?.message}
          {...register("gracePeriodDays", {
            valueAsNumber: true,
            min: { value: 0, message: "Cannot be negative" },
            max: { value: 365, message: "Max 365 days" },
          })}
        />
        <Input
          label="Max Capacity"
          type="number"
          error={errors.maxCapacity?.message}
          {...register("maxCapacity", {
            valueAsNumber: true,
            min: { value: 1, message: "At least 1 student" },
            max: { value: 500, message: "Max 500 students" },
          })}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          {initial?.id ? "Update Group" : "Create Group"}
        </Button>
      </div>
    </form>
  );
}

// ── ChangeInstructorForm ──────────────────────────────────────────────────────
function ChangeInstructorForm({
  groupId,
  onSubmit,
  loading,
  instructors = [],
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit((d) => onSubmit({ ...d, groupId }), handleInvalid)}
      className="space-y-3"
    >
      <Select
        label="New Instructor *"
        error={errors.newInstructorId?.message}
        {...register("newInstructorId", {
          required: "Please select an instructor",
        })}
      >
        <option value="">— Select —</option>
        {instructors.map((i) => (
          <option key={i.id} value={i.id}>
            {i.person?.firstName} {i.person?.lastName}
          </option>
        ))}
      </Select>
      <Input
        label="New Commission %"
        type="number"
        step="0.01"
        error={errors.newCommissionPct?.message}
        {...register("newCommissionPct", {
          required: "Commission % is required",
          valueAsNumber: true,
          min: { value: 0, message: "Cannot be negative" },
          max: { value: 100, message: "Cannot exceed 100%" },
        })}
      />
      <Input
        label="Effective From *"
        type="date"
        error={errors.effectiveFrom?.message}
        {...register("effectiveFrom", {
          required: "Effective date is required",
          validate: (v) =>
            new Date(v) <= new Date() || "Date cannot be in the future",
        })}
      />
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          Change Instructor
        </Button>
      </div>
    </form>
  );
}

// ── StudentSearchPicker ───────────────────────────────────────────────────────
function StudentSearchPicker({ students = [], value, onChange, error }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = students.find((s) => s.id === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students.slice(0, 8);
    return students
      .filter((s) => {
        const fullName =
          `${s.person?.firstName ?? ""} ${s.person?.lastName ?? ""}`.toLowerCase();
        const phone = (s.person?.phone ?? "").toLowerCase();
        return fullName.includes(q) || phone.includes(q);
      })
      .slice(0, 10);
  }, [students, query]);

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
        Student *
      </label>
      {selected && !open ? (
        <div className="flex items-center justify-between p-2.5 border rounded-lg bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div>
            <p className="text-sm font-medium dark:text-gray-100">
              {selected.person?.firstName} {selected.person?.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selected.person?.phone
                ? `📞 ${selected.person.phone}`
                : "No phone on record"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            autoFocus={open}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search by name or phone number…"
            className="input w-full text-sm pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
          {open && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {results.length === 0 ? (
                <p className="p-3 text-sm text-gray-400 text-center">
                  No students found
                </p>
              ) : (
                results.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onChange(s.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0 transition-colors"
                  >
                    <p className="text-sm font-medium dark:text-gray-100">
                      {s.person?.firstName} {s.person?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex gap-3">
                      {s.person?.phone && <span>📞 {s.person.phone}</span>}
                    </p>
                  </button>
                ))
              )}
              <div
                className="fixed inset-0 z-[-1]"
                onClick={() => setOpen(false)}
              />
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ── EnrollmentForm ────────────────────────────────────────────────────────────
function EnrollmentForm({
  group,
  students = [],
  onSubmit,
  onSubmitPartial,
  loading,
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      studentId: "",
      enrollDate: new Date().toISOString().slice(0, 10),
      discountPct: 0,
      scholarship: false,
      isPartial: false,
    },
  });

  const isPartial = watch("isPartial");
  const scholarship = watch("scholarship");
  const discountPct = Number(watch("discountPct") ?? 0);
  const studentId = watch("studentId");
  const feeAmount = group?.feeAmount ?? 0;
  const effectiveFee = scholarship
    ? 0
    : feeAmount - (feeAmount * discountPct) / 100;

  const handleValid = (d) => {
    const base = {
      studentId: d.studentId,
      groupId: group.id,
      scholarship: d.scholarship,
      discountPct: Number(d.discountPct),
    };
    if (d.isPartial) {
      if (new Date(d.partialEnd) <= new Date(d.partialStart)) {
        toast.error("Partial end date must be after start date");
        return;
      }
      onSubmitPartial({
        ...base,
        partialStart: d.partialStart,
        partialEnd: d.partialEnd,
        partialCost: Number(d.partialCost),
      });
    } else {
      onSubmit({ ...base, enrollDate: d.enrollDate, effectiveFee });
    }
  };

  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className="space-y-4"
    >
      <StudentSearchPicker
        students={students}
        value={studentId}
        onChange={(id) => setValue("studentId", id, { shouldValidate: true })}
        error={errors.studentId?.message}
      />
      <input
        type="hidden"
        {...register("studentId", { required: "Please select a student" })}
      />

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input type="checkbox" {...register("isPartial")} className="rounded" />
        <span className="dark:text-gray-300">
          Partial enrollment (mid-period join)
        </span>
      </label>

      {!isPartial ? (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Enroll Date *"
            type="date"
            error={errors.enrollDate?.message}
            {...register("enrollDate", {
              required: "Enroll date is required",
              validate: (v) => !!v || "Invalid date",
            })}
          />
          <Input
            label="Discount %"
            type="number"
            step="0.01"
            min="0"
            max="100"
            error={errors.discountPct?.message}
            {...register("discountPct", {
              valueAsNumber: true,
              min: { value: 0, message: "Cannot be negative" },
              max: { value: 100, message: "Cannot exceed 100%" },
            })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Partial Start *"
            type="date"
            error={errors.partialStart?.message}
            {...register("partialStart", {
              required: isPartial ? "Start date is required" : false,
            })}
          />
          <Input
            label="Partial End *"
            type="date"
            error={errors.partialEnd?.message}
            {...register("partialEnd", {
              required: isPartial ? "End date is required" : false,
            })}
          />
          <Input
            label="Partial Cost (EGP) *"
            type="number"
            step="0.01"
            error={errors.partialCost?.message}
            {...register("partialCost", {
              required: isPartial ? "Cost is required" : false,
              valueAsNumber: true,
              min: { value: 0, message: "Cannot be negative" },
            })}
          />
          <Input
            label="Discount %"
            type="number"
            step="0.01"
            min="0"
            max="100"
            error={errors.discountPct?.message}
            {...register("discountPct", {
              valueAsNumber: true,
              min: { value: 0, message: "Cannot be negative" },
              max: { value: 100, message: "Cannot exceed 100%" },
            })}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          {...register("scholarship")}
          className="rounded"
        />
        <span className="dark:text-gray-300">
          Scholarship (full fee waiver)
        </span>
      </label>

      {!isPartial && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm space-y-1.5 border dark:border-gray-700">
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Group fee</span>
            <span>{feeAmount.toFixed(2)} EGP</span>
          </div>
          {discountPct > 0 && (
            <div className="flex justify-between text-orange-500">
              <span>Discount ({discountPct}%)</span>
              <span>− {((feeAmount * discountPct) / 100).toFixed(2)} EGP</span>
            </div>
          )}
          {scholarship && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Scholarship</span>
              <span>Full waiver</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t dark:border-gray-700 pt-1.5 text-gray-800 dark:text-gray-100">
            <span>Effective fee</span>
            <span>{scholarship ? "0.00" : effectiveFee.toFixed(2)} EGP</span>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading} icon={UserPlus}>
          Enroll Student
        </Button>
      </div>
    </form>
  );
}

// ── EarlyExitForm ─────────────────────────────────────────────────────────────
function EarlyExitForm({ enrollment, paymentMethods = [], onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      paymentMethodId: "",
      actualRefundAmount: "",
      adjustmentReason: "",
    },
  });

  // Load preview as soon as the modal opens
  const {
    data: previewRes,
    isLoading: previewLoading,
    error: previewError,
  } = useQuery({
    queryKey: ["refund-preview", enrollment?.id],
    queryFn: () => enrollmentsApi.getRefundPreview(enrollment.id),
    enabled: !!enrollment?.id,
  });

  const preview = previewRes?.data?.data;

  // Pre-fill actual refund with calculated value once loaded
  useEffect(() => {
    if (preview?.calculatedRefundAmount != null) {
      setValue("actualRefundAmount", preview.calculatedRefundAmount);
    }
  }, [preview?.calculatedRefundAmount, setValue]);

  const actualRefund = Number(watch("actualRefundAmount") ?? 0);
  const isAdjusted = preview && actualRefund !== preview.calculatedRefundAmount;
  const reasonRequired = isAdjusted;

  const handleValid = (d) =>
    onSubmit({
      enrollmentId: enrollment.id,
      paymentMethodId: d.paymentMethodId,
      actualRefundAmount: Number(d.actualRefundAmount),
      adjustmentReason: d.adjustmentReason || null,
    });

  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className="space-y-4"
    >
      {/* ── Warning banner ── */}
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm space-y-1">
        <p className="font-semibold text-amber-800 dark:text-amber-300">
          ⚠ Early Exit — {enrollment?.studentName}
        </p>
        <p className="text-amber-600 dark:text-amber-500 text-xs">
          Refund is calculated from attendance records for the latest paid
          period only. The payment will be commission-blocked after exit.
        </p>
      </div>

      {/* ── Preview panel ── */}
      {previewLoading && (
        <p className="text-sm text-gray-400 animate-pulse">
          Loading refund preview…
        </p>
      )}

      {previewError && (
        <p className="text-sm text-red-500">Failed to load refund preview.</p>
      )}

      {preview && !previewLoading && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-sm space-y-1.5">
          {[
            ["Latest Payment Amount", `${preview.amountPaid.toFixed(2)} EGP`],
            ["Period", preview.periodLabel],
            ["Sessions in Period", preview.sessionsInPeriod],
            ["Past Sessions", preview.attendedSessions],
            ["Remaining Sessions", preview.remainingSessions],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between text-gray-600 dark:text-gray-400"
            >
              <span>{label}</span>
              <span className="font-medium dark:text-gray-200">{value}</span>
            </div>
          ))}

          <div className="flex justify-between border-t dark:border-gray-700 pt-1.5 text-primary-700 dark:text-primary-400 font-semibold">
            <span>Calculated Refund</span>
            <span>{preview.calculatedRefundAmount.toFixed(2)} EGP</span>
          </div>

          {!preview.canRefund && (
            <p className="text-xs text-red-500 font-medium pt-1">
              ✕ All sessions in this period were attended. No refund is
              available.
            </p>
          )}

          <div className="flex justify-between text-xs text-rose-500 dark:text-rose-400 pt-0.5">
            <span>🔒 Payment will be commission-blocked after exit</span>
          </div>
        </div>
      )}

      {/* ── Only show the rest of the form if a refund is possible ── */}
      {preview?.canRefund && (
        <>
          <Select
            label="Refund Payment Method *"
            error={errors.paymentMethodId?.message}
            {...register("paymentMethodId", {
              required: "Select a payment method",
            })}
          >
            <option value="">— Select —</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
              </option>
            ))}
          </Select>

          <Input
            label="Actual Refund Amount (EGP) *"
            type="number"
            step="0.01"
            error={errors.actualRefundAmount?.message}
            {...register("actualRefundAmount", {
              required: "Required",
              valueAsNumber: true,
              min: { value: 0, message: "Cannot be negative" },
              max: {
                value: preview?.amountPaid ?? Infinity,
                message: "Cannot exceed the original payment amount",
              },
            })}
          />

          {isAdjusted && (
            <div className="text-xs text-amber-600 dark:text-amber-400 -mt-2 px-1">
              ⚠ Amount differs from calculated refund — reason is required.
            </div>
          )}

          <Input
            label={`Adjustment Reason${reasonRequired ? " *" : ""}`}
            error={errors.adjustmentReason?.message}
            {...register("adjustmentReason", {
              validate: (v) =>
                !reasonRequired ||
                !!v?.trim() ||
                "Reason is required when overriding the calculated refund",
            })}
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={loading} icon={LogOut}>
              Confirm Exit &amp; Refund
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
// ── GroupDetail ───────────────────────────────────────────────────────────────
function GroupDetail({ group, onClose, instructors = [], branchId }) {
  const [tab, setTab] = useState("enrollments");
  const [changeInstr, setChangeInstr] = useState(false);
  const [enrollModal, setEnrollModal] = useState(false);
  const [exitTarget, setExitTarget] = useState(null); // ACTIVE / OVERDUE
  const [unenrollTarget, setUnenrollTarget] = useState(null); // PENDING / PARTIAL
  const qc = useQueryClient();

  const { data: enrRes, refetch: refetchEnr } = useQuery({
    queryKey: ["enr-g", group.id],
    queryFn: () => enrollmentsApi.getByGroup(group.id),
  });
  const { data: sesRes } = useQuery({
    queryKey: ["ses-g", group.id],
    queryFn: () => sessionsApi.getByGroup(group.id),
  });
  const { data: studentsRes } = useQuery({
    queryKey: ["students", branchId],
    queryFn: () => studentsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const { data: pmRes } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => lookupsApi.getPaymentMethods(),
  });

  const students = studentsRes?.data?.data || [];
  const enrollments = enrRes?.data?.data || [];
  const sessions = sesRes?.data?.data || [];
  const paymentMethods = pmRes?.data?.data || [];

  const enrolledStudentIds = new Set(
    enrollments
      .filter(
        (e) =>
          !["DROPPED", "COMPLETED", "EXITED_REFUNDED", "CANCELLED"].includes(
            e.status,
          ),
      )
      .map((e) => e.studentId),
  );
  const availableStudents = students.filter(
    (s) => s.isActive && !enrolledStudentIds.has(s.id),
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const changeInstrMut = useMutation({
    mutationFn: (d) => groupsApi.changeInstructor(d),
    onSuccess: () => {
      toast.success("Instructor changed");
      qc.invalidateQueries(["groups"]);
      setChangeInstr(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const enrollMut = useMutation({
    mutationFn: (d) => enrollmentsApi.create(d),
    onSuccess: (res) => {
      toast.success("Student enrolled");
      refetchEnr();
      qc.invalidateQueries(["groups"]);
      setEnrollModal(false);
      const id = res?.data?.data?.id;
      if (id) notificationsApi.enrollmentConfirmedGmail(id).catch(() => {});
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const enrollPartialMut = useMutation({
    mutationFn: (d) => enrollmentsApi.createPartial(d),
    onSuccess: (res) => {
      toast.success("Partial enrollment created");
      refetchEnr();
      qc.invalidateQueries(["groups"]);
      setEnrollModal(false);
      const id = res?.data?.data?.id;
      if (id) notificationsApi.enrollmentConfirmedGmail(id).catch(() => {});
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  // Exit & Refund — ACTIVE / OVERDUE
  const exitMut = useMutation({
    mutationFn: (d) => enrollmentsApi.earlyExitRefund(d),
    onSuccess: (res) => {
      toast.success("Student exited · refund recorded · commission blocked");
      refetchEnr();
      qc.invalidateQueries(["groups"]);
      setExitTarget(null);
      const refundId = res?.data?.data?.id;
      if (refundId)
        notificationsApi.earlyExitRefundGmail(refundId).catch(() => {});
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  // Unenroll — hard delete for PENDING / PARTIAL with no payments
  const unenrollMut = useMutation({
    mutationFn: (id) => enrollmentsApi.unenroll(id),
    onSuccess: () => {
      toast.success("Enrollment removed");
      refetchEnr();
      qc.invalidateQueries(["groups"]);
      setUnenrollTarget(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  // ── Action cell renderer ──────────────────────────────────────────────────
  // PENDING / PARTIAL  → red  Unenroll button  (UserX icon)
  // ACTIVE  / OVERDUE  → amber Exit button     (LogOut icon)
  // EXITED_REFUNDED    → green "✓ Refunded" label
  // everything else    → —
  const renderActionCell = (r) => {
    if (r.status?.toUpperCase() === "EXITED_REFUNDED") {
      return (
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          ✓ Refunded
        </span>
      );
    }
    if (["PENDING", "PARTIAL"].includes(r.status?.toUpperCase())) {
      return (
        <button
          onClick={() => setUnenrollTarget(r)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-800 transition-colors"
          title="Remove this enrollment (no payments exist)"
        >
          <UserX size={12} /> Unenroll
        </button>
      );
    }
    if (["ACTIVE", "OVERDUE"].includes(r.status?.toUpperCase())) {
      return (
        <button
          onClick={() => setExitTarget(r)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 border border-amber-200 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 transition-colors"
          title="Early exit with refund"
        >
          <LogOut size={12} /> Exit
        </button>
      );
    }
    return <span className="text-xs text-gray-400">—</span>;
  };

  return (
    <Modal open onClose={onClose} title={`${group.name} — Details`} size="xl">
      {/* Group info grid */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        {[
          ["Language", group.languageName],
          ["Level", group.levelCode],
          ["Instructor", group.instructorName],
          ["Category", group.groupCategory],
          ["Type", group.groupType],
          ["Delivery", group.deliveryMode],
          ["Strategy", group.paymentStrategy],
          ["Fee", `${group.feeAmount} EGP`],
          ["Commission", `${group.instructorCommissionPct}%`],
          ["Status", group.groupStatus],
          ["Sessions Per Period", `${group.sessionsPerMonth} Sessions`],
          ["Enrolled", `${group.enrolledCount} students`],
        ].map(([l, v]) => (
          <div key={l}>
            <p className="text-xs text-gray-500">{l}</p>
            <p className="text-sm font-medium dark:text-gray-200">{v || "—"}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 mb-3">
        <Button
          variant="secondary"
          icon={RefreshCw}
          onClick={() => setChangeInstr(true)}
        >
          Change Instructor
        </Button>
        <Button icon={UserPlus} onClick={() => setEnrollModal(true)}>
          Enroll Student
        </Button>
      </div>

      <Tabs
        tabs={[
          {
            key: "enrollments",
            label: "Enrollments",
            count: enrollments.length,
          },
          { key: "sessions", label: "Sessions", count: sessions.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── Enrollments tab ─────────────────────────────────────────────── */}
      {tab === "enrollments" && (
        <Table
          columns={[
            { key: "studentName", label: "Student" },
            {
              key: "enrollDate",
              label: "Enrolled",
              render: (r) => new Date(r.enrollDate).toLocaleDateString(),
            },
            {
              key: "effectiveFee",
              label: "Fee",
              render: (r) => `${r.effectiveFee} EGP`,
            },
            {
              key: "discountPct",
              label: "Discount",
              render: (r) => `${r.discountPct}%`,
            },
            {
              key: "scholarship",
              label: "Scholar.",
              render: (r) => (r.scholarship ? "✓" : "—"),
            },
            {
              key: "isPartial",
              label: "Partial",
              render: (r) => (r.isPartial ? "Yes" : "—"),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge label={r.status} />,
            },
            {
              key: "whatsapp",
              label: "WhatsApp",
              render: (r) => (
                <WaButton
                  label="Confirm"
                  onSend={() =>
                    notificationsApi.enrollmentConfirmedWhatsApp(r.id)
                  }
                />
              ),
            },
            {
              key: "gmail",
              label: "Gmail",
              render: (r) => (
                <GmailButton
                  label="Confirm"
                  onSend={() => notificationsApi.enrollmentConfirmedGmail(r.id)}
                />
              ),
            },
            { key: "action", label: "Action", render: renderActionCell },
          ]}
          data={enrollments}
          emptyMsg="No enrollments yet."
        />
      )}

      {/* ── Sessions tab ────────────────────────────────────────────────── */}
      {tab === "sessions" && (
        <Table
          columns={[
            { key: "sessionNumber", label: "#" },
            { key: "periodLabel", label: "Period" },
            { key: "instructorName", label: "Instructor" },
            {
              key: "scheduledDate",
              label: "Date",
              render: (r) => new Date(r.scheduledDate).toLocaleString(),
            },
            { key: "topic", label: "Topic", render: (r) => r.topic || "—" },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge label={r.status} />,
            },
          ]}
          data={sessions}
          emptyMsg="No sessions yet."
        />
      )}

      {/* ── Change Instructor modal ──────────────────────────────────────── */}
      <Modal
        open={changeInstr}
        onClose={() => setChangeInstr(false)}
        title="Change Instructor"
        size="sm"
      >
        <ChangeInstructorForm
          groupId={group.id}
          instructors={instructors}
          onSubmit={changeInstrMut.mutate}
          loading={changeInstrMut.isPending}
        />
      </Modal>

      {/* ── Enroll Student modal ─────────────────────────────────────────── */}
      <Modal
        open={enrollModal}
        onClose={() => setEnrollModal(false)}
        title={`Enroll Student — ${group.name}`}
        size="md"
      >
        <EnrollmentForm
          group={group}
          students={availableStudents}
          onSubmit={enrollMut.mutate}
          onSubmitPartial={enrollPartialMut.mutate}
          loading={enrollMut.isPending || enrollPartialMut.isPending}
        />
      </Modal>

      {/* ── Early Exit & Refund modal (ACTIVE / OVERDUE) ─────────────────── */}
      <Modal
        open={!!exitTarget}
        onClose={() => !exitMut.isPending && setExitTarget(null)}
        title={`Early Exit — ${exitTarget?.studentName ?? ""}`}
        size="md"
      >
        {exitTarget && (
          <EarlyExitForm
            enrollment={exitTarget}
            paymentMethods={paymentMethods}
            onSubmit={exitMut.mutate}
            loading={exitMut.isPending}
          />
        )}
      </Modal>

      {/* ── Unenroll confirm dialog (PENDING / PARTIAL — no payments) ────── */}
      <ConfirmDialog
        open={!!unenrollTarget}
        title="Remove Enrollment"
        message={
          `Are you sure you want to remove ${unenrollTarget?.studentName ?? "this student"} ` +
          `from the group? This permanently deletes the enrollment record. ` +
          `Only use this if the enrollment was added by mistake and no payment has been recorded.`
        }
        onConfirm={() => unenrollMut.mutate(unenrollTarget.id)}
        onCancel={() => setUnenrollTarget(null)}
        loading={unenrollMut.isPending}
      />
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Groups() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const resetFilters = () => setFilters({ ...DEFAULT_FILTERS });
  const isAnyFilterActive = useMemo(
    () => Object.entries(filters).some(([k, v]) => v !== DEFAULT_FILTERS[k]),
    [filters],
  );

  const { data: res, isLoading } = useQuery({
    queryKey: ["groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const { data: langRes } = useQuery({
    queryKey: ["languages"],
    queryFn: () => lookupsApi.getLanguages(),
  });
  const { data: instrRes } = useQuery({
    queryKey: ["instructors", branchId],
    queryFn: () => instructorsApi.getByBranch(branchId),
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
  const { data: statRes } = useQuery({
    queryKey: ["gstatus"],
    queryFn: () => lookupsApi.getGroupStatuses(),
  });
  const { data: catRes } = useQuery({
    queryKey: ["gcat"],
    queryFn: () => lookupsApi.getGroupCategories(),
  });
  const { data: typeRes } = useQuery({
    queryKey: ["gtype"],
    queryFn: () => lookupsApi.getGroupTypes(),
  });
  const { data: modeRes } = useQuery({
    queryKey: ["gmode"],
    queryFn: () => lookupsApi.getDeliveryModes(),
  });

  const groups = res?.data?.data || [];
  const languages = langRes?.data?.data || [];
  const instructors = instrRes?.data?.data || [];
  const halls = hallRes?.data?.data || [];
  const zooms = zoomRes?.data?.data || [];
  const statuses = statRes?.data?.data || [];
  const categories = catRes?.data?.data || [];
  const types = typeRes?.data?.data || [];
  const modes = modeRes?.data?.data || [];

  const levelsForFilter = useMemo(() => {
    if (!filters.filterLang) {
      const seen = new Set();
      return languages
        .flatMap((l) => l.levels || [])
        .filter((lv) => {
          if (seen.has(lv.name)) return false;
          seen.add(lv.name);
          return true;
        });
    }
    return languages.find((l) => l.name === filters.filterLang)?.levels || [];
  }, [languages, filters.filterLang]);

  const filtered = useMemo(
    () =>
      groups.filter((g) => {
        const q = filters.search.toLowerCase();
        if (q && !g.name.toLowerCase().includes(q)) return false;
        if (filters.filterStatus && g.groupStatus !== filters.filterStatus)
          return false;
        if (filters.filterCat && g.groupCategory !== filters.filterCat)
          return false;
        if (filters.filterType && g.groupType !== filters.filterType)
          return false;
        if (filters.filterLang && g.languageName !== filters.filterLang)
          return false;
        if (filters.filterLevel && g.levelCode !== filters.filterLevel)
          return false;
        if (
          filters.filterInstructor &&
          g.instructorName !== filters.filterInstructor
        )
          return false;
        if (filters.filterMode && g.deliveryMode !== filters.filterMode)
          return false;
        if (
          filters.filterZoom &&
          String(g.zoomAccountId) !== filters.filterZoom
        )
          return false;
        return true;
      }),
    [groups, filters],
  );

  const invalidate = () => qc.invalidateQueries(["groups"]);

  const createMut = useMutation({
    mutationFn: (d) =>
      groupsApi.create({
        ...d,
        branchId,
        hallId: d.hallId || null,
        zoomAccountId: d.zoomAccountId || null,
        maxCapacity: d.maxCapacity || null,
      }),
    onSuccess: () => {
      toast.success("Group created");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });
  const updateMut = useMutation({
    mutationFn: (d) =>
      groupsApi.update({
        ...d,
        id: selected.id,
        hallId: d.hallId || null,
        zoomAccountId: d.zoomAccountId || null,
        maxCapacity: d.maxCapacity || null,
      }),
    onSuccess: () => {
      toast.success("Updated");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => groupsApi.delete(id),
    onSuccess: () => {
      toast.success("Group deleted");
      invalidate();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const active = groups.filter((g) => g.groupStatus === "ACTIVE").length;
  const completed = groups.filter((g) => g.groupStatus === "COMPLETED").length;
  const online = groups.filter((g) => g.deliveryMode === "ONLINE").length;
  const commonProps = {
    languages,
    instructors,
    halls,
    zooms,
    statuses,
    categories,
    types,
    modes,
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Groups"
        subtitle={`${active} active · ${completed} completed · ${online} online`}
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            New Group
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Active"
          value={active}
          icon={BookOpen}
          color="bg-green-600"
        />
        <StatCard
          title="Completed"
          value={completed}
          icon={BookOpen}
          color="bg-blue-500"
        />
        <StatCard
          title="Online"
          value={online}
          icon={BookOpen}
          color="bg-cyan-500"
        />
        <StatCard
          title="Total"
          value={groups.length}
          icon={BookOpen}
          color="bg-primary-900"
        />
      </div>

      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={filters.search}
              onChange={(v) => setFilter("search", v)}
              placeholder="Search group…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filters.filterLang}
              onChange={(e) => {
                setFilter("filterLang", e.target.value);
                setFilter("filterLevel", "");
              }}
              className="input w-36 text-sm"
            >
              <option value="">All Languages</option>
              {languages.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
            <select
              value={filters.filterLevel}
              onChange={(e) => setFilter("filterLevel", e.target.value)}
              className="input w-32 text-sm"
              disabled={!filters.filterLang && levelsForFilter.length === 0}
            >
              <option value="">All Levels</option>
              {levelsForFilter.map((lv) => (
                <option key={lv.languageLevelId ?? lv.id} value={lv.name}>
                  {lv.name}
                </option>
              ))}
            </select>
            <select
              value={filters.filterInstructor}
              onChange={(e) => setFilter("filterInstructor", e.target.value)}
              className="input w-44 text-sm"
            >
              <option value="">All Instructors</option>
              {instructors.map((i) => (
                <option
                  key={i.id}
                  value={`${i.person?.firstName} ${i.person?.lastName}`}
                >
                  {i.person?.firstName} {i.person?.lastName}
                </option>
              ))}
            </select>
            <select
              value={filters.filterType}
              onChange={(e) => setFilter("filterType", e.target.value)}
              className="input w-36 text-sm"
            >
              <option value="">All Types</option>
              {types.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={filters.filterMode}
              onChange={(e) => setFilter("filterMode", e.target.value)}
              className="input w-36 text-sm"
            >
              <option value="">All Modes</option>
              {modes.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={filters.filterZoom}
              onChange={(e) => setFilter("filterZoom", e.target.value)}
              className="input w-44 text-sm"
            >
              <option value="">All Zoom Accounts</option>
              {zooms.map((z) => (
                <option key={z.id} value={String(z.id)}>
                  {z.displayName}
                </option>
              ))}
            </select>
            <select
              value={filters.filterStatus}
              onChange={(e) => setFilter("filterStatus", e.target.value)}
              className="input w-40 text-sm"
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={filters.filterCat}
              onChange={(e) => setFilter("filterCat", e.target.value)}
              className="input w-40 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
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
              {filtered.length} records
            </span>
          </div>
        </div>

        <Table
          loading={isLoading}
          data={filtered}
          emptyMsg="No groups found."
          columns={[
            { key: "name", label: "Name" },
            { key: "languageName", label: "Language" },
            { key: "levelCode", label: "Level" },
            { key: "instructorName", label: "Instructor" },
            {
              key: "groupCategory",
              label: "Category",
              render: (r) => <Badge label={r.groupCategory} />,
            },
            {
              key: "groupType",
              label: "Type",
              render: (r) => <Badge label={r.groupType} />,
            },
            {
              key: "deliveryMode",
              label: "Mode",
              render: (r) => <Badge label={r.deliveryMode} />,
            },
            {
              key: "feeAmount",
              label: "Fee",
              render: (r) => `${r.feeAmount} EGP`,
            },
            { key: "enrolledCount", label: "Enrolled" },
            {
              key: "groupStatus",
              label: "Status",
              render: (r) => <Badge label={r.groupStatus} />,
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
                    title="Edit group"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded"
                    title="Delete group"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Create Group"
        size="lg"
      >
        <GroupForm
          {...commonProps}
          existingGroups={groups}
          onSubmit={createMut.mutate}
          loading={createMut.isPending}
        />
      </Modal>

      <Modal
        open={modal === "edit"}
        onClose={() => setModal(null)}
        title="Edit Group"
        size="lg"
      >
        {selected && (
          <GroupForm
            {...commonProps}
            existingGroups={groups}
            initial={{
              ...selected,
              languageLevelId: selected.languageLevelId,
              groupCategoryId: selected.groupCategoryId,
              groupTypeId: selected.groupTypeId,
              deliveryModeId: selected.deliveryModeId,
              groupStatusId: selected.groupStatusId,
              hallId: selected.hallId,
              zoomAccountId: selected.zoomAccountId,
              instructorId: selected.instructorId,
            }}
            onSubmit={updateMut.mutate}
            loading={updateMut.isPending}
          />
        )}
      </Modal>

      {modal === "detail" && selected && (
        <GroupDetail
          group={selected}
          onClose={() => setModal(null)}
          instructors={instructors}
          branchId={branchId}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Group"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
