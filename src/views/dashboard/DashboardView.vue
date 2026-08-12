<template>
  <section class="space-y-6">
    <!-- Cabecera -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Dashboard</h1>
        <p class="text-sm text-muted-foreground">Resumen operacional en tiempo real</p>
      </div>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <!-- Skeleton mientras carga -->
    <div v-if="loading && !data" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="h-24 rounded-lg bg-muted animate-pulse" />
    </div>

    <template v-else>
      <!-- ── Sección Inventario ── -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
          <Activity :size="15" />
          Inventario
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-100 text-blue-600 shrink-0">
              <Package :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Ítems en stock</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.inventory?.stock_items) }}</strong>
              <span class="text-xs text-muted-foreground">Posiciones en bodega</span>
            </div>
          </article>

          <article :class="['relative flex items-start gap-4 p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow', data?.inventory?.low_stock_count > 0 ? 'bg-amber-100 border-amber-200' : 'bg-card border-border']">
            <div :class="['flex items-center justify-center w-11 h-11 rounded-xl shrink-0', data?.inventory?.low_stock_count > 0 ? 'bg-white text-amber-600' : 'bg-muted text-muted-foreground']">
              <AlertTriangle :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Stock bajo</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.inventory?.low_stock_count) }}</strong>
              <span class="text-xs text-muted-foreground">Productos por reponer</span>
            </div>
            <span v-if="data?.inventory?.low_stock_count > 0" class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white border border-amber-700">
              Acción requerida
            </span>
          </article>

          <article :class="['relative flex items-start gap-4 p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow', data?.inventory?.expiring_soon_count > 0 ? 'bg-purple-100 border-purple-200' : 'bg-card border-border']">
            <div :class="['flex items-center justify-center w-11 h-11 rounded-xl shrink-0', data?.inventory?.expiring_soon_count > 0 ? 'bg-white text-purple-600' : 'bg-muted text-muted-foreground']">
              <TrendingUp :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Lotes por vencer</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.inventory?.expiring_soon_count) }}</strong>
              <span class="text-xs text-muted-foreground">Próximos 30 días</span>
            </div>
            <span v-if="data?.inventory?.expiring_soon_count > 0" class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white border border-purple-700">
              Revisar
            </span>
          </article>


          <article :class="['relative flex items-start gap-4 p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow', data?.inventory?.low_stock_count > 0 ? 'bg-pastel-yellow border-amber-200' : 'bg-card border-border']">
            <div :class="['flex items-center justify-center w-11 h-11 rounded-xl shrink-0', data?.inventory?.low_stock_count > 0 ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground']">
              <AlertTriangle :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Stock bajo</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.inventory?.low_stock_count) }}</strong>
              <span class="text-xs text-muted-foreground">Productos por reponer</span>
            </div>
            <span v-if="data?.inventory?.low_stock_count > 0" class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Acción requerida
            </span>
          </article>

          <article :class="['relative flex items-start gap-4 p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow', data?.inventory?.expiring_soon_count > 0 ? 'bg-pastel-purple border-purple-200' : 'bg-card border-border']">
            <div :class="['flex items-center justify-center w-11 h-11 rounded-xl shrink-0', data?.inventory?.expiring_soon_count > 0 ? 'bg-purple-100 text-purple-600' : 'bg-muted text-muted-foreground']">
              <TrendingUp :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Lotes por vencer</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.inventory?.expiring_soon_count) }}</strong>
              <span class="text-xs text-muted-foreground">Próximos 30 días</span>
            </div>
            <span v-if="data?.inventory?.expiring_soon_count > 0" class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Revisar
            </span>
          </article>

        </div>
      </div>

      <!-- ── Sección Compras ── -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
          <ShoppingCart :size="15" />
          Compras
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-purple-100 text-purple-600 shrink-0">
              <ClipboardList :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Solicitudes pendientes</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.purchasing?.supply_requests_pending) }}</strong>
              <span class="text-xs text-muted-foreground">De {{ fmt(data?.purchasing?.supply_requests_total) }} totales</span>
            </div>
          </article>

          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-100 text-blue-600 shrink-0">
              <ShoppingCart :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Órdenes activas</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.purchasing?.purchase_orders_pending) }}</strong>
              <span class="text-xs text-muted-foreground">De {{ fmt(data?.purchasing?.purchase_orders_total) }} totales</span>
            </div>
          </article>

          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-teal-100 text-teal-600 shrink-0">
              <Truck :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Recepciones pendientes</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.purchasing?.pending_receipts) }}</strong>
              <span class="text-xs text-muted-foreground">Por recibir en bodega</span>
            </div>
          </article>

        </div>
      </div>

      <!-- ── Sección Finanzas ── -->
      <div v-if="data?.finance" class="space-y-4">
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
          <DollarSign :size="15" />
          Finanzas
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-green-100 text-green-600 shrink-0">
              <DollarSign :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Facturas pendientes</span>
              <strong class="text-xl font-extrabold text-foreground">
                {{ fmt(data.finance.total_invoiced_amount - data.finance.total_paid_amount, true) }}
              </strong>
              <span class="text-xs text-muted-foreground">{{ fmt(data.finance.supplier_invoices_pending) }} facturas por pagar</span>
            </div>
          </article>

          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
              <TrendingUp :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Total facturado</span>
              <strong class="text-xl font-extrabold text-foreground">{{ fmt(data.finance.total_invoiced_amount, true) }}</strong>
              <span class="text-xs text-muted-foreground">{{ fmt(data.finance.supplier_invoices_total) }} facturas</span>
            </div>
          </article>


          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-pastel-blue text-blue-600 shrink-0">
              <ShoppingCart :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Órdenes activas</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.purchasing?.purchase_orders_pending) }}</strong>
              <span class="text-xs text-muted-foreground">De {{ fmt(data?.purchasing?.purchase_orders_total) }} totales</span>
            </div>
          </article>

          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-pastel-teal text-teal-600 shrink-0">
              <Truck :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Recepciones pendientes</span>
              <strong class="text-3xl font-extrabold text-foreground">{{ fmt(data?.purchasing?.pending_receipts) }}</strong>
              <span class="text-xs text-muted-foreground">Por recibir en bodega</span>
            </div>
          </article>

        </div>
      </div>

      <!-- ── Sección Finanzas ── -->
      <div v-if="data?.finance" class="space-y-4">
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
          <DollarSign :size="15" />
          Finanzas
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-pastel-green text-emerald-600 shrink-0">
              <DollarSign :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Facturas pendientes</span>
              <strong class="text-xl font-extrabold text-foreground">
                {{ fmt(data.finance.total_invoiced_amount - data.finance.total_paid_amount, true) }}
              </strong>
              <span class="text-xs text-muted-foreground">{{ fmt(data.finance.supplier_invoices_pending) }} facturas por pagar</span>
            </div>
          </article>

          <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-pastel-blue text-blue-600 shrink-0">
              <TrendingUp :size="22" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-muted-foreground truncate">Total facturado</span>
              <strong class="text-xl font-extrabold text-foreground">{{ fmt(data.finance.total_invoiced_amount, true) }}</strong>
              <span class="text-xs text-muted-foreground">{{ fmt(data.finance.supplier_invoices_total) }} facturas</span>
            </div>
          </article>

        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Package, ShoppingCart, Truck, AlertTriangle, ClipboardList,
  DollarSign, TrendingUp, Activity,
} from 'lucide-vue-next'
import { dashboardApi } from '@/api/dashboard.api'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { useRefresh } from '@/composables/useRefresh'
import AppAlert from '@/components/common/AppAlert.vue'

const loading = ref(true)
const error   = ref(null)
const data    = ref(null)
const { setRefreshFunction, clearRefreshFunction } = useRefresh()

async function loadData() {
  loading.value = true
  error.value   = null
  try {
    const res = await dashboardApi.getSummary()
    data.value = res.data?.data ?? res.data
  } catch {
    error.value = 'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
  setRefreshFunction(loadData)
})

onUnmounted(clearRefreshFunction)
useAutoRefresh(loadData)

function fmt(val, isCurrency = false) {
  if (val == null) return '—'
  if (isCurrency) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
    }).format(val)
  }
  return new Intl.NumberFormat('es-CL').format(val)
}
</script>
