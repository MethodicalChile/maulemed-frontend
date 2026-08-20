<script setup>
import { computed } from "vue";

import {
  BarChart3,
  FileText,
  Info,
} from "lucide-vue-next";

import DashboardMetricCard
  from "./DashboardMetricCard.vue";

import DashboardChart
  from "./DashboardChart.vue";

import DashboardTable
  from "./DashboardTable.vue";


const props = defineProps({
  dashboard: {
    type: Object,
    default: null,
  },

  documentType: {
    type: String,
    default: "",
  },

  documentTypeLabel: {
    type: String,
    default: "",
  },
});


const metrics = computed(() => {
  return props.dashboard?.metrics ?? [];
});


const charts = computed(() => {
  return props.dashboard?.charts ?? [];
});


const tables = computed(() => {
  return props.dashboard?.tables ?? [];
});


const summary = computed(() => {
  return props.dashboard?.summary ?? null;
});


const period = computed(() => {
  return props.dashboard?.period ?? null;
});


const hasMetrics = computed(() => {
  return metrics.value.length > 0;
});


const hasCharts = computed(() => {
  return charts.value.length > 0;
});


const hasTables = computed(() => {
  return tables.value.length > 0;
});


const hasSummary = computed(() => {
  return Boolean(
    summary.value?.text
  );
});


const hasDashboardContent = computed(() => {
  return (
    hasMetrics.value ||
    hasCharts.value ||
    hasTables.value ||
    hasSummary.value
  );
});


const dashboardTitle = computed(() => {
  return (
    props.dashboard?.title ||
    props.documentTypeLabel ||
    "Dashboard del documento"
  );
});


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const text =
    String(value);

  /*
   * Soportamos principalmente:
   *
   * 2026-07-21
   * 21-07-2026
   */

  const isoMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (isoMatch) {
    const [
      ,
      year,
      month,
      day,
    ] = isoMatch;

    return `${day}-${month}-${year}`;
  }

  return text;
}


function getHighlightValue(
  highlight,
) {
  const value =
    highlight?.value;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const format =
    highlight?.format;

  if (format === "currency") {
    return new Intl.NumberFormat(
      "es-CL",
      {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      },
    ).format(
      Number(value ?? 0)
    );
  }

  if (format === "number") {
    return new Intl.NumberFormat(
      "es-CL",
      {
        maximumFractionDigits: 2,
      },
    ).format(
      Number(value ?? 0)
    );
  }

  if (format === "percentage") {
    return `${
      new Intl.NumberFormat(
        "es-CL",
        {
          maximumFractionDigits: 2,
        },
      ).format(
        Number(value ?? 0)
      )
    }%`;
  }

  if (format === "minutes") {
    return `${
      new Intl.NumberFormat(
        "es-CL",
        {
          maximumFractionDigits: 1,
        },
      ).format(
        Number(value ?? 0)
      )
    } min`;
  }

  return String(value);
}
</script>


<template>
  <div class="space-y-6">

    <!-- ====================================================== -->
    <!-- HEADER DASHBOARD                                       -->
    <!-- ====================================================== -->

    <div
      class="
        flex
        flex-col
        gap-4
        lg:flex-row
        lg:items-start
        lg:justify-between
      "
    >
      <div
        class="
          flex
          min-w-0
          items-start
          gap-3
        "
      >
        <div
          class="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-primary/10
            text-primary
          "
        >
          <BarChart3 :size="20" />
        </div>

        <div class="min-w-0">
          <h2
            class="
              text-lg
              font-semibold
              text-foreground
            "
          >
            {{ dashboardTitle }}
          </h2>

          <p
            v-if="documentTypeLabel"
            class="
              mt-1
              text-xs
              text-muted-foreground
            "
          >
            Tipo de documento:
            <strong
              class="
                font-medium
                text-foreground
              "
            >
              {{ documentTypeLabel }}
            </strong>
          </p>

          <p
            v-if="documentType"
            class="
              mt-0.5
              text-[11px]
              text-muted-foreground
            "
          >
            {{ documentType }}
          </p>
        </div>
      </div>


      <!-- Periodo -->

      <div
        v-if="
          period?.date_from ||
          period?.date_to
        "
        class="
          flex
          flex-wrap
          items-center
          gap-2
          text-xs
          text-muted-foreground
        "
      >
        <span>
          Período:
        </span>

        <span
          class="
            rounded-md
            border
            border-border
            bg-muted/40
            px-2.5
            py-1.5
            font-medium
            text-foreground
          "
        >
          {{
            formatDate(
              period?.date_from
            )
          }}
        </span>

        <span>
          a
        </span>

        <span
          class="
            rounded-md
            border
            border-border
            bg-muted/40
            px-2.5
            py-1.5
            font-medium
            text-foreground
          "
        >
          {{
            formatDate(
              period?.date_to
            )
          }}
        </span>
      </div>
    </div>


    <!-- ====================================================== -->
    <!-- SIN DASHBOARD                                          -->
    <!-- ====================================================== -->

    <div
      v-if="!hasDashboardContent"
      class="
        flex
        min-h-[300px]
        items-center
        justify-center
        rounded-xl
        border
        border-border
        bg-card
        p-8
      "
    >
      <div
        class="
          max-w-md
          text-center
        "
      >
        <div
          class="
            mx-auto
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-full
            bg-muted
            text-muted-foreground
          "
        >
          <FileText :size="22" />
        </div>

        <h3
          class="
            mt-4
            font-semibold
            text-foreground
          "
        >
          Sin información para dashboard
        </h3>

        <p
          class="
            mt-2
            text-sm
            text-muted-foreground
          "
        >
          El documento fue procesado,
          pero no se encontraron indicadores,
          gráficos o tablas para mostrar.
        </p>
      </div>
    </div>


    <template v-else>

      <!-- ==================================================== -->
      <!-- KPIS                                                -->
      <!-- ==================================================== -->

      <section
        v-if="hasMetrics"
        class="space-y-3"
      >
        <div>
          <h3
            class="
              text-sm
              font-semibold
              text-foreground
            "
          >
            Indicadores principales
          </h3>

          <p
            class="
              mt-1
              text-xs
              text-muted-foreground
            "
          >
            Resumen de las principales
            métricas detectadas en el documento.
          </p>
        </div>

        <div
          class="
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            xl:grid-cols-3
          "
        >
          <DashboardMetricCard
            v-for="metric in metrics"
            :key="
              metric.key ??
              metric.label
            "
            :metric="metric"
          />
        </div>
      </section>


      <!-- ==================================================== -->
      <!-- RESUMEN                                             -->
      <!-- ==================================================== -->

      <section
        v-if="hasSummary"
        class="
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
        "
      >
        <div
          class="
            flex
            items-center
            gap-2
            border-b
            border-border
            px-5
            py-4
          "
        >
          <Info
            :size="18"
            class="text-primary"
          />

          <h3
            class="
              font-semibold
              text-foreground
            "
          >
            {{
              summary?.title ??
              "Resumen"
            }}
          </h3>
        </div>

        <div
          class="
            space-y-5
            p-5
          "
        >
          <p
            class="
              text-sm
              leading-6
              text-foreground
            "
          >
            {{ summary.text }}
          </p>

          <div
            v-if="
              summary?.highlights?.length
            "
            class="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              xl:grid-cols-4
            "
          >
            <div
              v-for="
                highlight
                in summary.highlights
              "
              :key="
                highlight.key ??
                highlight.label
              "
              class="
                rounded-lg
                border
                border-border
                bg-muted/20
                px-4
                py-3
              "
            >
              <p
                class="
                  text-xs
                  text-muted-foreground
                "
              >
                {{ highlight.label }}
              </p>

              <p
                class="
                  mt-1
                  font-semibold
                  text-foreground
                  break-words
                "
              >
                {{
                  getHighlightValue(
                    highlight
                  )
                }}
              </p>
            </div>
          </div>
        </div>
      </section>


      <!-- ==================================================== -->
      <!-- GRÁFICOS                                            -->
      <!-- ==================================================== -->

      <section
        v-if="hasCharts"
        class="space-y-3"
      >
        <div>
          <h3
            class="
              text-sm
              font-semibold
              text-foreground
            "
          >
            Análisis gráfico
          </h3>

          <p
            class="
              mt-1
              text-xs
              text-muted-foreground
            "
          >
            Representación visual de la
            información relevante del documento.
          </p>
        </div>

        <div
          class="
            grid
            grid-cols-1
            gap-5
            xl:grid-cols-2
          "
        >
          <DashboardChart
            v-for="chart in charts"
            :key="
              chart.key ??
              chart.title
            "
            :chart="chart"
          />
        </div>
      </section>


      <!-- ==================================================== -->
      <!-- TABLAS                                              -->
      <!-- ==================================================== -->

      <section
        v-if="hasTables"
        class="space-y-4"
      >
        <div>
          <h3
            class="
              text-sm
              font-semibold
              text-foreground
            "
          >
            Información detallada
          </h3>

          <p
            class="
              mt-1
              text-xs
              text-muted-foreground
            "
          >
            Tablas construidas a partir
            de la información procesada.
          </p>
        </div>

        <DashboardTable
          v-for="table in tables"
          :key="
            table.key ??
            table.title
          "
          :table="table"
        />
      </section>

    </template>

  </div>
</template>