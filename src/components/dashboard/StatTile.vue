<script setup>
// Un número de titular con su variación y su chispa.
//
// Seis números de titular son una fila de tarjetas, no un gráfico de barras
// agrupadas: la comparación entre ellos no significa nada —son magnitudes
// distintas— y ponerlos en un mismo eje invitaría a leer una que no existe.
import { computed } from "vue";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-vue-next";
import { money, number } from "@/composables/useChartTheme";

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: null },
  unit: { type: String, default: "CLP" }, // CLP | PCT | COUNT
  deltaPct: { type: Number, default: null },
  sparkline: { type: Array, default: () => [] },
  hint: { type: String, default: "" },
  // Para métricas donde subir es malo: deuda, quiebres, compras de emergencia.
  invertDelta: { type: Boolean, default: false },
  accent: { type: String, default: "" },
  icon: { type: [Object, Function], default: null },
});

const formatted = computed(() => {
  if (props.value == null) return "—";
  if (props.unit === "CLP") return money(props.value);
  if (props.unit === "PCT") return `${Number(props.value).toFixed(1)} %`;
  return number(props.value);
});

// El signo dice si subió; el color, si eso es bueno. No es lo mismo.
const deltaTone = computed(() => {
  if (props.deltaPct == null) return "neutral";
  const bueno = props.invertDelta ? props.deltaPct < 0 : props.deltaPct > 0;
  if (props.deltaPct === 0) return "neutral";
  return bueno ? "good" : "bad";
});

const deltaIcon = computed(() => {
  if (props.deltaPct == null || props.deltaPct === 0) return Minus;
  return props.deltaPct > 0 ? ArrowUpRight : ArrowDownRight;
});

const deltaLabel = computed(() =>
  props.deltaPct == null
    ? "sin base de comparación"
    : `${props.deltaPct > 0 ? "+" : ""}${props.deltaPct.toFixed(1)} %`,
);

// Chispa dibujada a mano en SVG: es una silueta de contexto, no un gráfico —
// no lleva ejes, ni rejilla, ni tooltip.
const sparkPath = computed(() => {
  const pts = props.sparkline;
  if (!pts || pts.length < 2) return "";

  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const rango = max - min || 1;
  const ancho = 100;
  const alto = 28;

  return pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * ancho;
      const y = alto - ((v - min) / rango) * alto;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
});
</script>

<template>
  <article
    class="group relative flex flex-col gap-3 p-5 rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-lg"
  >
    <!-- Filo de color: identifica la tarjeta sin teñir el número -->
    <span
      v-if="accent"
      class="absolute inset-x-0 top-0 h-1"
      :style="{ backgroundColor: accent }"
      aria-hidden="true"
    />

    <header class="flex items-start justify-between gap-2">
      <span
        class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-0"
      >
        <component
          :is="icon"
          v-if="icon"
          :size="13"
          class="shrink-0"
          :style="{ color: accent || 'currentColor' }"
          aria-hidden="true"
        />
        <span class="truncate">{{ label }}</span>
      </span>
      <span
        v-if="deltaPct !== null"
        :class="[
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold',
          deltaTone === 'good' &&
            'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950',
          deltaTone === 'bad' &&
            'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950',
          deltaTone === 'neutral' && 'text-muted-foreground bg-muted',
        ]"
        :title="`Contra el período anterior: ${deltaLabel}`"
      >
        <component :is="deltaIcon" :size="12" />
        {{ deltaLabel }}
      </span>
    </header>

    <strong
      class="text-[26px] leading-none font-extrabold text-foreground tabular-nums"
    >
      {{ formatted }}
    </strong>

    <footer class="flex items-end justify-between gap-3">
      <span class="text-[11px] text-muted-foreground leading-tight">{{
        hint
      }}</span>
      <svg
        v-if="sparkPath"
        class="shrink-0 w-[100px] h-7 overflow-visible"
        viewBox="0 0 100 28"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          :d="sparkPath"
          fill="none"
          :stroke="accent || 'currentColor'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
          class="text-muted-foreground"
        />
      </svg>
    </footer>
  </article>
</template>
