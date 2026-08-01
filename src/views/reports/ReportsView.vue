<script setup>
import { ref, onMounted } from 'vue'
import { FileBarChart, Download, Calendar } from 'lucide-vue-next'
import { reportsApi } from '@/api/reports.api'
import PageHeader from '@/components/common/PageHeader.vue'
import AppAlert from '@/components/common/AppAlert.vue'

const reports = ref([])
const loading = ref(true)
const error   = ref('')

onMounted(async () => {
  try {
    const res = await reportsApi.listReports()
    reports.value = res.data?.data ?? res.data
  } catch {
    error.value = 'Error al cargar los reportes.'
  } finally {
    loading.value = false
  }
})

async function downloadReport(report) {
  try {
    const res = await reportsApi.generateReport(report.uuid)
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.name}.pdf`
    a.click()
  } catch {
    error.value = 'Error al generar el reporte.'
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader title="Reportes" subtitle="Generación de reportes operacionales" />
    
    <AppAlert v-if="error" type="error" :message="error" />
    
    <div v-if="loading" class="text-center py-10 text-muted-foreground">Cargando reportes...</div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="r in reports" :key="r.uuid" class="p-5 border rounded-lg bg-card shadow-sm flex items-start gap-4">
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

