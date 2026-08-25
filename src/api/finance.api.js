// src/api/finance.api.js
import http from "./http";

const BASE = {
  invoices: "/supplier-invoices",
  invoiceItems: "/supplier-invoice-items",
  payments: "/payments",
  budgets: "/budgets",
  budgetCategories: "/budget-categories",
};

export const financeApi = {
  // Invoices
  listInvoices: (params) => http.get(BASE.invoices + "/", { params }),
  getInvoice: (uuid) => http.get(`${BASE.invoices}/${uuid}/`),
  createInvoice: (data) => http.post(BASE.invoices + "/", data),
  updateInvoice: (uuid, data) => http.patch(`${BASE.invoices}/${uuid}/`, data),
  deleteInvoice: (uuid) => http.delete(`${BASE.invoices}/${uuid}/`),

  // Payments
  listPayments: (params) => http.get(BASE.payments + "/", { params }),
  getPayment: (uuid) => http.get(`${BASE.payments}/${uuid}/`),
  createPayment: (data) => http.post(BASE.payments + "/", data),
  updatePayment: (uuid, data) => http.patch(`${BASE.payments}/${uuid}/`, data),
  deletePayment: (uuid) => http.delete(`${BASE.payments}/${uuid}/`),

  // Budgets
  listBudgets: (params) => http.get(BASE.budgets + "/", { params }),
  getBudget: (uuid) => http.get(`${BASE.budgets}/${uuid}/`),
  createBudget: (data) => http.post(BASE.budgets + "/", data),
  updateBudget: (uuid, data) => http.patch(`${BASE.budgets}/${uuid}/`, data),
  deleteBudget: (uuid) => http.delete(`${BASE.budgets}/${uuid}/`),

  // Categorías del presupuesto de caja — las 34 líneas de la planilla
  listBudgetCategories: (params) =>
    http.get(BASE.budgetCategories + "/", { params }),
  createBudgetCategory: (data) => http.post(BASE.budgetCategories + "/", data),
  updateBudgetCategory: (uuid, data) =>
    http.patch(`${BASE.budgetCategories}/${uuid}/`, data),

  // Detalle de la factura
  listInvoiceItems: (params) => http.get(BASE.invoiceItems + "/", { params }),
  createInvoiceItem: (data) => http.post(BASE.invoiceItems + "/", data),
  updateInvoiceItem: (uuid, data) =>
    http.patch(`${BASE.invoiceItems}/${uuid}/`, data),
  deleteInvoiceItem: (uuid) => http.delete(`${BASE.invoiceItems}/${uuid}/`),
  prefillInvoiceItems: (uuid) =>
    http.post(`${BASE.invoices}/${uuid}/prefill-items/`),
};
