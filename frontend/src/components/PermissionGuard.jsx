// src/components/PermissionGuard.jsx
//
// Two components:
//
//  <PermissionGuard perm="studentsWrite">
//    <button>Edit</button>      ← only rendered if user has studentsWrite
//  </PermissionGuard>
//
//  <ProtectedRoute perm="dashboardRead" />  ← used inside <Route element={...}>

import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";

// ── Inline guard: hides children when permission is absent ────────────────────
export function PermissionGuard({ perm, children, fallback = null }) {
  const { can } = usePermissions();
  return can[perm] ? children : fallback;
}

// ── Full-page access denied ───────────────────────────────────────────────────
export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <ShieldAlert size={52} className="text-red-400" />
      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
        Access Denied
      </p>
      <p className="text-sm text-gray-400 max-w-xs">
        You don't have permission to view this page. Contact your administrator
        if you believe this is a mistake.
      </p>
    </div>
  );
}

// ── Route-level guard: renders <AccessDenied> (or redirects) when lacking perm ─
export function ProtectedRoute({ perm, redirectTo, children }) {
  const { can } = usePermissions();

  if (can[perm]) return children ?? null;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return <AccessDenied />;
}
