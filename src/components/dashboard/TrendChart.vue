<script setup>
// Tendencia en el tiempo, con dos o tres series distinguibles.
//
// Un solo eje, siempre. Dos escalas verticales dejarían comparar cosas que no se
// pueden comparar y es la forma más rápida de mentir con un gráfico. Cuando dos
// medidas no comparten unidad, van en dos gráficos.
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { baseChartOptions } from "@/composables/useChartTheme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
);

const props = defineProps({
  labels: { type: Array, required: true },
  // [{ label, data[], color, fill? }]
  series: { type: Array, required: true },
  theme: { type: Object, required: true },
  currency: { type: Boolean, default: true },
});

const data = computed(() => ({
  labels: props.labels,
  datasets: props.series.map((s) => ({
    label: s.label,
    data: s.data,
    borderColor: s.color,
    backgroundColor: s.fill ? `${s.color}1f` : s.color,
    fill: Boolean(s.fill),
    // Marca fina: 2px de línea. Los bloques gruesos y saturados se leen
    // ruidosos y tapan la forma del dato.
    borderWidth: 2,
    tension: 0.35,
    pointRadius: 0,
    // El punto sólo aparece al pasar por encima, y con 8px de radio para que
    // el blanco de la superficie lo separe de la línea.
    pointHoverRadius: 5,
    pointHoverBorderWidth: 2,
    pointHoverBorderColor: props.theme.surface,
    pointHoverBackgroundColor: s.color,
  })),
}));

const options = computed(() => {
  const base = baseChartOptions(props.theme, { currency: props.currency });
  return {
    ...base,
    // Cruz de mira: al pasar por un mes se leen todas las series de ese mes a
    // la vez, que es la comparación que el gráfico existe para permitir.
    interaction: { mode: "index", intersect: false },
    hover: { mode: "index", intersect: false },
    plugins: {
      ...base.plugins,
      tooltip: { ...base.plugins.tooltip, mode: "index", intersect: false },
    },
  };
});
</script>

<template>
  <Line :data="data" :options="options" />
</template>
