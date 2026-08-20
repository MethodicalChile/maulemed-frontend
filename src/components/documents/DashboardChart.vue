<script setup>
import { computed } from "vue";

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  Filler,
} from "chart.js";

import {
  Bar,
  Line,
  Doughnut,
} from "vue-chartjs";


ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  Filler,
);


const props = defineProps({
  chart: {
    type: Object,
    required: true,
  },
});


/*
 * Paleta general para dashboards.
 *
 * Los colores son suficientemente distintos
 * entre sí para:
 *
 * - barras
 * - donuts
 * - múltiples series
 */
const COLORS = [
  "#2563EB", // azul
  "#16A34A", // verde
  "#F59E0B", // amarillo
  "#9333EA", // morado
  "#0891B2", // cyan
  "#F97316", // naranja
  "#EC4899", // rosado
  "#6366F1", // indigo
  "#14B8A6", // teal
  "#DC2626", // rojo
];


const chartType = computed(() => {
  return (
    props.chart?.type ??
    "bar"
  );
});


const isBar = computed(() => {
  return (
    chartType.value === "bar"
  );
});


const isLine = computed(() => {
  return (
    chartType.value === "line"
  );
});


const isDonut = computed(() => {
  return [
    "donut",
    "doughnut",
    "pie",
  ].includes(
    chartType.value
  );
});


const chartRows = computed(() => {
  return (
    props.chart?.data ??
    []
  );
});


const chartSeries = computed(() => {
  return (
    props.chart?.series ??
    []
  );
});


const chartData = computed(() => {
  const rows =
    chartRows.value;

  const series =
    chartSeries.value;

  /*
   * ==========================================================
   * CASO SIMPLE
   *
   * data:
   *
   * [
   *   {
   *     label: "Débito",
   *     value: 1520826
   *   }
   * ]
   *
   * Se usa para:
   *
   * - medios de pago
   * - prestadores
   * - usuarios
   * - tablas
   * - prioridades
   * ==========================================================
   */

  if (
    !series.length
  ) {
    return {
      labels: rows.map(
        (item) =>
          item.label ??
          item.month ??
          item.date ??
          item.week ??
          "",
      ),

      datasets: [
        {
          label:
            props.chart?.title ??
            "Valor",

          data: rows.map(
            (item) =>
              Number(
                item.value ??
                item.count ??
                0,
              ),
          ),

          /*
           * En gráficos simples queremos
           * un color distinto para cada categoría.
           */
          backgroundColor:
            rows.map(
              (
                _item,
                index,
              ) =>
                COLORS[
                  index %
                  COLORS.length
                ],
            ),

          borderColor:
            rows.map(
              (
                _item,
                index,
              ) =>
                COLORS[
                  index %
                  COLORS.length
                ],
            ),

          borderWidth:
            isDonut.value
              ? 2
              : 1,

          borderRadius:
            isBar.value
              ? 5
              : 0,

          hoverOffset:
            isDonut.value
              ? 8
              : 0,
        },
      ],
    };
  }


  /*
   * ==========================================================
   * CASO MULTISERIE
   *
   * Ejemplo:
   *
   * Ingresos
   * Egresos
   *
   * o:
   *
   * Saldo final
   * Caja mínima
   * ==========================================================
   */

  const labels = rows.map(
    (item) =>
      item.label ??
      item.month ??
      item.date ??
      item.week ??
      "",
  );

  const datasets =
    series.map(
      (
        serie,
        index,
      ) => {
        const color =
          COLORS[
            index %
            COLORS.length
          ];

        return {
          label:
            serie.label ??
            serie.key,

          data: rows.map(
            (item) =>
              Number(
                item[
                  serie.key
                ] ?? 0,
              ),
          ),

          backgroundColor:
            isLine.value
              ? `${color}20`
              : color,

          borderColor:
            color,

          pointBackgroundColor:
            color,

          pointBorderColor:
            color,

          pointRadius:
            isLine.value
              ? 3
              : 0,

          pointHoverRadius:
            isLine.value
              ? 5
              : 0,

          borderWidth:
            2,

          borderRadius:
            isBar.value
              ? 5
              : 0,

          tension:
            0.3,

          fill:
            isLine.value
              ? false
              : undefined,
        };
      },
    );

  return {
    labels,
    datasets,
  };
});


const chartOptions = computed(() => {
  const format =
    props.chart?.format ??
    "number";

  const rows =
    chartRows.value;

  return {
    responsive: true,

    maintainAspectRatio: false,

    animation: {
      duration: 500,
    },

    interaction: {
      intersect: false,
      mode:
        isDonut.value
          ? "nearest"
          : "index",
    },

    plugins: {
      legend: {
        display: true,

        position: "bottom",

        labels: {
          usePointStyle: true,

          pointStyle: "circle",

          boxWidth: 9,

          boxHeight: 9,

          padding: 18,

          generateLabels(chart) {
            /*
             * Para donut mostramos:
             *
             * Débito — $1.520.826
             *
             * en lugar de una leyenda genérica.
             */
            if (
              isDonut.value &&
              chart.data.labels
                ?.length
            ) {
              const dataset =
                chart.data
                  .datasets?.[0];

              return chart.data.labels.map(
                (
                  label,
                  index,
                ) => {
                  const value =
                    dataset?.data?.[
                      index
                    ] ?? 0;

                  return {
                    text:
                      `${label} — ` +
                      formatValue(
                        value,
                        format,
                      ),

                    fillStyle:
                      dataset
                        ?.backgroundColor?.[
                          index
                        ] ??
                      COLORS[
                        index %
                        COLORS.length
                      ],

                    strokeStyle:
                      dataset
                        ?.backgroundColor?.[
                          index
                        ] ??
                      COLORS[
                        index %
                        COLORS.length
                      ],

                    lineWidth:
                      0,

                    hidden: false,

                    index,
                  };
                },
              );
            }

            /*
             * Para barras simples evitamos
             * mostrar una leyenda inútil como:
             *
             * "Total por prestador"
             *
             * porque ya está en el título.
             */
            if (
              isBar.value &&
              !chartSeries.value.length
            ) {
              return [];
            }

            return ChartJS.defaults.plugins
              .legend.labels.generateLabels(
                chart
              );
          },
        },
      },


      tooltip: {
        backgroundColor:
          "rgba(17, 24, 39, 0.92)",

        titleColor:
          "#FFFFFF",

        bodyColor:
          "#FFFFFF",

        padding:
          12,

        cornerRadius:
          8,

        displayColors:
          true,

        callbacks: {
          label(context) {
            const value =
              context.raw ?? 0;

            /*
             * Donut:
             *
             * Medios de pago: $1.520.826 (49,8%)
             */
            if (
              isDonut.value
            ) {
              const dataset =
                context.dataset;

              const total =
                dataset.data.reduce(
                  (
                    accumulator,
                    item,
                  ) =>
                    accumulator +
                    Number(
                      item ?? 0
                    ),
                  0,
                );

              const percentage =
                total > 0
                  ? (
                      Number(
                        value
                      ) /
                      total
                    ) *
                    100
                  : 0;

              return (
                `${formatValue(
                  value,
                  format,
                )} ` +
                `(${percentage.toLocaleString(
                  "es-CL",
                  {
                    maximumFractionDigits:
                      1,
                  },
                )}%)`
              );
            }

            const label =
              context.dataset.label
                ? `${context.dataset.label}: `
                : "";

            return (
              label +
              formatValue(
                value,
                format,
              )
            );
          },
        },
      },
    },


    /*
     * Los donuts no usan ejes.
     */
    scales:
      isDonut.value
        ? undefined
        : {
            x: {
              border: {
                display: false,
              },

              grid: {
                display: false,
              },

              ticks: {
                color:
                  "#6B7280",

                maxRotation:
                  rows.length > 5
                    ? 22
                    : 0,

                minRotation:
                  rows.length > 5
                    ? 22
                    : 0,

                autoSkip:
                  false,

                font: {
                  size: 11,
                },
              },
            },

            y: {
              beginAtZero: true,

              border: {
                display: false,
              },

              grid: {
                color:
                  "rgba(148, 163, 184, 0.18)",
              },

              ticks: {
                color:
                  "#6B7280",

                padding:
                  8,

                callback(value) {
                  return formatAxisValue(
                    value,
                    format,
                  );
                },
              },
            },
          },


    /*
     * Configuración especial para donut.
     */
    cutout:
      isDonut.value
        ? "62%"
        : undefined,
  };
});


function formatValue(
  value,
  format,
) {
  const number =
    Number(value ?? 0);

  if (
    format === "currency"
  ) {
    return new Intl.NumberFormat(
      "es-CL",
      {
        style:
          "currency",

        currency:
          "CLP",

        maximumFractionDigits:
          0,
      },
    ).format(
      number
    );
  }

  if (
    format === "percentage"
  ) {
    return (
      `${number.toLocaleString(
        "es-CL",
        {
          maximumFractionDigits:
            1,
        },
      )}%`
    );
  }

  if (
    format === "minutes"
  ) {
    return (
      `${number.toLocaleString(
        "es-CL",
        {
          maximumFractionDigits:
            1,
        },
      )} min`
    );
  }

  return new Intl.NumberFormat(
    "es-CL",
    {
      maximumFractionDigits:
        2,
    },
  ).format(
    number
  );
}


function formatAxisValue(
  value,
  format,
) {
  const number =
    Number(value ?? 0);

  if (
    format !==
    "currency"
  ) {
    return new Intl.NumberFormat(
      "es-CL",
      {
        maximumFractionDigits:
          1,
      },
    ).format(
      number
    );
  }

  if (
    Math.abs(number) >=
    1_000_000_000
  ) {
    return (
      "$" +
      (
        number /
        1_000_000_000
      ).toLocaleString(
        "es-CL",
        {
          maximumFractionDigits:
            1,
        },
      ) +
      " mil M"
    );
  }

  if (
    Math.abs(number) >=
    1_000_000
  ) {
    return (
      "$" +
      (
        number /
        1_000_000
      ).toLocaleString(
        "es-CL",
        {
          maximumFractionDigits:
            1,
        },
      ) +
      " M"
    );
  }

  if (
    Math.abs(number) >=
    1_000
  ) {
    return (
      "$" +
      (
        number /
        1_000
      ).toLocaleString(
        "es-CL",
        {
          maximumFractionDigits:
            0,
        },
      ) +
      " mil"
    );
  }

  return `$${number}`;
}
</script>


<template>
  <div
    class="
      overflow-hidden
      rounded-xl
      border
      border-border
      bg-card
    "
  >
    <!-- Header -->

    <div
      class="
        flex
        items-center
        justify-between
        gap-3
        border-b
        border-border
        px-5
        py-4
      "
    >
      <div>
        <h3
          class="
            font-semibold
            text-foreground
          "
        >
          {{ chart.title }}
        </h3>

        <p
          v-if="chart.description"
          class="
            mt-1
            text-xs
            text-muted-foreground
          "
        >
          {{ chart.description }}
        </p>
      </div>
    </div>


    <!-- Gráfico -->

    <div
      class="
        relative
        p-5
      "
      :class="
        isDonut
          ? 'h-[390px]'
          : 'h-[380px]'
      "
    >
      <Bar
        v-if="isBar"
        :data="chartData"
        :options="chartOptions"
      />

      <Line
        v-else-if="isLine"
        :data="chartData"
        :options="chartOptions"
      />

      <Doughnut
        v-else-if="isDonut"
        :data="chartData"
        :options="chartOptions"
      />

      <div
        v-else
        class="
          flex
          h-full
          items-center
          justify-center
          text-sm
          text-muted-foreground
        "
      >
        Tipo de gráfico
        no soportado:
        {{ chartType }}
      </div>
    </div>
  </div>
</template>