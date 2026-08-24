// src/composables/usePermissions.js
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";

export function usePermissions() {
  const authStore = useAuthStore();

  function can(key) {
    if (authStore.user?.is_superuser) {
      return true;
    }

    const hasPermission = Boolean(
      authStore.permissions?.[key],
    );

    return hasPermission;
  }

  // Shortcut para verificar si tiene alguno de varios permisos (OR)
  function canAny(...keys) {
    if (authStore.user?.is_superuser) {
      return true;
    }

    if (
      ["ADMIN", "GERENTE"].some(
        (r) =>
          authStore.roleCodes?.includes(r),
      )
    ) {
      return true;
    }

    const hasAny = keys.some(
      (k) =>
        Boolean(
          authStore.permissions?.[k],
        ),
    );

    return hasAny;
  }

  const permissions = {
    canViewDashboard: computed(() =>
      can("can_view_dashboard"),
    ),

    // =========================================================
    // CATÁLOGOS
    // =========================================================

    canManageCatalogs: computed(() =>
      can("can_manage_catalogs"),
    ),

    canViewCatalogs: computed(() =>
      canAny(
        "can_view_catalogs",
        "can_view_products",
      ),
    ),

    canCreateProducts: computed(() =>
      canAny(
        "can_create_products",
      ),
    ),

    canEditProducts: computed(() =>
      canAny(
        "can_edit_products",
      ),
    ),

    canDeleteProducts: computed(() =>
      canAny(
        "can_delete_products",
      ),
    ),

    // =========================================================
    // PROVEEDORES
    // =========================================================

    canViewSuppliers: computed(() =>
      can("can_view_suppliers"),
    ),

    canCreateSuppliers: computed(() =>
      can("can_create_suppliers"),
    ),

    canEditSuppliers: computed(() =>
      can("can_edit_suppliers"),
    ),

    canDeleteSuppliers: computed(() =>
      can("can_delete_suppliers"),
    ),

    // =========================================================
    // INVENTARIO — MOVIMIENTOS
    // =========================================================

    canViewInventory: computed(() =>
      can("can_view_inventory"),
    ),

    canCreateInventory: computed(() =>
      can("can_create_inventory"),
    ),

    canEditInventory: computed(() =>
      can("can_edit_inventory"),
    ),

    canDeleteInventory: computed(() =>
      can("can_delete_inventory"),
    ),

    // =========================================================
    // INVENTARIO — BODEGAS
    // =========================================================

    canViewWarehouses: computed(() =>
      can("can_view_warehouses"),
    ),

    canCreateWarehouses: computed(() =>
      can("can_create_warehouses"),
    ),

    canEditWarehouses: computed(() =>
      can("can_edit_warehouses"),
    ),

    canDeleteWarehouses: computed(() =>
      can("can_delete_warehouses"),
    ),

    // =========================================================
    // COMPRAS — SOLICITUDES
    // =========================================================

    canViewSupplyRequests: computed(() =>
      can("can_view_supply_requests"),
    ),

    canCreateSupplyRequest: computed(() =>
      can("can_create_supply_request"),
    ),

    canEditSupplyRequest: computed(() =>
      can("can_edit_supply_request"),
    ),

    canApproveSupplyRequest: computed(() =>
      can("can_approve_supply_request"),
    ),

    // =========================================================
    // COMPRAS — ÓRDENES
    // =========================================================

    canViewPurchaseOrders: computed(() =>
      can("can_view_purchase_orders"),
    ),

    canCreatePurchaseOrders: computed(() =>
      can("can_create_purchase_orders"),
    ),

    canEditPurchaseOrders: computed(() =>
      can("can_edit_purchase_orders"),
    ),

    canDeletePurchaseOrders: computed(() =>
      can("can_delete_purchase_orders"),
    ),

    // =========================================================
    // COMPRAS — RECEPCIONES
    // =========================================================

    canViewPurchaseReceipts: computed(() =>
      can("can_view_purchase_receipts"),
    ),

    canCreatePurchaseReceipts: computed(() =>
      can("can_create_purchase_receipts"),
    ),

    canEditPurchaseReceipts: computed(() =>
      can("can_edit_purchase_receipts"),
    ),

    canDeletePurchaseReceipts: computed(() =>
      can("can_delete_purchase_receipts"),
    ),

    canProcessPurchaseReceipts: computed(() =>
      can("can_process_purchase_receipts"),
    ),

    // =========================================================
    // COMPRAS — RECLAMOS
    // =========================================================

    canViewSupplierClaims: computed(() =>
      can("can_view_supplier_claims"),
    ),

    canCreateSupplierClaims: computed(() =>
      can("can_create_supplier_claims"),
    ),

    canEditSupplierClaims: computed(() =>
      can("can_edit_supplier_claims"),
    ),

    canDeleteSupplierClaims: computed(() =>
      can("can_delete_supplier_claims"),
    ),

    // =========================================================
    // TRASPASOS
    // =========================================================

    canViewTransfers: computed(() =>
    can("can_view_transfers"),
    ),

    canCreateTransfers: computed(() =>
    can("can_create_transfers"),
    ),

    canEditTransfers: computed(() =>
    can("can_edit_transfers"),
    ),

    canDeleteTransfers: computed(() =>
    can("can_delete_transfers"),
    ),

    // =========================================================
    // CARGA DE DOCUMENTOS
    // =========================================================

    canAccessDocumentPreview: computed(() =>
    can("can_access_document_preview"),
    ),

    // =========================================================
    // FINANZAS
    // =========================================================

    canManageFinance: computed(() =>
      can("can_manage_finance"),
    ),

    // =========================================================
    // EVALUACIONES
    // =========================================================

    canViewEvaluations: computed(() =>
      can("can_view_evaluations"),
    ),

    canCreateEvaluations: computed(() =>
      can("can_create_evaluations"),
    ),

    canEditEvaluations: computed(() =>
      can("can_edit_evaluations"),
    ),

    canDeleteEvaluations: computed(() =>
      can("can_delete_evaluations"),
    ),

    // =========================================================
    // REPORTES / AUDITORÍA
    // =========================================================

    canViewAudit: computed(() =>
      can("can_view_audit"),
    ),

    canViewReports: computed(() =>
      can("can_view_reports"),
    ),

    // =========================================================
    // ORGANIZACIÓN
    // =========================================================

    canViewOrganizations: computed(() =>
      canAny(
        "can_view_organizations",
      ),
    ),

    canCreateOrganizations: computed(() =>
      canAny(
        "can_create_organizations",
      ),
    ),

    canEditOrganizations: computed(() =>
      canAny(
        "can_edit_organizations",
      ),
    ),

    canDeleteOrganizations: computed(() =>
      canAny(
        "can_delete_organizations",
      ),
    ),

    // =========================================================
    // SUCURSALES
    // =========================================================

    canViewBranches: computed(() =>
      canAny(
        "can_view_branches",
        "can_view_organizations",
      ),
    ),

    canCreateBranches: computed(() =>
      canAny(
        "can_create_branches",
        "can_create_organizations",
      ),
    ),

    canEditBranches: computed(() =>
      canAny(
        "can_edit_branches",
        "can_edit_organizations",
      ),
    ),

    canDeleteBranches: computed(() =>
      canAny(
        "can_delete_branches",
        "can_delete_organizations",
      ),
    ),

    // =========================================================
    // ENTIDADES LEGALES
    // =========================================================

    canViewLegalEntities: computed(() =>
      canAny(
        "can_view_legal_entities",
        "can_view_organizations",
      ),
    ),

    canCreateLegalEntities: computed(() =>
      canAny(
        "can_create_legal_entities",
        "can_create_organizations",
      ),
    ),

    canEditLegalEntities: computed(() =>
      canAny(
        "can_edit_organizations",
        "can_edit_organizations",
      ),
    ),

    canDeleteLegalEntities: computed(() =>
      canAny(
        "can_delete_organizations",
        "can_delete_organizations",
      ),
    ),

    // =========================================================
    // CENTROS DE COSTO
    // =========================================================

    canViewCostCenters: computed(() =>
      canAny(
        "can_view_cost_centers",
        "can_view_organizations",
      ),
    ),

    canCreateCostCenters: computed(() =>
      canAny(
        "can_create_cost_centers",
        "can_create_organizations",
      ),
    ),

    canEditCostCenters: computed(() =>
      canAny(
        "can_edit_cost_centers",
        "can_edit_organizations",
      ),
    ),

    canDeleteCostCenters: computed(() =>
      canAny(
        "can_delete_cost_center",
        "can_delete_organizations",
      ),
    ),

    canManageOrganizations: computed(
      () =>
        authStore.user?.is_superuser ||
        ["ADMIN", "GERENTE"].some(
          (r) =>
            authStore.roleCodes?.includes(r),
        ) ||
        Boolean(
          authStore.permissions
            ?.can_manage_organizations,
        ),
    ),

    // =========================================================
    // USUARIOS Y ROLES
    // =========================================================

    canManageUsers: computed(() =>
      can("can_manage_users"),
    ),
  };

  return {
    can,
    canAny,
    ...permissions,
  };
}