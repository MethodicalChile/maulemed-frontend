<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { DollarSign, History, Pencil, Plus, Search, Trash2, XCircle, ImagePlus } from 'lucide-vue-next'
import { suppliersApi } from '@/api/suppliers.api'
import { optionsApi } from '@/api/options.api'
import { useList } from '@/composables/useList'
import { useForm } from '@/composables/useForm'
import { usePermissions } from '@/composables/usePermissions'
import { useRefresh } from '@/composables/useRefresh'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormField from '@/components/common/FormField.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'

const { canCreateSuppliers, canEditSuppliers, canDeleteSuppliers, canManageSuppliers } = usePermissions()

const columns = [
  { key: 'name',          label: 'Nombre' },
  { key: 'rut',           label: 'RUT' },
  { key: 'contact_name',  label: 'Contacto' },
  { key: 'email',         label: 'Email' },
  { key: 'phone',         label: 'Teléfono' },
  { key: 'delivery_days', label: 'Días entrega' },
  { key: 'is_active',     label: 'Estado', width: '100px' },
  { key: 'actions',       label: '',       width: '110px' },
]

const { items, loading, error, pagination, params, load, setPage, setParam } = useList(
  suppliersApi.listSuppliers
)

const { setRefreshFunction, clearRefreshFunction } = useRefresh()
onMounted(() => {
  setRefreshFunction(load)
  load()
})
onUnmounted(clearRefreshFunction)

// ── Crear / Editar proveedor ──────────────────────────────────────────────────
const showForm    = ref(false)
const editingItem = ref(null)
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

// Exponemos items para depuración en consola
window.itemsForDebug = items

const imageInput = ref(null)
const imagePreview = ref('')
const originalImageUrl = ref('')
const imageError = ref('')
let localImageUrl = null

function releaseLocalImageUrl() {
  if (!localImageUrl) return
  URL.revokeObjectURL(localImageUrl)
  localImageUrl = null
}

function resetImageState() {
  releaseLocalImageUrl()
  imagePreview.value = ''
  originalImageUrl.value = ''
  imageError.value = ''
  form.image = null
  form.remove_image = false
  if (imageInput.value) imageInput.value.value = ''
}

function openImageSelector() { imageInput.value?.click() }

function handleImageChange(event) {
  imageError.value = ''
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    imageError.value = 'Solo se permiten imágenes JPG, PNG o WEBP.'
    event.target.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    imageError.value = 'La imagen no puede superar los 5 MB.'
    event.target.value = ''
    return
  }
  releaseLocalImageUrl()
  localImageUrl = URL.createObjectURL(file)
  imagePreview.value = localImageUrl
  form.image = file
  form.remove_image = false
}

function removeSupplierImage() {
  releaseLocalImageUrl()
  imagePreview.value = ''
  imageError.value = ''
  form.image = null
  form.remove_image = true
  if (imageInput.value) imageInput.value.value = ''
}

function discardImageChange() {
  releaseLocalImageUrl()
  form.image = null
  form.remove_image = false
  imagePreview.value = originalImageUrl.value
  imageError.value = ''
  if (imageInput.value) imageInput.value.value = ''
}

const emptyForm = {
  name: '', rut: '', contact_name: '', email: '', phone: '',
  address: '', payment_terms: '', delivery_days: '', is_active: true,
}
const { form, loading: formLoading, error: formError, reset, fill, submit } = useForm(
  emptyForm,
  (data) => editingItem.value
    ? suppliersApi.updateSupplier(editingItem.value.uuid, data)
    : suppliersApi.createSupplier(data)
)

onMounted(load)

function openCreate() { editingItem.value = null; reset(); showForm.value = true }
function openEdit(row) {
  editingItem.value = row
  fill({
    name: row.name, rut: row.rut ?? '', contact_name: row.contact_name ?? '',
    email: row.email ?? '', phone: row.phone ?? '', address: row.address ?? '',
    payment_terms: row.payment_terms ?? '', delivery_days: row.delivery_days ?? '',
    is_active: row.is_active,
  })
  showForm.value = true
}
async function handleSubmit() {
  formError.value = ''
  try {
    editingItem.value
      ? await suppliersApi.updateSupplier(editingItem.value.uuid, form)
      : await suppliersApi.createSupplier(form)
    showForm.value = false
    load()
  } catch (err) {
      console.error("Error al guardar:", err);
      formError.value = err.response?.data?.message ?? err.response?.data?.detail ?? 'Error al guardar.'
  }
}
async function confirmDelete() {
  deleteLoading.value = true
  try { await suppliersApi.deleteSupplier(deleteTarget.value.uuid); deleteTarget.value = null; load() }
  finally { deleteLoading.value = false }
}

const showProductsModal = ref(false)

const viewingSupplier   = ref(null)
const spList            = ref([])
const spLoading         = ref(false)
const spError           = ref('')
const allProducts       = ref([])

const showSPModal   = ref(false)
const editingSP     = ref(null)
const spFormLoading = ref(false)
const spFormError   = ref('')
const spForm        = ref({
  product: '', supplier_sku: '', last_price: '', currency: 'CLP',
  min_purchase_quantity: '', requires_purchase_order: false,
  allows_credit: true, allows_cash_purchase: true, is_active: true,
})

const showPriceModal = ref(false)
const viewingSP      = ref(null)
const priceList      = ref([])
const priceLoading   = ref(false)
const showPriceForm  = ref(false)
const priceFormLoad  = ref(false)
const priceFormError = ref('')
const editingPrice   = ref(null)
const priceForm      = ref({ price: '', currency: 'CLP', valid_from: '', valid_to: '', source: '' })

async function openProductsModal(supplier) {
  viewingSupplier.value = supplier
  spError.value = ''
  spLoading.value = true
  showProductsModal.value = true
  try {
    const [spRes, prRes] = await Promise.allSettled([
      // FIX: filtrar por uuid, no por id — más robusto ante cambios del backend
      suppliersApi.listSupplierProducts({ supplier: supplier.uuid, page_size: 200 }),
      optionsApi.getProducts(),
    ])
    if (spRes.status === 'fulfilled') {
      const d = spRes.value.data?.data ?? spRes.value.data
      spList.value = Array.isArray(d) ? d : d.results ?? d
    }
    if (prRes.status === 'fulfilled') {
      const d = prRes.value.data?.data ?? prRes.value.data
      allProducts.value = Array.isArray(d) ? d : d.results ?? d
    }
  } catch (e) { spError.value = e.response?.data?.message ?? 'Error al cargar productos' }
  finally { spLoading.value = false }
}

function openCreateSP() {
  editingSP.value = null; spFormError.value = ''
  spForm.value = {
    product: '', supplier_sku: '', last_price: '', currency: 'CLP',
    min_purchase_quantity: '', requires_purchase_order: false,
    allows_credit: true, allows_cash_purchase: true, is_active: true,
  }
  showSPModal.value = true
}
function openEditSP(sp) {
  editingSP.value = sp; spFormError.value = ''
  spForm.value = {
    // FIX: product ya viene como uuid desde la respuesta del serializer
    product: sp.product_detail?.uuid ?? sp.product,
    supplier_sku: sp.supplier_sku ?? '',
    last_price: sp.last_price ?? '', currency: sp.currency ?? 'CLP',
    min_purchase_quantity: sp.min_purchase_quantity ?? '',
    requires_purchase_order: sp.requires_purchase_order,
    allows_credit: sp.allows_credit, allows_cash_purchase: sp.allows_cash_purchase,
    is_active: sp.is_active,
  }
  showSPModal.value = true
}
async function handleSPSubmit() {
  spFormLoading.value = true; spFormError.value = ''
  try {
    // FIX: supplier debe ser uuid, no id
    const payload = { ...spForm.value, supplier: viewingSupplier.value.uuid }
    editingSP.value
      ? await suppliersApi.updateSupplierProduct(editingSP.value.uuid, payload)
      : await suppliersApi.createSupplierProduct(payload)
    showSPModal.value = false
    await openProductsModal(viewingSupplier.value)
  } catch (e) { spFormError.value = e.response?.data?.message ?? 'Error al guardar' }
  finally { spFormLoading.value = false }
}
async function deleteSP(sp) {
  if (!confirm(`¿Eliminar relación con "${productName(sp.product)}"?`)) return
  await suppliersApi.deleteSupplierProduct(sp.uuid).catch(() => null)
  await openProductsModal(viewingSupplier.value)
}

function productName(productId) {
  return allProducts.value.find(p => p.uuid === productId || p.id === productId)?.name ?? productId
}

// Precios
async function openPrices(sp) {
  viewingSP.value = sp
  priceList.value = []
  priceLoading.value = true
  showPriceModal.value = true
  try {
    const res = await suppliersApi.listPrices({ supplier_product: sp.uuid, page_size: 200 })
    const d = res.data?.data ?? res.data
    priceList.value = Array.isArray(d) ? d : d.results ?? d
  } catch { priceList.value = [] }
  finally { priceLoading.value = false }
}
function openCreatePrice() {
  editingPrice.value = null; priceFormError.value = ''
  priceForm.value = { price: '', currency: 'CLP', valid_from: '', valid_to: '', source: '' }
  showPriceForm.value = true
}
function openEditPrice(p) {
  editingPrice.value = p; priceFormError.value = ''
  priceForm.value = {
    price: p.price, currency: p.currency ?? 'CLP',
    valid_from: p.valid_from ?? '', valid_to: p.valid_to ?? '', source: p.source ?? '',
  }
  showPriceForm.value = true
}
async function handlePriceSubmit() {
  priceFormLoad.value = true; priceFormError.value = ''
  try {
    const payload = { ...priceForm.value, supplier_product: viewingSP.value.uuid }
    editingPrice.value
      ? await suppliersApi.updatePrice(editingPrice.value.uuid, payload)
      : await suppliersApi.createPrice(payload)
    showPriceForm.value = false
    await openPrices(viewingSP.value)
  } catch (e) { priceFormError.value = e.response?.data?.message ?? 'Error al guardar' }
  finally { priceFormLoad.value = false }
}
async function deletePrice(p) {
  if (!confirm('¿Eliminar este precio?')) return
  await suppliersApi.deletePrice(p.uuid).catch(() => null)
  await openPrices(viewingSP.value)
}

function fmtCLP(val) {
  if (val == null || val === '') return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
}
function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CL')
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader title="Proveedores" subtitle="Gestión de proveedores y sus precios">
      <button v-if="canManageSuppliers" class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-md hover:bg-primary/90 transition-all hover:scale-105" @click="openCreate">
        <Plus :size="18" /> Nuevo proveedor
      </button>
    </PageHeader>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-card border border-border shadow-sm hidden">
      <div class="relative">
        <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            type="text"
            placeholder="Buscar por nombre, RUT..."
            :model-value="params.search"
            @update:model-value="setParam('search', $event)"
            class="pl-10"
          />
      </div>
      <AppSelect :model-value="params.is_active" @update:model-value="setParam('is_active', $event)">
        <option value="">Todos</option>
        <option value="true">Activos</option>
        <option value="false">Inactivos</option>
      </AppSelect>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <AppTable :columns="columns" :rows="items" :loading="loading">
      <template #filter-name>
         <AppInput type="text" placeholder="Buscar..." :model-value="params.search" @update:model-value="setParam('search', $event)" />
      </template>

      <template #is_active="{ row }">
        <span :class="['px-2 py-0.5 rounded-full text-xs font-bold', row.is_active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground']">
          {{ row.is_active ? 'Activo' : 'Inactivo' }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-1 justify-end">
          <button class="p-1 rounded hover:bg-muted" title="Productos y precios" @click="openProductsModal(row)">
            <DollarSign :size="16" />
          </button>
          <button v-if="canManageSuppliers" class="p-1 rounded hover:bg-muted" title="Editar" @click="openEdit(row)">
            <Pencil :size="16" />
          </button>
          <button v-if="canManageSuppliers" class="p-1 rounded hover:bg-muted text-destructive hover:bg-destructive/10" title="Eliminar" @click="deleteTarget = row">
            <Trash2 :size="16" />
          </button>
        </div>
      </template>
    </AppTable>

    <AppPagination
      :count="pagination.count"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      @change="setPage"
    />

    <!-- ══ MODAL: Crear / editar proveedor ══ -->
    <AppModal
      v-if="showForm"
      :title="editingItem ? 'Editar proveedor' : 'Nuevo proveedor'"
      size="lg"
      @close="showForm = false"
    >
      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
        <AppAlert v-if="formError" type="error" :message="formError" class="col-span-full" />
        <FormField label="Nombre" required><AppInput v-model="form.name" type="text" required /></FormField>
        <FormField label="RUT"><AppInput v-model="form.rut" type="text" /></FormField>
        <FormField label="Contacto"><AppInput v-model="form.contact_name" type="text" /></FormField>
        <FormField label="Email"><AppInput v-model="form.email" type="email" /></FormField>
        <FormField label="Teléfono"><AppInput v-model="form.phone" type="text" /></FormField>
        <FormField label="Días de entrega"><AppInput v-model="form.delivery_days" type="number" /></FormField>
        <FormField label="Condiciones de pago" class="col-span-full"><AppInput v-model="form.payment_terms" type="text" /></FormField>
        <FormField label="Dirección" class="col-span-full"><AppTextarea v-model="form.address" rows="2" /></FormField>
        <label class="col-span-full flex items-center gap-2 text-sm"><input v-model="form.is_active" type="checkbox" /> Activo</label>
        
        <div class="flex justify-end gap-3 col-span-full mt-4 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground" @click="showForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" :disabled="formLoading">
            {{ formLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Productos del proveedor ══ -->
    <AppModal
      v-if="showProductsModal && viewingSupplier"
      :title="`Productos — ${viewingSupplier.name}`"
      size="xl"
      @close="showProductsModal = false"
    >
      <div class="flex justify-between items-center mb-4">
        <span class="text-sm text-muted-foreground">{{ spList.length }} producto(s) vinculado(s)</span>
        <button v-if="canManageSuppliers" class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" @click="openCreateSP">
          <Plus :size="14" /> Vincular producto
        </button>
      </div>
      <AppAlert v-if="spError" type="error" :message="spError" />
      <div v-if="spLoading" class="text-center p-6 text-muted-foreground">Cargando...</div>
      <table v-else-if="spList.length" class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
            <th class="p-2 text-left">Producto</th>
            <th class="p-2 text-left">SKU prov.</th>
            <th class="p-2 text-left">Último precio</th>
            <th class="p-2 text-left">Moneda</th>
            <th class="p-2 text-left">Activo</th>
            <th class="p-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="sp in spList" :key="sp.uuid">
            <td class="p-2">{{ sp.product_detail?.name ?? productName(sp.product) }}</td>
            <td class="p-2">{{ sp.supplier_sku ?? '—' }}</td>
            <td class="p-2">{{ sp.last_price ? fmtCLP(sp.last_price) : '—' }}</td>
            <td class="p-2">{{ sp.currency ?? 'CLP' }}</td>
            <td class="p-2">
              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold', sp.is_active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground']">
                {{ sp.is_active ? 'Sí' : 'No' }}
              </span>
            </td>
            <td class="p-2">
              <div class="flex gap-1">
                <button class="p-1.5 rounded-md hover:bg-muted" title="Historial de precios" @click="openPrices(sp)">
                  <History :size="14" />
                </button>
                <button v-if="canManageSuppliers" class="p-1.5 rounded-md hover:bg-muted" title="Editar" @click="openEditSP(sp)">
                  <Pencil :size="14" />
                </button>
                <button v-if="canManageSuppliers" class="p-1.5 rounded-md hover:bg-muted text-destructive hover:bg-destructive/10" title="Desvincular" @click="deleteSP(sp)">
                  <XCircle :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!spLoading" class="text-muted-foreground text-sm text-center py-6">
        Sin productos vinculados. Usa el botón para vincular.
      </p>
    </AppModal>

    <!-- ══ MODAL: Crear / editar SupplierProduct ══ -->
    <AppModal
      v-if="showSPModal"
      :title="editingSP ? 'Editar producto vinculado' : 'Vincular producto'"
      size="md"
      @close="showSPModal = false"
    >
      <form class="grid grid-cols-1 gap-4" @submit.prevent="handleSPSubmit">
        <AppAlert v-if="spFormError" type="error" :message="spFormError" />
        <FormField label="Producto" required>
          <AppSelect v-model="spForm.product" required>
            <option value="">Seleccionar producto</option>
            <option v-for="p in allProducts" :key="p.uuid" :value="p.uuid">{{ p.name }}</option>
          </AppSelect>
        </FormField>
        <FormField label="SKU del proveedor">
          <AppInput v-model="spForm.supplier_sku" type="text" />
        </FormField>
        <FormField label="Último precio conocido">
          <AppInput v-model="spForm.last_price" type="number" />
        </FormField>
        <FormField label="Moneda">
          <AppSelect v-model="spForm.currency">
            <option value="CLP">CLP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </AppSelect>
        </FormField>
        <FormField label="Cantidad mínima de compra">
          <AppInput v-model="spForm.min_purchase_quantity" type="number" />
        </FormField>
        <div class="flex flex-wrap gap-4 text-sm">
          <label class="flex items-center gap-2"><input v-model="spForm.requires_purchase_order" type="checkbox" /> Requiere OC</label>
          <label class="flex items-center gap-2"><input v-model="spForm.allows_credit" type="checkbox" /> Permite crédito</label>
          <label class="flex items-center gap-2"><input v-model="spForm.allows_cash_purchase" type="checkbox" /> Permite compra en efectivo</label>
          <label class="flex items-center gap-2"><input v-model="spForm.is_active" type="checkbox" /> Activo</label>
        </div>
        <div class="flex justify-end gap-3 mt-4 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground" @click="showSPModal = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" :disabled="spFormLoading">
            {{ spFormLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Historial de precios ══ -->
    <AppModal
      v-if="showPriceModal && viewingSP"
      :title="`Precios — ${viewingSP.product_detail?.name ?? 'Producto'}`"
      size="lg"
      @close="showPriceModal = false"
    >
      <div class="flex justify-between items-center mb-4">
        <span class="text-sm text-muted-foreground">{{ priceList.length }} registro(s)</span>
        <button v-if="canManageSuppliers" class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" @click="openCreatePrice">
          <Plus :size="14" /> Registrar precio
        </button>
      </div>
      <div v-if="priceLoading" class="text-center p-6 text-muted-foreground">Cargando...</div>
      <table v-else-if="priceList.length" class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
            <th class="p-2 text-left">Precio</th><th class="p-2 text-left">Moneda</th><th class="p-2 text-left">Desde</th><th class="p-2 text-left">Hasta</th><th class="p-2 text-left">Fuente</th><th class="p-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="p in priceList" :key="p.uuid">
            <td class="p-2 font-semibold">{{ fmtCLP(p.price) }}</td>
            <td class="p-2">{{ p.currency }}</td>
            <td class="p-2">{{ fmtDate(p.valid_from) }}</td>
            <td class="p-2">{{ p.valid_to ? fmtDate(p.valid_to) : 'Vigente' }}</td>
            <td class="p-2">{{ p.source ?? '—' }}</td>
            <td class="p-2">
              <div class="flex gap-1">
                <button v-if="canManageSuppliers" class="p-1.5 rounded-md hover:bg-muted" title="Editar" @click="openEditPrice(p)">
                  <Pencil :size="13" />
                </button>
                <button v-if="canManageSuppliers" class="p-1.5 rounded-md hover:bg-muted text-destructive hover:bg-destructive/10" title="Eliminar" @click="deletePrice(p)">
                  <XCircle :size="13" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!priceLoading" class="text-muted-foreground text-sm text-center py-6">
        Sin precios registrados.
      </p>

      <!-- Sub-formulario de precio -->
      <div v-if="showPriceForm" class="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
        <div class="bg-card w-full max-w-md p-6 rounded-lg shadow-xl">
          <h4 class="text-sm font-semibold mb-4">
            {{ editingPrice ? 'Editar precio' : 'Nuevo precio' }}
          </h4>
          <AppAlert v-if="priceFormError" type="error" :message="priceFormError" />
          <div class="grid grid-cols-1 gap-4">
            <FormField label="Precio" required>
              <AppInput v-model="priceForm.price" type="number" required />
            </FormField>
            <FormField label="Moneda">
              <AppSelect v-model="priceForm.currency">
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </AppSelect>
            </FormField>
            <FormField label="Válido desde" required>
              <AppInput v-model="priceForm.valid_from" type="date" required />
            </FormField>
            <FormField label="Válido hasta">
              <AppInput v-model="priceForm.valid_to" type="date" />
            </FormField>
            <FormField label="Fuente / referencia">
              <AppInput v-model="priceForm.source" type="text" placeholder="Ej: Cotización, factura..." />
            </FormField>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground" @click="showPriceForm = false">Cancelar</button>
            <button type="button" class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" :disabled="priceFormLoad" @click="handlePriceSubmit">
              {{ priceFormLoad ? 'Guardando...' : 'Guardar precio' }}
            </button>
          </div>
        </div>
      </div>
    </AppModal>

    <ConfirmDialog
      v-if="deleteTarget"
      title="Eliminar proveedor"
      :message="`¿Seguro que desea eliminar &quot;${deleteTarget.name}&quot;?`"
      confirm-label="Eliminar"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </section>
</template>
