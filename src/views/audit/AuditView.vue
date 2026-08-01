<script setup>
import { ref, onMounted } from 'vue'
import { Search } from 'lucide-vue-next'
import { auditApi } from '@/api/audit.api'
import { useList } from '@/composables/useList'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppAlert from '@/components/common/AppAlert.vue'

const columns = [
  { key: 'user',        label: 'Usuario' },
  { key: 'action',      label: 'Acción' },
  { key: 'target_type', label: 'Tipo' },
  { key: 'timestamp',   label: 'Fecha' },
  { key: 'details',     label: 'Detalles' },
]

const auditList = useList(auditApi.listLogs)

onMounted(auditList.load)
</script>

<template>
  <section class="space-y-6">
    <PageHeader title="Auditoría" subtitle="Registro de actividades del sistema" />
    
    <div class="flex items-center gap-4 mb-4">
      <div class="relative w-full md:w-64">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <AppInput
          type="text"
          placeholder="Buscar acción o usuario..."
          :model-value="auditList.params.search"
          @update:model-value="auditList.setParam('search', $event)"
          class="pl-10"
        />
      </div>
    </div>

    <AppAlert v-if="auditList.error.value" type="error" :message="auditList.error.value" />

    <AppTable :columns="columns" :rows="auditList.items.value" :loading="auditList.loading.value">
      <template #user="{ row }">{{ row.user_detail?.username ?? '—' }}</template>
      <template #timestamp="{ row }">{{ new Date(row.timestamp).toLocaleString('es-CL') }}</template>
      <template #details="{ row }"><pre class="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">{{ JSON.stringify(row.details, null, 2) }}</pre></template>
    </AppTable>
    
    <AppPagination
      :count="auditList.pagination.count"
      :page="auditList.pagination.page"
      :page-size="auditList.pagination.pageSize"
      @change="auditList.setPage"
    />
  </section>
</template>

