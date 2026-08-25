<script setup>
// Parte-de-todo por fila, en horizontal.
//
// Se usa para la antigüedad de la cobranza, y ahí los segmentos NO son
// categorías sino una escala ordenada: sin vencer, 1-30, 31-60, 61-90, 90+. Por
// eso el color va sobre una rampa secuencial —claro es reciente, oscuro es
// viejo— y no sobre seis tonos categóricos. La escala dice "más oscuro es peor"
// sin que haya que leer la leyenda.
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import { baseChartOptions } from "@/composables/useChartTheme";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const props = defineProps({
  labels: { type: Array, required: true },
  // [{ label, data[], color }]
  series: { type: Array, required: true },
  theme: { type: Object, required: true },
  currency: { type: Boolean, default: true },
  horizontal: { type: Boolean, default: true },
});

const data = computed(() => ({
  labels: props.labels,
  datasets: props.series.map((s) => ({
    label: s.label,
    data: s.data,
    backgroundColor: s.color,
    // 2px del color de la superficie entre segmentos: sin esa separación dos
    // tonos vecinos de la misma rampa se funden en uno.
    borderColor: props.theme.surface,
    borderWidth: 2,
    borderRadius: 3,
    borderSkipped: false,
    barThickness: 20,
  })),
}));

const options = computed(() => {
  const base = baseChartOptions(props.theme, { currency: props.currency });
  const valueAxis = {
    stacked: true,
    grid: { color: props.theme.grid, drawBorder: false, drawTicks: false },
    border: { display: false },
    ticks: base.scales.y.ticks,
  };
  const categoryAxis = {
    stacked: true,
    grid: { display: false, drawBorder: false },
    border: { display: false },
    ticks: { color: props.theme.muted, font: { size: 11 }, padding: 6 },
  };

  return {
    ...base,
    indexAxis: props.horizontal ? "y" : "x",
    interaction: { mode: "index", intersect: false },
    scales: props.horizontal
      ? { x: valueAxis, y: categoryAxis }
      : { x: categoryAxis, y: valueAxis },
  };
});
</script>

<template>
  <Bar :data="data" :options="options" />
</template>
