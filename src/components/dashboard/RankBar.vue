<script setup>
// Comparación de magnitud, de mayor a menor.
//
// Una sola tonalidad, no la paleta categórica: aquí las barras no son
// identidades distintas que haya que distinguir, son cantidades que hay que
// ordenar. Darle a cada una su color enterraría cuál manda, que es justo lo
// único que el gráfico tiene que decir.
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
  values: { type: Array, required: true },
  theme: { type: Object, required: true },
  currency: { type: Boolean, default: true },
});

// Más oscuro es más grande, dentro de la misma tonalidad.
const colors = computed(() => {
  const rampa = props.theme.sequential;
  const max = Math.max(...props.values, 1);
  return props.values.map((v) => {
    const pos = Math.min(
      rampa.length - 1,
      Math.round((v / max) * (rampa.length - 1)),
    );
    return rampa[Math.max(1, pos)];
  });
});

// Los nombres de razón social son largos y comparten prefijo: "Soc. Médica y de
// Diagnóstico Maule Ltda." y "Soc. Médica y de Diagnóstico Nova Imagen Ltda."
// truncadas por el final quedan idénticas. Se recorta por el medio, que es lo
// único que conserva las dos puntas que las distinguen.
function acortar(texto, largo = 30) {
  const limpio = String(texto ?? "");
  if (limpio.length <= largo) return limpio;

  const cabeza = Math.ceil((largo - 1) / 2);
  const cola = Math.floor((largo - 1) / 2);
  return `${limpio.slice(0, cabeza)}…${limpio.slice(-cola)}`;
}

const data = computed(() => ({
  labels: props.labels.map((l) => acortar(l)),
  datasets: [
    {
      data: props.values,
      backgroundColor: colors.value,
      borderRadius: 4,
      borderSkipped: false,
      barThickness: 18,
    },
  ],
}));

const options = computed(() => {
  const base = baseChartOptions(props.theme, { currency: props.currency });
  return {
    ...base,
    indexAxis: "y",
    plugins: {
      ...base.plugins,
      tooltip: {
        ...base.plugins.tooltip,
        callbacks: {
          ...base.plugins.tooltip.callbacks,
          // En el tooltip sí va el nombre completo.
          title: (ctx) => props.labels[ctx[0].dataIndex],
        },
      },
    },
    scales: {
      // Horizontal: los nombres largos de razón social se leen sin rotar.
      x: {
        grid: { color: props.theme.grid, drawBorder: false, drawTicks: false },
        border: { display: false },
        ticks: base.scales.y.ticks,
      },
      y: {
        grid: { display: false, drawBorder: false },
        border: { display: false },
        ticks: { color: props.theme.muted, font: { size: 11 }, padding: 6 },
      },
    },
  };
});
</script>

<template>
  <Bar :data="data" :options="options" />
</template>
