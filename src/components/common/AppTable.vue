<script setup>
import { useSlots, computed } from "vue";
import Skeleton from "@/components/common/Skeleton.vue";

/**
 * @component AppTable
 * @description Tabla reutilizable con soporte para columnas, carga y estados vacíos.
 */
const props = defineProps({
  /** @type {Array<{key: string, label: string, width?: string}>} */
  columns: { type: Array, required: true },
  /** @type {Array<Object>} */
  rows: { type: Array, default: () => [] },
  /** @type {boolean} */
  loading: { type: Boolean, default: false },
  /** @type {string} */
  emptyMessage: { type: String, default: "No hay registros para mostrar." },
  /** @type {string} */
  emptyIcon: { type: String, default: "📋" },
});

const slots = useSlots();
// Verificación extra de seguridad para col y key
const hasFilters = computed(() => {
  if (!props.columns || !Array.isArray(props.columns)) return false;
  return props.columns.some(
    (col) => col && col.key && !!slots[`filter-${col.key}`],
  );
});
</script>

<template>
  <div class="w-full overflow-x-auto rounded-lg border border-border bg-card">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border">
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width } : {}"
            class="text-left p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider bg-muted/50"
          >
            {{ col.label }}
          </th>
        </tr>
        <tr v-if="hasFilters" class="border-b border-border bg-muted/20">
          <td v-for="col in columns" :key="`filter-${col.key}`" class="p-2">
            <slot v-if="col.key" :name="`filter-${col.key}`" />
          </td>
        </tr>
      </thead>
      <tbody>
        <!-- Skeleton rows mientras carga -->
        <template v-if="loading">
          <tr v-for="i in 5" :key="`sk-${i}`" class="border-b border-border/50">
            <td v-for="col in columns" :key="col.key" class="p-4">
              <Skeleton
                :class-name="`h-4 ${col.width ? 'w-[60%]' : 'w-[80%]'}`"
              />
            </td>
          </tr>
        </template>

        <!-- Estado vacío mejorado -->
        <tr v-else-if="!rows.length">
          <td :colspan="columns ? columns.length : 1" class="p-0">
            <div class="flex flex-col items-center justify-center gap-2 p-12">
              <span class="text-4xl opacity-50">{{ emptyIcon }}</span>
              <p class="text-sm text-muted-foreground text-center">
                {{ emptyMessage }}
              </p>
            </div>
          </td>
        </tr>

        <!-- Filas de datos -->
        <tr
          v-for="(row, idx) in rows"
          v-else
          :key="row.uuid ?? row.id ?? idx"
          class="border-b border-border/50 hover:bg-muted/50 transition-colors"
        >
          <td v-for="col in columns" :key="col.key" class="p-4 text-foreground">
            <slot :name="col.key" :row="row" :value="row[col.key]">
              {{ row[col.key] ?? "—" }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
