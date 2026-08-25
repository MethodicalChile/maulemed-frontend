<script setup>
// Un ratio contra un límite es un medidor, no una barra más en un gráfico.
//
// Para la ejecución presupuestaria: cada línea tiene su presupuesto —la pista— y
// lo usado —el relleno—. Barras agrupadas obligarían a comparar alturas entre
// líneas de montos muy distintos para leer lo mismo que aquí se lee de un
// vistazo: qué porcentaje va consumido.
import { computed } from "vue";
import { money } from "@/composables/useChartTheme";

const props = defineProps({
  // [{ name, budget, committed, consumed, used, used_pct }]
  lines: { type: Array, required: true },
  theme: { type: Object, required: true },
});

function tone(pct) {
  if (pct == null) return "neutral";
  if (pct > 100) return "critical";
  if (pct >= 90) return "serious";
  if (pct >= 75) return "warning";
  return "good";
}

const rows = computed(() =>
  props.lines.map((l) => {
    const pct = l.used_pct ?? 0;
    const estado = tone(l.used_pct);
    return {
      ...l,
      pct,
      // El relleno nunca pasa del 100 % del ancho: el sobregiro se dice con el
      // color y con el número, no desbordando la pista.
      width: Math.min(100, pct),
      tone: estado,
      color: props.theme.status[estado],
      // El estado nunca viaja sólo en color.
      badge:
        estado === "critical"
          ? "Sobregirado"
          : estado === "serious"
            ? "Al límite"
            : estado === "warning"
              ? "Atención"
              : "En rango",
    };
  }),
);
</script>

<template>
  <ul class="flex flex-col gap-3.5 h-full overflow-y-auto pr-1">
    <li v-for="row in rows" :key="row.code" class="flex flex-col gap-1.5">
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-xs font-semibold text-foreground truncate">
          {{ row.name }}
        </span>
        <span class="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {{ money(row.used) }} / {{ money(row.budget) }}
        </span>
      </div>

      <div class="flex items-center gap-2 flex-nowrap">
        <div class="flex-1 min-w-0 h-2 rounded-full bg-muted overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :style="{ width: `${row.width}%`, backgroundColor: row.color }"
          />
        </div>
        <span
          class="text-[11px] font-bold tabular-nums w-11 shrink-0 text-right"
          :class="
            row.tone === 'good' ? 'text-muted-foreground' : 'text-foreground'
          "
        >
          {{ row.pct.toFixed(0) }} %
        </span>
      </div>

      <span
        v-if="row.tone !== 'good'"
        class="text-[10px] font-semibold uppercase tracking-wide"
        :style="{ color: row.color }"
      >
        {{ row.badge }}
      </span>
    </li>
  </ul>
</template>
