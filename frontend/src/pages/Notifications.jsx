import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../context/authStore";
import {
  notificationsApi,
  lookupsApi,
  groupsApi,
  studentsApi,
  enrollmentsApi,
} from "../services/endpoints";
import { Send, Users, User, BookOpen, Search, X } from "lucide-react";
import toast from "react-hot-toast";

// ── Globe icon ────────────────────────────────────────────────────────────────

function Globe({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// ── Student Picker Modal ──────────────────────────────────────────────────────

function StudentPickerModal({
  branchId,
  groups,
  selected,
  onConfirm,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");
  const [draft, setDraft] = useState(selected);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // All students for this branch
  const { data: allStudents = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students", branchId],
    queryFn: () => studentsApi.getByBranch(branchId),
    enabled: !!branchId,
    select: (r) => r.data?.data || [],
  });

  // Enrollments for selected group — only fetched when a group is picked
  const { data: groupEnrollments = [], isLoading: loadingGroup } = useQuery({
    queryKey: ["enrollments-group", filterGroupId],
    queryFn: () => enrollmentsApi.getByGroup(filterGroupId),
    enabled: !!filterGroupId,
    select: (r) => r.data?.data || [],
  });

  const isLoading = loadingStudents || (!!filterGroupId && loadingGroup);

  // When a group is selected, restrict to student IDs in that group's enrollments
  const groupStudentIds = useMemo(() => {
    if (!filterGroupId) return null;
    return new Set(groupEnrollments.map((e) => e.studentId));
  }, [filterGroupId, groupEnrollments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allStudents.filter((s) => {
      const name =
        `${s.person?.firstName ?? ""} ${s.person?.lastName ?? ""}`.toLowerCase();
      const matchesSearch =
        !q || name.includes(q) || (s.person?.phone ?? "").includes(q);
      const matchesGroup = !groupStudentIds || groupStudentIds.has(s.id);
      return matchesSearch && matchesGroup;
    });
  }, [allStudents, search, groupStudentIds]);

  const isSelected = (id) => draft.some((s) => s.id === id);

  const toggle = (student) => {
    setDraft((prev) =>
      prev.some((s) => s.id === student.id)
        ? prev.filter((s) => s.id !== student.id)
        : [...prev, student],
    );
  };

  const toggleAll = () => {
    const allSelected = filtered.every((s) => isSelected(s.id));
    if (allSelected) {
      setDraft((prev) =>
        prev.filter((s) => !filtered.some((f) => f.id === s.id)),
      );
    } else {
      const toAdd = filtered.filter((s) => !isSelected(s.id));
      setDraft((prev) => [...prev, ...toAdd]);
    }
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => isSelected(s.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              Select Students
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {draft.length > 0
                ? `${draft.length} selected`
                : "No students selected yet"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-gray-100 space-y-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
            />
          </div>
          <select
            value={filterGroupId}
            onChange={(e) => setFilterGroupId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
          >
            <option value="">All Students</option>
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Select all row */}
        {!isLoading && filtered.length > 0 && (
          <div
            onClick={toggleAll}
            className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                allFilteredSelected
                  ? "bg-[#1A3C6E] border-[#1A3C6E]"
                  : "border-gray-300"
              }`}
            >
              {allFilteredSelected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4l3 3 5-6"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span className="text-xs font-medium text-gray-500">
              {allFilteredSelected
                ? "Deselect all visible"
                : "Select all visible"}{" "}
              ({filtered.length})
            </span>
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-gray-400">
              Loading students…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">
              No students found
            </div>
          ) : (
            filtered.map((s) => {
              const checked = isSelected(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => toggle(s)}
                  className={`flex items-center gap-3 px-5 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    checked ? "bg-blue-50 hover:bg-blue-50" : ""
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked
                        ? "bg-[#1A3C6E] border-[#1A3C6E]"
                        : "border-gray-300"
                    }`}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4l3 3 5-6"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {s.person?.firstName} {s.person?.lastName}
                    </p>
                    {s.person?.phone && (
                      <p className="text-xs text-gray-400 truncate">
                        {s.person.phone}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {draft.length > 0 && (
            <button
              onClick={() => setDraft([])}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear all
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(draft)}
              className="px-4 py-2 rounded-xl bg-[#1A3C6E] text-white text-sm font-medium hover:bg-[#2E7DBF]"
            >
              Confirm {draft.length > 0 ? `(${draft.length})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Notifications() {
  const { branchId } = useAuthStore();
  const [showStudentModal, setShowStudentModal] = useState(false);

  const [customForm, setCustomForm] = useState({
    message: "",
    sendTo: "all",
    groupId: "",
    languageId: "",
    selectedStudents: [],
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
    select: (r) => r.data?.data || [],
  });

  const { data: languages = [] } = useQuery({
    queryKey: ["languages"],
    queryFn: () => lookupsApi.getLanguages(),
    select: (r) => r.data?.data || [],
  });

  const sendCustom = useMutation({
    mutationFn: () => {
      if (!customForm.message.trim())
        throw new Error("Message cannot be empty.");
      if (!branchId) throw new Error("Branch is not set. Please log in again.");
      if (customForm.sendTo === "group" && !customForm.groupId)
        throw new Error("Please select a group.");
      if (customForm.sendTo === "language" && !customForm.languageId)
        throw new Error("Please select a language.");
      if (
        customForm.sendTo === "specific" &&
        customForm.selectedStudents.length === 0
      )
        throw new Error("Please select at least one student.");

      const payload = {
        branchId,
        message: customForm.message.trim(),
        sendTo: customForm.sendTo,
        groupId: customForm.sendTo === "group" ? customForm.groupId : null,
        languageId:
          customForm.sendTo === "language" ? customForm.languageId : null,
        studentIds:
          customForm.sendTo === "specific"
            ? customForm.selectedStudents.map((s) => s.id)
            : [],
      };

      return notificationsApi.sendCustom(payload);
    },
    onSuccess: (res) => {
      if (res?.data?.sent === true) {
        toast.success("Notification sent successfully");
        setCustomForm((f) => ({ ...f, message: "", selectedStudents: [] }));
      } else {
        toast.error("Unexpected server response. Check the logs.");
      }
    },
    onError: (e) => {
      const msg =
        e.message ||
        e.response?.data?.message ||
        e.response?.data?.title ||
        `Error ${e.response?.status ?? "unknown"}`;
      toast.error(msg);
    },
  });

  const canSend =
    customForm.message.trim().length > 0 &&
    (customForm.sendTo !== "group" || !!customForm.groupId) &&
    (customForm.sendTo !== "language" || !!customForm.languageId) &&
    (customForm.sendTo !== "specific" ||
      customForm.selectedStudents.length > 0);

  const removeStudent = (id) =>
    setCustomForm((f) => ({
      ...f,
      selectedStudents: f.selectedStudents.filter((s) => s.id !== id),
    }));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure and send notifications to students
        </p>
      </div>

      {/* ── Custom Notification ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">
          Send Custom Notification
        </h3>
        <div className="space-y-4">
          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Message *
            </label>
            <textarea
              rows={4}
              value={customForm.message}
              onChange={(e) =>
                setCustomForm((f) => ({ ...f, message: e.target.value }))
              }
              placeholder="Write your notification message…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C6E] resize-none"
            />
          </div>

          {/* Send To */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Send To
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "all", label: "All Students", icon: Users },
                { v: "group", label: "Specific Group", icon: BookOpen },
                { v: "language", label: "By Language", icon: Globe },
                { v: "specific", label: "Specific Students", icon: User },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() =>
                    setCustomForm((f) => ({ ...f, sendTo: opt.v }))
                  }
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    customForm.sendTo === opt.v
                      ? "bg-[#1A3C6E] text-white border-[#1A3C6E]"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <opt.icon size={14} /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Group picker */}
          {customForm.sendTo === "group" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Group *
              </label>
              <select
                value={customForm.groupId}
                onChange={(e) =>
                  setCustomForm((f) => ({ ...f, groupId: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
              >
                <option value="">-- Select Group --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Language picker */}
          {customForm.sendTo === "language" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Language *
              </label>
              <select
                value={customForm.languageId}
                onChange={(e) =>
                  setCustomForm((f) => ({ ...f, languageId: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3C6E]"
              >
                <option value="">-- Select Language --</option>
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Specific Students */}
          {customForm.sendTo === "specific" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Students *
              </label>

              {/* Selected chips */}
              {customForm.selectedStudents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {customForm.selectedStudents.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 bg-[#EEF3FA] text-[#1A3C6E] text-xs px-2.5 py-1 rounded-full font-medium"
                    >
                      {s.person?.firstName} {s.person?.lastName}
                      <button
                        onClick={() => removeStudent(s.id)}
                        className="hover:opacity-60 ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Open modal button */}
              <button
                onClick={() => setShowStudentModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#1A3C6E] hover:text-[#1A3C6E] hover:bg-[#EEF3FA] transition-colors w-full justify-center"
              >
                <Users size={15} />
                {customForm.selectedStudents.length > 0
                  ? `${customForm.selectedStudents.length} selected — click to change`
                  : "Browse & select students"}
              </button>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={() => sendCustom.mutate()}
            disabled={!canSend || sendCustom.isPending}
            className="flex items-center gap-2 bg-[#1A3C6E] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2E7DBF] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send size={15} />
            {sendCustom.isPending ? "Sending…" : "Send Notification"}
          </button>
        </div>
      </div>

      {/* ── Student Picker Modal ── */}
      {showStudentModal && (
        <StudentPickerModal
          branchId={branchId}
          groups={groups}
          selected={customForm.selectedStudents}
          onConfirm={(students) => {
            setCustomForm((f) => ({ ...f, selectedStudents: students }));
            setShowStudentModal(false);
          }}
          onClose={() => setShowStudentModal(false)}
        />
      )}
    </div>
  );
}
