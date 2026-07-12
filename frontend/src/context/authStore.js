// src/context/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

function parsePermissions(permissions) {
  if (typeof permissions === "number" && !isNaN(permissions))
    return permissions;
  if (typeof permissions === "string") {
    const n = parseInt(permissions, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      // ✅ branchId and userId stored as PLAIN state fields (not getters)
      // so that const { branchId } = useAuthStore() works in every page
      branchId: null,
      userId: null,

      // Called by Login.jsx as: setAuth(token, authData)
      setAuth(token, authData) {
        const permBits = parsePermissions(authData.permissions);
        console.log(
          "[authStore] setAuth — roleName:",
          authData.roleName,
          "| raw permissions:",
          authData.permissions,
          "| parsed bits:",
          permBits,
        );
        set({
          token,
          branchId: authData.branchId ?? null,
          userId: authData.userId ?? null,
          user: {
            id: authData.userId,
            name: authData.name,
            email: authData.email,
            roleName: authData.roleName,
            permissions: permBits,
            branchId: authData.branchId,
            expiresAt: authData.expiresAt,
          },
        });
      },

      // Alternative: login(fullApiResponse)
      login(apiResponse) {
        const {
          token,
          userId,
          name,
          email,
          roleName,
          permissions,
          branchId,
          expiresAt,
        } = apiResponse;
        const permBits = parsePermissions(permissions);
        set({
          token,
          branchId: branchId ?? null,
          userId: userId ?? null,
          user: {
            id: userId,
            name,
            email,
            roleName,
            permissions: permBits,
            branchId,
            expiresAt,
          },
        });
      },

      logout() {
        set({ user: null, token: null, branchId: null, userId: null });
      },
    }),
    {
      name: "lingua-auth",
      // Persist everything needed to restore full session on reload
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        branchId: state.branchId,
        userId: state.userId,
      }),
    },
  ),
);
