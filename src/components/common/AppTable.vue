<script setup>
defineProps({
  columns:      { type: Array,   required: true },
  rows:         { type: Array,   default: () => [] },
  loading:      { type: Boolean, default: false },
  emptyMessage: { type: String,  default: 'No hay registros para mostrar.' },
  emptyIcon:    { type: String,  default: '📋' },
})
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
      </thead>
      <tbody>
        <!-- Skeleton rows mientras carga -->
        <template v-if="loading">
          <tr v-for="i in 5" :key="`sk-${i}`" class="border-b border-border/50">
            <td v-for="col in columns" :key="col.key" class="p-4">
              <div class="h-4 rounded bg-muted animate-pulse" :style="{ width: col.width ? '60%' : `${50 + (i * 13) % 40}%` }" />
            </td>
          </tr>
        </template>

        <!-- Estado vacío mejorado -->
        <tr v-else-if="!rows.length">
          <td :colspan="columns.length" class="p-0">
            <div class="flex flex-col items-center justify-center gap-2 p-12">
              <span class="text-4xl opacity-50">{{ emptyIcon }}</span>
              <p class="text-sm text-muted-foreground text-center">{{ emptyMessage }}</p>
            </div>
          </td>
        </tr>

        <!-- Filas de datos -->
        <tr v-for="(row, idx) in rows" v-else :key="row.uuid ?? row.id ?? idx" class="border-b border-border/50 hover:bg-muted/50 transition-colors">
          <td v-for="col in columns" :key="col.key" class="p-4 text-foreground">
            <slot :name="col.key" :row="row" :value="row[col.key]">
              {{ row[col.key] ?? '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
