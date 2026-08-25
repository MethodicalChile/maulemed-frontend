<script setup>
// Tablero ejecutivo.
//
// Todo lo que las fases anteriores construyeron —el devengado, la caja, la deuda
// institucional, el presupuesto comprometido, el estado de cada compra— pasa por
// aquí. Cada bloque está en la forma que su dato pide, no en la que se veía más
// vistosa: los seis titulares son tarjetas, la evolución es una línea de un solo
// eje, el ranking por sociedad es una barra de una sola tonalidad, la antigüedad
// es una rampa ordenada y el presupuesto son medidores.
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  AlertTriangle,
  CalendarClock,
  Landmark,
  PiggyBank,
  TrendingUp,
  Truck,
  Wallet,
  Zap,
} from "lucide-vue-next";

import { dashboardApi } from "@/api/dashboard.api";
import { optionsApi } from "@/api/options.api";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useRefresh } from "@/composables/useRefresh";
import { money, number, useChartTheme } from "@/composables/useChartTheme";

import AppAlert from "@/components/common/AppAlert.vue";
import ChartCard from "@/components/dashboard/ChartCard.vue";
import DonutChart from "@/components/dashboard/DonutChart.vue";
import MeterRow from "@/components/dashboard/MeterRow.vue";
import RankBar from "@/components/dashboard/RankBar.vue";
import StackedBar from "@/components/dashboard/StackedBar.vue";
import StatTile from "@/components/dashboard/StatTile.vue";
import TrendChart from "@/components/dashboard/TrendChart.vue";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();
const { theme } = useChartTheme();

const loading = ref(true);
const error = ref(null);
const data = ref(null);

const months = ref(12);
const legalEntity = ref("");
const legalEntities = ref([]);

const PERIODOS = [
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
  { value: 24, label: "24 meses" },
];

const saludo = computed(() => {
  const hora = new Date().getHours();
  const momento =
    hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const nombre = authStore.user?.first_name || authStore.user?.username || "";
  return nombre ? `${momento}, ${nombre}` : momento;
});

const access = computed(() => data.value?.access ?? {});
const kpis = computed(() => data.value?.kpis ?? {});
const revenue = computed(() => data.value?.revenue);
const budget = computed(() => data.value?.budget);
const purchasing = computed(() => data.value?.purchasing);
const inventory = computed(() => data.value?.inventory);

// ── Carga ───────────────────────────────────────────────────────────────────

async function load() {
  error.value = null;
  try {
    const res = await dashboardApi.getExecutive({
      months: months.value,
      ...(legalEntity.value ? { legal_entity: legalEntity.value } : {}),
    });
    data.value = res.data?.data ?? res.data;
  } catch {
    error.value =
      "No se pudo cargar el tablero. Revisa la conexión o intenta de nuevo.";
  } finally {
    loading.value = false;
  }
}

async function loadEntities() {
  try {
    const res = await optionsApi.getLegalEntities();
    legalEntities.value = res?.data?.data ?? [];
  } catch {
    legalEntities.value = [];
  }
}

watch([months, legalEntity], load);

const { setRefreshFunction, clearRefreshFunction } = useRefresh();

onMounted(() => {
  load();
  loadEntities();
  setRefreshFunction(load);
});
onUnmounted(clearRefreshFunction);
useAutoRefresh(load);

// ── Tendencia ───────────────────────────────────────────────────────────────

const trendLabels = computed(() =>
  (revenue.value?.trend ?? []).map((p) => p.label),
);

// Devengado, recaudado y gasto comparten unidad —son pesos— así que van en un
// solo eje. Si alguna no lo compartiera, iría en otro gráfico, nunca en un
// segundo eje.
const trendSeries = computed(() => {
  const t = revenue.value?.trend ?? [];
  const c = theme.value.categorical;
  return [
    {
      label: "Ingreso devengado",
      data: t.map((p) => p.revenue),
      color: c[0],
      fill: true,
    },
    {
      label: "Recaudado en caja",
      data: t.map((p) => p.collected),
      color: c[2],
    },
    { label: "Gasto en compras", data: t.map((p) => p.expense), color: c[1] },
  ];
});

const trendLegend = computed(() =>
  trendSeries.value.map((s) => ({ label: s.label, color: s.color })),
);

// ── Ingreso por sociedad ────────────────────────────────────────────────────

const byEntity = computed(() =>
  (revenue.value?.by_legal_entity ?? []).slice(0, 8),
);

// ── Medios de pago ──────────────────────────────────────────────────────────

const paymentSegments = computed(() => {
  const m = revenue.value?.payment_methods ?? {};
  const c = theme.value.categorical;
  return [
    { label: "Débito", value: m.debito ?? 0, color: c[0] },
    { label: "Efectivo", value: m.efectivo ?? 0, color: c[2] },
    { label: "Crédito", value: m.credito ?? 0, color: c[1] },
    { label: "Cheque", value: m.cheque ?? 0, color: c[3] },
  ];
});

const paymentLegend = computed(() =>
  paymentSegments.value
    .filter((s) => s.value > 0)
    .map((s) => ({ label: s.label, color: s.color })),
);

// ── Antigüedad de la cobranza ───────────────────────────────────────────────

// Los tramos son una escala ordenada, no categorías: la rampa dice "más oscuro
// es más viejo" sin que haya que leer la leyenda. "Sin fecha" queda en gris
// porque no pertenece a la escala — es deuda que nadie sabe cuándo vencía.
const AGING_BUCKETS = [
  "Sin vencer",
  "1-30",
  "31-60",
  "61-90",
  "90+",
  "Sin fecha",
];

const agingRows = computed(() =>
  (revenue.value?.receivable_aging ?? []).slice(0, 6),
);

const agingSeries = computed(() => {
  const rampa = theme.value.sequential;
  return AGING_BUCKETS.map((bucket, i) => ({
    label: bucket,
    data: agingRows.value.map((r) => r.buckets?.[bucket] ?? 0),
    color:
      bucket === "Sin fecha"
        ? theme.value.status.neutral
        : (rampa[i + 1] ?? rampa[5]),
  }));
});

const agingLegend = computed(() =>
  agingSeries.value.map((s) => ({ label: s.label, color: s.color })),
);

// ── Compras ─────────────────────────────────────────────────────────────────

// Estados: la paleta de estado está reservada justo para esto, y siempre con la
// etiqueta al lado, nunca color solo.
const PIPELINE_TONE = {
  draft: "neutral",
  in_review: "warning",
  approved: "good",
  closed: "good",
  rejected: "critical",
};

const pipelineSeries = computed(() => {
  const grupos = purchasing.value?.purchase_orders ?? [];
  const solicitudes = purchasing.value?.supply_requests ?? [];
  return grupos.map((g) => {
    const s = solicitudes.find((x) => x.key === g.key);
    return {
      label: g.label,
      data: [s?.count ?? 0, g.count],
      color: theme.value.status[PIPELINE_TONE[g.key] ?? "neutral"],
    };
  });
});

const pipelineLegend = computed(() =>
  pipelineSeries.value
    .filter((s) => s.data.some((v) => v > 0))
    .map((s) => ({ label: s.label, color: s.color })),
);

const hasPipeline = computed(() =>
  pipelineSeries.value.some((s) => s.data.some((v) => v > 0)),
);

// ── KPI ─────────────────────────────────────────────────────────────────────

const tiles = computed(() => {
  const k = kpis.value;
  const c = theme.value.categorical;
  const s = theme.value.status;
  const out = [];

  if (k.revenue_accrued) {
    out.push({
      key: "devengado",
      label: "Ingreso devengado",
      hint: "Mes en curso",
      accent: c[0],
      icon: TrendingUp,
      ...k.revenue_accrued,
    });
  }
  if (k.revenue_collected) {
    out.push({
      key: "caja",
      label: "Recaudado en caja",
      hint: "Mes en curso",
      accent: c[2],
      icon: Wallet,
      ...k.revenue_collected,
    });
  }
  if (k.receivable_pending) {
    out.push({
      key: "deuda",
      label: "Deuda institucional",
      hint: "Pendiente de cobro",
      accent: c[1],
      icon: Landmark,
      invertDelta: true,
      ...k.receivable_pending,
    });
  }
  if (k.budget_execution) {
    out.push({
      key: "presupuesto",
      label: "Ejecución presupuestaria",
      hint: "Comprometido más consumido",
      accent: c[4],
      icon: PiggyBank,
      ...k.budget_execution,
    });
  }
  if (k.extraordinary_pct) {
    out.push({
      key: "extraordinarias",
      label: "Compras extraordinarias",
      hint: "Urgentes y de gerencia",
      accent: s.warning,
      icon: Zap,
      invertDelta: true,
      ...k.extraordinary_pct,
    });
  }
  if (k.pending_receipts) {
    out.push({
      key: "recepciones",
      label: "Órdenes por recibir",
      hint: "Aprobadas y en camino",
      accent: c[5],
      icon: Truck,
      ...k.pending_receipts,
    });
  }
  if (k.low_stock) {
    out.push({
      key: "quiebres",
      label: "Productos bajo umbral",
      hint: "Con alerta activa",
      accent: s.critical,
      icon: AlertTriangle,
      invertDelta: true,
      ...k.low_stock,
    });
  }
  if (k.expiring_lots) {
    out.push({
      key: "vencimientos",
      label: "Lotes por vencer",
      hint: "Próximos 30 días",
      accent: s.serious,
      icon: CalendarClock,
      invertDelta: true,
      ...k.expiring_lots,
    });
  }

  return out;
});
</script>

<template>
  <section class="space-y-6">
    <!-- ── Cabecera y filtros ── -->
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground tracking-tight">
          {{ saludo }}
        </h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Así va la operación de MauleMed
        </p>
      </div>

      <div class="flex items-center gap-2">
        <select
          v-model="legalEntity"
          class="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground"
          aria-label="Razón social"
        >
          <option value="">Todas las sociedades</option>
          <option v-for="le in legalEntities" :key="le.uuid" :value="le.uuid">
            {{ le.label ?? le.name }}
          </option>
        </select>

        <div class="flex rounded-lg border border-border overflow-hidden">
          <button
            v-for="p in PERIODOS"
            :key="p.value"
            :class="[
              'px-3 h-9 text-xs font-semibold transition-colors',
              months === p.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground',
            ]"
            @click="months = p.value"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </header>

    <AppAlert v-if="error" type="error" :message="error" />

    <!-- ── Esqueleto ── -->
    <div v-if="loading && !data" class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="i in 8"
          :key="i"
          class="h-28 rounded-xl bg-muted animate-pulse"
        />
      </div>
      <div class="h-80 rounded-xl bg-muted animate-pulse" />
    </div>

    <template v-else-if="data">
      <!-- ── Fila de titulares ── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          v-for="tile in tiles"
          :key="tile.key"
          :label="tile.label"
          :value="tile.value"
          :unit="tile.unit"
          :delta-pct="tile.delta_pct"
          :sparkline="tile.sparkline"
          :hint="tile.hint"
          :accent="tile.accent"
          :icon="tile.icon"
          :invert-delta="tile.invertDelta"
        />
      </div>

      <!-- ── Evolución ── -->
      <ChartCard
        v-if="revenue"
        title="Ingreso, caja y gasto"
        subtitle="La diferencia entre lo devengado y lo recaudado es la deuda institucional"
        :legend="trendLegend"
        legend-below
        height="h-80"
      >
        <TrendChart
          :labels="trendLabels"
          :series="trendSeries"
          :theme="theme"
        />

        <template #table>
          <table class="w-full text-xs">
            <thead class="text-muted-foreground text-left">
              <tr>
                <th class="py-1.5 pr-4 font-semibold">Mes</th>
                <th class="py-1.5 pr-4 font-semibold text-right">Devengado</th>
                <th class="py-1.5 pr-4 font-semibold text-right">Recaudado</th>
                <th class="py-1.5 font-semibold text-right">Gasto</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in revenue.trend"
                :key="p.month"
                class="border-t border-border"
              >
                <td class="py-1.5 pr-4">{{ p.label }}</td>
                <td class="py-1.5 pr-4 text-right tabular-nums">
                  {{ money(p.revenue) }}
                </td>
                <td class="py-1.5 pr-4 text-right tabular-nums">
                  {{ money(p.collected) }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ money(p.expense) }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </ChartCard>

      <!-- ── Sociedad · medios de pago · presupuesto ── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          v-if="revenue"
          title="Ingreso por razón social"
          subtitle="La apertura que hoy se rehace a mano"
        >
          <RankBar
            :labels="byEntity.map((e) => e.name)"
            :values="byEntity.map((e) => e.amount)"
            :theme="theme"
          />
          <template #table>
            <table class="w-full text-xs">
              <thead class="text-muted-foreground text-left">
                <tr>
                  <th class="py-1.5 pr-4 font-semibold">Razón social</th>
                  <th class="py-1.5 pr-4 font-semibold text-right">
                    Prestaciones
                  </th>
                  <th class="py-1.5 font-semibold text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="e in byEntity"
                  :key="e.uuid"
                  class="border-t border-border"
                >
                  <td class="py-1.5 pr-4">{{ e.name }}</td>
                  <td class="py-1.5 pr-4 text-right tabular-nums">
                    {{ number(e.entries) }}
                  </td>
                  <td class="py-1.5 text-right tabular-nums">
                    {{ money(e.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </ChartCard>

        <ChartCard
          v-if="revenue"
          title="Medios de pago"
          subtitle="Lo que entra por tarjeta paga comisión y se abona con desfase"
          :legend="paymentLegend"
          legend-below
        >
          <DonutChart
            :segments="paymentSegments"
            :theme="theme"
            center-label="Recaudado"
          />
          <template #table>
            <table class="w-full text-xs">
              <tbody>
                <tr
                  v-for="s in paymentSegments"
                  :key="s.label"
                  class="border-t border-border"
                >
                  <td class="py-1.5 pr-4">{{ s.label }}</td>
                  <td class="py-1.5 text-right tabular-nums">
                    {{ money(s.value) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </ChartCard>

        <ChartCard
          v-if="budget"
          title="Ejecución presupuestaria"
          :subtitle="`Mes en curso · ${budget.execution_pct ?? 0} % del total`"
          :has-table="false"
        >
          <MeterRow
            v-if="budget.lines.length"
            :lines="budget.lines"
            :theme="theme"
          />
          <p v-else class="text-xs text-muted-foreground">
            Sin presupuesto cargado para el mes en curso.
          </p>
        </ChartCard>
      </div>

      <!-- ── Cobranza y compras ── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          v-if="revenue"
          title="Antigüedad de la cobranza"
          subtitle="De sin vencer a más de 90 días"
          :legend="agingLegend"
          legend-below
          height="h-72"
          class="lg:col-span-2"
        >
          <StackedBar
            v-if="agingRows.length"
            :labels="agingRows.map((r) => r.financier)"
            :series="agingSeries"
            :theme="theme"
          />
          <p v-else class="text-xs text-muted-foreground">
            Sin deuda institucional pendiente.
          </p>

          <template #table>
            <table class="w-full text-xs">
              <thead class="text-muted-foreground text-left">
                <tr>
                  <th class="py-1.5 pr-3 font-semibold">Financiador</th>
                  <th
                    v-for="b in AGING_BUCKETS"
                    :key="b"
                    class="py-1.5 pr-3 font-semibold text-right"
                  >
                    {{ b }}
                  </th>
                  <th class="py-1.5 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in agingRows"
                  :key="r.financier"
                  class="border-t border-border"
                >
                  <td class="py-1.5 pr-3">{{ r.financier }}</td>
                  <td
                    v-for="b in AGING_BUCKETS"
                    :key="b"
                    class="py-1.5 pr-3 text-right tabular-nums"
                  >
                    {{ r.buckets[b] ? money(r.buckets[b]) : "—" }}
                  </td>
                  <td class="py-1.5 text-right tabular-nums font-semibold">
                    {{ money(r.total_pending) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </ChartCard>

        <ChartCard
          v-if="purchasing"
          title="Estado de las compras"
          subtitle="Por fase del ciclo"
          :legend="pipelineLegend"
          legend-below
          height="h-64"
          :has-table="false"
        >
          <StackedBar
            v-if="hasPipeline"
            :labels="['Solicitudes', 'Órdenes']"
            :series="pipelineSeries"
            :theme="theme"
            :currency="false"
            :horizontal="false"
          />
          <p v-else class="text-xs text-muted-foreground">
            Sin solicitudes ni órdenes en el período.
          </p>
        </ChartCard>
      </div>

      <!-- ── Proveedores y vencimientos ── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section
          v-if="purchasing"
          class="rounded-xl border border-border bg-card overflow-hidden"
        >
          <header class="px-5 pt-4 pb-3 border-b border-border">
            <h2 class="text-sm font-bold text-foreground">
              Proveedores por gasto
            </h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Facturado en el período
            </p>
          </header>
          <div class="p-5 pt-3 overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="text-muted-foreground text-left">
                <tr>
                  <th class="py-1.5 pr-4 font-semibold">Proveedor</th>
                  <th class="py-1.5 pr-4 font-semibold text-right">Facturas</th>
                  <th class="py-1.5 font-semibold text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="s in purchasing.top_suppliers"
                  :key="s.uuid ?? s.name"
                  class="border-t border-border"
                >
                  <td class="py-2 pr-4 text-foreground">{{ s.name }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums">
                    {{ s.invoices }}
                  </td>
                  <td class="py-2 text-right tabular-nums font-semibold">
                    {{ money(s.amount) }}
                  </td>
                </tr>
                <tr v-if="!purchasing.top_suppliers.length">
                  <td colspan="3" class="py-3 text-muted-foreground">
                    Sin facturas en el período.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          v-if="inventory"
          class="rounded-xl border border-border bg-card overflow-hidden"
        >
          <header class="px-5 pt-4 pb-3 border-b border-border">
            <h2 class="text-sm font-bold text-foreground">Lotes por vencer</h2>
            <p class="text-xs text-muted-foreground mt-0.5">Próximos 30 días</p>
          </header>
          <div class="p-5 pt-3 overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="text-muted-foreground text-left">
                <tr>
                  <th class="py-1.5 pr-4 font-semibold">Producto</th>
                  <th class="py-1.5 pr-4 font-semibold">Bodega</th>
                  <th class="py-1.5 pr-4 font-semibold text-right">Cantidad</th>
                  <th class="py-1.5 font-semibold text-right">Vence en</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="l in inventory.expiring_lots"
                  :key="`${l.product}-${l.lot_number}`"
                  class="border-t border-border"
                >
                  <td class="py-2 pr-4 text-foreground">{{ l.product }}</td>
                  <td class="py-2 pr-4">{{ l.warehouse }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums">
                    {{ number(l.quantity) }}
                  </td>
                  <td
                    class="py-2 text-right tabular-nums font-semibold"
                    :style="{
                      color:
                        l.days_left <= 7
                          ? theme.status.critical
                          : theme.status.warning,
                    }"
                  >
                    {{ l.days_left }} días
                  </td>
                </tr>
                <tr v-if="!inventory.expiring_lots.length">
                  <td colspan="4" class="py-3 text-muted-foreground">
                    Ningún lote vence en los próximos 30 días.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Sin permiso no es lo mismo que sin datos -->
      <p
        v-if="!access.finance && !access.purchasing && !access.inventory"
        class="text-sm text-muted-foreground"
      >
        Tu rol no tiene acceso a los módulos que alimentan el tablero.
      </p>
    </template>
  </section>
</template>
