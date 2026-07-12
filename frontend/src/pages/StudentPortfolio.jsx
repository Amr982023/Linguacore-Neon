import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { studentsApi, enrollmentsApi, examsApi } from "../services/endpoints";
import {
  ArrowLeft,
  User,
  BookOpen,
  ClipboardList,
  Award,
  QrCode,
  Phone,
  Mail,
  MapPin,
  Target,
  FileText,
  CheckCircle2,
  XCircle,
  Printer,
  X,
  Calendar,
  Hash,
  Percent,
  ChevronRight,
  Clock,
  Layers,
  GraduationCap,
  BarChart2,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmtDT = (d) => (d ? new Date(d).toLocaleString("en-GB") : "—");

// ── Reusable Section card ──────────────────────────────────────────────────
function Section({ title, icon: Icon, children, className = "", id }) {
  return (
    <div
      id={id}
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#1A3C6E]/10 dark:bg-blue-900/30 flex items-center justify-center">
          <Icon size={16} className="text-[#1A3C6E] dark:text-blue-400" />
        </div>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm tracking-wide uppercase">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ── Info row ───────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      {Icon && (
        <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
      )}
      <span className="text-sm text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right flex-1">
        {value}
      </span>
    </div>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────────────────
function DetailDrawer({
  open,
  onClose,
  title,
  headerClass = "bg-[#1A3C6E]",
  icon: Icon,
  children,
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 dark:bg-black/50 transition-opacity duration-200
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white dark:bg-gray-900
          shadow-2xl flex flex-col transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div
          className={`${headerClass} px-5 py-4 flex items-center justify-between shrink-0`}
        >
          <div className="flex items-center gap-2.5">
            {Icon && <Icon size={16} className="text-white/90" />}
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-1">{children}</div>
      </div>
    </>
  );
}

// ── Drawer row — same rhythm as InfoRow ───────────────────────────────────
function DRow({ label, value, icon: Icon }) {
  if (value === null || value === undefined || value === "" || value === false)
    return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      {Icon && (
        <Icon size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
      )}
      <span className="text-sm text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 text-right break-words">
        {value}
      </span>
    </div>
  );
}

// ── Enrollment Drawer ──────────────────────────────────────────────────────
function EnrollmentDrawer({ enrollment: e, open, onClose }) {
  if (!e) return null;

  const statusConfig = {
    ACTIVE:    { bg: "#dcfce7", color: "#15803d" },
    COMPLETED: { bg: "#dbeafe", color: "#1d4ed8" },
    SUSPENDED: { bg: "#fee2e2", color: "#b91c1c" },
    PENDING:   { bg: "#fef9c3", color: "#a16207" },
  };
  const s = statusConfig[e.status] || { bg: "#f3f4f6", color: "#4b5563" };

  return (
    <DetailDrawer open={open} onClose={onClose} title="Enrollment Details" icon={BookOpen}>
      <DRow icon={Layers} label="Group" value={e.groupName} />
      <DRow icon={BookOpen} label="Language" value={e.languageName} />
      <DRow icon={GraduationCap} label="Level" value={e.levelCode} />
      <DRow
        icon={CheckCircle2}
        label="Status"
        value={
          <span style={{ backgroundColor: s.bg, color: s.color }}
            className="text-[10px] px-2 py-0.5 rounded-full font-bold">
            {e.status}
          </span>
        }
      />
      <DRow icon={Calendar} label="Enroll Date" value={fmt(e.enrollDate)} />
      <DRow icon={Hash} label="Payment Strategy" value={e.paymentStrategy} />
      <DRow
        icon={Hash}
        label="Effective Fee"
        value={e.effectiveFee != null ? `${e.effectiveFee} EGP` : null}
      />
      <DRow
        icon={Percent}
        label="Discount"
        value={e.discountPct ? `${e.discountPct}%` : null}
      />
      <DRow
        icon={Award}
        label="Scholarship"
        value={e.scholarship ? "Yes" : null}
      />

      {e.isPartial && (
        <div className="pt-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
            Partial Period
          </p>
          <DRow icon={Calendar} label="From" value={fmt(e.partialStart)} />
          <DRow icon={Calendar} label="To" value={fmt(e.partialEnd)} />
          <DRow
            icon={Hash}
            label="Partial Cost"
            value={e.partialCost != null ? `${e.partialCost} EGP` : null}
          />
        </div>
      )}

      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
        <DRow icon={Clock} label="Created" value={fmt(e.createdAt)} />
        <DRow icon={Clock} label="Modified" value={fmt(e.modifiedAt)} />
      </div>
    </DetailDrawer>
  );
}

// ── Exam Result Drawer ─────────────────────────────────────────────────────
function ExamResultDrawer({ result: r, open, onClose }) {
  if (!r) return null;
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="Exam Result Details"
      icon={ClipboardList}
      headerClass={r.passed ? "bg-green-600" : "bg-red-500"}
    >
      <div
        className={`flex items-center gap-2 p-3 rounded-xl mb-1 ${
          r.passed
            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
        }`}
      >
        {r.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        <span className="text-sm font-bold">
          {r.passed ? "Passed" : "Failed"}
        </span>
      </div>

      <DRow icon={ClipboardList} label="Exam" value={r.examTitle} />
      <DRow icon={BarChart2} label="Marks" value={r.marksObtained} />
      <DRow icon={Hash} label="Attempt" value={`#${r.attemptNumber}`} />
      <DRow icon={Hash} label="Retake" value={r.isRetake ? "Yes" : "No"} />
      {r.isRetake && r.retakeReason && (
        <DRow icon={FileText} label="Retake Reason" value={r.retakeReason} />
      )}
      <DRow icon={Clock} label="Recorded At" value={fmtDT(r.recordedAt)} />
    </DetailDrawer>
  );
}

// ── Certificate Drawer ─────────────────────────────────────────────────────
function CertificateDrawer({ cert: c, open, onClose }) {
  if (!c) return null;
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="Certificate Details"
      icon={Award}
      headerClass="bg-amber-500"
    >
      <div className="flex items-center gap-4 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 mb-1">
        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <Award size={22} className="text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">
            {c.languageName} — {c.levelCode}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Issued {fmt(c.issuedAt)}
          </p>
        </div>
      </div>

      <DRow icon={Hash} label="Serial No." value={c.serialNumber} />
      <DRow icon={BookOpen} label="Language" value={c.languageName} />
      <DRow icon={GraduationCap} label="Level" value={c.levelCode} />
      <DRow icon={Calendar} label="Issued At" value={fmtDT(c.issuedAt)} />
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
        <DRow icon={Clock} label="Created" value={fmt(c.createdAt)} />
        <DRow icon={Clock} label="Modified" value={fmt(c.modifiedAt)} />
      </div>
    </DetailDrawer>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function StudentPortfolio() {
  const { id: studentId } = useParams();
  const navigate = useNavigate();

  // Single drawer state — null or { type, data }
  const [drawer, setDrawer] = useState(null);
  const openDrawer = (type, data) => setDrawer({ type, data });
  const closeDrawer = () => setDrawer(null);

  // ── Queries ──
  const { data: student, isLoading } = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => studentsApi.getById(studentId),
    select: (r) => r.data?.data,
    enabled: !!studentId,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments", studentId],
    queryFn: () => enrollmentsApi.getByStudent(studentId),
    select: (r) => r.data?.data || [],
    enabled: !!studentId,
  });

  const { data: examResults = [] } = useQuery({
    queryKey: ["examResults", studentId],
    queryFn: () => examsApi.getResultsByStudent(studentId),
    select: (r) => r.data?.data || [],
    enabled: !!studentId,
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#1A3C6E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading portfolio…</p>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Student not found.</p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-[#1A3C6E] underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const fullName = [
    student.person?.firstName,
    student.person?.secondName,
    student.person?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  const handlePrint = () => {
    const styleId = "lc-print-styles";
    // Remove old style if exists to always get fresh styles
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
    @media print {
      /* ── Hide everything first ── */
      body * { visibility: hidden; }

      /* ── Show only the portfolio root ── */
      #student-portfolio-root,
      #student-portfolio-root * { visibility: visible; }

      /* ── Position root to fill page ── */
      #student-portfolio-root {
        position: absolute;
        inset: 0;
        width: 100%;
        padding: 0 !important;
        overflow: visible !important;
      }

      html, body {
        overflow: visible !important;
        height: auto !important;
      }

      /* ── Hide non-print UI elements ── */
      #portfolio-topbar,
      #portfolio-qr { display: none !important; }

      /* ── Hide drawers ── */
      .fixed { display: none !important; }

      /* ── Hero banner: keep but simplify ── */
      #portfolio-hero {
        background: #1A3C6E !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        border-radius: 12px;
        margin-bottom: 16px;
        break-inside: avoid;
      }

      /* ── Stats strip ── */
      #portfolio-stats {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 12px !important;
        margin-bottom: 16px !important;
        break-inside: avoid;
      }

      /* ── Two-column layout: stack on print ── */
      #portfolio-two-col {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 16px !important;
        margin-bottom: 16px !important;
      }

      /* ── Enrollments grid: 2 cols on print ── */
      #portfolio-enrollments .grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }

      /* ── Certificates grid: 2 cols on print ── */
      #portfolio-certificates .grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }

      /* ── Card print styling ── */
      .rounded-2xl, .rounded-xl {
        break-inside: avoid;
        border: 1px solid #e5e7eb !important;
        box-shadow: none !important;
      }

      /* ── Force colors to print ── */
      .bg-green-100, .bg-blue-100, .bg-amber-100,
      .bg-red-100, .bg-purple-100, .text-green-600,
      .text-blue-600, .text-purple-600, .text-emerald-600 {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* ── Max width and spacing ── */
      .max-w-6xl { max-width: 100% !important; margin: 0 !important; }
      .space-y-6 > * + * { margin-top: 16px !important; }

      @page {
        margin: 1.5cm;
        size: A4;
      }
    }
  `;
    document.head.appendChild(style);
    window.print();
  };
  return (
    <div
      id="student-portfolio-root"
      className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6"
    >
      {/* ── Top bar ── */}
      <div
        id="portfolio-topbar"
        className="max-w-6xl mx-auto mb-6 flex items-center justify-between"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Back to Students
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Printer size={14} />
          Print / Export
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Hero banner ── */}
        <div
          id="portfolio-hero"
          className="bg-gradient-to-r from-[#1A3C6E] to-[#2E7DBF] rounded-2xl p-8 text-white shadow-lg"
        >
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
              <User size={32} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
              <p className="text-blue-200 mt-1 text-sm">
                {student.attendanceMode} · Branch: {student.branchName}
              </p>
              {(student.activeLanguages || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(student.activeLanguages || []).map((l) => (
                    <span
                      key={l}
                      className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium"
                    >
                      {l}
                    </span>
                  ))}
                  {(student.activeLevels || []).map((l) => (
                    <span
                      key={l}
                      className="text-xs bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full font-medium"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold ${
                student.isActive
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {student.isActive ? (
                <CheckCircle2 size={14} />
              ) : (
                <XCircle size={14} />
              )}
              {student.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* ── Quick stats strip ── */}
        <div
          id="portfolio-stats"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            {
              label: "Enrollments",
              value: enrollments.length,
              sub: "total",
              color: "text-blue-600",
            },
            {
              label: "Active",
              value: enrollments.filter((e) => e.enrollStatus === "ACTIVE")
                .length,
              sub: "enrollments",
              color: "text-green-600",
            },
            {
              label: "Exams Taken",
              value: examResults.length,
              sub: "attempts",
              color: "text-purple-600",
            },
            {
              label: "Passed",
              value: examResults.filter((r) => r.passed).length,
              sub: "exams",
              color: "text-emerald-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center shadow-sm"
            >
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stat.label} <span className="text-gray-400">{stat.sub}</span>
              </p>
            </div>
          ))}
        </div>

        {/* ── QR Code ── */}
        {student.qrCode && (
          <div
            id="portfolio-qr"
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm flex items-center gap-6"
          >
            <div className="flex items-center gap-2 text-[#1A3C6E] dark:text-blue-400 flex-shrink-0">
              <QrCode size={16} />
              <span className="font-semibold text-sm uppercase tracking-wide">
                QR Code
              </span>
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(student.qrCode)}`}
              alt="QR Code"
              className="w-24 h-24 rounded-xl border dark:border-gray-700 bg-white p-1 flex-shrink-0"
              onError={(e) => (e.target.style.display = "none")}
            />
            <p className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
              {student.qrCode}
            </p>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div
          id="portfolio-two-col"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Personal Info — static, not clickable */}
          <Section title="Personal Information" icon={User}>
            <InfoRow icon={Mail} label="Email" value={student.person?.email} />
            <InfoRow icon={Phone} label="Phone" value={student.person?.phone} />
            <InfoRow
              icon={Phone}
              label="WhatsApp"
              value={student.person?.whatsappNumber}
            />
            <InfoRow
              icon={FileText}
              label="National ID"
              value={student.person?.nationalId}
            />
            <InfoRow label="Age" value={student.person?.age} />
            <InfoRow label="Gender" value={student.person?.gender} />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={student.person?.address}
            />
            <InfoRow icon={Target} label="Goal" value={student.goalName} />
            <InfoRow label="Sub-Goal" value={student.nestedGoalName} />
            {student.notes && (
              <InfoRow icon={FileText} label="Notes" value={student.notes} />
            )}
          </Section>

          {/* Exam History — each row clickable */}
          <Section title="Exam History" icon={ClipboardList}>
            {examResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No exam records yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {examResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openDrawer("result", r)}
                    className="w-full text-left flex items-center justify-between p-3 rounded-xl
                      bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700
                      hover:border-[#1A3C6E]/30 dark:hover:border-blue-700
                      hover:bg-blue-50/40 dark:hover:bg-blue-900/10
                      transition-all group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                        {r.examTitle}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Marks: {r.marksObtained} · Attempt #{r.attemptNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-bold ${
                          r.passed
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {r.passed ? "PASS" : "FAIL"}
                      </span>
                      <ChevronRight
                        size={13}
                        className="text-gray-300 dark:text-gray-600 group-hover:text-[#1A3C6E] dark:group-hover:text-blue-400 transition-colors"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Enrollments — each card clickable ── */}
        <Section id="portfolio-enrollments" title="Enrollments" icon={BookOpen}>
          {enrollments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No enrollments yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {enrollments.map((e) => (
                <button
                  key={e.id}
                  onClick={() => openDrawer("enrollment", e)}
                  className="w-full text-left border border-gray-100 dark:border-gray-700 rounded-xl p-4
                    hover:border-[#1A3C6E]/30 dark:hover:border-blue-700
                    hover:shadow-md hover:bg-blue-50/30 dark:hover:bg-blue-900/10
                    transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">
                      {e.groupName}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          e.enrollStatus === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : e.enrollStatus === "COMPLETED"
                              ? "bg-blue-100 text-blue-700"
                              : e.enrollStatus === "SUSPENDED"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {e.enrollStatus}
                      </span>
                      <ChevronRight
                        size={12}
                        className="text-gray-300 dark:text-gray-600 group-hover:text-[#1A3C6E] dark:group-hover:text-blue-400 transition-colors"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {e.languageName} · {e.levelCode}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {e.paymentStrategy} ·{" "}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {e.effectiveFee} EGP
                    </span>
                  </p>
                  {(e.scholarship || (e.discountPct ?? 0) > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {e.scholarship && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Scholarship
                        </span>
                      )}
                      {(e.discountPct ?? 0) > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {e.discountPct}% Discount
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* ── Certificates — each card clickable ── */}
        {(student.certificates || []).length > 0 && (
          <Section
            id="portfolio-certificates"
            title="Certificates"
            icon={Award}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {student.certificates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openDrawer("cert", c)}
                  className="w-full text-left flex items-center gap-4 p-4 rounded-xl
                    border border-amber-100 dark:border-amber-900/30
                    bg-amber-50 dark:bg-amber-900/10
                    hover:border-amber-300 dark:hover:border-amber-700
                    hover:shadow-md hover:bg-amber-100/60 dark:hover:bg-amber-900/20
                    transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Award size={18} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                      {c.languageName} — {c.levelCode}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Serial: {c.serialNumber}
                    </p>
                  </div>
                  <ChevronRight
                    size={13}
                    className="text-amber-300 dark:text-amber-700 group-hover:text-amber-500 transition-colors flex-shrink-0"
                  />
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* ── Drawers (rendered outside scroll, fixed position) ── */}
      <EnrollmentDrawer
        enrollment={drawer?.type === "enrollment" ? drawer.data : null}
        open={drawer?.type === "enrollment"}
        onClose={closeDrawer}
      />
      <ExamResultDrawer
        result={drawer?.type === "result" ? drawer.data : null}
        open={drawer?.type === "result"}
        onClose={closeDrawer}
      />
      <CertificateDrawer
        cert={drawer?.type === "cert" ? drawer.data : null}
        open={drawer?.type === "cert"}
        onClose={closeDrawer}
      />
    </div>
  );
}
