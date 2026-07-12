import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  examsApi,
  groupsApi,
  lookupsApi,
  enrollmentsApi,
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
  StatCard,
  Tabs,
} from "../components/ui";
import WaButton from "../components/WaButton";
import GmailButton from "../components/GmailButton";
import {
  Plus,
  Eye,
  ClipboardList,
  Award,
  RotateCcw,
  Trophy,
  Pencil,
  ArrowUpDown,
} from "lucide-react";

const PAGE_SIZE = 15;
const RANKING_PAGE_SIZE = 20;
const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
const DEFAULT_FILTERS = {
  selGroup: "",
  typeFilter: "",
  monthFilter: "",
  yearFilter: "",
  periodLabelFilter: "",
  resultFilter: "",
};

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
        return (
          fullName.includes(q) ||
          (s.person?.nationalId ?? "").toLowerCase().includes(q) ||
          (s.qrCode ?? "").toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
        );
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
              {selected.person?.nationalId
                ? `ID: ${selected.person.nationalId}`
                : `QR: ${selected.qrCode?.slice(0, 8)}…`}
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
            placeholder="Search by name, national ID, or QR code…"
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
                      {s.person?.nationalId && (
                        <span>🪪 {s.person.nationalId}</span>
                      )}
                      <span>📋 {s.qrCode?.slice(0, 12)}…</span>
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

// ── ExamForm ──────────────────────────────────────────────────────────────────
function ExamForm({ initial, onSubmit, loading, groups = [] }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: initial });

  const handleValid = (data) => onSubmit(data);
  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className="space-y-3"
    >
      {initial?.id && <input type="hidden" {...register("id")} />}

      <Select
        label="Group *"
        error={errors.groupId?.message}
        {...register("groupId", { required: "Please select a group" })}
      >
        <option value="">— Select Group —</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name} ({g.languageName} {g.levelCode})
          </option>
        ))}
      </Select>

      <Input
        label="Exam Title *"
        error={errors.title?.message}
        {...register("title", {
          required: "Exam title is required",
          minLength: { value: 3, message: "At least 3 characters" },
          maxLength: { value: 150, message: "Max 150 characters" },
        })}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Total Marks *"
          type="number"
          step="0.01"
          error={errors.totalMarks?.message}
          {...register("totalMarks", {
            required: "Total marks is required",
            valueAsNumber: true,
            min: { value: 1, message: "Must be at least 1" },
            max: { value: 10000, message: "Too high" },
          })}
        />
        <Input
          label="Pass % *"
          type="number"
          step="0.01"
          error={errors.passPercentage?.message}
          {...register("passPercentage", {
            required: "Pass percentage is required",
            valueAsNumber: true,
            min: { value: 1, message: "Must be at least 1%" },
            max: { value: 100, message: "Cannot exceed 100%" },
          })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Exam Date *"
          type="datetime-local"
          error={errors.examDate?.message}
          {...register("examDate", {
            required: "Exam date is required",
            validate: (v) => !!v || "Invalid date/time",
          })}
        />
        <Input
          label="Duration (mins)"
          type="number"
          error={errors.durationMins?.message}
          {...register("durationMins", {
            valueAsNumber: true,
            min: { value: 5, message: "At least 5 minutes" },
            max: { value: 480, message: "Max 8 hours (480 min)" },
          })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          className="rounded"
          {...register("isFinalExam")}
        />
        Final / Level Exam
      </label>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          {initial?.id ? "Save Changes" : "Create Exam"}
        </Button>
      </div>
    </form>
  );
}

// ── ResultForm ────────────────────────────────────────────────────────────────
function ResultForm({ examId, exam, onSubmit, loading, students = [] }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();
  const studentId = watch("studentId");
  const totalMarks = exam?.totalMarks ?? 0;

  const handleValid = (d) =>
    onSubmit({ ...d, examId, marksObtained: parseFloat(d.marksObtained) });
  const handleInvalid = () =>
    toast.error("Please fix the highlighted fields before submitting.");

  return (
    <form
      onSubmit={handleSubmit(handleValid, handleInvalid)}
      className="space-y-3"
    >
      <StudentSearchPicker
        students={students}
        value={studentId ?? ""}
        onChange={(id) => setValue("studentId", id, { shouldValidate: true })}
        error={errors.studentId?.message}
      />
      <input
        type="hidden"
        {...register("studentId", { required: "Please select a student" })}
      />

      <Input
        label={`Marks Obtained * ${totalMarks ? `(max: ${totalMarks})` : ""}`}
        type="number"
        step="0.01"
        error={errors.marksObtained?.message}
        {...register("marksObtained", {
          required: "Marks obtained is required",
          valueAsNumber: true,
          min: { value: 0, message: "Cannot be negative" },
          ...(totalMarks > 0 && {
            max: {
              value: totalMarks,
              message: `Cannot exceed total marks (${totalMarks})`,
            },
          }),
        })}
      />

      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input type="checkbox" className="rounded" {...register("isRetake")} />
        Retake
      </label>

      <Input
        label="Retake Reason"
        error={errors.retakeReason?.message}
        {...register("retakeReason", {
          maxLength: { value: 300, message: "Max 300 characters" },
        })}
      />

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>
          Save Result
        </Button>
      </div>
    </form>
  );
}

// ── ExamDetail ────────────────────────────────────────────────────────────────
function ExamDetail({ exam, onClose, branchId }) {
  const [tab, setTab] = useState("results");
  const [addResult, setAddResult] = useState(false);
  const [marksSort, setMarksSort] = useState("desc"); // NEW: "desc" | "asc"

  const { data: resData, refetch } = useQuery({
    queryKey: ["results", exam.id],
    queryFn: () => examsApi.getResults(exam.id),
  });
  const { data: rankData } = useQuery({
    queryKey: ["ranking", exam.groupId],
    queryFn: () => examsApi.getRanking(exam.groupId),
  });
  const { data: enrRes } = useQuery({
    queryKey: ["enr-g", exam.groupId],
    queryFn: () => enrollmentsApi.getByGroup(exam.groupId),
    enabled: !!exam.groupId,
  });
  const { data: studentsRes } = useQuery({
    queryKey: ["students", branchId],
    queryFn: () => studentsApi.getByBranch(branchId),
    enabled: !!branchId,
  });

  const enrolledStudents = useMemo(() => {
    const enrollments = enrRes?.data?.data || [];
    const allStudents = studentsRes?.data?.data || [];
    const existingResults = resData?.data?.data || [];
    const activeIds = new Set(
      enrollments
        .filter(
          (e) =>
            !["DROPPED", "COMPLETED", "EXITED_REFUNDED", "CANCELLED"].includes(
              e.status,
            ),
        )
        .map((e) => e.studentId),
    );
    const passedIds = new Set(
      existingResults.filter((r) => r.passed).map((r) => r.studentId),
    );
    return allStudents.filter(
      (s) => activeIds.has(s.id) && !passedIds.has(s.id),
    );
  }, [enrRes, studentsRes, resData]);

  const resultMut = useMutation({
    mutationFn: (d) => examsApi.addResult(d),
    onSuccess: (res) => {
      toast.success("Result saved");
      refetch();
      setAddResult(false);
      const resultId = res?.data?.data?.id;
      const passed = res?.data?.data?.passed;
      const certificateId = res?.data?.data?.certificateId;
      if (resultId) {
        notificationsApi.examMarksGmail(resultId).catch(() => {});
        if (!passed) notificationsApi.failedExamGmail(resultId).catch(() => {});
        if (passed && certificateId)
          notificationsApi.levelCertificateGmail(certificateId).catch(() => {});
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  // NEW: results sorted by marksObtained (toggleable asc/desc)
  const results = useMemo(() => {
    const list = resData?.data?.data || [];
    const sorted = [...list].sort((a, b) => b.marksObtained - a.marksObtained);
    return marksSort === "asc" ? sorted.reverse() : sorted;
  }, [resData, marksSort]);
  const rankings = rankData?.data?.data || [];
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return (
    <Modal open onClose={onClose} title={`${exam.title} — Details`} size="xl">
      <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        {[
          ["Group", exam.groupName],
          ["Language", exam.languageName],
          ["Level", exam.levelCode],
          ["Total Marks", exam.totalMarks],
          ["Pass %", `${exam.passPercentage}%`],
          ["Duration", `${exam.durationMins} min`],
          ["Final Exam", exam.isFinalExam ? "Yes" : "No"],
          ["Custom", exam.isCustom ? "Yes" : "No"],
          ["Date", new Date(exam.examDate).toLocaleString()],
        ].map(([l, v]) => (
          <div key={l}>
            <p className="text-xs text-gray-500">{l}</p>
            <p className="text-sm font-medium dark:text-gray-200">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-3">
        <span className="text-sm text-green-600 font-medium">
          ✓ {passed} passed
        </span>
        <span className="text-sm text-red-500 font-medium">
          ✗ {failed} failed
        </span>
        <Button
          variant="secondary"
          icon={Plus}
          onClick={() => setAddResult(true)}
          className="ml-auto"
        >
          Add Result
        </Button>
      </div>

      <Tabs
        tabs={[
          { key: "results", label: "Results", count: results.length },
          { key: "ranking", label: "Rankings", count: rankings.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "results" && (
        <>
          {/* NEW: sort toggle above the results table */}
          <div className="flex justify-end mt-3 mb-1">
            <button
              type="button"
              onClick={() =>
                setMarksSort((s) => (s === "desc" ? "asc" : "desc"))
              }
              title="Toggle marks sort order"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowUpDown size={12} />
              Marks: {marksSort === "desc" ? "Highest first" : "Lowest first"}
            </button>
          </div>

          <Table
            columns={[
              { key: "studentName", label: "Student" },
              {
                key: "marksObtained",
                label: "Marks",
                render: (r) => `${r.marksObtained}/${exam.totalMarks}`,
              },
              {
                key: "passed",
                label: "Result",
                render: (r) => (
                  <Badge
                    label={r.passed ? "PASSED" : "FAILED"}
                    color={
                      r.passed
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  />
                ),
              },
              { key: "attemptNumber", label: "Attempt" },
              {
                key: "isRetake",
                label: "Retake",
                render: (r) => (r.isRetake ? "Yes" : "—"),
              },
              {
                key: "whatsapp",
                label: "WhatsApp",
                render: (r) => (
                  <div className="flex flex-col gap-1">
                    <WaButton
                      label="Send marks"
                      onSend={() => notificationsApi.examMarksWhatsApp(r.id)}
                    />
                    {!r.passed && (
                      <WaButton
                        label="Send remedial"
                        onSend={() => notificationsApi.failedExamWhatsApp(r.id)}
                      />
                    )}
                    {r.passed && r.certificateId && (
                      <WaButton
                        label="Send certificate"
                        onSend={() =>
                          notificationsApi.levelCertificateWhatsApp(
                            r.certificateId,
                          )
                        }
                      />
                    )}
                  </div>
                ),
              },
              {
                key: "gmail",
                label: "Gmail",
                render: (r) => (
                  <div className="flex flex-col gap-1">
                    <GmailButton
                      label="Send marks"
                      onSend={() => notificationsApi.examMarksGmail(r.id)}
                    />
                    {!r.passed && (
                      <GmailButton
                        label="Send remedial"
                        onSend={() => notificationsApi.failedExamGmail(r.id)}
                      />
                    )}
                    {r.passed && r.certificateId && (
                      <GmailButton
                        label="Send certificate"
                        onSend={() =>
                          notificationsApi.levelCertificateGmail(
                            r.certificateId,
                          )
                        }
                      />
                    )}
                  </div>
                ),
              },
            ]}
            data={results}
          />
        </>
      )}

      {tab === "ranking" && (
        <Table
          columns={[
            {
              key: "rank",
              label: "Rank",
              render: (r) => (
                <span className="font-bold text-primary-900 dark:text-primary-400">
                  #{r.rank}
                </span>
              ),
            },
            { key: "studentName", label: "Student" },
            { key: "totalMarks", label: "Total Marks" },
            {
              key: "averageMark",
              label: "Avg",
              render: (r) => r.averageMark?.toFixed(1),
            },
            { key: "examsCount", label: "Exams" },
          ]}
          data={rankings}
        />
      )}

      <Modal
        open={addResult}
        onClose={() => setAddResult(false)}
        title="Add Exam Result"
        size="sm"
      >
        <ResultForm
          examId={exam.id}
          exam={exam}
          students={enrolledStudents}
          onSubmit={resultMut.mutate}
          loading={resultMut.isPending}
        />
      </Modal>
    </Modal>
  );
}

// ── RankingMedal ──────────────────────────────────────────────────────────────
function RankingMedal({ rank }) {
  if (rank === 1) return <span title="1st place">🥇</span>;
  if (rank === 2) return <span title="2nd place">🥈</span>;
  if (rank === 3) return <span title="3rd place">🥉</span>;
  return (
    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
      #{rank}
    </span>
  );
}

// ── RankingsSection ───────────────────────────────────────────────────────────
function RankingsSection({ groups = [], allExams = [], branchId }) {
  const [filterExam, setFilterExam] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [rankPage, setRankPage] = useState(1);

  const resetRankFilters = () => {
    setFilterExam("");
    setFilterGroup("");
    setFilterLanguage("");
    setFilterLevel("");
    setRankPage(1);
  };
  const isAnyRankFilterActive =
    !!filterExam || !!filterGroup || !!filterLanguage || !!filterLevel;

  const languageOptions = useMemo(
    () =>
      [...new Set(groups.map((g) => g.languageName).filter(Boolean))].sort(),
    [groups],
  );
  const levelOptions = useMemo(() => {
    const source = filterLanguage
      ? groups.filter((g) => g.languageName === filterLanguage)
      : groups;
    return [...new Set(source.map((g) => g.levelCode).filter(Boolean))].sort();
  }, [groups, filterLanguage]);
  const groupOptions = useMemo(
    () =>
      groups.filter((g) => {
        if (filterLanguage && g.languageName !== filterLanguage) return false;
        if (filterLevel && g.levelCode !== filterLevel) return false;
        return true;
      }),
    [groups, filterLanguage, filterLevel],
  );
  const examOptions = useMemo(() => {
    if (!filterGroup) {
      const groupIds = new Set(groupOptions.map((g) => g.id));
      return allExams.filter((e) => groupIds.has(e.groupId));
    }
    return allExams.filter((e) => e.groupId === filterGroup);
  }, [allExams, filterGroup, groupOptions]);
  const scopedExamIds = useMemo(() => {
    if (filterExam) return [filterExam];
    if (filterGroup)
      return allExams.filter((e) => e.groupId === filterGroup).map((e) => e.id);
    return examOptions.map((e) => e.id);
  }, [filterExam, filterGroup, examOptions, allExams]);

  const resultsQueries = useQuery({
    queryKey: ["ranking-results", scopedExamIds],
    queryFn: async () => {
      if (!scopedExamIds.length) return [];
      const responses = await Promise.all(
        scopedExamIds.map((id) =>
          examsApi.getResults(id).then((r) => r.data?.data || []),
        ),
      );
      return responses.flat();
    },
    enabled: scopedExamIds.length > 0,
  });

  const allResults = resultsQueries.data || [];
  const rankings = useMemo(() => {
    if (!allResults.length) return [];
    const byStudent = {};
    allResults.forEach((r) => {
      if (!byStudent[r.studentId])
        byStudent[r.studentId] = {
          studentId: r.studentId,
          studentName: r.studentName || "—",
          marks: [],
          attempts: 0,
          passed: false,
        };
      byStudent[r.studentId].marks.push(r.marksObtained);
      byStudent[r.studentId].attempts += 1;
      if (r.passed) byStudent[r.studentId].passed = true;
    });
    const rows = Object.values(byStudent).map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      totalMarks: s.marks.reduce((a, b) => a + b, 0),
      bestMark: Math.max(...s.marks),
      averageMark: s.marks.reduce((a, b) => a + b, 0) / s.marks.length,
      attempts: s.attempts,
      passed: s.passed,
    }));
    rows.sort((a, b) =>
      b.averageMark !== a.averageMark
        ? b.averageMark - a.averageMark
        : b.bestMark - a.bestMark,
    );
    let currentRank = 1;
    return rows.map((r, idx) => {
      if (idx > 0 && r.averageMark < rows[idx - 1].averageMark)
        currentRank = idx + 1;
      return { ...r, rank: currentRank };
    });
  }, [allResults]);

  const totalRankPages = Math.max(
    1,
    Math.ceil(rankings.length / RANKING_PAGE_SIZE),
  );
  const pagedRankings = rankings.slice(
    (rankPage - 1) * RANKING_PAGE_SIZE,
    rankPage * RANKING_PAGE_SIZE,
  );
  const scopeLabel = useMemo(() => {
    const parts = [];
    if (filterExam) {
      const e = allExams.find((x) => x.id === filterExam);
      if (e) parts.push(`Exam: ${e.title}`);
    } else if (filterGroup) {
      const g = groups.find((x) => x.id === filterGroup);
      if (g) parts.push(`Group: ${g.name}`);
    }
    if (filterLanguage) parts.push(`Language: ${filterLanguage}`);
    if (filterLevel) parts.push(`Level: ${filterLevel}`);
    return parts.length ? parts.join(" · ") : "All exams (branch-wide)";
  }, [filterExam, filterGroup, filterLanguage, filterLevel, allExams, groups]);

  const isLoading = resultsQueries.isLoading && scopedExamIds.length > 0;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label text-xs mb-1 block">Language</label>
              <select
                className="input w-40 text-sm"
                value={filterLanguage}
                onChange={(e) => {
                  setFilterLanguage(e.target.value);
                  setFilterLevel("");
                  setFilterGroup("");
                  setFilterExam("");
                  setRankPage(1);
                }}
              >
                <option value="">All Languages</option>
                {languageOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs mb-1 block">Level</label>
              <select
                className="input w-32 text-sm"
                value={filterLevel}
                onChange={(e) => {
                  setFilterLevel(e.target.value);
                  setFilterGroup("");
                  setFilterExam("");
                  setRankPage(1);
                }}
                disabled={levelOptions.length === 0}
              >
                <option value="">All Levels</option>
                {levelOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs mb-1 block">Group</label>
              <select
                className="input w-52 text-sm"
                value={filterGroup}
                onChange={(e) => {
                  setFilterGroup(e.target.value);
                  setFilterExam("");
                  setRankPage(1);
                }}
                disabled={groupOptions.length === 0}
              >
                <option value="">All Groups</option>
                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.languageName} {g.levelCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs mb-1 block">Specific Exam</label>
              <select
                className="input w-56 text-sm"
                value={filterExam}
                onChange={(e) => {
                  setFilterExam(e.target.value);
                  setRankPage(1);
                }}
                disabled={examOptions.length === 0}
              >
                <option value="">All Exams in Scope</option>
                {examOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} — {e.groupName}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={resetRankFilters}
              disabled={!isAnyRankFilterActive}
              title="Reset ranking filters"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors self-end ${isAnyRankFilterActive ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-default"}`}
            >
              <RotateCcw size={12} /> Reset
            </button>
            <span className="text-xs text-gray-400 pb-1 ml-auto">
              {rankings.length} students ranked
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Trophy size={11} /> Ranking scope:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {scopeLabel}
            </span>
          </p>
        </div>

        {rankings.length >= 3 && !isLoading && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-end justify-center gap-3 mb-4">
              {rankings[1] && (
                <div className="flex flex-col items-center gap-1 w-36">
                  <span className="text-2xl">🥈</span>
                  <p className="text-xs font-semibold text-center leading-tight dark:text-gray-200 truncate w-full text-center">
                    {rankings[1].studentName}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg flex items-center justify-center h-14">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                      {rankings[1].averageMark.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
              {rankings[0] && (
                <div className="flex flex-col items-center gap-1 w-36">
                  <span className="text-3xl">🥇</span>
                  <p className="text-xs font-semibold text-center leading-tight dark:text-gray-200 truncate w-full text-center">
                    {rankings[0].studentName}
                  </p>
                  <div className="w-full bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-700 rounded-t-lg flex items-center justify-center h-20">
                    <span className="text-base font-bold text-amber-700 dark:text-amber-400">
                      {rankings[0].averageMark.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
              {rankings[2] && (
                <div className="flex flex-col items-center gap-1 w-36">
                  <span className="text-2xl">🥉</span>
                  <p className="text-xs font-semibold text-center leading-tight dark:text-gray-200 truncate w-full text-center">
                    {rankings[2].studentName}
                  </p>
                  <div className="w-full bg-orange-100 dark:bg-orange-900/30 rounded-t-lg flex items-center justify-center h-10">
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {rankings[2].averageMark.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Table
          loading={isLoading}
          emptyMsg={
            scopedExamIds.length === 0
              ? "Select a language, level, group, or exam to load rankings."
              : "No results found for this scope."
          }
          data={pagedRankings}
          columns={[
            {
              key: "rank",
              label: "Rank",
              render: (r) => <RankingMedal rank={r.rank} />,
            },
            {
              key: "studentName",
              label: "Student",
              render: (r) => (
                <span
                  className={
                    r.rank <= 3 ? "font-semibold dark:text-gray-100" : ""
                  }
                >
                  {r.studentName}
                </span>
              ),
            },
            {
              key: "averageMark",
              label: "Avg Mark",
              render: (r) => (
                <span className="font-medium tabular-nums">
                  {r.averageMark.toFixed(2)}
                </span>
              ),
            },
            {
              key: "bestMark",
              label: "Best Mark",
              render: (r) => (
                <span className="tabular-nums text-green-600 dark:text-green-400">
                  {r.bestMark}
                </span>
              ),
            },
            {
              key: "totalMarks",
              label: "Total Marks",
              render: (r) => (
                <span className="tabular-nums">{r.totalMarks}</span>
              ),
            },
            {
              key: "attempts",
              label: "Attempts",
              render: (r) => <span className="tabular-nums">{r.attempts}</span>,
            },
            {
              key: "passed",
              label: "Status",
              render: (r) => (
                <Badge
                  label={r.passed ? "PASSED" : "NOT PASSED"}
                  color={
                    r.passed
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }
                />
              ),
            },
          ]}
        />

        {totalRankPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t dark:border-gray-700">
            <span className="text-xs text-gray-500">
              Page {rankPage} of {totalRankPages} · {rankings.length} students
            </span>
            <div className="flex gap-2">
              <button
                disabled={rankPage === 1}
                onClick={() => setRankPage((p) => p - 1)}
                className="btn-secondary disabled:opacity-40 text-xs px-3 py-1"
              >
                ← Prev
              </button>
              <button
                disabled={rankPage === totalRankPages}
                onClick={() => setRankPage((p) => p + 1)}
                className="btn-secondary disabled:opacity-40 text-xs px-3 py-1"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Exams() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();
  const [filters, setFiltersState] = useState({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [mainTab, setMainTab] = useState("exams");

  const setFilter = (key, value) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };
  const resetFilters = () => {
    setFiltersState({ ...DEFAULT_FILTERS });
    setPage(1);
  };
  const isAnyFilterActive = useMemo(
    () => Object.entries(filters).some(([k, v]) => v !== DEFAULT_FILTERS[k]),
    [filters],
  );

  const { data: grpRes } = useQuery({
    queryKey: ["groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
  });
  const { data: periodRes } = useQuery({
    queryKey: ["period-labels"],
    queryFn: lookupsApi.getPeriodLabels,
  });
  const { data: exmRes, isLoading } = useQuery({
    queryKey: ["exams", filters.selGroup, branchId],
    queryFn: async () => {
      if (filters.selGroup) {
        const r = await examsApi.getByGroup(filters.selGroup);
        return r.data?.data || [];
      }
      const allGroups = grpRes?.data?.data || [];
      if (!allGroups.length) return [];
      const results = await Promise.all(
        allGroups.map((g) =>
          examsApi.getByGroup(g.id).then((r) => r.data?.data || []),
        ),
      );
      return results.flat();
    },
    enabled: !!branchId && !!grpRes,
  });

  const groups = grpRes?.data?.data || [];
  const periodLabels = periodRes?.data?.data || [];
  const allExams = exmRes || [];

  const availableYears = useMemo(
    () =>
      [
        ...new Set(allExams.map((e) => new Date(e.examDate).getFullYear())),
      ].sort((a, b) => b - a),
    [allExams],
  );

  const filteredExams = useMemo(
    () =>
      allExams.filter((e) => {
        if (filters.typeFilter === "final" && !e.isFinalExam) return false;
        if (filters.typeFilter === "regular" && e.isFinalExam) return false;
        if (filters.monthFilter) {
          const m = new Date(e.examDate).getMonth() + 1;
          if (String(m) !== filters.monthFilter) return false;
        }
        if (filters.yearFilter) {
          const y = new Date(e.examDate).getFullYear();
          if (String(y) !== filters.yearFilter) return false;
        }
        if (
          filters.periodLabelFilter &&
          String(e.periodLabelId) !== filters.periodLabelFilter
        )
          return false;
        if (filters.resultFilter === "passed" && e.passedCount === 0)
          return false;
        if (filters.resultFilter === "failed" && e.failedCount === 0)
          return false;
        return true;
      }),
    [allExams, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / PAGE_SIZE));
  const pagedExams = filteredExams.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const invalidate = () => qc.invalidateQueries(["exams"]);

  const createMut = useMutation({
    mutationFn: (d) => examsApi.create(d),
    onSuccess: () => {
      toast.success("Exam created");
      invalidate();
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const updateMut = useMutation({
    mutationFn: (d) => examsApi.update(d),
    onSuccess: () => {
      toast.success("Exam updated");
      invalidate();
      setModal(null);
      setSelected(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  const editInitial = useMemo(() => {
    if (!selected) return {};
    const dt = new Date(selected.examDate);
    const pad = (n) => String(n).padStart(2, "0");
    const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    return {
      id: selected.id,
      groupId: selected.groupId,
      title: selected.title,
      totalMarks: selected.totalMarks,
      passPercentage: selected.passPercentage,
      examDate: local,
      durationMins: selected.durationMins,
      isFinalExam: selected.isFinalExam,
    };
  }, [selected]);

  const finals = allExams.filter((e) => e.isFinalExam).length;
  const regular = allExams.filter((e) => !e.isFinalExam).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Exams"
        subtitle="Manage exams, results, and rankings"
        action={
          <Button icon={Plus} onClick={() => setModal("create")}>
            New Exam
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Exams"
          value={allExams.length}
          icon={ClipboardList}
          color="bg-primary-900"
        />
        <StatCard
          title="Final Exams"
          value={finals}
          icon={Award}
          color="bg-amber-500"
        />
        <StatCard
          title="Regular Tests"
          value={regular}
          icon={ClipboardList}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Groups"
          value={groups.filter((g) => g.groupStatus === "ACTIVE").length}
          icon={ClipboardList}
          color="bg-green-600"
        />
      </div>

      <div className="mb-4">
        <Tabs
          tabs={[
            { key: "exams", label: "Exams", count: allExams.length },
            { key: "rankings", label: "Rankings", icon: Trophy },
          ]}
          active={mainTab}
          onChange={setMainTab}
        />
      </div>

      {mainTab === "exams" && (
        <>
          <div className="card mb-4">
            <div className="p-4 border-b dark:border-gray-700 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-48">
                  <label className="label text-xs mb-1 block">Group</label>
                  <select
                    className="input w-full text-sm"
                    value={filters.selGroup}
                    onChange={(e) => setFilter("selGroup", e.target.value)}
                  >
                    <option value="">— All Groups —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.languageName} {g.levelCode})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={resetFilters}
                  title="Reset all filters"
                  disabled={!isAnyFilterActive}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors self-end ${isAnyFilterActive ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-default"}`}
                >
                  <RotateCcw size={12} /> Reset Filters
                </button>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="label text-xs mb-1 block">Month</label>
                  <select
                    className="input w-36 text-sm"
                    value={filters.monthFilter}
                    onChange={(e) => setFilter("monthFilter", e.target.value)}
                  >
                    <option value="">All Months</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs mb-1 block">Year</label>
                  <select
                    className="input w-28 text-sm"
                    value={filters.yearFilter}
                    onChange={(e) => setFilter("yearFilter", e.target.value)}
                  >
                    <option value="">All Years</option>
                    {availableYears.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs mb-1 block">
                    Period Label
                  </label>
                  <select
                    className="input w-44 text-sm"
                    value={filters.periodLabelFilter}
                    onChange={(e) =>
                      setFilter("periodLabelFilter", e.target.value)
                    }
                  >
                    <option value="">All Periods</option>
                    {periodLabels.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs mb-1 block">Type</label>
                  <select
                    className="input w-36 text-sm"
                    value={filters.typeFilter}
                    onChange={(e) => setFilter("typeFilter", e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="final">Final Exams</option>
                    <option value="regular">Regular Tests</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs mb-1 block">Result</label>
                  <select
                    className="input w-36 text-sm"
                    value={filters.resultFilter}
                    onChange={(e) => setFilter("resultFilter", e.target.value)}
                  >
                    <option value="">All Results</option>
                    <option value="passed">Has Passed</option>
                    <option value="failed">Has Failed</option>
                  </select>
                </div>
                <span className="text-xs text-gray-400 pb-1 ml-auto">
                  {filteredExams.length} records
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <Table
              loading={isLoading}
              data={pagedExams}
              emptyMsg="No exams found for these filters."
              columns={[
                { key: "title", label: "Title" },
                { key: "groupName", label: "Group" },
                {
                  key: "isFinalExam",
                  label: "Type",
                  render: (r) => (
                    <Badge
                      label={r.isFinalExam ? "FINAL" : "REGULAR"}
                      color={
                        r.isFinalExam
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    />
                  ),
                },
                { key: "totalMarks", label: "Total Marks" },
                {
                  key: "passPercentage",
                  label: "Pass %",
                  render: (r) => `${r.passPercentage}%`,
                },
                {
                  key: "examDate",
                  label: "Date",
                  render: (r) =>
                    new Date(r.examDate).toLocaleDateString("en-GB"),
                },
                {
                  key: "durationMins",
                  label: "Duration",
                  render: (r) => `${r.durationMins} min`,
                },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <div className="flex items-center gap-1">
                      <button
                        title="View details"
                        onClick={() => {
                          setSelected(r);
                          setModal("detail");
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        title="Edit exam"
                        onClick={() => {
                          setSelected(r);
                          setModal("edit");
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  ),
                },
              ]}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t dark:border-gray-700">
                <span className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary disabled:opacity-40 text-xs px-3 py-1"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary disabled:opacity-40 text-xs px-3 py-1"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {mainTab === "rankings" && (
        <RankingsSection
          groups={groups}
          allExams={allExams}
          branchId={branchId}
        />
      )}

      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Create Exam"
      >
        <ExamForm
          groups={groups}
          onSubmit={createMut.mutate}
          loading={createMut.isPending}
          initial={filters.selGroup ? { groupId: filters.selGroup } : {}}
        />
      </Modal>

      {modal === "edit" && selected && (
        <Modal
          open
          onClose={() => {
            setModal(null);
            setSelected(null);
          }}
          title="Edit Exam"
          size="sm"
        >
          <ExamForm
            groups={groups}
            onSubmit={updateMut.mutate}
            loading={updateMut.isPending}
            initial={editInitial}
          />
        </Modal>
      )}

      {modal === "detail" && selected && (
        <ExamDetail
          exam={selected}
          onClose={() => {
            setModal(null);
            setSelected(null);
          }}
          branchId={branchId}
        />
      )}
    </div>
  );
}
