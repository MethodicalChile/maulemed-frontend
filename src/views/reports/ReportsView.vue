<script setup>
import { ref } from 'vue'
import { FileBarChart, Download } from 'lucide-vue-next'
import { reportsApi, downloadCsvBlob } from '@/api/reports.api'
import PageHeader from '@/components/common/PageHeader.vue'
import AppAlert from '@/components/common/AppAlert.vue'

const reports = ref([
  { name: 'Stock de Inventario', description: 'Detalle de existencias actuales', endpoint: 'inventory-stock' },
  { name: 'Movimientos de Inventario', description: 'Registro histórico de movimientos', endpoint: 'inventory-movements' },
  { name: 'Compras', description: 'Reporte consolidado de compras', endpoint: 'purchases' },
  { name: 'Gasto por Proveedor', description: 'Análisis de inversión en proveedores', endpoint: 'supplier-spending' },
  { name: 'Consumo por Sucursal', description: 'Detalle de consumo interno', endpoint: 'branch-consumption' },
  { name: 'Resumen Financiero', description: 'Indicadores económicos', endpoint: 'finance-summary' },
  { name: 'Historial de Stock', description: 'Evolución histórica de stock', endpoint: 'stock-history' }
])
const error   = ref('')

async function downloadReport(report) {
  error.value = ''
  try {
    const res = await reportsApi.exportCsv(report.endpoint, {})
    downloadCsvBlob(res.data, report.name)
  } catch (err) {
    error.value = 'Error al generar el reporte.'
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader title="Reportes" subtitle="Generación de reportes operacionales" />
    
    <AppAlert v-if="error" type="error" :message="error" />
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="r in reports" :key="r.endpoint" class="p-5 border rounded-lg bg-card shadow-sm flex items-start gap-4">
        <div class="p-3 rounded-xl bg-blue-100 text-blue-600"><FileBarChart :size="24" /></div>
        <div class="flex-1">
          <h3 class="font-bold text-sm">{{ r.name }}</h3>
          <p class="text-xs text-muted-foreground mt-1">{{ r.description }}</p>
          <button class="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/90" @click="downloadReport(r)">
            <Download :size="14" /> Descargar reporte
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

