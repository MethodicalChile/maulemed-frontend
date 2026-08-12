<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Pencil, Plus, Ruler, Search, Tags, Trash2 } from 'lucide-vue-next'
import { productsApi } from '@/api/products.api'
import { useList } from '@/composables/useList'
import { usePermissions } from '@/composables/usePermissions'
import { useRefresh } from '@/composables/useRefresh'
import AppAlert from '@/components/common/AppAlert.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormField from '@/components/common/FormField.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'


const { canManageCatalogs, canCreateProducts, canDeleteProducts } = usePermissions()

const activeTab = ref('categories')

// ── Listas paginadas con búsqueda server-side ─────────────────────────────────
const catList  = useList(productsApi.listCategories,  { ordering: 'name' })
const unitList = useList(productsApi.listUnits,        { ordering: 'code' })
const currentList = computed(() => activeTab.value === 'categories' ? catList : unitList)

const { setRefreshFunction, clearRefreshFunction } = useRefresh()
function refresh() {
  catList.load()
  unitList.load()
}
onMounted(() => {
  setRefreshFunction(refresh)
  catList.load()
  unitList.load()
})
onUnmounted(clearRefreshFunction)

function switchTab(tab) {
  activeTab.value = tab
  // Limpiar error de la lista anterior para no mostrarlo en la tab recién abierta
  catList.error.value  = null
  unitList.error.value = null
}

// ── Columnas ──────────────────────────────────────────────────────────────────
const categoryColumns = [
  { key: 'name',        label: 'Nombre' },
  { key: 'description', label: 'Descripción' },
  { key: 'is_active',   label: 'Estado', width: '110px' },
  { key: 'actions',     label: '',       width: '100px' },
]
const unitColumns = [
  { key: 'code',      label: 'Código',  width: '140px' },
  { key: 'name',      label: 'Nombre' },
  { key: 'is_active', label: 'Estado',  width: '110px' },
  { key: 'actions',   label: '',        width: '100px' },
]

const currentTitle = computed(() =>
  activeTab.value === 'categories' ? 'Categorías' : 'Unidades de medida'
)

// ── Formularios ───────────────────────────────────────────────────────────────
const formLoading = ref(false)
const formError   = ref('')
const showCategoryForm = ref(false)
const showUnitForm     = ref(false)
const editingCategory  = ref(null)
const editingUnit      = ref(null)
const deleteTarget     = ref(null)
const deleteLoading    = ref(false)

const categoryForm = ref({ name: '', description: '', is_active: true })
const unitForm     = ref({ code: '', name: '', is_active: true })

function getErrorMessage(err) {
  const data = err.response?.data
  if (typeof data?.message === 'string') return data.message
  if (typeof data?.detail  === 'string') return data.detail
  if (data && typeof data === 'object') {
    const first = Object.values(data)[0]
    if (Array.isArray(first)) return first[0]
    if (typeof first === 'string') return first
  }
  return 'Ocurrió un error.'
}

function openCreateCategory() {
  editingCategory.value = null
  categoryForm.value = { name: '', description: '', is_active: true }
  formError.value = ''
  showCategoryForm.value = true
}
function openEditCategory(row) {
  editingCategory.value = row
  categoryForm.value = { name: row.name ?? '', description: row.description ?? '', is_active: row.is_active ?? true }
  formError.value = ''
  showCategoryForm.value = true
}
async function saveCategory() {
  formLoading.value = true; formError.value = ''
  try {
    editingCategory.value
      ? await productsApi.updateCategory(editingCategory.value.uuid, categoryForm.value)
      : await productsApi.createCategory(categoryForm.value)
    showCategoryForm.value = false
    catList.load()
  } catch (err) { formError.value = getErrorMessage(err) }
  finally { formLoading.value = false }
}

function openCreateUnit() {
  editingUnit.value = null
  unitForm.value = { code: '', name: '', is_active: true }
  formError.value = ''
  showUnitForm.value = true
}
function openEditUnit(row) {
  editingUnit.value = row
  unitForm.value = { code: row.code ?? '', name: row.name ?? '', is_active: row.is_active ?? true }
  formError.value = ''
  showUnitForm.value = true
}
async function saveUnit() {
  formLoading.value = true; formError.value = ''
  try {
    editingUnit.value
      ? await productsApi.updateUnit(editingUnit.value.uuid, unitForm.value)
      : await productsApi.createUnit(unitForm.value)
    showUnitForm.value = false
    unitList.load()
  } catch (err) { formError.value = getErrorMessage(err) }
  finally { formLoading.value = false }
}

function requestDelete(type, item) { deleteTarget.value = { type, item } }
async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const { type, item } = deleteTarget.value
    if (type === 'category') { await productsApi.deleteCategory(item.uuid); catList.load() }
    if (type === 'unit')     { await productsApi.deleteUnit(item.uuid);     unitList.load() }
    deleteTarget.value = null
  } catch (err) {
    currentList.value.error.value = getErrorMessage(err)
    deleteTarget.value = null
  } finally { deleteLoading.value = false }
}
</script>

<template>
  <section class="p-6 space-y-6">
    <PageHeader title="Mantenedor" subtitle="Administración de parámetros maestros del sistema">
      <button v-if="canCreateProducts && activeTab === 'categories'" class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-md hover:bg-primary/90 transition-all hover:scale-105" @click="openCreateCategory">
        <Plus :size="18" /> Nueva categoría
      </button>
      <button v-if="canCreateProducts && activeTab === 'units'" class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-md hover:bg-primary/90 transition-all hover:scale-105" @click="openCreateUnit">
        <Plus :size="18" /> Nueva unidad
      </button>
    </PageHeader>

    <AppAlert v-if="currentList.error.value" type="error" :message="currentList.error.value" />

    <div class="flex gap-2">
      <button type="button" :class="['px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2', activeTab === 'categories' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80']" @click="switchTab('categories')">
        <Tags :size="16" /> Categorías
      </button>
      <button type="button" :class="['px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2', activeTab === 'units' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80']" @click="switchTab('units')">
        <Ruler :size="16" /> Unidades de medida
      </button>
    </div>

    <!-- Buscador -->
    <div class="p-4 rounded-xl bg-card border border-border shadow-sm">
      <div class="relative">
        <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <AppInput
          type="text"
          placeholder="Buscar..."
          :model-value="currentList.params.search"
          @update:model-value="currentList.setParam('search', $event)"
          class="pl-10"
        />
      </div>
    </div>

    <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div class="p-4 border-b border-border">
        <h2 class="text-lg font-semibold">{{ currentTitle }}</h2>
        <p class="text-sm text-muted-foreground">{{ activeTab === 'categories' ? 'Clasificación utilizada para ordenar los productos.' : 'Unidades utilizadas para gestionar cantidades y stock.' }}</p>
      </div>

      <!-- Categorías -->
      <template v-if="activeTab === 'categories'">
        <AppTable :columns="categoryColumns" :rows="catList.items.value" :loading="catList.loading.value">
          <template #description="{ row }">{{ row.description || '—' }}</template>
          <template #is_active="{ row }">
            <span :class="['px-3 py-1 rounded-full text-[11px] font-bold', row.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground']">
              {{ row.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end gap-1">
              <button v-if="canManageCatalogs" type="button" class="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Editar" @click="openEditCategory(row)"><Pencil :size="16" /></button>
              <button v-if="canDeleteProducts" type="button" class="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Eliminar" @click="requestDelete('category', row)"><Trash2 :size="16" /></button>
            </div>
          </template>
        </AppTable>
        <AppPagination :count="catList.pagination.count" :page="catList.pagination.page" :page-size="catList.pagination.pageSize" @change="catList.setPage" />
      </template>

      <!-- Unidades -->
      <template v-if="activeTab === 'units'">
        <AppTable :columns="unitColumns" :rows="unitList.items.value" :loading="unitList.loading.value">
          <template #code="{ row }"><span class="font-mono text-xs px-2 py-1 bg-muted rounded">{{ row.code }}</span></template>
          <template #is_active="{ row }">
            <span :class="['px-3 py-1 rounded-full text-[11px] font-bold', row.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground']">
              {{ row.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end gap-1">
              <button v-if="canManageCatalogs" type="button" class="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Editar" @click="openEditUnit(row)"><Pencil :size="16" /></button>
              <button v-if="canDeleteProducts" type="button" class="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Eliminar" @click="requestDelete('unit', row)"><Trash2 :size="16" /></button>
            </div>
          </template>
        </AppTable>
        <AppPagination :count="unitList.pagination.count" :page="unitList.pagination.page" :page-size="unitList.pagination.pageSize" @change="unitList.setPage" />
      </template>
    </div>

    <!-- Modal categoría -->
    <AppModal v-if="showCategoryForm" :title="editingCategory ? 'Editar categoría' : 'Nueva categoría'" size="md" @close="showCategoryForm = false">
      <form @submit.prevent="saveCategory">
        <AppAlert v-if="formError" type="error" :message="formError" />
        <div class="space-y-4">
          <FormField label="Nombre" required>
            <AppInput v-model="categoryForm.name" type="text" maxlength="150" required />
          </FormField>
          <FormField label="Descripción">
            <AppTextarea v-model="categoryForm.description" rows="3" />
          </FormField>
          <label class="flex items-center gap-2 text-sm"><input v-model="categoryForm.is_active" type="checkbox" /> Categoría activa</label>
        </div>
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button type="button" class="px-4 py-2 border rounded hover:bg-muted" @click="showCategoryForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-primary text-white rounded" :disabled="formLoading">{{ formLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- Modal unidad -->
    <AppModal v-if="showUnitForm" :title="editingUnit ? 'Editar unidad de medida' : 'Nueva unidad de medida'" size="md" @close="showUnitForm = false">
      <form @submit.prevent="saveUnit">
        <AppAlert v-if="formError" type="error" :message="formError" />
        <div class="space-y-4">
          <FormField label="Código" required>
            <AppInput v-model="unitForm.code" type="text" maxlength="20" placeholder="UN, KG, LT" required />
          </FormField>
          <FormField label="Nombre" required>
            <AppInput v-model="unitForm.name" type="text" maxlength="100" placeholder="Unidad" required />
          </FormField>
          <label class="flex items-center gap-2 text-sm"><input v-model="unitForm.is_active" type="checkbox" /> Unidad activa</label>
        </div>
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button type="button" class="px-4 py-2 border rounded hover:bg-muted" @click="showUnitForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-primary text-white rounded" :disabled="formLoading">{{ formLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <ConfirmDialog
      v-if="deleteTarget"
      :title="deleteTarget.type === 'category' ? 'Eliminar categoría' : 'Eliminar unidad de medida'"
      :message="`¿Seguro que desea eliminar &quot;${deleteTarget.item.name}&quot;?`"
      confirm-label="Eliminar"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </section>
</template>
