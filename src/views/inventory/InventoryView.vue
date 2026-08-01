<script setup>
import { ref, onMounted } from 'vue'
import { Search, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { inventoryApi } from '@/api/inventory.api'
import { optionsApi } from '@/api/options.api'
import { useList } from '@/composables/useList'
import { useForm } from '@/composables/useForm'
import { usePermissions } from '@/composables/usePermissions'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import FormField from '@/components/common/FormField.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'

const { canManageInventory } = usePermissions()

// ── Tabs ──────────────────────────────────────────────────────────────────────
const tabs = ['Stock', 'Lotes', 'Movimientos', 'Bodegas']
const activeTab = ref('Stock')

// ── Stock ─────────────────────────────────────────────────────────────────────
const stockColumns = [
  { key: 'product',           label: 'Producto' },
  { key: 'warehouse',         label: 'Bodega' },
  { key: 'quantity',          label: 'Cantidad' },
  { key: 'reserved_quantity', label: 'Reservado' },
  { key: 'available',         label: 'Disponible' },
]
const stockList = useList(inventoryApi.listStocks)

// ── Lotes ─────────────────────────────────────────────────────────────────────
const lotColumns = [
  { key: 'product',         label: 'Producto' },
  { key: 'lot_number',      label: 'N° Lote' },
  { key: 'expiration_date', label: 'Vencimiento' },
  { key: 'quantity',        label: 'Cantidad' },
  { key: 'status',          label: 'Estado' },
  { key: 'actions',         label: '', width: '60px' },
]
const lotList = useList(inventoryApi.listLots)

const showLotForm   = ref(false)
const editingLot    = ref(null)
const warehouses    = ref([])

const emptyLotForm = {
  status: 'DISPONIBLE',
}

const { form: lotForm, loading: lotLoading, error: lotError, fill: lotFill, submit: lotSubmit } = useForm(
  emptyLotForm,
  (data) => inventoryApi.updateLot(editingLot.value.uuid, data)
)

async function handleLotSubmit() {
  await lotSubmit()
  showLotForm.value = false
  lotList.load()
}

// ── Movimientos ───────────────────────────────────────────────────────────────
const movColumns = [
  { key: 'movement_type', label: 'Tipo' },
  { key: 'product',       label: 'Producto' },
  { key: 'quantity',      label: 'Cantidad' },
  { key: 'origin',        label: 'Origen' },
  { key: 'destination',   label: 'Destino' },
  { key: 'created_at',    label: 'Fecha' },
]
const movList = useList(inventoryApi.listMovements)

const showMovForm  = ref(false)
const allProducts  = ref([])

const emptyMovForm = {
  movement_type:         'AJUSTE_POSITIVO',
  product:               '',
  warehouse_destination: '',
  warehouse_origin:      '',
  quantity:              '',
  reason:                '',
}

const { form: movForm, error: movError, reset: movReset } = useForm(
  emptyMovForm,
  () => {} // submit manejado manualmente abajo
)
const movLoading = ref(false)

async function handleMovSubmit() {
  movError.value = null
  movLoading.value = true
  try {
    const type = movForm.movement_type
    const payload = {
      product_uuid:  movForm.product,
      quantity:      movForm.quantity,
      reason:        movForm.reason || undefined,
    }

    if (['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'].includes(type)) {
      // adjust espera quantity positiva para + y negativa para -
      const qty = type === 'AJUSTE_NEGATIVO'
        ? -Math.abs(movForm.quantity)
        : Math.abs(movForm.quantity)
      await inventoryApi.adjustStock({
        warehouse_uuid: movForm.warehouse_origin || movForm.warehouse_destination,
        product_uuid:   movForm.product,
        quantity:       qty,
        reason:         movForm.reason || 'Ajuste manual',
      })
    } else if (['EGRESO_CONSUMO', 'MERMA', 'VENCIMIENTO'].includes(type)) {
      await inventoryApi.decreaseStock({
        warehouse_uuid: movForm.warehouse_origin,
        product_uuid:   movForm.product,
        quantity:       movForm.quantity,
        reason:         movForm.reason || undefined,
      })
    } else {
      // Fallback: POST directo para tipos no cubiertos por acciones custom
      await inventoryApi.createMovement({
        movement_type:         type,
        product:               movForm.product,
        warehouse_origin:      movForm.warehouse_origin  || null,
        warehouse_destination: movForm.warehouse_destination || null,
        quantity:              movForm.quantity,
        reason:                movForm.reason || null,
      })
    }

    showMovForm.value = false
    movList.load()
    stockList.load()
  } catch (e) {
    movError.value = e.response?.data?.message ?? 'Error al registrar el movimiento.'
  } finally {
    movLoading.value = false
  }
}

// ── Bodegas ───────────────────────────────────────────────────────────────────
const warehouseList = useList(inventoryApi.listWarehouses)

const warehouseColumns = [
  { key: 'name',           label: 'Nombre' },
  { key: 'branch',         label: 'Sucursal' },
  { key: 'warehouse_type', label: 'Tipo',   width: '130px' },
  { key: 'is_active',      label: 'Estado', width: '100px' },
  { key: 'actions',        label: '',       width: '100px' },
]

const showWarehouseForm  = ref(false)
const editingWarehouse   = ref(null)
const deleteWarehouse    = ref(null)
const deleteWhLoading    = ref(false)
const whFormLoading      = ref(false)
const whFormError        = ref('')
const allBranches        = ref([])

const warehouseForm = ref({
  name: '', branch: '', warehouse_type: 'GENERAL',
  description: '', is_active: true,
})

const WAREHOUSE_TYPES = [
  { value: 'GENERAL',    label: 'General' },
  { value: 'FARMACIA',   label: 'Farmacia' },
  { value: 'INSUMOS',    label: 'Insumos' },
  { value: 'CRITICO',    label: 'Crítico' },
  { value: 'TRANSITO',   label: 'En tránsito' },
  { value: 'DEVOLUCION', label: 'Devolución' },
]

function openCreateWarehouse() {
  editingWarehouse.value = null
  whFormError.value = ''
  warehouseForm.value = { name: '', branch: '', warehouse_type: 'GENERAL', description: '', is_active: true }
  showWarehouseForm.value = true
}

function openEditWarehouse(row) {
  editingWarehouse.value = row
  whFormError.value = ''
  warehouseForm.value = {
    name: row.name, branch: row.branch,
    warehouse_type: row.warehouse_type ?? 'GENERAL',
    description: row.description ?? '', is_active: row.is_active,
  }
  showWarehouseForm.value = true
}

async function handleWarehouseSubmit() {
  whFormLoading.value = true; whFormError.value = ''
  try {
    editingWarehouse.value
      ? await inventoryApi.updateWarehouse(editingWarehouse.value.uuid, warehouseForm.value)
      : await inventoryApi.createWarehouse(warehouseForm.value)
    showWarehouseForm.value = false
    warehouseList.load()
    // Refrescar el array local de bodegas que usan los selects
    const res = await optionsApi.getWarehouses().catch(() => null)
    if (res) {
      const d = res.data?.data ?? res.data
      warehouses.value = Array.isArray(d) ? d : d.results ?? d
    }
  } catch (e) { whFormError.value = e.response?.data?.message ?? 'Error al guardar' }
  finally { whFormLoading.value = false }
}

async function confirmDeleteWarehouse() {
  deleteWhLoading.value = true
  try {
    await inventoryApi.deleteWarehouse(deleteWarehouse.value.uuid)
    deleteWarehouse.value = null
    warehouseList.load()
  } finally { deleteWhLoading.value = false }
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  stockList.load()
  lotList.load()
  movList.load()
  warehouseList.load()

  const [whRes, prodRes, brRes] = await Promise.allSettled([
    optionsApi.getWarehouses(),
    optionsApi.getProducts(),
    optionsApi.getBranches(),
  ])
  if (whRes.status === 'fulfilled') {
    const d = whRes.value.data?.data ?? whRes.value.data
    warehouses.value = Array.isArray(d) ? d : d.results ?? d
  }
  if (prodRes.status === 'fulfilled') {
    const d = prodRes.value.data?.data ?? prodRes.value.data
    allProducts.value = Array.isArray(d) ? d : d.results ?? d
  }
  if (brRes.status === 'fulfilled') {
    const d = brRes.value.data?.data ?? brRes.value.data
    allBranches.value = Array.isArray(d) ? d : d.results ?? d
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(val) {
  if (val == null) return '—'
  return parseFloat(val).toLocaleString('es-CL', { maximumFractionDigits: 3 })
}

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CL')
}

const LOT_STATUSES = ['DISPONIBLE', 'RESERVADO', 'VENCIDO', 'CONSUMIDO', 'BLOQUEADO']

const MOV_TYPES_WRITE = [
  { value: 'AJUSTE_POSITIVO',  label: 'Ajuste positivo' },
  { value: 'AJUSTE_NEGATIVO',  label: 'Ajuste negativo' },
  { value: 'EGRESO_CONSUMO',   label: 'Egreso por consumo' },
  { value: 'MERMA',            label: 'Merma' },
  { value: 'VENCIMIENTO',      label: 'Vencimiento' },
]

// Movimientos que requieren bodega origen
const needsOrigin = (type) => ['EGRESO_CONSUMO', 'AJUSTE_NEGATIVO', 'MERMA', 'VENCIMIENTO'].includes(type)
// Movimientos que requieren bodega destino
const needsDestination = (type) => ['AJUSTE_POSITIVO'].includes(type)
</script>

<template>
  <section class="page">
    <PageHeader title="Inventario" subtitle="Stock, lotes y movimientos">
      <button
        v-if="canManageInventory && activeTab === 'Movimientos'"
        class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        @click="movReset(); showMovForm = true"
      >
        <Plus :size="16" /> Registrar movimiento
      </button>
      <button
        v-if="canManageInventory && activeTab === 'Bodegas'"
        class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        @click="openCreateWarehouse"
      >
        <Plus :size="16" /> Nueva bodega
      </button>
    </PageHeader>

    <div class="flex border-b border-border mb-4">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="['px-4 py-2 text-sm font-semibold border-b-2 transition-colors', activeTab === tab ? 'text-primary border-primary' : 'text-muted-foreground hover:text-foreground border-transparent']"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- ── STOCK ── -->
    <template v-if="activeTab === 'Stock'">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-card border border-border shadow-sm mb-4">
        <div class="relative col-span-2">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            type="text"
            placeholder="Buscar producto..."
            :model-value="stockList.params.search"
            @update:model-value="stockList.setParam('search', $event)"
            class="pl-10"
          />
        </div>
        <AppSelect
          :model-value="stockList.params.warehouse"
          @update:model-value="stockList.setParam('warehouse', $event)"
        >
          <option value="">Todas las bodegas</option>
          <option v-for="w in warehouses" :key="w.uuid" :value="w.uuid">{{ w.name }}</option>
        </AppSelect>
      </div>
      <AppAlert v-if="stockList.error.value" type="error" :message="stockList.error.value" />
      <AppTable :columns="stockColumns" :rows="stockList.items.value" :loading="stockList.loading.value">
        <template #product="{ row }">{{ row.product_detail?.name ?? '—' }}</template>
        <template #warehouse="{ row }">{{ row.warehouse_detail?.name ?? '—' }}</template>
        <template #quantity="{ row }">{{ fmt(row.quantity) }}</template>
        <template #reserved_quantity="{ row }">{{ fmt(row.reserved_quantity) }}</template>
        <template #available="{ row }">
          <span :class="parseFloat(row.available_quantity) <= 0 ? 'text-destructive font-semibold' : ''">
            {{ fmt(row.available_quantity) }}
          </span>
        </template>
      </AppTable>
      <AppPagination
        :count="stockList.pagination.count"
        :page="stockList.pagination.page"
        :page-size="stockList.pagination.pageSize"
        @change="stockList.setPage"
      />
    </template>

    <!-- ── LOTES ── -->
    <template v-if="activeTab === 'Lotes'">
      <AppAlert v-if="lotList.error.value" type="error" :message="lotList.error.value" />
      <AppTable :columns="lotColumns" :rows="lotList.items.value" :loading="lotList.loading.value">
        <template #product="{ row }">{{ row.product_detail?.name ?? '—' }}</template>
        <template #quantity="{ row }">{{ fmt(row.quantity) }}</template>
        <template #expiration_date="{ row }">{{ fmtDate(row.expiration_date) }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #actions="{ row }">
          <div class="flex gap-1.5 flex-wrap">
            <button
              v-if="canManageInventory"
              class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              title="Cambiar estado"
              @click="editingLot = row; lotFill({ status: row.status }); showLotForm = true"
            >
              <Pencil :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="lotList.pagination.count"
        :page="lotList.pagination.page"
        :page-size="lotList.pagination.pageSize"
        @change="lotList.setPage"
      />
    </template>

    <!-- ── MOVIMIENTOS ── -->
    <template v-if="activeTab === 'Movimientos'">
      <div class="p-4 rounded-xl bg-card border border-border shadow-sm mb-4">
        <AppSelect
          :model-value="movList.params.movement_type"
          @update:model-value="movList.setParam('movement_type', $event)"
        >
          <option value="">Todos los tipos</option>
          <option v-for="t in MOV_TYPES_WRITE" :key="t.value" :value="t.value">{{ t.label }}</option>
        </AppSelect>
      </div>
      <AppAlert v-if="movList.error.value" type="error" :message="movList.error.value" />

      <AppTable :columns="movColumns" :rows="movList.items.value" :loading="movList.loading.value">
        <template #movement_type="{ row }"><StatusBadge :status="row.movement_type" /></template>
        <template #product="{ row }">{{ row.product_detail?.name ?? '—' }}</template>
        <template #quantity="{ row }">{{ fmt(row.quantity) }}</template>
        <template #origin="{ row }">{{ row.warehouse_origin_detail?.name ?? '—' }}</template>
        <template #destination="{ row }">{{ row.warehouse_destination_detail?.name ?? '—' }}</template>
        <template #created_at="{ row }">{{ fmtDate(row.created_at) }}</template>
      </AppTable>
      <AppPagination
        :count="movList.pagination.count"
        :page="movList.pagination.page"
        :page-size="movList.pagination.pageSize"
        @change="movList.setPage"
      />
    </template>

    <!-- ── BODEGAS ── -->
    <template v-if="activeTab === 'Bodegas'">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-card border border-border shadow-sm mb-4">
        <div class="relative col-span-2">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            type="text"
            placeholder="Buscar bodega..."
            :model-value="warehouseList.params.search"
            @update:model-value="warehouseList.setParam('search', $event)"
          />
        </div>
        <AppSelect
          :model-value="warehouseList.params.is_active"
          @update:model-value="warehouseList.setParam('is_active', $event)"
        >
          <option value="">Todas</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </AppSelect>
      </div>
      <AppAlert v-if="warehouseList.error.value" type="error" :message="warehouseList.error.value" />
      <AppTable :columns="warehouseColumns" :rows="warehouseList.items.value" :loading="warehouseList.loading.value">
        <template #branch="{ row }">{{ row.branch_detail?.name ?? '—' }}</template>
        <template #warehouse_type="{ row }">
          <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{{ row.warehouse_type ?? '—' }}</span>
        </template>
        <template #is_active="{ row }">
          <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', row.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground']">
            {{ row.is_active ? 'Activa' : 'Inactiva' }}
          </span>
        </template>
        <template #actions="{ row }">
          <div class="flex gap-1.5 flex-wrap">
            <button v-if="canManageInventory" class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all" title="Editar" @click="openEditWarehouse(row)">
              <Pencil :size="15" />
            </button>
            <button v-if="canManageInventory" class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all" title="Eliminar" @click="deleteWarehouse = row">
              <Trash2 :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="warehouseList.pagination.count"
        :page="warehouseList.pagination.page"
        :page-size="warehouseList.pagination.pageSize"
        @change="warehouseList.setPage"
      />
    </template>

    <!-- ── Modal editar estado lote ── -->
    <AppModal
      v-if="showLotForm"
      title="Actualizar estado del lote"
      size="sm"
      @close="showLotForm = false"
    >
      <form class="grid grid-cols-1 gap-4" @submit.prevent="handleLotSubmit">
        <AppAlert v-if="lotError" type="error" :message="lotError" />
        <FormField label="Producto" class="col-span-full">
          <input :value="editingLot?.product_detail?.name ?? '—'" type="text" disabled class="w-full px-3 py-2 border rounded-md text-sm bg-muted/50 cursor-not-allowed" />
        </FormField>
        <FormField label="Estado" class="col-span-full">
          <select v-model="lotForm.status" class="w-full px-3 py-2 border rounded-md text-sm">
            <option v-for="s in LOT_STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
        </FormField>
        <div class="flex justify-end gap-3 mt-4 pt-4 border-t col-span-full">
          <button type="button" class="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted" @click="showLotForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90" :disabled="lotLoading">
            {{ lotLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ── Modal nuevo movimiento ── -->
    <AppModal
      v-if="showMovForm"
      title="Registrar movimiento"
      size="md"
      @close="showMovForm = false"
    >
      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleMovSubmit">
        <AppAlert v-if="movError" type="error" :message="movError" />
        <FormField label="Tipo de movimiento" required class="col-span-full">
          <select v-model="movForm.movement_type" required class="w-full px-3 py-2 border rounded-md text-sm">
            <option v-for="t in MOV_TYPES_WRITE" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </FormField>
        <FormField label="Producto" required class="col-span-full">
          <select v-model="movForm.product" required class="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Seleccione...</option>
            <option v-for="p in allProducts" :key="p.uuid" :value="p.uuid">{{ p.name }}</option>
          </select>
        </FormField>
        <FormField v-if="needsOrigin(movForm.movement_type)" label="Bodega origen" required>
          <select v-model="movForm.warehouse_origin" required class="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Seleccione...</option>
            <option v-for="w in warehouses" :key="w.uuid" :value="w.uuid">{{ w.name }}</option>
          </select>
        </FormField>
        <FormField v-if="needsDestination(movForm.movement_type)" label="Bodega destino" required>
          <select v-model="movForm.warehouse_destination" required class="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Seleccione...</option>
            <option v-for="w in warehouses" :key="w.uuid" :value="w.uuid">{{ w.name }}</option>
          </select>
        </FormField>
        <FormField label="Cantidad" required>
          <input v-model="movForm.quantity" type="number" min="0.001" step="0.001" required class="w-full px-3 py-2 border rounded-md text-sm" />
        </FormField>
        <FormField label="Motivo" class="col-span-full">
          <textarea v-model="movForm.reason" rows="2" class="w-full px-3 py-2 border rounded-md text-sm" />
        </FormField>
        <div class="flex justify-end gap-3 mt-4 pt-4 border-t col-span-full">
          <button type="button" class="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted" @click="showMovForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90" :disabled="movLoading">
            {{ movLoading ? 'Registrando...' : 'Registrar' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ── Modal crear / editar bodega ── -->
    <AppModal
      v-if="showWarehouseForm"
      :title="editingWarehouse ? 'Editar bodega' : 'Nueva bodega'"
      size="md"
      @close="showWarehouseForm = false"
    >
      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleWarehouseSubmit">
        <AppAlert v-if="whFormError" type="error" :message="whFormError" />
        <FormField label="Nombre" required class="col-span-full">
          <input v-model="warehouseForm.name" type="text" required class="w-full px-3 py-2 border rounded-md text-sm" />
        </FormField>
        <FormField label="Sucursal" required>
          <select v-model="warehouseForm.branch" required class="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Seleccionar sucursal</option>
            <option v-for="b in allBranches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
          </select>
        </FormField>
        <FormField label="Tipo de bodega">
          <select v-model="warehouseForm.warehouse_type" class="w-full px-3 py-2 border rounded-md text-sm">
            <option v-for="t in WAREHOUSE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </FormField>
        <FormField label="Descripción" class="col-span-full">
          <textarea v-model="warehouseForm.description" rows="2" class="w-full px-3 py-2 border rounded-md text-sm" />
        </FormField>
        <div class="col-span-full">
          <label class="flex items-center gap-2 text-sm text-foreground">
            <input v-model="warehouseForm.is_active" type="checkbox" class="rounded border-border" /> Bodega activa
          </label>
        </div>
        <div class="flex justify-end gap-3 mt-4 pt-4 border-t col-span-full">
          <button type="button" class="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted" @click="showWarehouseForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90" :disabled="whFormLoading">
            {{ whFormLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ── Confirmar eliminar bodega ── -->
    <ConfirmDialog
      v-if="deleteWarehouse"
      title="Eliminar bodega"
      :message="`¿Eliminar la bodega &quot;${deleteWarehouse.name}&quot;? Esta acción no puede deshacerse.`"
      confirm-label="Eliminar"
      :loading="deleteWhLoading"
      @confirm="confirmDeleteWarehouse"
      @cancel="deleteWarehouse = null"
    />
  </section>
</template>

