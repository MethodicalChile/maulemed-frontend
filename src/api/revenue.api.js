// src/api/revenue.api.js
// El lado del ingreso: libro de ingresos, financiadores, recaudación diaria y
// cobranza institucional.
import http from "./http";

const BASE = {
  entries: "/revenue-entries",
  financiers: "/financiers",
  aliases: "/financier-aliases",
  imports: "/revenue-imports",
  collections: "/cash-collections",
  receivables: "/receivables",
};

function upload(url, file) {
  const form = new FormData();
  form.append("file", file);
  return http.post(url, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export const revenueApi = {
  // Libro de ingresos
  listEntries: (params) => http.get(BASE.entries + "/", { params }),
  entriesByLegalEntity: (params) =>
    http.get(`${BASE.entries}/by-legal-entity/`, { params }),
  entriesByFinancier: (params) =>
    http.get(`${BASE.entries}/by-financier/`, { params }),

  // Financiadores y sus grafías
  listFinanciers: (params) => http.get(BASE.financiers + "/", { params }),
  createFinancier: (data) => http.post(BASE.financiers + "/", data),
  updateFinancier: (uuid, data) =>
    http.patch(`${BASE.financiers}/${uuid}/`, data),
  deleteFinancier: (uuid) => http.delete(`${BASE.financiers}/${uuid}/`),

  listAliases: (params) => http.get(BASE.aliases + "/", { params }),
  createAlias: (data) => http.post(BASE.aliases + "/", data),
  deleteAlias: (uuid) => http.delete(`${BASE.aliases}/${uuid}/`),

  // Cargas
  listImports: (params) => http.get(BASE.imports + "/", { params }),
  previewImport: (file) => upload(`${BASE.imports}/preview/`, file),
  runImport: (file) => upload(`${BASE.imports}/import/`, file),

  // Recaudación
  listCollections: (params) => http.get(BASE.collections + "/", { params }),
  importCollections: (file) => upload(`${BASE.collections}/import/`, file),

  // Cobranza
  listReceivables: (params) => http.get(BASE.receivables + "/", { params }),
  receivablesAging: (params) =>
    http.get(`${BASE.receivables}/aging/`, { params }),
  rebuildReceivables: (data) => http.post(`${BASE.receivables}/rebuild/`, data),
  registerCollection: (uuid, data) =>
    http.post(`${BASE.receivables}/${uuid}/register-collection/`, data),
};
