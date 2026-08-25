<script setup>
// El lado del ingreso: lo devengado (libro de ingresos), lo percibido
// (recaudación diaria) y la diferencia entre ambos (cobranza institucional).
//
// UI funcional, siguiendo el patrón del resto de las vistas. El acabado llega
// con el rediseño.
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Upload, RefreshCw } from "lucide-vue-next";
import { revenueApi } from "@/api/revenue.api";
import { useList } from "@/composables/useList";
import { useRefresh } from "@/composables/useRefresh";
import PageHeader from "@/components/common/PageHeader.vue";
import AppTable from "@/components/common/AppTable.vue";
import AppAlert from "@/components/common/AppAlert.vue";
import AppPagination from "@/components/common/AppPagination.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();

const canManage = computed(() => {
  if (authStore.user?.is_superuser) return true;
  return (
    ["ADMIN", "GERENTE", "FINANZAS"].some((r) =>
      authStore.roleCodes?.includes(r),
    ) || Boolean(authStore.permissions?.can_edit_finance)
  );
});

const tabs = [
  "Libro de ingresos",
  "Cobranza",
  "Recaudación",
  "Financiadores",
  "Cargas",
];
const activeTab = ref("Libro de ingresos");

const feedback = ref(null);
const feedbackType = ref("success");

function notify(message, type = "success") {
  feedback.value = message;
  feedbackType.value = type;
}

function money(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Libro de ingresos ───────────────────────────────────────────────────────
const entryColumns = [
  { key: "service_date", label: "Fecha" },
  { key: "legal_entity", label: "Razón social" },
  { key: "financier", label: "Financiador" },
  { key: "procedure", label: "Prestación" },
  { key: "gross_amount", label: "Bruto" },
  { key: "discount_amount", label: "Descuento" },
  { key: "net_amount", label: "Neto" },
];
const entryList = useList(revenueApi.listEntries);

const byEntity = ref([]);
async function loadByEntity() {
  try {
    const res = await revenueApi.entriesByLegalEntity();
    byEntity.value = res.data?.data ?? [];
  } catch {
    byEntity.value = [];
  }
}

// ── Cobranza ────────────────────────────────────────────────────────────────
const receivableColumns = [
  { key: "financier", label: "Financiador" },
  { key: "legal_entity", label: "Razón social" },
  { key: "period", label: "Período" },
  { key: "billed_amount", label: "Facturado" },
  { key: "collected_amount", label: "Cobrado" },
  { key: "pending_amount", label: "Pendiente" },
  { key: "aging_bucket", label: "Antigüedad" },
  { key: "status", label: "Estado" },
];
const receivableList = useList(revenueApi.listReceivables);

const aging = ref([]);
async function loadAging() {
  try {
    const res = await revenueApi.receivablesAging();
    aging.value = res.data?.data ?? [];
  } catch {
    aging.value = [];
  }
}

const rebuilding = ref(false);
async function rebuildReceivables() {
  const now = new Date();
  rebuilding.value = true;
  try {
    const res = await revenueApi.rebuildReceivables({
      period_year: now.getFullYear(),
      period_month: now.getMonth() + 1,
    });
    notify(res.data?.message ?? "Cuentas actualizadas.");
    await Promise.all([receivableList.load(), loadAging()]);
  } catch (e) {
    notify(
      e?.response?.data?.message ?? "No se pudieron reconstruir las cuentas.",
      "error",
    );
  } finally {
    rebuilding.value = false;
  }
}

// ── Recaudación ─────────────────────────────────────────────────────────────
const collectionColumns = [
  { key: "collection_date", label: "Fecha" },
  { key: "legal_entity", label: "Razón social" },
  { key: "particular_amount", label: "Particular" },
  { key: "copay_amount", label: "Copago" },
  { key: "card_amount", label: "Tarjeta" },
  { key: "total_amount", label: "Total" },
];
const collectionList = useList(revenueApi.listCollections);

// ── Financiadores ───────────────────────────────────────────────────────────
const financierColumns = [
  { key: "code", label: "Código" },
  { key: "name", label: "Nombre" },
  { key: "financier_type_label", label: "Tipo" },
  { key: "generates_receivable", label: "Genera deuda" },
  { key: "alias_count", label: "Grafías" },
];
const financierList = useList(revenueApi.listFinanciers);

// ── Cargas ──────────────────────────────────────────────────────────────────
const importColumns = [
  { key: "created_at", label: "Fecha" },
  { key: "file_name", label: "Archivo" },
  { key: "rows_imported", label: "Importadas" },
  { key: "rows_skipped", label: "Fuera" },
  { key: "unmapped", label: "Sin mapear" },
  { key: "status", label: "Estado" },
];
const importList = useList(revenueApi.listImports);

const uploading = ref(false);
const preview = ref(null);
const pendingFile = ref(null);

async function onFileSelected(event, kind) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  uploading.value = true;
  preview.value = null;

  try {
    if (kind === "collections") {
      const res = await revenueApi.importCollections(file);
      notify(res.data?.message ?? "Recaudación cargada.");
      await collectionList.load();
    } else {
      // Se previsualiza antes de escribir: una vez importado con la
      // atribución equivocada, el error es invisible.
      const res = await revenueApi.previewImport(file);
      preview.value = res.data?.data ?? null;
      pendingFile.value = file;
    }
  } catch (e) {
    notify(
      e?.response?.data?.message ??
        e?.response?.data?.data?.file ??
        "No se pudo procesar el archivo.",
      "error",
    );
  } finally {
    uploading.value = false;
  }
}

async function confirmImport() {
  if (!pendingFile.value) return;
  uploading.value = true;
  try {
    const res = await revenueApi.runImport(pendingFile.value);
    notify(res.data?.message ?? "Carga realizada.");
    preview.value = null;
    pendingFile.value = null;
    await Promise.all([importList.load(), entryList.load(), loadByEntity()]);
  } catch (e) {
    notify(e?.response?.data?.message ?? "No se pudo importar.", "error");
  } finally {
    uploading.value = false;
  }
}

// ── Carga inicial ───────────────────────────────────────────────────────────
const { setRefreshFunction, clearRefreshFunction } = useRefresh();

async function loadAll() {
  await Promise.all([
    entryList.load(),
    receivableList.load(),
    collectionList.load(),
    financierList.load(),
    importList.load(),
    loadByEntity(),
    loadAging(),
  ]);
}

onMounted(() => {
  loadAll();
  setRefreshFunction(loadAll);
});
onUnmounted(clearRefreshFunction);
</script>

<template>
  <section class="space-y-6">
    <PageHeader
      title="Ingresos"
      subtitle="Devengado, percibido y la deuda institucional entre ambos"
    >
      <label
        v-if="canManage && activeTab === 'Cargas'"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 cursor-pointer"
      >
        <Upload :size="16" /> Cargar prestaciones
        <input
          type="file"
          class="hidden"
          accept=".xlsx,.xls,.csv"
          :disabled="uploading"
          @change="(e) => onFileSelected(e, 'reporte')"
        />
      </label>

      <label
        v-if="canManage && activeTab === 'Recaudación'"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 cursor-pointer"
      >
        <Upload :size="16" /> Cargar depósitos
        <input
          type="file"
          class="hidden"
          accept=".pdf"
          :disabled="uploading"
          @change="(e) => onFileSelected(e, 'collections')"
        />
      </label>

      <button
        v-if="canManage && activeTab === 'Cobranza'"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-60"
        :disabled="rebuilding"
        @click="rebuildReceivables"
      >
        <RefreshCw :size="16" /> Reconstruir el mes
      </button>
    </PageHeader>

    <AppAlert v-if="feedback" :type="feedbackType" :message="feedback" />

    <div class="flex gap-2 border-b border-border overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="[
          'px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
          activeTab === tab
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        ]"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- ── LIBRO DE INGRESOS ── -->
    <template v-if="activeTab === 'Libro de ingresos'">
      <div
        v-if="byEntity.length"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div
          v-for="fila in byEntity"
          :key="fila.legal_entity__uuid"
          class="p-4 rounded-lg border border-border bg-card"
        >
          <p class="text-xs uppercase tracking-wide text-muted-foreground">
            {{ fila.legal_entity__rut }}
          </p>
          <p class="text-sm font-semibold text-foreground truncate">
            {{ fila.legal_entity__name }}
          </p>
          <p class="mt-2 text-xl font-bold text-foreground">
            {{ money(fila.net_amount) }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ fila.appointments }} atenciones · {{ fila.entries }} prestaciones
          </p>
        </div>
      </div>

      <AppAlert
        v-if="entryList.error.value"
        type="error"
        :message="entryList.error.value"
      />
      <AppTable
        :columns="entryColumns"
        :rows="entryList.items.value"
        :loading="entryList.loading.value"
        empty-message="Sin prestaciones cargadas. Carga el reporte desde la pestaña Cargas."
      >
        <template #legal_entity="{ row }">{{
          row.legal_entity_detail?.name ?? "—"
        }}</template>
        <template #financier="{ row }">{{
          row.financier_detail?.name ?? "—"
        }}</template>
        <template #procedure="{ row }">{{
          row.procedure_name ?? "—"
        }}</template>
        <template #gross_amount="{ row }">{{
          money(row.gross_amount)
        }}</template>
        <template #discount_amount="{ row }">{{
          money(row.discount_amount)
        }}</template>
        <template #net_amount="{ row }">{{ money(row.net_amount) }}</template>
      </AppTable>
      <AppPagination
        :count="entryList.pagination.count"
        :page="entryList.pagination.page"
        :page-size="entryList.pagination.pageSize"
        @change="entryList.setPage"
      />
    </template>

    <!-- ── COBRANZA ── -->
    <template v-if="activeTab === 'Cobranza'">
      <div
        v-if="aging.length"
        class="rounded-lg border border-border bg-card p-4"
      >
        <h2 class="text-sm font-bold uppercase text-muted-foreground mb-3">
          Antigüedad de la deuda por financiador
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted-foreground">
                <th class="py-1 pr-4">Financiador</th>
                <th class="py-1 pr-4">Sin vencer</th>
                <th class="py-1 pr-4">1-30</th>
                <th class="py-1 pr-4">31-60</th>
                <th class="py-1 pr-4">61-90</th>
                <th class="py-1 pr-4">90+</th>
                <th class="py-1 pr-4">Sin fecha</th>
                <th class="py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="fila in aging"
                :key="fila.financier_uuid"
                class="border-t border-border"
              >
                <td class="py-1 pr-4">{{ fila.financier_name }}</td>
                <td class="py-1 pr-4">
                  {{ money(fila.buckets["Sin vencer"]) }}
                </td>
                <td class="py-1 pr-4">{{ money(fila.buckets["1-30"]) }}</td>
                <td class="py-1 pr-4">{{ money(fila.buckets["31-60"]) }}</td>
                <td class="py-1 pr-4">{{ money(fila.buckets["61-90"]) }}</td>
                <td class="py-1 pr-4 font-semibold">
                  {{ money(fila.buckets["90+"]) }}
                </td>
                <td class="py-1 pr-4">
                  {{ money(fila.buckets["Sin fecha"]) }}
                </td>
                <td class="py-1 font-bold">{{ money(fila.total_pending) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <AppTable
        :columns="receivableColumns"
        :rows="receivableList.items.value"
        :loading="receivableList.loading.value"
        empty-message="Sin cuentas por cobrar. Reconstruye el mes desde el libro de ingresos."
      >
        <template #financier="{ row }">{{
          row.financier_detail?.name ?? "—"
        }}</template>
        <template #legal_entity="{ row }">{{
          row.legal_entity_detail?.name ?? "—"
        }}</template>
        <template #period="{ row }"
          >{{ row.period_month }}/{{ row.period_year }}</template
        >
        <template #billed_amount="{ row }">{{
          money(row.billed_amount)
        }}</template>
        <template #collected_amount="{ row }">{{
          money(row.collected_amount)
        }}</template>
        <template #pending_amount="{ row }">{{
          money(row.pending_amount)
        }}</template>
        <template #status="{ row }"
          ><StatusBadge :status="row.status"
        /></template>
      </AppTable>
      <AppPagination
        :count="receivableList.pagination.count"
        :page="receivableList.pagination.page"
        :page-size="receivableList.pagination.pageSize"
        @change="receivableList.setPage"
      />
    </template>

    <!-- ── RECAUDACIÓN ── -->
    <template v-if="activeTab === 'Recaudación'">
      <AppTable
        :columns="collectionColumns"
        :rows="collectionList.items.value"
        :loading="collectionList.loading.value"
        empty-message="Sin recaudación cargada. Sube el informe de depósitos."
      >
        <template #legal_entity="{ row }">{{
          row.legal_entity_detail?.name ?? "—"
        }}</template>
        <template #particular_amount="{ row }">{{
          money(row.particular_amount)
        }}</template>
        <template #copay_amount="{ row }">{{
          money(row.copay_amount)
        }}</template>
        <template #card_amount="{ row }">{{ money(row.card_amount) }}</template>
        <template #total_amount="{ row }">{{
          money(row.total_amount)
        }}</template>
      </AppTable>
      <AppPagination
        :count="collectionList.pagination.count"
        :page="collectionList.pagination.page"
        :page-size="collectionList.pagination.pageSize"
        @change="collectionList.setPage"
      />
    </template>

    <!-- ── FINANCIADORES ── -->
    <template v-if="activeTab === 'Financiadores'">
      <AppTable
        :columns="financierColumns"
        :rows="financierList.items.value"
        :loading="financierList.loading.value"
      >
        <template #generates_receivable="{ row }">{{
          row.generates_receivable ? "Sí" : "No"
        }}</template>
      </AppTable>
      <AppPagination
        :count="financierList.pagination.count"
        :page="financierList.pagination.page"
        :page-size="financierList.pagination.pageSize"
        @change="financierList.setPage"
      />
    </template>

    <!-- ── CARGAS ── -->
    <template v-if="activeTab === 'Cargas'">
      <div
        v-if="preview"
        class="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3"
      >
        <h2 class="text-sm font-bold text-amber-900">
          Previsualización de {{ preview.file_name }}
        </h2>
        <p class="text-sm text-amber-900">
          {{ preview.rows_mappable }} de {{ preview.rows_total }} filas se
          pueden atribuir a una sociedad y un financiador.
        </p>

        <div v-if="preview.unmapped_providers?.length" class="text-sm">
          <p class="font-semibold text-amber-900">Prestadores sin alias:</p>
          <p class="text-amber-800">
            {{ preview.unmapped_providers.join(", ") }}
          </p>
        </div>
        <div v-if="preview.unmapped_financiers?.length" class="text-sm">
          <p class="font-semibold text-amber-900">Financiadores sin alias:</p>
          <p class="text-amber-800">
            {{ preview.unmapped_financiers.join(", ") }}
          </p>
        </div>
        <p v-if="preview.rows_skipped" class="text-xs text-amber-800">
          Las filas sin alias no se importan. Créalos y vuelve a cargar el
          archivo — atribuirlas a la sociedad más parecida haría desaparecer el
          error.
        </p>

        <div class="flex gap-2">
          <button
            class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md disabled:opacity-60"
            :disabled="uploading || !preview.rows_mappable"
            @click="confirmImport"
          >
            Importar {{ preview.rows_mappable }} filas
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold text-foreground border border-border rounded-md"
            @click="preview = null"
          >
            Cancelar
          </button>
        </div>
      </div>

      <AppTable
        :columns="importColumns"
        :rows="importList.items.value"
        :loading="importList.loading.value"
        empty-message="Todavía no se ha cargado ningún reporte."
      >
        <template #created_at="{ row }">{{
          new Date(row.created_at).toLocaleDateString("es-CL")
        }}</template>
        <template #unmapped="{ row }">{{
          (row.unmapped_providers?.length ?? 0) +
          (row.unmapped_financiers?.length ?? 0)
        }}</template>
        <template #status="{ row }"
          ><StatusBadge :status="row.status"
        /></template>
      </AppTable>
      <AppPagination
        :count="importList.pagination.count"
        :page="importList.pagination.page"
        :page-size="importList.pagination.pageSize"
        @change="importList.setPage"
      />
    </template>
  </section>
</template>
