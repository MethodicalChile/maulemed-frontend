// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";

import { useAuthStore } from "@/stores/auth.store";

import AuthLayout from "@/layouts/AuthLayout.vue";
import AppLayout from "@/layouts/AppLayout.vue";
import LoginView from "@/views/auth/LoginView.vue";

// Lazy-loaded — code splitting por módulo
const DashboardView = () => import("@/views/dashboard/DashboardView.vue");

const OrganizationsView = () =>
  import("@/views/organizations/OrganizationsView.vue");

const ProductsView = () => import("@/views/products/ProductsView.vue");

const MaintenanceView = () => import("@/views/maintenance/MaintenanceView.vue");

const InventoryView = () => import("@/views/inventory/InventoryView.vue");

const SuppliersView = () => import("@/views/suppliers/SuppliersView.vue");

const PurchasingView = () => import("@/views/purchasing/PurchasingView.vue");

const TransfersView = () => import("@/views/transfers/TransfersView.vue");

const FinanceView = () => import("@/views/finance/FinanceView.vue");

const AuditView = () => import("@/views/audit/AuditView.vue");

const UsersView = () => import("@/views/users/UsersView.vue");

const RolesView = () => import("@/views/roles/RolesView.vue");

const ReportsView = () => import("@/views/reports/ReportsView.vue");

const DocumentsView = () => import("@/views/documents/DocumentsView.vue");

const DocumentPreviewView = () => import("@/views/documents/DocumentPreviewView.vue");

const EvaluationsView = () => import("@/views/evaluations/EvaluationsView.vue");

const ForbiddenView = () => import("@/views/errors/ForbiddenView.vue");

const ProductPriceHistoryView = () => import("@/views/products/ProductPriceHistoryView.vue");

const routes = [
  {
    path: "/login",
    component: AuthLayout,
    children: [
      {
        path: "",
        name: "login",
        component: LoginView,
      },
    ],
  },
  {
    path: "/",
    component: AppLayout,
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: "",
        redirect: "/dashboard",
      },
      {
        path: "dashboard",
        name: "dashboard",
        component: DashboardView,
        meta: {
          title: "Dashboard",
        },
      },
      {
        path: "organizations",
        name: "organizations",
        component: OrganizationsView,
        meta: {
          title: "Organización",
          permission: "can_view_organizations",
        },
      },
      {
        path: "products",
        name: "products",
        component: ProductsView,
        meta: {
          title: "Productos",
          permission: "can_view_catalogs",
        },
      },
      {
        path: "maintenance",
        name: "maintenance",
        component: MaintenanceView,
        meta: {
          title: "Mantenedor",
          permission: "can_manage_catalogs",
        },
      },
      {
        path: "suppliers",
        name: "suppliers",
        component: SuppliersView,
        meta: {
          title: "Proveedores",
          permission: "can_view_suppliers",
        },
      },
      {
        path: "inventory",
        name: "inventory",
        component: InventoryView,
        meta: {
          title: "Inventario",
          permission: "can_view_inventory",
        },
      },
      {
        path: "purchasing",
        name: "purchasing",
        component: PurchasingView,
        meta: {
          title: "Compras",
          permission: "can_view_purchasing",
        },
      },
      {
        path: "transfers",
        name: "transfers",
        component: TransfersView,
        meta: {
          title: "Traspasos",
          permission: "can_view_transfers",
        },
      },
      {
        path: "products/:uuid/price-history",
        name: "product-price-history",
        component: ProductPriceHistoryView,
        meta: {
          title: "Historial de precios",
          permission: "can_view_catalogs",
        },
      },
      {
        path: "finance",
        name: "finance",
        component: FinanceView,
        meta: {
          title: "Finanzas",
          permission: "can_view_finance",
        },
      },
      {
        path: "audit",
        name: "audit",
        component: AuditView,
        meta: {
          title: "Auditoría",
          permission: "can_view_audit",
        },
      },
      {
        path: "evaluations",
        name: "evaluations",
        component: EvaluationsView,
        meta: {
          title: "Evaluaciones",
          permission: "can_view_evaluations",
        },
      },
      {
        path: "reports",
        name: "reports",
        component: ReportsView,
        meta: {
          title: "Reportes",
          permission: "can_view_reports",
        },
      },
      {
        path: "documents",
        name: "documents",
        component: DocumentsView,
        meta: {
          title: "Documentos",
          permission: "can_manage_purchase_orders",
        },
      },
      {
        path: "users",
        name: "users",
        component: UsersView,
        meta: {
          title: "Usuarios",
          permission: "can_manage_users",
        },
      },
      {
        path: "document-preview",
        name: "document-preview",
        component: DocumentPreviewView,
        meta: {
          title: "Carga de documentos",
          permission: "can_access_document_preview",
        },
      },
      {
        path: "roles",
        name: "roles",
        component: RolesView,
        meta: {
          title: "Roles",
          permission: "can_view_roles",
        },
      },
      {
        path: "forbidden",
        name: "forbidden",
        component: ForbiddenView,
        meta: {
          title: "Sin acceso",
        },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// El guard solo ejecuta fetchMe si el store está vacío.
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  const requiresAuth = to.matched.some((route) => route.meta.requiresAuth);

  if (!requiresAuth) {
    return next();
  }

  if (!authStore.isAuthenticated) {
    return next("/login");
  }

  if (!authStore.hydrated) {
    // No hay snapshot en localStorage — primera carga o después de un logout
    // Hay que esperar a fetchMe() antes de evaluar permisos
    try {
      await authStore.fetchMe();
    } catch {
      authStore.logout();
      return next("/login");
    }
  } else if (!authStore.user) {
    // Tiene tokens y snapshot corrupto — raro, pero lo manejamos
    try {
      await authStore.fetchMe();
    } catch {
      authStore.logout();
      return next("/login");
    }
  } else {
    // Tiene snapshot válido: navega inmediatamente (sin flash)
    // y refresca en background para mantener permisos actualizados
    authStore.fetchMe(true).catch(() => {
      // Si el token expiró y el refresh también falla, http.js ya redirige a /login
    });
  }

  const permissionKey = to.meta?.permission;

  if (permissionKey) {
    const hasAccess = checkPermission(authStore, permissionKey);
    if (!hasAccess) {
      return next("/forbidden");
    }
  }

  return next();
});

function checkPermission(authStore, key) {
  if (authStore.user?.is_superuser) {
    return true;
  }

  // Roles ADMIN/GERENTE tienen acceso a todo
  const isAdminOrGerente = ["ADMIN", "GERENTE"].some((r) =>
    authStore.roleCodes?.includes(r),
  );

  if (isAdminOrGerente) {
    return true;
  }

  const permissions = authStore.permissions ?? {};

  // Para cada clave de ruta, lista los permisos que dan acceso (OR).
  const accessMap = {
    // Dashboard
    can_view_dashboard: [
      "can_view_dashboard",
    ],

    // Organización
    can_view_organizations: [
      "can_view_organizations",
      "can_manage_organizations",
    ],

    can_manage_organizations: [
      "can_view_organizations",
      "can_manage_organizations",
    ],

    // Catálogo
    can_view_catalogs: [
      "can_view_catalogs",
      "can_manage_catalogs",
    ],

    can_manage_catalogs: [
      "can_manage_catalogs",
    ],

    // Proveedores
    can_view_suppliers: [
      "can_view_suppliers",
      "can_manage_suppliers",
    ],

    // Inventario
    can_view_inventory: [
      "can_view_inventory",
      "can_manage_inventory",
    ],

    // Carga de documentos
    can_access_document_preview: [
      "can_access_document_preview",
    ],

    // Compras - acceso general al módulo
    can_view_purchasing: [
      "can_view_supply_requests",
      "can_view_purchase_orders",
      "can_view_purchase_receipts",
      "can_view_supplier_claims",
    ],

    // Solicitudes de compra
    can_view_supply_requests: [
      "can_view_supply_requests",
    ],

    can_create_supply_request: [
      "can_create_supply_request",
      "can_manage_purchase_orders",
      "can_approve_supply_request",
      "can_receive_purchase",
    ],

    can_edit_supply_request: [
      "can_edit_supply_request",
    ],

    can_approve_supply_request: [
      "can_approve_supply_request",
    ],

    // Órdenes de compra
    can_view_purchase_orders: [
      "can_view_purchase_orders",
    ],

    can_create_purchase_order: [
      "can_create_purchase_order",
    ],

    can_edit_purchase_order: [
      "can_edit_purchase_order",
    ],

    can_delete_purchase_order: [
      "can_delete_purchase_order",
    ],

    can_receive_purchase: [
      "can_receive_purchase",
    ],

    // Traspasos
    can_view_transfers: [
      "can_view_transfers",
    ],

    can_create_transfers: [
      "can_create_transfers",
    ],

    can_edit_transfers: [
      "can_edit_transfers",
    ],

    can_delete_transfers: [
      "can_delete_transfers",
    ],

    // Finanzas
    can_view_finance: [
      "can_view_finance",
    ],

    // Documentos / órdenes de compra legacy
    can_manage_purchase_orders: [
      "can_manage_purchase_orders",
      "can_view_purchase_orders",
      "can_create_purchase_order",
      "can_edit_purchase_order",
      "can_delete_purchase_order",
      "can_receive_purchase",
      "can_manage_inventory",
    ],

    // Evaluaciones
    can_view_evaluations: [
      "can_view_evaluations",
    ],

    // Reportes
    can_view_reports: [
      "can_view_reports",
    ],

    // Auditoría
    can_view_audit: [
      "can_view_audit",
    ],

    // Usuarios
    can_view_users: [
      "can_view_users",
      "can_create_users",
      "can_edit_users",
      "can_delete_users",
    ],

    // Roles
    can_view_roles: [
      "can_view_roles",
      "can_create_roles",
      "can_edit_roles",
      "can_delete_roles",
    ],

    // Legacy
    can_manage_users: [
      "can_manage_users",
      "can_view_users",
      "can_create_users",
      "can_edit_users",
      "can_delete_users",
      "can_view_roles",
      "can_create_roles",
      "can_edit_roles",
      "can_delete_roles",
    ],
  };

  const allowed = accessMap[key] ?? [key];

  return allowed.some((permission) =>
    Boolean(permissions[permission]),
  );
}

router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} | MauleMed` : "MauleMed";
});

export default router;
