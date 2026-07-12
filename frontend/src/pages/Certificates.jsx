import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { certificatesApi, groupsApi } from "../services/endpoints";
import { useAuthStore } from "../context/authStore";
import {
  PageHeader,
  Table,
  Modal,
  StatCard,
  SearchInput,
} from "../components/ui";
import { Award, Eye, Printer } from "lucide-react";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

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

export default function Certificates() {
  const { branchId } = useAuthStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ["certificates", branchId],
    queryFn: () => certificatesApi.getByBranch(branchId),
    enabled: !!branchId,
  });

  const { data: groupsRes } = useQuery({
    queryKey: ["groups", branchId],
    queryFn: () => groupsApi.getByBranch(branchId),
    enabled: !!branchId,
  });

  const certs = res?.data?.data || [];
  const groups = groupsRes?.data?.data || [];

  const languages = [
    ...new Map(
      certs
        .filter((c) => c.languageName)
        .map((c) => [
          c.languageName,
          { id: c.languageName, name: c.languageName },
        ]),
    ).values(),
  ];

  const levels = [
    ...new Map(
      certs
        .filter((c) => c.levelCode)
        .map((c) => [c.levelCode, { id: c.levelCode, code: c.levelCode }]),
    ).values(),
  ];

  const filtered = certs.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.studentName?.toLowerCase().includes(q) ||
      c.serialNumber?.toLowerCase().includes(q);
    const matchLang = !langFilter || c.languageName === langFilter;
    const matchLevel = !levelFilter || c.levelCode === levelFilter;
    const matchGroup = !groupFilter || c.groupId === groupFilter;
    return matchSearch && matchLang && matchLevel && matchGroup;
  });

  return (
    <div className="p-6">
      <PageHeader title="Certificates" subtitle={`${certs.length} issued`} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Issued"
          value={certs.length}
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
          title="This Month"
          value={
            certs.filter(
              (c) => new Date(c.issuedAt) > new Date(new Date().setDate(1)),
            ).length
          }
          color="bg-green-600"
          icon={Award}
        />
      </div>

      <div className="card">
        <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name or serial…"
          />

          <select
            className="input w-40"
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
          >
            <option value="">All Languages</option>
            {languages.map((l) => (
              <option key={l.id} value={l.name}>
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
              <option key={l.id} value={l.code}>
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

          <span className="text-xs text-gray-500 ml-auto">
            {filtered.length} records
          </span>
        </div>

        <Table
          loading={isLoading}
          data={filtered}
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

      {selected && (
        <CertificateDetailModal
          cert={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
