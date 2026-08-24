<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, History, RefreshCw } from "lucide-vue-next";
import { Line } from "vue-chartjs";
import { useRefresh } from "@/composables/useRefresh";

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from "chart.js";

import "chartjs-adapter-date-fns";

import { suppliersApi } from "@/api/suppliers.api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const route = useRoute();
const router = useRouter();
const { setRefreshFunction, clearRefreshFunction } = useRefresh();

const loading = ref(false);
const error = ref("");
const product = ref(null);
const series = ref([]);

const formatCurrency = (value, currency = "CLP") => {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(numericValue);
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
  }).format(new Date(value));
};

const chartData = computed(() => ({
  datasets: series.value.map((supplierSeries) => ({
    label: supplierSeries.supplier_name,
    data: supplierSeries.points.map((point) => ({
      x: point.date,
      y: Number(point.price),
    })),
    stepped: true,
    tension: 0,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    fill: false,
  })),
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "nearest",
    axis: "x",
    intersect: false,
  },
  plugins: {
    legend: {
      position: "bottom",
    },
    tooltip: {
      callbacks: {
        label(context) {
          const supplier = series.value[context.datasetIndex];
          const value = context.parsed.y;

          return `${supplier.supplier_name}: ${formatCurrency(
            value,
            supplier.currency,
          )}`;
        },
      },
    },
  },
  scales: {
    x: {
      type: "time",
      time: {
        unit: "month",
        tooltipFormat: "dd/MM/yyyy",
      },
      title: {
        display: true,
        text: "Fecha",
      },
    },
    y: {
      beginAtZero: false,
      title: {
        display: true,
        text: "Precio",
      },
      ticks: {
        callback(value) {
          return new Intl.NumberFormat("es-CL").format(value);
        },
      },
    },
  },
}));

const hasData = computed(() =>
  series.value.some((item) => item.points.length > 0),
);

const loadPriceHistory = async () => {
  loading.value = true;
  error.value = "";

  try {
    const response = await suppliersApi.getProductPriceHistory(
      route.params.uuid,
    );

    const data = response.data?.data ?? response.data;
    product.value = data.product;
    series.value = data.series ?? [];
  } catch (requestError) {
    console.error(requestError);

    error.value =
      requestError.response?.data?.detail ||
      "No fue posible cargar el historial de precios.";
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push("/products");
};

onMounted(async () => {
  await loadPriceHistory();
  setRefreshFunction(loadPriceHistory);
});
onUnmounted(clearRefreshFunction);
</script>

<template>
  <div class="p-6 space-y-6">
    <header class="flex items-center justify-between">
      <button
        type="button"
        class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        @click="goBack"
      >
        <ArrowLeft :size="16" />
        Volver a productos
      </button>

      <button
        type="button"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        :disabled="loading"
        @click="loadPriceHistory"
      >
        <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
        Actualizar
      </button>
    </header>

    <div v-if="error" class="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive">
      {{ error }}
    </div>

    <div v-else-if="loading" class="flex justify-center p-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <template v-else>
      <div class="flex items-start gap-4">
        <div class="p-3 bg-primary/10 text-primary rounded-xl">
          <History :size="24" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-foreground">Historial de precios</h1>
          <p v-if="product" class="text-muted-foreground mt-1">
            {{ product.name }}
            <span v-if="product.sku" class="font-medium"> · SKU {{ product.sku }} </span>
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="item in series"
          :key="item.supplier_product_uuid"
          class="bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <h3 class="font-semibold text-lg">{{ item.supplier_name }}</h3>
          <p v-if="item.supplier_sku" class="text-sm text-muted-foreground mb-4">
            Código: {{ item.supplier_sku }}
          </p>
          <div class="text-2xl font-bold text-primary mb-2">
            {{ formatCurrency(item.current_price, item.currency) }}
          </div>
          <p class="text-sm text-muted-foreground">
            {{
              item.points.length > 1
                ? `${item.points.length - 1} cambios registrados`
                : "Sin cambios registrados"
            }}
          </p>
        </article>
      </div>

      <article v-if="hasData" class="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 class="text-lg font-semibold mb-6">Evolución por proveedor</h2>
        <div class="h-80">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </article>

      <article v-else class="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        No existen precios registrados para este producto.
      </article>

      <article v-if="series.length" class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <h2 class="text-lg font-semibold p-6 border-b border-border">Detalle de precios</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-6 py-3 text-left font-medium text-muted-foreground">Proveedor</th>
                <th class="px-6 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th class="px-6 py-3 text-right font-medium text-muted-foreground">Precio</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <template
                v-for="item in series"
                :key="item.supplier_product_uuid"
              >
                <tr
                  v-for="point in item.points.filter(
                    (entry) => !entry.is_projection,
                  )"
                  :key="`${item.supplier_product_uuid}-${point.date}`"
                  class="hover:bg-muted/30"
                >
                  <td class="px-6 py-4 font-medium">{{ item.supplier_name }}</td>
                  <td class="px-6 py-4 text-muted-foreground">{{ formatDate(point.date) }}</td>
                  <td class="px-6 py-4 text-right font-semibold">
                    {{ formatCurrency(point.price, point.currency) }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </article>
    </template>
  </div>
</template>
