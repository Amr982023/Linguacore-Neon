import api from "./api";

export const authApi = {
  hasUsers: () => api.get("/auth/has-users"),
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  changePassword: (userId, cur, nw) =>
    api.post("/auth/change-password", null, {
      params: { userId, current: cur, newPwd: nw },
    }),
};

export const studentsApi = {
  getByBranch: (branchId) => api.get(`/students/branch/${branchId}`),
  getByBranchPaged: (branchId, params) =>
    api.get(`/students/branch/${branchId}/paged`, { params }),
  getById: (id) => api.get(`/students/${id}`),
  getByQr: (qrCode) => api.get(`/students/qr/${qrCode}`),
  create: (data) => api.post("/students", data),
  update: (data) => api.put("/students", data),
  deactivate: (id) => api.delete(`/students/${id}`),
  regenerateQr: (id) => api.post(`/students/${id}/regenerate-qr`),
};

export const instructorsApi = {
  getByBranch: (branchId) => api.get(`/instructors/branch/${branchId}`),
  getById: (id) => api.get(`/instructors/${id}`),
  getByLanguage: (languageId) => api.get(`/instructors/language/${languageId}`),
  create: (data) => api.post("/instructors", data),
  update: (data) => api.put("/instructors", data),
  toggleActive: (id) => api.patch(`/instructors/${id}/toggle-active`),
};

export const groupsApi = {
  getByBranch: (branchId) => api.get(`/groups/branch/${branchId}`),
  getByBranchPaged: (branchId, params) =>
    api.get(`/groups/branch/${branchId}/paged`, { params }),
  getByLanguageLevel: (languageId, levelId, branchId) =>
    api.get(`/groups/language-level`, {
      params: { languageId, levelId, branchId },
    }),
  getById: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post("/groups", data),
  update: (data) => api.put("/groups", data),
  delete: (id) => api.delete(`/groups/${id}`),
  changeInstructor: (data) => api.post("/groups/change-instructor", data),
  checkHallConflict: (params) => api.get("/groups/hall-conflict", { params }),
  checkZoomConflict: (params) => api.get("/groups/zoom-conflict", { params }),
};

export const enrollmentsApi = {
  getByStudent: (studentId) => api.get(`/enrollments/student/${studentId}`),
  getByGroup: (groupId) => api.get(`/enrollments/group/${groupId}`),
  create: (data) => api.post("/enrollments", data),
  createPartial: (data) => api.post("/enrollments/partial", data),
  updateStatus: (data) => api.put("/enrollments/status", data),
  earlyExitRefund: (data) => api.post("/enrollments/early-exit-refund", data),
  unenroll: (id) => api.delete(`/enrollments/${id}`), // ← NEW
  getRefundPreview: (id) => api.get(`/enrollments/${id}/refund-preview`),
  getRefundsByBranch: (branchId, from, to) =>
    api.get(`/enrollments/refunds/branch/${branchId}`, {
      params: { ...(from && { from }), ...(to && { to }) },
    }),
};

export const sessionsApi = {
  getByGroup: (groupId) => api.get(`/sessions/group/${groupId}`),
  getByHall: (hallId, from, to) =>
    api.get(`/sessions/hall/${hallId}`, { params: { from, to } }),
  getByZoom: (zoomId, from, to) =>
    api.get(`/sessions/zoom/${zoomId}`, { params: { from, to } }),
  create: (data) => api.post("/sessions", data),
  update: (data) => api.put("/sessions", data),
  getAttendance: (sessionId) => api.get(`/sessions/${sessionId}/attendance`),
  markManual: (data) => api.post("/sessions/attendance/manual", data),
  markQr: (data) => api.post("/sessions/attendance/qr", data),
  revertAttendance: (data) => api.post("/sessions/attendance/revert", data),
  getNextSessionNumber: (groupId, periodLabelId) =>
    api.get(
      `/sessions/next-number?groupId=${groupId}&periodLabelId=${periodLabelId}`,
    ),
  getByBranch: (branchId, params) =>
    api.get(`/sessions/branch/${branchId}`, { params }),
  getStats: (branchId) => api.get(`/sessions/branch/${branchId}/stats`),
};

export const examsApi = {
  getByGroup: (groupId) => api.get(`/exams/group/${groupId}`),
  getResults: (examId) => api.get(`/exams/${examId}/results`),
  getResultsByStudent: (studentId) =>
    api.get(`/exams/student/${studentId}/results`),
  getRanking: (groupId) => api.get(`/exams/group/${groupId}/ranking`),
  create: (data) => api.post("/exams", data),
  addResult: (data) => api.post("/exams/result", data),
  issueCertificate: (examResultId) =>
    api.post(`/exams/${examResultId}/certificate`),
  update: (data) => api.put("/exams", data),
};

export const certificatesApi = {
  getByBranch: (branchId) => api.get(`/certificates/branch/${branchId}`),
  getByBranchPaged: (branchId, filter) =>
    api.get(`/certificates/branch/${branchId}/paged`, { params: filter }),
  getById: (id) => api.get(`/certificates/${id}`),
};

export const paymentsApi = {
  getByEnrollment: (enrollmentId) =>
    api.get(`/payments/enrollment/${enrollmentId}`),
  getByGroup: (groupId) => api.get(`/payments/group/${groupId}`),
  create: (data) => api.post("/payments", data),

  // Legacy, unpaginated — kept until callers are migrated
  getCommission: (instructorId, from, to) =>
    api.get(`/payments/commission/instructor/${instructorId}`, {
      params: { from, to },
    }),

  // New: offset-paginated instructor commission history
  getCommissionPaged: (instructorId, filter) =>
    api.get(`/payments/commission/instructor/${instructorId}/paged`, {
      params: filter, // { from, to, page, pageSize } — axios drops undefined keys
    }),

  // Legacy, unpaginated — kept until callers are migrated
  getByPeriod: (branchId, from, to) =>
    api.get("/payments/period", { params: { branchId, from, to } }),

  // New: offset-paginated, server-side filtered
  getByPeriodPaged: (filter) =>
    api.get("/payments/period/paged", { params: filter }),

  getClosings: (instructorId) =>
    api.get(`/payments/closing/instructor/${instructorId}`),
  getDebts: (branchId, from, to) =>
    api.get(`/payments/debts/${branchId}`, {
      params: { ...(from && { from }), ...(to && { to }) },
    }),
  settleBalance: (data) => api.post("/payments/settle-balance", data),
};

export const usersApi = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleActive: (id) => api.put(`/users/${id}/toggle-active`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
};

export const closingApi = {
  create: (data) => api.post("/closing", data),
  delete: (id) => api.delete(`/closing/${id}`),
  confirm: (data) => api.post("/closing/confirm", data),
  markPaid: (data) => api.post("/closing/paid", data),
  getDetails: (id) => api.get(`/closing/${id}`),
  getByBranch: (branchId) => api.get(`/closing/branch/${branchId}`),
  addCenterDeduction: (closingId, data) =>
    api.post(`/closing/${closingId}/center-deductions`, data),
  removeCenterDeduction: (closingId, deductionId) =>
    api.delete(`/closing/${closingId}/center-deductions/${deductionId}`),
  addInstructorBonus: (closingId, data) =>
    api.post(`/closing/${closingId}/instructor-bonuses`, data),
  removeInstructorBonus: (closingId, bonusId) =>
    api.delete(`/closing/${closingId}/instructor-bonuses/${bonusId}`),
  addInstructorSalaryDeduction: (closingId, data) =>
    api.post(`/closing/${closingId}/instructor-salary-deductions`, data),
  removeInstructorSalaryDeduction: (closingId, deductionId) =>
    api.delete(
      `/closing/${closingId}/instructor-salary-deductions/${deductionId}`,
    ),
  getAuditFlags: (branchId) => api.get(`/closing/audit-flags/${branchId}`),
  getByInstructor: (instructorId) =>
    api.get(`/closing/instructor/${instructorId}`),
};

export const waitingListApi = {
  getByBranch: (branchId, params) =>
    api.get(`/waitinglist/branch/${branchId}`, { params }),
  getExceeding: (days, params) =>
    api.get(`/waitinglist/exceeding/${days}`, { params }),
  create: (data) => api.post("/waitinglist", data),
  updateStatus: (data) => api.put("/waitinglist/status", data),
  update: (data) => api.put("/waitinglist", data),
  convert: (data) => api.post("/waitinglist/convert", data),
};

export const dashboardApi = {
  getFinancial: (branchId, from, to) =>
    api.get("/dashboard/financial", { params: { branchId, from, to } }),
  getStudents: (branchId) =>
    api.get("/dashboard/students", { params: { branchId } }),
  getGroups: (branchId) =>
    api.get("/dashboard/groups", { params: { branchId } }),
};

export const lookupsApi = {
  getLanguages: () => api.get("/lookups/languages"),
  createLanguage: (data) => api.post("/lookups/languages", data),
  updateLanguage: (id, data) => api.put("/lookups/languages", { id, ...data }),
  deleteLanguage: (id) => api.delete(`/lookups/languages/${id}`),
  getLevels: () => api.get("/lookups/levels"),
  getLanguageLevels: (languageId) =>
    api.get(`/lookups/Language-levels/${languageId}`),
  createLevel: (data) => api.post("/lookups/levels", data),
  updateLevel: (id, data) => api.put("/lookups/levels", { id, ...data }),
  deleteLevel: (id) => api.delete(`/lookups/levels/${id}`),
  getGoals: () => api.get("/lookups/goals"),
  createGoal: (data) => api.post("/lookups/goals", data),
  updateGoal: (id, data) => api.put("/lookups/goals", { id, ...data }),
  deleteGoal: (id) => api.delete(`/lookups/goals/${id}`),
  createNestedGoal: (data) => api.post("/lookups/goals/nested", data),
  updateNestedGoal: (id, data) =>
    api.put("/lookups/goals/nested", { id, ...data }),
  deleteNestedGoal: (id) => api.delete(`/lookups/goals/nested/${id}`),
  getPaymentMethods: () => api.get("/lookups/payment-methods"),
  createPaymentMethod: (data) => api.post("/lookups/payment-methods", data),
  updatePaymentMethod: (id, data) =>
    api.put("/lookups/payment-methods", { id, ...data }),
  deletePaymentMethod: (id) => api.delete(`/lookups/payment-methods/${id}`),
  getPeriodLabels: () => api.get("/lookups/period-labels"),
  createPeriodLabel: (data) => api.post("/lookups/period-labels", data),
  updatePeriodLabel: (id, data) =>
    api.put("/lookups/period-labels", { id, ...data }),
  deletePeriodLabel: (id) => api.delete(`/lookups/period-labels/${id}`),
  getBranches: () => api.get("/lookups/branches"),
  createBranch: (data) => api.post("/lookups/branches", data),
  updateBranch: (id, data) => api.put("/lookups/branches", { id, ...data }),
  deleteBranch: (id) => api.delete(`/lookups/branches/${id}`),
  getHalls: (bid) => api.get(`/lookups/halls/${bid}`),
  createHall: (data) => api.post("/lookups/halls", data),
  updateHall: (id, data) => api.put("/lookups/halls", { id, ...data }),
  deleteHall: (id) => api.delete(`/lookups/halls/${id}`),
  getZoomAccounts: (bid) => api.get(`/lookups/zoom/${bid}`),
  createZoomAccount: (data) => api.post("/lookups/zoom", data),
  updateZoomAccount: (id, data) => api.put("/lookups/zoom", { id, ...data }),
  deleteZoomAccount: (id) => api.delete(`/lookups/zoom/${id}`),
  getRoles: () => api.get("/lookups/roles"),
  createRole: (data) => api.post("/lookups/roles", data),
  updateRole: (id, data) => api.put("/lookups/roles", { id, ...data }),
  deleteRole: (id) => api.delete(`/lookups/roles/${id}`),
  getGroupCategories: () => api.get("/lookups/group-categories"),
  getGroupTypes: () => api.get("/lookups/group-types"),
  getGroupStatuses: () => api.get("/lookups/group-statuses"),
  getDeliveryModes: () => api.get("/lookups/delivery-modes"),
  getEnrollStatuses: () => api.get("/lookups/enroll-statuses"),
  getSettings: () => api.get("/lookups/settings"),
  updateSetting: (key, value) => api.put("/lookups/settings", { key, value }),
};

// ── Notifications ──────────────────────────────────────────────────────────
// Every event endpoint accepts channel: "gmail" | "whatsapp"
// Gmail is called automatically in onSuccess (fire-and-forget).
// WhatsApp is called manually via a trigger button in the UI.

const notifPost = (path, channel) => api.post(`${path}?channel=${channel}`);

export const notificationsApi = {
  // Custom blast (Notifications page — unchanged)
  sendCustom: (data) => api.post("/notifications/send-custom", data),
  getLogs: (branchId) =>
    api.get("/notifications/logs", { params: { branchId } }),
  getSettings: () => api.get("/notifications/settings"),
  updateSetting: (data) => api.put("/notifications/settings", data),

  // ── Enrollment ─────────────────────────────────────────────────────────
  enrollmentConfirmedGmail: (enrollmentId) =>
    notifPost(`/notifications/enrollment-confirmed/${enrollmentId}`, "gmail"),
  enrollmentConfirmedWhatsApp: (enrollmentId) =>
    notifPost(
      `/notifications/enrollment-confirmed/${enrollmentId}`,
      "whatsapp",
    ),

  // ── Payments ───────────────────────────────────────────────────────────
  paymentReceivedGmail: (paymentId) =>
    notifPost(`/notifications/payment-received/${paymentId}`, "gmail"),
  paymentReceivedWhatsApp: (paymentId) =>
    notifPost(`/notifications/payment-received/${paymentId}`, "whatsapp"),

  paymentOverdueGmail: (enrollmentId) =>
    notifPost(`/notifications/payment-overdue/${enrollmentId}`, "gmail"),
  paymentOverdueWhatsApp: (enrollmentId) =>
    notifPost(`/notifications/payment-overdue/${enrollmentId}`, "whatsapp"),

  paymentDueGmail: (enrollmentId) =>
    notifPost(`/notifications/payment-due/${enrollmentId}`, "gmail"),
  paymentDueWhatsApp: (enrollmentId) =>
    notifPost(`/notifications/payment-due/${enrollmentId}`, "whatsapp"),

  earlyExitRefundGmail: (refundId) =>
    notifPost(`/notifications/early-exit-refund/${refundId}`, "gmail"),
  earlyExitRefundWhatsApp: (refundId) =>
    notifPost(`/notifications/early-exit-refund/${refundId}`, "whatsapp"),

  // ── Sessions ───────────────────────────────────────────────────────────
  // Session cancelled is WhatsApp-only per the spec table
  sessionCancelledWhatsApp: (sessionId) =>
    notifPost(`/notifications/session-cancelled/${sessionId}`, "whatsapp"),

  // ── Exams ──────────────────────────────────────────────────────────────
  examMarksGmail: (examResultId) =>
    notifPost(`/notifications/exam-marks/${examResultId}`, "gmail"),
  examMarksWhatsApp: (examResultId) =>
    notifPost(`/notifications/exam-marks/${examResultId}`, "whatsapp"),

  levelCertificateGmail: (certificateId) =>
    notifPost(`/notifications/level-certificate/${certificateId}`, "gmail"),
  levelCertificateWhatsApp: (certificateId) =>
    notifPost(`/notifications/level-certificate/${certificateId}`, "whatsapp"),

  failedExamGmail: (examResultId) =>
    notifPost(`/notifications/failed-exam/${examResultId}`, "gmail"),
  failedExamWhatsApp: (examResultId) =>
    notifPost(`/notifications/failed-exam/${examResultId}`, "whatsapp"),

  // ── Waiting list ───────────────────────────────────────────────────────
  waitingListAlarmWhatsApp: (waitingListId) =>
    notifPost(`/notifications/waiting-list-alarm/${waitingListId}`, "whatsapp"),
};
export const getOverviewSummary = async (branchId) => {
  const [financial, students, groups] = await Promise.all([
    api.get("/dashboard/financial", {
      params: {
        branchId,
        from: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        ).toISOString(),
        to: new Date().toISOString(),
      },
    }),
    api.get("/dashboard/students", { params: { branchId } }),
    api.get("/dashboard/groups", { params: { branchId } }),
  ]);
  return {
    financial: financial.data?.data,
    students: students.data?.data,
    groups: groups.data?.data,
  };
};

export const getStudentSummary = async (branchId) => {
  const res = await api.get("/dashboard/students", { params: { branchId } });
  return res.data?.data;
};

// ── Rich endpoints ───────────────────────────────────────────────────────
// period: "month" | "3months" | "year" — drives the on-screen period label
// and, where applicable, the actual date-range query on the backend.

export const getGroupSummaryRich = async (branchId) => {
  const res = await api.get("/dashboard/groups-rich", { params: { branchId } });
  return res.data?.data;
};

export const getPaymentSummaryRich = async (branchId, period = "month") => {
  const res = await api.get("/dashboard/payments-rich", {
    params: { branchId, period },
  });
  return res.data?.data;
};

export const getInstructorSummaryRich = async (branchId, period = "month") => {
  const res = await api.get("/dashboard/instructors-rich", {
    params: { branchId, period },
  });
  return res.data?.data;
};

export const getExamSummaryRich = async (branchId, period = "month") => {
  const res = await api.get("/dashboard/exams-rich", {
    params: { branchId, period },
  });
  return res.data?.data;
};

export const getWaitingSummaryRich = async (branchId) => {
  const res = await api.get("/dashboard/waiting-rich", {
    params: { branchId },
  });
  return res.data?.data;
};

export const syncApi = {
  getStatus: () => api.get("/sync/status"),
  getMeta: () => api.get("/sync/meta"),
  getHistory: () => api.get("/sync/history"),
  syncNow: (since = null, forceBootstrap = false) =>
    api.post("/sync/trigger", null, {
      params: {
        ...(since ? { since } : {}),
        ...(forceBootstrap ? { forceBootstrap: true } : {}),
      },
    }),
  publishNow: () => api.post("/sync/publish-now"),
  cleanup: () => api.post("/sync/cleanup"),
  resetOutOfSync: () => api.post("/sync/reset-out-of-sync"),
  resetPointer: () => api.post("/sync/reset-pointer"),
  pushOne: (collection, id, data) =>
    api.post(`/sync/push/${collection}/${id}`, data),
};

export const centerDeductionsApi = {
  create: (data) => api.post("/centerdeduction", data),
  update: (data) => api.put("/centerdeduction", data),
  delete: (id) => api.delete(`/centerdeduction/${id}`),
  getByBranch: (branchId, from, to) =>
    api.get(`/centerdeduction/branch/${branchId}`, {
      params: { ...(from && { from }), ...(to && { to }) },
    }),
  getByBranchPaged: (branchId, filter) =>
    api.get(`/centerdeduction/branch/${branchId}/paged`, {
      params: filter, // { from, to, search, page, pageSize } — axios drops undefined keys
    }),
};

export const getCashDrawer = async (branchId) => {
  const res = await api.get("/dashboard/cash-drawer", { params: { branchId } });
  return res.data?.data;
};

export const storeApi = {
  getCategories: () => api.get("/store/categories"),
  createCategory: (data) => api.post("/store/categories", data),
  updateCategory: (data) => api.put("/store/categories", data),
  getItems: (branchId, categoryId, lowStockOnly) =>
    api.get("/store/items", {
      params: {
        branchId,
        ...(categoryId && { categoryId }),
        ...(lowStockOnly && { lowStockOnly }),
      },
    }),
  createItem: (data) => api.post("/store/items", data),
  updateItem: (data) => api.put("/store/items", data),
  restock: (data) => api.post("/store/items/restock", data),
  deleteItem: (id) => api.delete(`/store/items/${id}`),
};

export const salesApi = {
  create: (data) => api.post("/sales", data),
  getSales: (branchId, from, to, page = 1, pageSize = 8) =>
    api.get("/sales", {
      params: {
        branchId,
        ...(from && { from }),
        ...(to && { to }),
        page,
        pageSize,
      },
    }),
  getStats: (branchId) => api.get("/sales/stats", { params: { branchId } }),
};
