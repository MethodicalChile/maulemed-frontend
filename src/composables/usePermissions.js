// src/composables/usePermissions.js
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

export function usePermissions() {
  const authStore = useAuthStore()

  function can(key) {
    if (authStore.user?.is_superuser) {
        return true
    }
    const hasPermission = Boolean(authStore.permissions?.[key])
    return hasPermission
  }

  // Shortcut para verificar si tiene alguno de varios permisos (OR)
  function canAny(...keys) {
    if (authStore.user?.is_superuser) return true
    if (['ADMIN', 'GERENTE'].some(r => authStore.roleCodes?.includes(r))) return true
    const hasAny = keys.some(k => Boolean(authStore.permissions?.[k]))
    return hasAny
  }

  const permissions = {
    canViewDashboard: computed(() => can('can_view_dashboard')),

    // Catálogos
    canManageCatalogs:  computed(() => can('can_manage_catalogs')),
    canViewCatalogs:    computed(() => canAny('can_view_catalogs', 'can_manage_catalogs')),
    canCreateProducts:  computed(() => canAny('can_create_products', 'can_manage_products')),
    canEditProducts:    computed(() => canAny('can_edit_products',   'can_manage_products')),
    canDeleteProducts:  computed(() => canAny('can_delete_products', 'can_manage_products')),

    // Proveedores
    canViewSuppliers: computed(() =>
      can('can_view_suppliers')
    ),

    canCreateSuppliers: computed(() =>
      can('can_create_suppliers')
    ),

    canEditSuppliers: computed(() =>
      can('can_edit_suppliers')
    ),

    canDeleteSuppliers: computed(() =>
      can('can_delete_suppliers')
    ),

    // Inventario — Movimientos
    canViewInventory: computed(() =>
    can('can_view_inventory')
    ),

    canCreateInventory: computed(() =>
    can('can_create_inventory')
    ),

    canEditInventory: computed(() =>
    can('can_edit_inventory')
    ),

    canDeleteInventory: computed(() =>
    can('can_delete_inventory')
    ),

    // Inventario — Bodegas
    canViewWarehouses: computed(() =>
    can('can_view_warehouses')
    ),

    canCreateWarehouses: computed(() =>
    can('can_create_warehouses')
    ),

    canEditWarehouses: computed(() =>
    can('can_edit_warehouses')
    ),

    canDeleteWarehouses: computed(() =>
    can('can_delete_warehouses')
    ),

    // Compras
    canCreateSupplyRequest:  computed(() => can('can_create_supply_request')),
    canApproveSupplyRequest: computed(() => can('can_approve_supply_request')),
    canManagePurchaseOrders: computed(() => can('can_manage_purchase_orders')),
    canReceivePurchase:      computed(() => can('can_receive_purchase')),

    // Traspasos
    canManageTransfers: computed(() => can('can_manage_transfers')),

    // Finanzas
    canManageFinance: computed(() => can('can_manage_finance')),

    // Reportes / auditoría
    canViewAudit:   computed(() => can('can_view_audit')),
    canViewReports: computed(() => can('can_view_reports')),

    // Organización:
    canViewOrganizations:    computed(() => canAny('can_view_organizations', 'can_manage_organizations')),
    canCreateOrganizations:  computed(() => canAny('can_create_organizations', 'can_manage_organizations')),
    canEditOrganizations:    computed(() => canAny('can_edit_organizations', 'can_manage_organizations')),
    canDeleteOrganizations:  computed(() => canAny('can_delete_organizations', 'can_manage_organizations')),

    // Sucursales
    canViewBranches:    computed(() => canAny('can_view_branches', 'can_view_organizations')),
    canCreateBranches:  computed(() => canAny('can_create_branches', 'can_create_organizations')),
    canEditBranches:    computed(() => canAny('can_edit_branches', 'can_edit_organizations')),
    canDeleteBranches:  computed(() => canAny('can_delete_branches', 'can_delete_organizations')),

    // Entidades Legales
    canViewLegalEntities:    computed(() => canAny('can_view_legal_entities', 'can_view_organizations')),
    canCreateLegalEntities:  computed(() => canAny('can_create_legal_entities', 'can_create_organizations')),
    canEditLegalEntities:    computed(() => canAny('can_edit_organizations', 'can_edit_organizations')),
    canDeleteLegalEntities:  computed(() => canAny('can_delete_organizations', 'can_delete_organizations')),

    // Centros de Costo
    canViewCostCenters:    computed(() => canAny('can_view_cost_centers', 'can_view_organizations')),
    canCreateCostCenters:  computed(() => canAny('can_create_cost_centers', 'can_create_organizations')),
    canEditCostCenters:    computed(() => canAny('can_edit_cost_centers', 'can_edit_organizations')),
    canDeleteCostCenters:  computed(() => canAny('can_delete_cost_center', 'can_delete_organizations')),

    canManageOrganizations: computed(() =>
      authStore.user?.is_superuser ||
      ['ADMIN', 'GERENTE'].some(r => authStore.roleCodes?.includes(r)) ||
      Boolean(authStore.permissions?.can_manage_organizations)
    ),

    // Usuarios y roles (solo ADMIN)
    canManageUsers: computed(() => can('can_manage_users')),
  }

  return { can, canAny, ...permissions }
}
