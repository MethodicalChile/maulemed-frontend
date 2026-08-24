<script setup>
import { onMounted, onUnmounted } from "vue";
import { auditApi } from "@/api/audit.api";
import { useList } from "@/composables/useList";
import { useRefresh } from "@/composables/useRefresh";
import PageHeader from "@/components/common/PageHeader.vue";
import AppTable from "@/components/common/AppTable.vue";
import AppPagination from "@/components/common/AppPagination.vue";
import AppAlert from "@/components/common/AppAlert.vue";
import AppTableFilterInput from "@/components/common/AppTableFilterInput.vue";

const columns = [
  { key: "user", label: "Usuario" },
  { key: "action", label: "Acción" },
  { key: "target_type", label: "Tipo" },
  { key: "timestamp", label: "Fecha" },
  { key: "details", label: "Detalles" },
];

const auditList = useList(auditApi.listLogs);

const { setRefreshFunction, clearRefreshFunction } = useRefresh();
onMounted(() => {
  setRefreshFunction(auditList.load);
  auditList.load();
});
onUnmounted(clearRefreshFunction);

function fmtDate(val) {
  if (!val) return "—";
  const date = new Date(val);
  return isNaN(date.getTime()) ? "—" : date.toLocaleString("es-CL");
}
</script>

<template>
  <section class="page">
    <PageHeader
      title="Auditoría"
      subtitle="Registro de actividades del sistema"
    />

    <AppAlert
      v-if="auditList.error.value"
      type="error"
      :message="auditList.error.value"
    />

    <AppTable
      :columns="columns"
      :rows="auditList.items.value"
      :loading="auditList.loading.value"
    >
      <template #filter-user>
        <AppTableFilterInput
          placeholder="Buscar..."
          :model-value="auditList.params.user"
          @update:model-value="auditList.setParam('user', $event)"
        />
      </template>
      <template #filter-action>
        <AppTableFilterInput
          placeholder="Buscar..."
          :model-value="auditList.params.action"
          @update:model-value="auditList.setParam('action', $event)"
        />
      </template>

      <template #user="{ row }">{{
        row.user_detail?.username ?? "—"
      }}</template>
      <template #timestamp="{ row }">{{ fmtDate(row.timestamp) }}</template>
      <template #details="{ row }">
        <div
          class="text-xs text-muted-foreground truncate max-w-xs"
          :title="JSON.stringify(row.details)"
        >
          {{ JSON.stringify(row.details) }}
        </div>
      </template>
    </AppTable>

    <AppPagination
      :count="auditList.pagination.count"
      :page="auditList.pagination.page"
      :page-size="auditList.pagination.pageSize"
      @change="auditList.setPage"
    />
  </section>
</template>
