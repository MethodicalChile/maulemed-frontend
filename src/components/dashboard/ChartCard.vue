<script setup>
// El marco común de cada gráfico: título, leyenda en HTML y el interruptor que
// cambia el gráfico por su tabla.
//
// Ese interruptor no es un extra. El validador de la paleta marca tres de los
// colores por debajo de 3:1 contra la superficie clara, y eso obliga a ofrecer
// relieve: etiquetas visibles o vista de tabla. Además es la salida accesible
// para quien no puede leer el gráfico.
import { ref } from "vue";
import { Table2, BarChart3 } from "lucide-vue-next";

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  // [{ label, color }] — se dibuja en HTML, no con la leyenda de Chart.js,
  // para que sea texto real y no un canvas.
  legend: { type: Array, default: () => [] },
  height: { type: String, default: "h-72" },
  hasTable: { type: Boolean, default: true },
  // En una tarjeta angosta la leyenda junto al título lo comprime hasta
  // cortarlo. Con esto baja a su propia línea.
  legendBelow: { type: Boolean, default: false },
});

const showTable = ref(false);
</script>

<template>
  <section
    class="flex flex-col rounded-xl border border-border bg-card overflow-hidden"
  >
    <header
      class="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-border"
    >
      <div class="min-w-0 flex-1">
        <h2 class="text-sm font-bold text-foreground">{{ title }}</h2>
        <p v-if="subtitle" class="text-xs text-muted-foreground mt-0.5">
          {{ subtitle }}
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <ul
          v-if="legend.length && !legendBelow"
          class="hidden sm:flex items-center gap-3 flex-wrap justify-end max-w-[60%]"
        >
          <li
            v-for="serie in legend"
            :key="serie.label"
            class="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <span
              class="w-2.5 h-2.5 rounded-sm shrink-0"
              :style="{ backgroundColor: serie.color }"
              aria-hidden="true"
            />
            {{ serie.label }}
          </li>
        </ul>

        <button
          v-if="hasTable"
          class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          :title="showTable ? 'Ver el gráfico' : 'Ver los datos en tabla'"
          :aria-pressed="showTable"
          @click="showTable = !showTable"
        >
          <component :is="showTable ? BarChart3 : Table2" :size="15" />
        </button>
      </div>
    </header>

    <!-- Leyenda en pantalla angosta, bajo la cabecera -->
    <ul
      v-if="legend.length"
      :class="[
        'flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 pt-3',
        legendBelow ? 'flex' : 'sm:hidden',
      ]"
    >
      <li
        v-for="serie in legend"
        :key="serie.label"
        class="flex items-center gap-1.5 text-[11px] text-muted-foreground"
      >
        <span
          class="w-2.5 h-2.5 rounded-sm"
          :style="{ backgroundColor: serie.color }"
          aria-hidden="true"
        />
        {{ serie.label }}
      </li>
    </ul>

    <div class="flex-1 p-5 pt-4">
      <div v-show="!showTable" :class="height">
        <slot />
      </div>
      <div v-if="showTable" class="max-h-72 overflow-auto">
        <slot name="table">
          <p class="text-xs text-muted-foreground">
            Sin tabla para este gráfico.
          </p>
        </slot>
      </div>
    </div>
  </section>
</template>
