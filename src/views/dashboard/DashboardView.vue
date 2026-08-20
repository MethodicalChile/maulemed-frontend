<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import {
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  ClipboardList,
  DollarSign,
  TrendingUp,
  Activity,
} from "lucide-vue-next";
import { dashboardApi } from "@/api/dashboard.api";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useRefresh } from "@/composables/useRefresh";
import AppAlert from "@/components/common/AppAlert.vue";
import SummaryCard from "@/components/dashboard/SummaryCard.vue";
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const loading = ref(true);
const error = ref(null);
const data = ref<any>(null);

const chartData = computed(() => ({
  labels: ['Compras', 'Inventario', 'Finanzas'],
  datasets: [{ 
      label: 'Resumen Operacional', 
      data: [data.value?.purchasing?.purchase_orders_total || 0, 10, 20], 
      backgroundColor: '#3b82f6' 
  }]
}));

const chartOptions = { responsive: true };

const { setRefreshFunction, clearRefreshFunction } = useRefresh();


async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const res = await dashboardApi.getSummary();
    data.value = res.data?.data ?? res.data;
  } catch {
    error.value =
      "No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
  setRefreshFunction(loadData);
});

onUnmounted(clearRefreshFunction);
useAutoRefresh(loadData);

function fmt(val: any, isCurrency = false): string {
  if (val == null) return "—";
  if (isCurrency) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(val);
  }
  return new Intl.NumberFormat("es-CL").format(val);
}
</script>

<template>
  <section class="space-y-6">
    <!-- Cabecera -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Dashboard</h1>
        <p class="text-sm text-muted-foreground">
          Resumen operacional en tiempo real
        </p>
      </div>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <!-- Skeleton mientras carga -->
    <div
      v-if="loading && !data"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="h-24 rounded-lg bg-muted animate-pulse"
      />
    </div>

    <template v-else>
      <!-- Chart Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="p-4 rounded-lg border border-border bg-card shadow-sm">
            <h2 class="text-sm font-bold uppercase text-muted-foreground mb-4">Resumen Operacional</h2>
            <Bar :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <!-- ── Sección Inventario ── -->
      <div class="space-y-4">
        <div
          class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1"
        >
          <Activity :size="15" />
          Inventario
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryCard 
            title="Ítems en stock" 
            :value="fmt(data?.inventory?.stock_items)"
            subtitle="Posiciones en bodega"
            :icon="Package"
            color-class="text-blue-600"
            icon-bg-class="bg-blue-100"
          />
          
          <SummaryCard 
            title="Stock bajo" 
            :value="fmt(data?.inventory?.low_stock_count)"
            subtitle="Productos por reponer"
            :icon="AlertTriangle"
            :class="data?.inventory?.low_stock_count > 0 ? 'bg-amber-100 border-amber-200' : ''"
            color-class="text-amber-600"
            icon-bg-class="bg-white"
          />

          <SummaryCard 
            title="Lotes por vencer" 
            :value="fmt(data?.inventory?.expiring_soon_count)"
            subtitle="Próximos 30 días"
            :icon="TrendingUp"
            :class="data?.inventory?.expiring_soon_count > 0 ? 'bg-purple-100 border-purple-200' : ''"
            color-class="text-purple-600"
            icon-bg-class="bg-white"
          />
        </div>
      </div>

      <!-- ... resto del dashboard ... -->
    </template>
  </section>
</template>
