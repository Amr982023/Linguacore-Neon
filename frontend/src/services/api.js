// src/services/api.js
import axios from "axios";
import { useAuthStore } from "../context/authStore";

const api = axios.create({ baseURL: "/api" });

// Attach JWT token — reads from persisted store
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 handler — never touch auth endpoints
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url ?? "";
    const status = err.response?.status;

    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/has-users") ||
      url.includes("/license"); // ← ADD THIS

    if (status === 401 && !isAuthEndpoint) {
      console.warn("[api] 401 on", url, "— logging out");
      useAuthStore.getState().logout();
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  },
);

export default api;
