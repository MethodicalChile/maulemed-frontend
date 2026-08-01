<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Trash2, FileText, Search, ExternalLink, Upload } from 'lucide-vue-next'
import { documentsApi } from '@/api/documents.api'
import { useList } from '@/composables/useList'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import FormField from '@/components/common/FormField.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'

const DOCUMENT_TYPES = [
  { value: 'ORDEN_COMPRA_PDF', label: 'Orden de compra PDF' },
  { value: 'FACTURA',          label: 'Factura' },
  { value: 'GUIA_DESPACHO',    label: 'Guía de despacho' },
  { value: 'GUIA_INTERNA',     label: 'Guía interna' },
  { value: 'NOTA_CREDITO',     label: 'Nota de crédito' },
  { value: 'COTIZACION',       label: 'Cotización' },
  { value: 'COMPROBANTE_PAGO', label: 'Comprobante de pago' },
  { value: 'OTRO',             label: 'Otro' },
]

const RELATED_MODELS = [
  { value: '',                label: 'Todos los módulos' },
  { value: 'PurchaseOrder',   label: 'Orden de compra' },
  { value: 'PurchaseReceipt', label: 'Recepción' },
  { value: 'SupplierClaim',   label: 'Reclamo proveedor' },
  { value: 'SupplyRequest',   label: 'Solicitud de insumos' },
]

const columns = [
  { key: 'document_type', label: 'Tipo' },
  { key: 'file_name',     label: 'Archivo' },
  { key: 'related_model', label: 'Módulo' },
  { key: 'uploaded_by',   label: 'Subido por' },
  { key: 'created_at',    label: 'Fecha' },
  { key: 'actions',       label: '', width: '100px' },
]

const docList    = useList(documentsApi.listDocuments)
const deleteError = ref('')

// ── Upload modal ──────────────────────────────────────────────────────────────
const showModal   = ref(false)
const uploading   = ref(false)
const uploadError = ref('')
const selectedFile = ref(null)
const fileInputRef = ref(null)

const uploadMeta = ref({
  document_type: 'FACTURA',
  related_model: '',
  related_uuid:  '',
  notes:         '',
})

onMounted(() => docList.load())

function openModal() {
  selectedFile.value  = null
  uploadError.value   = ''
  uploadMeta.value    = { document_type: 'FACTURA', related_model: '', related_uuid: '', notes: '' }
  showModal.value     = true
}

function onFileChange(e) {
  selectedFile.value = e.target.files?.[0] ?? null
}

async function handleUpload() {
  if (!selectedFile.value) { uploadError.value = 'Selecciona un archivo primero.'; return }
  uploading.value   = true
  uploadError.value = ''
  try {
    await documentsApi.uploadDocument(selectedFile.value, uploadMeta.value)
    showModal.value = false
    docList.load()
  } catch (e) {
    uploadError.value = e.response?.data?.message ?? 'Error al subir el archivo.'
  } finally {
    uploading.value = false
  }
}

async function handleDelete(uuid) {
  if (!confirm('¿Eliminar este documento?')) return
  deleteError.value = ''
  try {
    await documentsApi.deleteDocument(uuid)
    docList.load()
  } catch (e) {
    deleteError.value = e.response?.data?.message ?? 'Error al eliminar'
  }
}

function typeLabel(val) {
  return DOCUMENT_TYPES.find((t) => t.value === val)?.label ?? val
}

function modelLabel(val) {
  return RELATED_MODELS.find((m) => m.value === val)?.label ?? val ?? '—'
}

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CL')
}

function fileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader title="Documentos" subtitle="PDFs, facturas, guías de despacho y comprobantes">
      <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" @click="openModal">
        <Upload :size="16" /> Subir documento
      </button>
    </PageHeader>

    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 px-3 py-2 border rounded-md">
        <Search :size="16" class="text-muted-foreground" />
        <AppInput
          type="text"
          placeholder="Buscar por nombre..."
          class="bg-transparent text-sm focus:outline-none"
          :model-value="docList.params.search"
          @update:model-value="docList.setParam('search', $event)"
        />
      </div>
      <AppSelect class="text-sm" :model-value="docList.params.document_type" @update:model-value="docList.setParam('document_type', $event)">
        <option value="">Todos los tipos</option>
        <option v-for="t in DOCUMENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </AppSelect>
      <AppSelect class="text-sm" :model-value="docList.params.related_model" @update:model-value="docList.setParam('related_model', $event)">
        <option value="">Todos los módulos</option>
        <option v-for="m in RELATED_MODELS.filter(m => m.value !== '')" :key="m.value" :value="m.value">{{ m.label }}</option>
      </AppSelect>
    </div>

    <AppAlert v-if="docList.error.value || deleteError" type="error" :message="docList.error.value || deleteError" />

    <AppTable :columns="columns" :rows="docList.items.value" :loading="docList.loading.value">
      <template #document_type="{ row }">
        <span class="text-[0.78rem] font-semibold px-2 py-1 rounded-full border border-border bg-muted whitespace-nowrap">{{ typeLabel(row.document_type) }}</span>
      </template>
      <template #file_name="{ row }">
        <div class="flex items-center gap-1.5 text-sm">
          <FileText :size="14" class="text-muted-foreground flex-shrink-0" />
          <span>{{ row.file_name ?? '—' }}</span>
          <span v-if="row.file_size" class="text-xs text-muted-foreground">{{ fileSize(row.file_size) }}</span>
        </div>
      </template>
      <template #related_model="{ row }">{{ modelLabel(row.related_model) }}</template>
      <template #uploaded_by="{ row }">{{ row.uploaded_by_detail?.full_name ?? '—' }}</template>
      <template #created_at="{ row }">{{ fmtDate(row.created_at) }}</template>
      <template #actions="{ row }">
        <div class="flex gap-1">
          <a
            v-if="row.file_url"
            :href="row.file_url"
            target="_blank"
            rel="noopener noreferrer"
            class="p-2 rounded-md hover:bg-muted"
            title="Abrir archivo"
          >
            <ExternalLink :size="15" />
          </a>
          <button class="p-2 rounded-md hover:bg-muted text-destructive hover:bg-destructive/10" title="Eliminar" @click="handleDelete(row.uuid)">
            <Trash2 :size="15" />
          </button>
        </div>
      </template>
    </AppTable>

    <AppPagination
      :count="docList.pagination.count"
      :page="docList.pagination.page"
      :page-size="docList.pagination.pageSize"
      @change="docList.setPage"
    />

    <!-- ══ MODAL: Subir documento ══ -->
    <AppModal v-if="showModal" title="Subir documento" size="md" @close="showModal = false">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppAlert v-if="uploadError" type="error" :message="uploadError" class="col-span-full" />

        <FormField label="Archivo" required class="col-span-full">
          <div class="flex flex-col items-center gap-1.5 p-7 border-2 border-dashed border-border rounded-lg cursor-pointer transition-colors bg-slate-50 text-center hover:border-primary" @click="fileInputRef?.click()">
            <input
              ref="fileInputRef"
              type="file"
              class="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv"
              @change="onFileChange"
            />
            <template v-if="selectedFile">
              <FileText :size="20" class="text-muted-foreground" />
              <span class="text-sm font-semibold">{{ selectedFile.name }}</span>
              <span class="text-xs text-muted-foreground">{{ fileSize(selectedFile.size) }}</span>
            </template>
            <template v-else>
              <Upload :size="24" class="text-muted-foreground" />
              <span class="text-sm text-muted-foreground">
                Haz clic para seleccionar un archivo
              </span>
              <span class="text-xs text-muted-foreground">
                PDF, imagen, Word, Excel — máx. 20 MB
              </span>
            </template>
          </div>
        </FormField>

        <FormField label="Tipo de documento" required>
          <AppSelect v-model="uploadMeta.document_type" required>
            <option v-for="t in DOCUMENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </AppSelect>
        </FormField>

        <FormField label="Módulo relacionado">
          <AppSelect v-model="uploadMeta.related_model">
            <option value="">Sin módulo</option>
            <option value="PurchaseOrder">Orden de compra</option>
            <option value="PurchaseReceipt">Recepción</option>
            <option value="SupplierClaim">Reclamo proveedor</option>
            <option value="SupplyRequest">Solicitud de insumos</option>
          </AppSelect>
        </FormField>

        <FormField label="UUID del registro relacionado" class="col-span-full">
          <AppInput
            v-model="uploadMeta.related_uuid"
            type="text"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </FormField>

        <FormField label="Notas" class="col-span-full">
          <AppTextarea v-model="uploadMeta.notes" rows="2" />
        </FormField>

        <div class="col-span-full flex justify-end gap-3 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground" @click="showModal = false">Cancelar</button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
            :disabled="uploading || !selectedFile"
            @click="handleUpload"
          >
            <Upload v-if="!uploading" :size="15" />
            {{ uploading ? 'Subiendo...' : 'Subir archivo' }}
          </button>
        </div>
      </div>
    </AppModal>
  </section>
</template>


