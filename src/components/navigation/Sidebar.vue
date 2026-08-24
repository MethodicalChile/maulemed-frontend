<script setup>
import { computed, ref, reactive } from "vue";
import { RouterLink, useRoute } from "vue-router";
import BrandLogo from "@/components/common/BrandLogo.vue";

import {
  Bell,
  Building2,
  ClipboardList,
  DollarSign,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Warehouse,
  ChevronDown,
} from "lucide-vue-next";

import { useAuthStore } from "@/stores/auth.store";

defineEmits(["navigate"]);

const authStore = useAuthStore();
const route = useRoute();

// ── Colapso total del sidebar ──────────────────────────────────────────────
const collapsed = ref(true);

// ── Grupos colapsables ─────────────────────────────────────────────────────
// Cada grupo recuerda si está abierto/cerrado en localStorage
const GROUPS = [
  {
    key: "core",
    label: "Principal",
    keys: ["dashboard"],
  },
  {
    key: "catalog",
    label: "Catálogo",
    keys: ["products", "suppliers"],
  },
  {
    key: "maintenance",
    label: "Mantenedor",
    keys: ["maintenance"],
  },
  {
    key: "operations",
    label: "Operaciones",
    keys: ["inventory", "purchasing", "transfers"],
  },
  {
    key: "admin",
    label: "Administración",
    keys: ["organizations", "finance", "documents", "document-preview"],
  },
  {
    key: "people",
    label: "Personas",
    keys: ["evaluations", "users", "roles"],
  },
  {
    key: "analytics",
    label: "Análisis",
    keys: ["reports", "audit"],
  },
  {
    key: "system",
    label: "Sistema",
    keys: ["notifications"],
  },
];

// Inicializar estados de grupos desde localStorage
const groupOpen = reactive(
  Object.fromEntries(
    GROUPS.map((g) => {
      const stored = localStorage.getItem(`sb_group_${g.key}`);
      // Por defecto abiertos excepto 'people', 'analytics' y 'system'
      const defaultOpen = !["people", "analytics", "system"].includes(g.key);
      return [g.key, stored !== null ? stored === "true" : defaultOpen];
    }),
  ),
);

function toggleGroup(key) {
  groupOpen[key] = !groupOpen[key];
  localStorage.setItem(`sb_group_${key}`, String(groupOpen[key]));
}

// ── Mapa de íconos y colores ───────────────────────────────────────────────
const ICON_MAP = {
  dashboard: LayoutDashboard,
  organizations: Building2,
  products: Package,
  maintenance: Settings,
  suppliers: Users,
  inventory: Warehouse,
  purchasing: ShoppingCart,
  transfers: Truck,
  finance: DollarSign,
  revenue: TrendingUp,
  evaluations: ClipboardList,
  reports: FileText,
  documents: FolderOpen,
  notifications: Bell,
  users: UserCog,
  roles: ShieldAlert,
  audit: ShieldCheck,
  "document-preview": FileText,
};

const COLOR_MAP = {
  dashboard: "text-blue-600",
  organizations: "text-indigo-600",
  products: "text-emerald-600",
  maintenance: "text-slate-600",
  suppliers: "text-sky-600",
  inventory: "text-blue-600",
  purchasing: "text-emerald-600",
  transfers: "text-orange-600",
  finance: "text-green-600",
  revenue: "text-lime-600",
  evaluations: "text-purple-600",
  reports: "text-cyan-600",
  documents: "text-amber-600",
  notifications: "text-red-600",
  users: "text-blue-500",
  roles: "text-purple-500",
  audit: "text-teal-600",
  "document-preview": "text-violet-600",
};

// ── Menú ───────────────────────────────────────────────────────────────────
const FALLBACK_MENU = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "organizations", label: "Organización", path: "/organizations" },
  { key: "products", label: "Productos", path: "/products" },
  { key: "maintenance", label: "Mantenedor", path: "/maintenance" },
  { key: "suppliers", label: "Proveedores", path: "/suppliers" },
  { key: "inventory", label: "Inventario", path: "/inventory" },
  { key: "purchasing", label: "Compras", path: "/purchasing" },
  { key: "transfers", label: "Traspasos", path: "/transfers" },
  { key: "finance", label: "Finanzas", path: "/finance" },
  { key: "revenue", label: "Ingresos", path: "/revenue" },
  { key: "evaluations", label: "Evaluaciones", path: "/evaluations" },
  { key: "reports", label: "Reportes", path: "/reports" },
  { key: "documents", label: "Documentos", path: "/documents" },
  { key: "notifications", label: "Notificaciones", path: "/notifications" },
  { key: "users", label: "Usuarios", path: "/users" },
  { key: "roles", label: "Roles", path: "/roles" },
  { key: "audit", label: "Auditoría", path: "/audit" },
  {
    key: "document-preview",
    label: "Carga de documentos",
    path: "/document-preview",
  },
];

// Construir mapa de ítems disponibles (respetando permisos del backend)
const itemMap = computed(() => {
  const source = authStore.menu?.length ? authStore.menu : FALLBACK_MENU;
  const map = {};
  source.forEach((item) => {
    map[item.key] = {
      key: item.key,
      label: item.label,
      path: item.path,
      icon: ICON_MAP[item.key] ?? LayoutDashboard,
      color: COLOR_MAP[item.key] ?? "text-muted-foreground",
    };
  });

  if (!map["document-preview"]) {
    map["document-preview"] = {
      key: "document-preview",
      label: "Carga de documentos",
      path: "/document-preview",
      icon: ICON_MAP["document-preview"] ?? FileText,
      color: COLOR_MAP["document-preview"] ?? "text-violet-600",
    };
  }

  // Asegurar que Mantenedor siempre esté disponible
  if (!map["maintenance"]) {
    map["maintenance"] = {
      key: "maintenance",
      label: "Mantenedor",
      path: "/maintenance",
      icon: ICON_MAP["maintenance"] ?? Settings,
      color: COLOR_MAP["maintenance"] ?? "text-slate-600",
    };
  }

  return map;
});

// Permisos del usuario para filtrar visibilidad del sidebar
const permissions = computed(() => authStore.permissions ?? {});
const isAdminOrGerente = computed(
  () =>
    authStore.user?.is_superuser ||
    ["ADMIN", "GERENTE"].some((r) => authStore.roleCodes?.includes(r)),
);

function hasAnyPermission(...keys) {
  if (isAdminOrGerente.value) return true;
  return keys.some((k) => Boolean(permissions.value[k]));
}

// Mapa de visibilidad: key del ítem → función que retorna si debe mostrarse
// Mapa de visibilidad: key del ítem → función que retorna si debe mostrarse
const VISIBILITY = {
  // Dashboard
  dashboard: () => true,

  // Organización
  organizations: () =>
    hasAnyPermission(
      "can_view_organizations",
    ),

  // Catálogo
  products: () =>
    hasAnyPermission(
      "can_view_products",
      "can_view_catalogs",
    ),

  // Mantenedor
  maintenance: () => hasAnyPermission("can_manage_catalogs"),

  // Proveedores
  suppliers: () =>
    hasAnyPermission(
      "can_view_suppliers",
    ),

  // Inventario
  inventory: () =>
    hasAnyPermission(
      "can_view_inventory",
      "can_view_warehouses",
    ),

  // Compras
  purchasing: () =>
    hasAnyPermission(
      "can_view_supply_requests",
      "can_view_purchase_orders",
      "can_view_purchase_receipts",
      "can_view_supplier_claims",
    ),

  // Traspasos
  transfers: () => hasAnyPermission("can_view_transfers"),

  // Finanzas
  finance: () => hasAnyPermission("can_view_finance"),

  // Evaluaciones
  evaluations: () => hasAnyPermission("can_view_evaluations"),

  // Reportes
  reports: () => hasAnyPermission("can_view_reports"),

  // Documentos
  documents: () =>
    hasAnyPermission("can_manage_purchase_orders", "can_manage_inventory"),

  // Notificaciones
  notifications: () => true,

  // Usuarios
  users: () =>
    hasAnyPermission(
      "can_view_users",
      "can_create_users",
      "can_edit_users",
      "can_delete_users",
    ),

  // Roles
  roles: () =>
    hasAnyPermission(
      "can_view_roles",
      "can_create_roles",
      "can_edit_roles",
      "can_delete_roles",
    ),

  // Auditoría
  audit: () => hasAnyPermission("can_view_audit"),

  // Carga de documentos
  "document-preview": () => hasAnyPermission("can_access_document_preview"),
};

// Grupos con solo los ítems que el usuario tiene permiso de ver
const visibleGroups = computed(() =>
  GROUPS.map((g) => ({
    ...g,
    items: g.keys
      .map((k) => itemMap.value[k])
      .filter((item) => item && (VISIBILITY[item.key]?.() ?? true)),
  })).filter((g) => g.items.length > 0),
);

function isActive(path) {
  return route.path === path || route.path.startsWith(path + "/");
}
</script>

<template>
  <nav
    :class="[
      'bg-card border-r border-border h-screen transition-all duration-300 flex flex-col',
      { 'w-16': collapsed, 'w-64': !collapsed },
    ]"
    @mouseenter="collapsed = false"
    @mouseleave="collapsed = true"
  >
    <!-- HEADER -->
    <div
      class="h-16 flex items-center justify-center px-4 border-b border-border bg-card"
    >
      <div class="h-8">
        <BrandLogo />
      </div>
    </div>

    <!-- MENU con grupos -->
    <div class="flex-1 overflow-y-auto py-4">
      <template v-for="group in visibleGroups" :key="group.key">
        <!-- Cabecera del grupo (solo en modo expandido) -->
        <button
          v-show="!collapsed"
          class="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-primary"
          @click="toggleGroup(group.key)"
        >
          <span>{{ group.label }}</span>
          <ChevronDown
            :size="13"
            :class="[
              'transition-transform duration-200',
              { 'rotate-180': groupOpen[group.key] },
            ]"
          />
        </button>

        <!-- Separador en modo colapsado -->
        <div v-show="collapsed" class="my-2 border-t border-border" />

        <!-- Ítems del grupo -->
        <template v-if="collapsed || groupOpen[group.key]">
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            :class="[
              'flex items-center px-4 py-2 text-sm transition-all border-r-2',
              isActive(item.path)
                ? 'bg-primary/10 text-primary font-semibold border-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent',
            ]"
            :title="collapsed ? item.label : undefined"
            @click="$emit('navigate')"
          >
            <component
              :is="item.icon"
              :size="18"
              class="shrink-0"
              :class="item.color"
            />
            <span v-show="!collapsed" class="ml-3">{{ item.label }}</span>
          </RouterLink>
        </template>
      </template>
    </div>

    <!-- TOGGLE collapse (ahora es solo indicador o se puede ocultar si es molesto) -->
    <div
      class="h-12 flex items-center justify-center border-t border-border text-muted-foreground"
    >
      <component :is="collapsed ? PanelLeftOpen : PanelLeftClose" :size="18" />
    </div>
  </nav>
</template>
