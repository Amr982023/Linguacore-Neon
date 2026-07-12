import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./context/authStore";
import { usePermissions } from "./hooks/usePermissions";
import { AccessDenied } from "./components/PermissionGuard";
import CenterDeductions from "./pages/CenterDeductions";
import StorePage from "./pages/StorePage";
import SalesPage from "./pages/SalesPage";

import Login from "./pages/Login";
import BranchOverview from "./pages/Branchoverview";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudentPortfolio from "./pages/StudentPortfolio";
import Instructors from "./pages/Instructors";
import InstructorProfile from "./pages/Instructorprofile";
import Groups from "./pages/Groups";
import Sessions from "./pages/Sessions";
import Exams from "./pages/Exams";
import Payments from "./pages/Payments";
import Closing from "./pages/Closing";
import Certificates from "./pages/Certificates";
import WaitingList from "./pages/WaitingList";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import FirebaseSync from "./pages/FirebaseSync";
import UsersPage from "./pages/Users";
import UserProfile from "./pages/UserProfile";
import Layout from "./components/Layout";
import CertificatePrint from "./pages/CertificatePrint";
import ResourceScheduler from "./pages/Resourcescheduler";

// QueryClient is now owned by main.jsx — do NOT create it here

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

function PermRoute({ perm, children }) {
  const { can } = usePermissions();
  return can[perm] === true ? children : <AccessDenied />;
}

function ProfileRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    // QueryClientProvider removed — it now wraps ActivationGate in main.jsx
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/certificates/:id/print"
          element={
            <PrivateRoute>
              <CertificatePrint />
            </PrivateRoute>
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route
            index
            element={
              <PermRoute perm="dashboardRead">
                <Dashboard />
              </PermRoute>
            }
          />
          <Route
            path="students"
            element={
              <PermRoute perm="studentsRead">
                <Students />
              </PermRoute>
            }
          />
          <Route
            path="students/:id/portfolio"
            element={
              <PermRoute perm="studentsRead">
                <StudentPortfolio />
              </PermRoute>
            }
          />
          <Route
            path="instructors"
            element={
              <PermRoute perm="instructorsRead">
                <Instructors />
              </PermRoute>
            }
          />

          {/* Instructor Profile — Super Admin only */}
          <Route
            path="instructor-profile"
            element={
              <PermRoute perm="isSuperAdmin">
                <InstructorProfile />
              </PermRoute>
            }
          />

          <Route
            path="groups"
            element={
              <PermRoute perm="groupsRead">
                <Groups />
              </PermRoute>
            }
          />
          <Route
            path="sessions"
            element={
              <PermRoute perm="sessionsRead">
                <Sessions />
              </PermRoute>
            }
          />
          <Route
            path="exams"
            element={
              <PermRoute perm="examsRead">
                <Exams />
              </PermRoute>
            }
          />
          <Route
            path="payments"
            element={
              <PermRoute perm="paymentsRead">
                <Payments />
              </PermRoute>
            }
          />
          <Route
            path="closing"
            element={
              <PermRoute perm="closingsRead">
                <Closing />
              </PermRoute>
            }
          />
          <Route
            path="center-deductions"
            element={
              <PermRoute perm="closingsRead">
                <CenterDeductions />
              </PermRoute>
            }
          />
          <Route
            path="certificates"
            element={
              <PermRoute perm="certificatesRead">
                <Certificates />
              </PermRoute>
            }
          />
          <Route
            path="store"
            element={
              <PermRoute perm="storeRead">
                <StorePage />
              </PermRoute>
            }
          />
          <Route
            path="sales"
            element={
              <PermRoute perm="salesRead">
                <SalesPage />
              </PermRoute>
            }
          />
          <Route
            path="branch-overview"
            element={
              <PermRoute perm="isSuperAdmin">
                <BranchOverview />
              </PermRoute>
            }
          />
          <Route
            path="waiting"
            element={
              <PermRoute perm="waitingListRead">
                <WaitingList />
              </PermRoute>
            }
          />

          {/* ── Resource Scheduler ── */}
          <Route
            path="resource-scheduler"
            element={
              <PermRoute perm="resourceSchedulerRead">
                <ResourceScheduler />
              </PermRoute>
            }
          />

          {/* Users list — Super Admin only */}
          <Route
            path="users"
            element={
              <PermRoute perm="usersManage">
                <UsersPage />
              </PermRoute>
            }
          />

          {/* User profile — any authenticated user */}
          <Route
            path="users/:id"
            element={
              <ProfileRoute>
                <UserProfile />
              </ProfileRoute>
            }
          />

          <Route
            path="settings"
            element={
              <PermRoute perm="settingsRead">
                <Settings />
              </PermRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <PermRoute perm="notificationsRead">
                <Notifications />
              </PermRoute>
            }
          />
          <Route
            path="firebase-sync"
            element={
              <PermRoute perm="isSuperAdmin">
                <FirebaseSync />
              </PermRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
