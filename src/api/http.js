// src/api/http.js
import axios from "axios";
import emitter from "../utils/eventBus";
import { useUiStore } from "@/stores/ui.store";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Helper para limpiar tokens
function clearAuth() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
  sessionStorage.removeItem("auth_session");
}

// ── Mutex de refresco ─────────────────────────────────────────────────────────
// Evita que múltiples requests en paralelo llamen a /auth/refresh/ simultáneamente.
// Si ya hay un refresh en curso, las demás requests esperan el mismo resultado.
let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise; // ya hay uno en curso → reutilizar

  const refresh = sessionStorage.getItem("refresh_token");
  if (!refresh) {
    clearAuth();
    window.location.href = "/login";
    throw new Error("No refresh token");
  }

  refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh/`, { refresh })
    .then((res) => {
      const access = res.data?.data?.access ?? res.data?.access;
      sessionStorage.setItem("access_token", access);
      return access;
    })
    .catch((err) => {
      clearAuth();
      window.location.href = "/login";
      throw err;
    })
    .finally(() => {
      refreshPromise = null; // limpiar el mutex al terminar
    });

  return refreshPromise;
}

// ── Interceptor de request — añadir token ────────────────────────────────────
http.interceptors.request.use((config) => {
  const uiStore = useUiStore();
  
  // No mostrar loader si la petición se marca como silenciosa
  if (!config.silent) {
    uiStore.startLoading();
  }

  const token = sessionStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interceptor de response — manejar token expirado ─────────────────────────
http.interceptors.response.use(
  (response) => {
    const uiStore = useUiStore();
    
    // Solo detener si la petición original no era silenciosa
    if (!response.config.silent) {
      uiStore.stopLoading();
    }
    
    return response;
  },
  async (error) => {
    const uiStore = useUiStore();
    
    // Solo detener si la petición original no era silenciosa
    if (!error.config?.silent) {
      uiStore.stopLoading();
    }
    
    const originalRequest = error.config;

    // Intentar refrescar también ante 403 por si el token tiene permisos obsoletos
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return http(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    // Emitir error global
    if (error.response) {
      emitter.emit("api:error", error.response);
    }

    return Promise.reject(error);
  },
);

export default http;
