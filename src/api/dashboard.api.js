// src/api/dashboard.api.js
import http from "./http";

export const dashboardApi = {
  getSummary: () => http.get("/dashboard/summary/"),
  getInventorySummary: () => http.get("/dashboard/inventory/"),
  getPurchasingSummary: () => http.get("/dashboard/purchasing/"),
  getFinanceSummary: () => http.get("/dashboard/finance/"),

  // Tablero ejecutivo: todo lo que la pantalla de inicio necesita en una
  // sola llamada, en vez de seis viajes que llegarían en desorden.
  getExecutive: (params) => http.get("/dashboard/executive/", { params }),
};
