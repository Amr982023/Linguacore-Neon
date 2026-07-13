import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { certificatesApi, groupsApi, lookupsApi } from "../services/endpoints";
import { useAuthStore } from "../context/authStore";
import {
  PageHeader,
  Table,
  Modal,
  StatCard,
  SearchInput,
} from "../components/ui";
import { Award, Eye, Printer, ChevronLeft, ChevronRight } from "lucide-react";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const PAGE_SIZE = 10;

// Applied to every useQuery on this page so data only reloads on a
// deliberate user action (filter/search/page change) — never from window
// focus, remount, or reconnect.
const NO_AUTO_REFETCH = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
};

function CertificateDetailModal({ cert, onClose }) {
  return (
    <Modal open onClose={onClose} title="Certificate Details" size="sm">
      <div className="space-y-3">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700 text-center">
          <Award size={40} className="mx-auto text-blue-600 mb-3" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {cert.studentName}
          </h3>
          <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
            {cert.languageName} — {cert.levelCode}
          </p>
          {cert.marksObtained && cert.totalMarks && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Score: {cert.marksObtained} / {cert.totalMarks}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Serial: {cert.serialNumber}
          </p>
          <p className="text-xs text-gray-500">
            Issued: {fmtDate(cert.issuedAt)}
          </p>
        </div>
        {cert.notes && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {cert.notes}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, totalCount, pageSize, onPageChange }) {
  if (totalCount === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
      <span>
        {from}–{to} of {totalCount} records
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs text-gray-400 px-1">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function Certificates() {
  const { branchId } = useAuthStore();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState(""); // what's being typed
  const [search, setSearch] = useState(""); // what's actually committed/queried
  const [langFilter, setLangFilter] = useState(""); // languageId
  const [levelFilter, setLevelFilter] = useState(""); // levelId
  const [groupFilter, setGroupFilter] = useState(""); // groupId
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  // Reset to page 1 whenever any filter changes — otherwise you can get stuck
  // on page 4 of a filtered result that only has 1 page.
  useEffect(() => {
    setPage(1);
  }, [search, langFilter, levelFilter, groupFilter]);

  const commitSearch = () => setSearch(searchInput.trim());

  const filter = {
    search: search || undefined,
    languageId: langFilter || undefined,
    levelId: levelFilter || undefined,
    groupId: groupFilter || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const {
    data: res,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "certificates",
      branchId,
      search,
      langFilter,
      levelFilter,
      groupFilter,
      page,
    ],
    queryFn: () => certificatesApi.getByBranchPaged(branchId, filter),
    enabled: !!branchId,
    keepPreviousData: true, // avoids a flash of "no certificates" while flipping pages
    ...NO_AUTO_REFETCH,
  });

  const { data: groupsRes } = useQuery({
    queryKey: ["groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
    ...NO_AUTO_REFETCH,
  });

  // Language/level options come from lookups, not from the loaded page of
  // certificates — with server-side pagination the visible page is only a
  // slice, so deriving filter options from it would hide options that exist
  // on other pages.
  const { data: languagesRes } = useQuery({
    queryKey: ["languages"],
    queryFn: () => lookupsApi.getLanguages(),
    ...NO_AUTO_REFETCH,
  });

  const { data: levelsRes } = useQuery({
    queryKey: ["levels"],
    queryFn: () => lookupsApi.getLevels(),
    ...NO_AUTO_REFETCH,
  });

  const pagedData = res?.data?.data;
  const certs = pagedData?.items ?? [];
  const totalCount = pagedData?.totalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;

  const groups = groupsRes?.data?.data || [];
  const languages = languagesRes?.data?.data || [];
  const levels = levelsRes?.data?.data || [];

  const isAnyFilterActive =
    search !== "" ||
    langFilter !== "" ||
    levelFilter !== "" ||
    groupFilter !== "";

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setLangFilter("");
    setLevelFilter("");
    setGroupFilter("");
  };

  return (
    <div className="p-6">
      <PageHeader title="Certificates" subtitle={`${totalCount} issued`} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Issued"
          value={totalCount}
          color="bg-blue-600"
          icon={Award}
        />
        <StatCard
          title="Languages"
          value={languages.length}
          color="bg-purple-600"
          icon={Award}
        />
        <StatCard
          title="This Page"
          value={certs.length}
          color="bg-green-600"
          icon={Award}
        />
      </div>

      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onKeyDown={(e) => e.key === "Enter" && commitSearch()}
            placeholder="Search name or serial…"
          />
          <button
            onClick={commitSearch}
            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Search
          </button>

          <select
            className="input w-40"
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
          >
            <option value="">All Languages</option>
            {languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <select
            className="input w-32"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="">All Levels</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}
              </option>
            ))}
          </select>

          <select
            className="input w-40"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {isAnyFilterActive && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reset filters
            </button>
          )}

          <span className="text-xs text-gray-500 ml-auto">
            {totalCount} records
          </span>
        </div>

        <div className={`transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <Table
            loading={isLoading}
            data={certs}
            emptyMsg="No certificates issued yet."
            columns={[
              { key: "studentName", label: "Student" },
              {
                key: "language",
                label: "Language",
                render: (r) => `${r.languageName} ${r.levelCode}`,
              },
              { key: "serialNumber", label: "Serial No." },
              {
                key: "score",
                label: "Score",
                render: (r) =>
                  r.marksObtained ? `${r.marksObtained}/${r.totalMarks}` : "—",
              },
              {
                key: "issuedAt",
                label: "Issued",
                render: (r) => fmtDate(r.issuedAt),
              },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelected(r)}
                      className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      onClick={() => navigate(`/certificates/${r.id}/print`)}
                      className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs"
                    >
                      <Printer size={13} /> Print
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
      </div>

      {selected && (
        <CertificateDetailModal
          cert={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
