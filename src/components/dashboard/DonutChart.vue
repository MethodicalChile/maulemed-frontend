<script setup>
// Parte-de-todo de un vistazo, con el total al centro.
//
// Sirve con pocos segmentos y valores claramente distintos. Con valores
// parecidos una dona no permite compararlos —el ojo no mide ángulos— y ahí
// corresponde una barra. Se usa para los medios de pago, que son tres y muy
// desiguales.
import { computed } from "vue";
import { Doughnut } from "vue-chartjs";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { money, number } from "@/composables/useChartTheme";

ChartJS.register(ArcElement, Tooltip);

const props = defineProps({
  // [{ label, value, color }]
  segments: { type: Array, required: true },
  theme: { type: Object, required: true },
  centerLabel: { type: String, default: "Total" },
  currency: { type: Boolean, default: true },
});

const visibles = computed(() => props.segments.filter((s) => s.value > 0));

const total = computed(() =>
  visibles.value.reduce((acc, s) => acc + Number(s.value), 0),
);

const centerValue = computed(() =>
  props.currency ? money(total.value) : number(total.value),
);

const data = computed(() => ({
  labels: visibles.value.map((s) => s.label),
  datasets: [
    {
      data: visibles.value.map((s) => s.value),
      backgroundColor: visibles.value.map((s) => s.color),
      // Anillo delgado y separado por la superficie: el grosor no aporta
      // información y sí ruido.
      borderColor: props.theme.surface,
      borderWidth: 3,
      hoverOffset: 6,
    },
  ],
}));

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: props.theme.surface,
      titleColor: props.theme.text,
      bodyColor: props.theme.muted,
      borderColor: props.theme.border,
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      boxWidth: 8,
      boxHeight: 8,
      boxPadding: 4,
      callbacks: {
        label: (ctx) => {
          const v = ctx.parsed;
          const pct = total.value ? ((v / total.value) * 100).toFixed(1) : "0";
          const texto = props.currency ? money(v) : number(v);
          return ` ${ctx.label}: ${texto} (${pct} %)`;
        },
      },
    },
  },
}));
</script>

<template>
  <div class="relative h-full">
    <Doughnut :data="data" :options="options" />
    <div
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
    >
      <span class="text-[10px] uppercase tracking-wider text-muted-foreground">
        {{ centerLabel }}
      </span>
      <strong class="text-lg font-extrabold text-foreground tabular-nums">
        {{ centerValue }}
      </strong>
    </div>
  </div>
</template>
