<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Plus, Pencil, Trash2, Search, MoreVertical } from 'lucide-vue-next'
import { organizationsApi } from '@/api/organizations.api'
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

const permissions = usePermissions()

const TABS = ['Organizaciones', 'Sucursales', 'Entidades Legales', 'Centros de Costo']
const activeTab = ref('Organizaciones')

const orgOptions         = ref([])   
const legalEntityOptions = ref([])   
const branchOptions      = ref([])   

async function loadOptions() {
  const [orgs, les, brs] = await Promise.allSettled([
    organizationsApi.listOrganizations({ page_size: 200 }),
    organizationsApi.listLegalEntities({ page_size: 200 }),
    organizationsApi.listBranches({ page_size: 200 }),
  ])
  const extract = (r) => {
    if (r.status !== 'fulfilled') return []
    const d = r.value.data?.data ?? r.value.data
    return Array.isArray(d) ? d : d.results ?? d
  }
  orgOptions.value         = extract(orgs)
  legalEntityOptions.value = extract(les)
  branchOptions.value      = extract(brs)
}

const canEditRow = () => {
  return permissions.can('can_edit_organizations')
}

const canDeleteRow = () => {
  return permissions.can('can_delete_organizations')
}

const showActionModal = ref(false)
const activeActionRow = ref(null)

const canEdit = computed(() => {
  return activeActionRow.value ? canEditRow(activeActionRow.value) : false
})

const canDelete = computed(() => {
  return activeActionRow.value ? canDeleteRow(activeActionRow.value) : false
})

function openActions(row, type) {
  activeActionRow.value = { ...row, type }
  showActionModal.value = true
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. ORGANIZACIONES
// ═════════════════════════════════════════════════════════════════════════════
const orgCols = [
  { key: 'name',      label: 'Nombre' },
  { key: 'rut',       label: 'RUT' },
  { key: 'is_active', label: 'Estado', width: '100px' },
  { key: 'actions',   label: '',       width: '90px' },
]
const orgList          = useList(organizationsApi.listOrganizations)
const showOrgForm      = ref(false)
const editingOrg       = ref(null)
const deleteOrgTarget  = ref(null)
const deleteOrgLoading = ref(false)

const { form: orgForm, loading: orgLoading, error: orgError, reset: orgReset, fill: orgFill, submit: orgSubmit } = useForm(
  { name: '', rut: '', description: '', is_active: true },
  (data) => editingOrg.value
    ? organizationsApi.updateOrganization(editingOrg.value.uuid, data)
    : organizationsApi.createOrganization(data)
)

function openCreateOrg() { editingOrg.value = null; orgReset(); showOrgForm.value = true }
function openEditOrg(row) {
  editingOrg.value = row
  orgFill({ name: row.name, rut: row.rut ?? '', description: row.description ?? '', is_active: row.is_active })
  showOrgForm.value = true
}
async function handleOrgSubmit() {
  await orgSubmit()
  if (!orgError.value) { showOrgForm.value = false; orgList.load(); loadOptions() }
}
async function confirmDeleteOrg() {
  deleteOrgLoading.value = true
  try { await organizationsApi.deleteOrganization(deleteOrgTarget.value.uuid); deleteOrgTarget.value = null; orgList.load() }
  finally { deleteOrgLoading.value = false }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. SUCURSALES
// ═════════════════════════════════════════════════════════════════════════════
const branchCols = [
  { key: 'name',         label: 'Nombre' },
  { key: 'code',         label: 'Código' },
  { key: 'organization', label: 'Organización' },
  { key: 'legal_entity', label: 'Entidad legal' },
  { key: 'city',         label: 'Ciudad' },
  { key: 'is_active',    label: 'Estado', width: '100px' },
  { key: 'actions',      label: '',       width: '90px' },
]
const branchList          = useList(organizationsApi.listBranches)
const showBranchForm      = ref(false)
const editingBranch       = ref(null)
const deleteBranchTarget  = ref(null)
const deleteBranchLoading = ref(false)

const { form: branchForm, loading: branchLoading, error: branchError, reset: branchReset, fill: branchFill, submit: branchSubmit } = useForm(
  { name: '', code: '', city: '', address: '', phone: '', email: '',
    organization: '', legal_entity: '', is_main_branch: false, is_active: true },
  (data) => editingBranch.value
    ? organizationsApi.updateBranch(editingBranch.value.uuid, data)
    : organizationsApi.createBranch(data)
)

function openCreateBranch() { editingBranch.value = null; branchReset(); showBranchForm.value = true }
function openEditBranch(row) {
  editingBranch.value = row
  branchFill({
    name: row.name, code: row.code ?? '', city: row.city ?? '',
    address: row.address ?? '', phone: row.phone ?? '', email: row.email ?? '',
    organization: row.organization, legal_entity: row.legal_entity ?? '',
    is_main_branch: row.is_main_branch, is_active: row.is_active,
  })
  showBranchForm.value = true
}
async function handleBranchSubmit() {
  await branchSubmit()
  if (!branchError.value) { showBranchForm.value = false; branchList.load(); loadOptions() }
}
async function confirmDeleteBranch() {
  deleteBranchLoading.value = true
  try { await organizationsApi.deleteBranch(deleteBranchTarget.value.uuid); deleteBranchTarget.value = null; branchList.load() }
  finally { deleteBranchLoading.value = false }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. ENTIDADES LEGALES
// ═════════════════════════════════════════════════════════════════════════════
const leCols = [
  { key: 'name',         label: 'Razón social' },
  { key: 'rut',          label: 'RUT' },
  { key: 'organization', label: 'Organización' },
  { key: 'is_active',    label: 'Estado', width: '100px' },
  { key: 'actions',      label: '',       width: '90px' },
]
const leList          = useList(organizationsApi.listLegalEntities)
const showLeForm      = ref(false)
const editingLe       = ref(null)
const deleteLe        = ref(null)
const deleteLeLoading = ref(false)

const { form: leForm, loading: leLoading, error: leError, reset: leReset, fill: leFill, submit: leSubmit } = useForm(
  { name: '', rut: '', business_activity: '', address: '', organization: '', is_active: true },
  (data) => editingLe.value
    ? organizationsApi.updateLegalEntity(editingLe.value.uuid, data)
    : organizationsApi.createLegalEntity(data)
)

function openCreateLe() { editingLe.value = null; leReset(); showLeForm.value = true }
function openEditLe(row) {
  editingLe.value = row
  leFill({
    name: row.name, rut: row.rut ?? '',
    business_activity: row.business_activity ?? '', address: row.address ?? '',
    organization: row.organization, is_active: row.is_active,
  })
  showLeForm.value = true
}
async function handleLeSubmit() {
  await leSubmit()
  if (!leError.value) { showLeForm.value = false; leList.load(); loadOptions() }
}
async function confirmDeleteLe() {
  deleteLeLoading.value = true
  try { await organizationsApi.deleteLegalEntity(deleteLe.value.uuid); deleteLe.value = null; leList.load() }
  finally { deleteLeLoading.value = false }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. CENTROS DE COSTO
// ═════════════════════════════════════════════════════════════════════════════
const ccCols = [
  { key: 'code',         label: 'Código' },
  { key: 'name',         label: 'Nombre' },
  { key: 'legal_entity', label: 'Entidad legal' },
  { key: 'branch',       label: 'Sucursal' },
  { key: 'is_active',    label: 'Estado', width: '100px' },
  { key: 'actions',      label: '',       width: '90px' },
]
const ccList          = useList(organizationsApi.listCostCenters)
const showCcForm      = ref(false)
const editingCc       = ref(null)
const deleteCc        = ref(null)
const deleteCcLoading = ref(false)

const { form: ccForm, loading: ccLoading, error: ccError, reset: ccReset, fill: ccFill, submit: ccSubmit } = useForm(
  { code: '', name: '', description: '', legal_entity: '', branch: '', is_active: true },
  (data) => editingCc.value
    ? organizationsApi.updateCostCenter(editingCc.value.uuid, data)
    : organizationsApi.createCostCenter(data)
)

function openCreateCc() { editingCc.value = null; ccReset(); showCcForm.value = true }
function openEditCc(row) {
  editingCc.value = row
  ccFill({
    code: row.code, name: row.name, description: row.description ?? '',
    legal_entity: row.legal_entity, branch: row.branch ?? '',
    is_active: row.is_active,
  })
  showCcForm.value = true
}
async function handleCcSubmit() {
  await ccSubmit()
  if (!ccError.value) { showCcForm.value = false; ccList.load() }
}
async function confirmDeleteCc() {
  deleteCcLoading.value = true
  try { await organizationsApi.deleteCostCenter(deleteCc.value.uuid); deleteCc.value = null; ccList.load() }
  finally { deleteCcLoading.value = false }
}

async function loadData() {
  orgList.load()
  branchList.load()
  leList.load()
  ccList.load()
  loadOptions()
}

const { setRefreshFunction, clearRefreshFunction } = useRefresh()
onMounted(() => {
  setRefreshFunction(loadData)
  loadData()
})
onUnmounted(clearRefreshFunction)
</script>

<template>
  <section class="page">
    <PageHeader title="Organización" subtitle="Gestión de organizaciones, sucursales, entidades legales y centros de costo">
      <button v-if="permissions.can('can_create_organizations') && activeTab === 'Organizaciones'" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90" @click="openCreateOrg">    <Plus :size="16" /> Nueva organización   </button>
      <button v-if="permissions.can('can_create_organizations') && activeTab === 'Sucursales'" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90" @click="openCreateBranch"> <Plus :size="16" /> Nueva sucursal       </button>
      <button v-if="permissions.can('can_create_organizations') && activeTab === 'Entidades Legales'" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90" @click="openCreateLe">    <Plus :size="16" /> Nueva entidad legal  </button>
      <button v-if="permissions.can('can_create_organizations') && activeTab === 'Centros de Costo'" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90" @click="openCreateCc">     <Plus :size="16" /> Nuevo centro de costo</button>
    </PageHeader>

    <div class="flex border-b border-border mb-6">
      <button v-for="tab in TABS" :key="tab" :class="['px-4 py-2 text-sm font-semibold border-b-2 transition-colors', activeTab === tab ? 'text-primary border-primary' : 'text-muted-foreground hover:text-foreground border-transparent']" @click="activeTab = tab">
        {{ tab }}
      </button>
    </div>

    <!-- ══ ORGANIZACIONES ══ -->
    <template v-if="activeTab === 'Organizaciones'">
      <div v-if="permissions.can('can_create_organizations')" class="flex gap-4 mb-4">
        <div class="relative flex-1">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput type="text" placeholder="Buscar organización..." :model-value="orgList.params.search" @update:model-value="orgList.setParam('search', $event)" class="pl-10" />
        </div>
      </div>
      <div v-else class="mb-4">
        <div class="relative flex-1">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput type="text" placeholder="Buscar organización..." :model-value="orgList.params.search" @update:model-value="orgList.setParam('search', $event)" class="pl-10" />
        </div>
      </div>
      <AppAlert v-if="orgList.error.value" type="error" :message="orgList.error.value" />
      <AppTable :columns="orgCols" :rows="orgList.items.value" :loading="orgList.loading.value">
        <template #is_active="{ row }">
          <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold', row.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground']">{{ row.is_active ? 'Activo' : 'Inactivo' }}</span>
        </template>
        <template #actions="{ row }">
          <button v-if="canEditRow(row) || canDeleteRow(row)" class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all" @click="openActions(row, 'org')">
            <MoreVertical :size="16" />
          </button>
        </template>
      </AppTable>
      <AppPagination :count="orgList.pagination.count" :page="orgList.pagination.page" :page-size="orgList.pagination.pageSize" @change="orgList.setPage" />
    </template>

    <!-- ══ SUCURSALES ══ -->
    <template v-if="activeTab === 'Sucursales'">
      <div v-if="permissions.can('can_create_organizations')" class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-card border border-border shadow-sm mb-4">
        <div class="relative col-span-2">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput type="text" placeholder="Buscar sucursal..." :model-value="branchList.params.search" @update:model-value="branchList.setParam('search', $event)" class="pl-10" />
        </div>
      </div>
      <div v-else class="mb-4">
        <div class="relative">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput type="text" placeholder="Buscar sucursal..." :model-value="branchList.params.search" @update:model-value="branchList.setParam('search', $event)" class="pl-10" />
        </div>
      </div>
      <AppAlert v-if="branchList.error.value" type="error" :message="branchList.error.value" />
      <AppTable :columns="branchCols" :rows="branchList.items.value" :loading="branchList.loading.value">
        <template #organization="{ row }">{{ row.organization_detail?.name ?? '—' }}</template>
        <template #legal_entity="{ row }">{{ row.legal_entity_detail?.name ?? '—' }}</template>
        <template #is_active="{ row }">
          <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">{{ row.is_active ? 'Activo' : 'Inactivo' }}</span>
        </template>
        <template #actions="{ row }">
          <button v-if="canEditRow(row) || canDeleteRow(row)" class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all" @click="openActions(row, 'branch')">
            <MoreVertical :size="16" />
          </button>
        </template>
      </AppTable>
      <AppPagination :count="branchList.pagination.count" :page="branchList.pagination.page" :page-size="branchList.pagination.pageSize" @change="branchList.setPage" />
    </template>

    <!-- ══ ENTIDADES LEGALES ══ -->
    <template v-if="activeTab === 'Entidades Legales'">
      <div v-if="permissions.can('can_create_organizations')" class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-card border border-border shadow-sm mb-4">
        <div class="relative col-span-2">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput type="text" placeholder="Buscar entidad legal..." :model-value="leList.params.search" @update:model-value="leList.setParam('search', $event)" class="pl-10" />
        </div>
      </div>
      <div v-else class="mb-4">
        <div class="relative">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput type="text" placeholder="Buscar entidad legal..." :model-value="leList.params.search" @update:model-value="leList.setParam('search', $event)" class="pl-10" />
        </div>
      </div>
      <AppAlert v-if="leList.error.value" type="error" :message="leList.error.value" />
      <AppTable :columns="leCols" :rows="leList.items.value" :loading="leList.loading.value">
        <template #organization="{ row }">{{ row.organization_detail?.name ?? '—' }}</template>
        <template #is_active="{ row }">
          <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">{{ row.is_active ? 'Activo' : 'Inactivo' }}</span>
        </template>
        <template #actions="{ row }">
          <button v-if="canEditRow(row) || canDeleteRow(row)" class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all" @click="openActions(row, 'le')">
            <MoreVertical :size="16" />
          </button>
        </template>
      </AppTable>
      <AppPagination :count="leList.pagination.count" :page="leList.pagination.page" :page-size="leList.pagination.pageSize" @change="leList.setPage" />
    </template>

    <template v-if="activeTab === 'Centros de Costo'">
      <div v-if="permissions.can('can_create_organizations')" class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-card border border-border shadow-sm mb-4">
        <div class="relative col-span-2">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput type="text" placeholder="Buscar centro de costo..." :model-value="ccList.params.search" @update:model-value="ccList.setParam('search', $event)" class="pl-10" />
        </div>
      </div>
      <div v-else class="mb-4">
        <div class="relative">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput type="text" placeholder="Buscar centro de costo..." :model-value="ccList.params.search" @update:model-value="ccList.setParam('search', $event)" class="pl-10" />
        </div>
      </div>
      <AppAlert v-if="ccList.error.value" type="error" :message="ccList.error.value" />
      <AppTable :columns="ccCols" :rows="ccList.items.value" :loading="ccList.loading.value">
        <template #legal_entity="{ row }">{{ row.legal_entity_detail?.name ?? '—' }}</template>
        <template #branch="{ row }">{{ row.branch_detail?.name ?? '—' }}</template>
        <template #is_active="{ row }">
          <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">{{ row.is_active ? 'Activo' : 'Inactivo' }}</span>
        </template>
        <template #actions="{ row }">
          <button v-if="canEditRow(row) || canDeleteRow(row)" class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all" @click="openActions(row, 'cc')">
            <MoreVertical :size="16" />
          </button>
        </template>
      </AppTable>
      <AppPagination :count="ccList.pagination.count" :page="ccList.pagination.page" :page-size="ccList.pagination.pageSize" @change="ccList.setPage" />
    </template>

    <AppModal v-if="showOrgForm" :title="editingOrg ? 'Editar organización' : 'Nueva organización'" size="md" @close="showOrgForm = false">
      <form class="grid grid-cols-1 gap-4" @submit.prevent="handleOrgSubmit">
        <AppAlert v-if="orgError" type="error" :message="orgError" />
        <FormField label="Nombre" required><AppInput v-model="orgForm.name" type="text" required /></FormField>
        <FormField label="RUT"><AppInput v-model="orgForm.rut" type="text" placeholder="76.123.456-7" /></FormField>
        <FormField label="Descripción"><AppTextarea v-model="orgForm.description" rows="2" /></FormField>
        <label class="flex items-center gap-2 text-sm"><input v-model="orgForm.is_active" type="checkbox" /> Activo</label>
        <div class="flex justify-end gap-3 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm font-medium border rounded hover:bg-muted" @click="showOrgForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90" :disabled="orgLoading">{{ orgLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Sucursal ══ -->
    <AppModal v-if="showBranchForm" :title="editingBranch ? 'Editar sucursal' : 'Nueva sucursal'" size="lg" @close="showBranchForm = false">
      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleBranchSubmit">
        <AppAlert v-if="branchError" type="error" :message="branchError" />

        <FormField label="Nombre" required>
          <AppInput v-model="branchForm.name" type="text" required placeholder="Ej: Sucursal Centro" />
        </FormField>
        <FormField label="Código">
          <AppInput v-model="branchForm.code" type="text" placeholder="Ej: SUC-001" />
        </FormField>
        <FormField label="Organización" required>
          <AppSelect v-model="branchForm.organization" required>
            <option value="">Seleccione...</option>
            <option v-for="o in orgOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
          </AppSelect>
        </FormField>
        <FormField label="Entidad legal">
          <AppSelect v-model="branchForm.legal_entity">
            <option value="">Sin entidad legal</option>
            <option v-for="le in legalEntityOptions" :key="le.id" :value="le.id">{{ le.name }}</option>
          </AppSelect>
        </FormField>
        <FormField label="Ciudad">
          <AppInput v-model="branchForm.city" type="text" placeholder="Ej: Santiago" />
        </FormField>
        <FormField label="Teléfono">
          <AppInput v-model="branchForm.phone" type="text" placeholder="+56 2 1234 5678" />
        </FormField>
        <FormField label="Email" class="col-span-full">
          <AppInput v-model="branchForm.email" type="email" />
        </FormField>
        <FormField label="Dirección" class="col-span-full">
          <AppTextarea v-model="branchForm.address" rows="2" placeholder="Calle y número, comuna" />
        </FormField>
        <div class="col-span-full flex gap-4">
          <label class="flex items-center gap-2 text-sm"><input v-model="branchForm.is_main_branch" type="checkbox" /> Es sucursal principal</label>
          <label class="flex items-center gap-2 text-sm"><input v-model="branchForm.is_active" type="checkbox" /> Activo</label>
        </div>
        <div class="col-span-full flex justify-end gap-3 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm font-medium border rounded hover:bg-muted" @click="showBranchForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90" :disabled="branchLoading">{{ branchLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Entidad Legal ══ -->
    <AppModal v-if="showLeForm" :title="editingLe ? 'Editar entidad legal' : 'Nueva entidad legal'" size="md" @close="showLeForm = false">
      <form class="grid grid-cols-1 gap-4" @submit.prevent="handleLeSubmit">
        <AppAlert v-if="leError" type="error" :message="leError" />
        <FormField label="Razón social" required>
          <AppInput v-model="leForm.name" type="text" required placeholder="Ej: Clínica MauleMed SpA" />
        </FormField>
        <FormField label="RUT" required>
          <AppInput v-model="leForm.rut" type="text" required placeholder="76.123.456-7" />
        </FormField>
        <FormField label="Organización" required>
          <AppSelect v-model="leForm.organization" required>
            <option value="">Seleccione...</option>
            <option v-for="o in orgOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
          </AppSelect>
        </FormField>
        <FormField label="Giro comercial">
          <AppInput v-model="leForm.business_activity" type="text" placeholder="Ej: Servicios de salud" />
        </FormField>
        <FormField label="Dirección">
          <AppTextarea v-model="leForm.address" rows="2" />
        </FormField>
        <label class="flex items-center gap-2 text-sm"><input v-model="leForm.is_active" type="checkbox" /> Activo</label>
        <div class="flex justify-end gap-3 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm font-medium border rounded hover:bg-muted" @click="showLeForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90" :disabled="leLoading">{{ leLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Centro de Costo ══ -->
    <AppModal v-if="showCcForm" :title="editingCc ? 'Editar centro de costo' : 'Nuevo centro de costo'" size="md" @close="showCcForm = false">
      <form class="grid grid-cols-1 gap-4" @submit.prevent="handleCcSubmit">
        <AppAlert v-if="ccError" type="error" :message="ccError" />
        <FormField label="Código" required>
          <AppInput v-model="ccForm.code" type="text" required placeholder="Ej: CC-001" />
        </FormField>
        <FormField label="Nombre" required>
          <AppInput v-model="ccForm.name" type="text" required placeholder="Ej: Bodega Central" />
        </FormField>
        <FormField label="Entidad legal" required>
          <AppSelect v-model="ccForm.legal_entity" required>
            <option value="">Seleccione...</option>
            <option v-for="le in legalEntityOptions" :key="le.id" :value="le.id">{{ le.name }}</option>
          </AppSelect>
        </FormField>
        <FormField label="Sucursal">
          <AppSelect v-model="ccForm.branch">
            <option value="">Sin sucursal</option>
            <option v-for="b in branchOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
          </AppSelect>
        </FormField>
        <FormField label="Descripción">
          <AppTextarea v-model="ccForm.description" rows="2" />
        </FormField>
        <label class="flex items-center gap-2 text-sm"><input v-model="ccForm.is_active" type="checkbox" /> Activo</label>
        <div class="flex justify-end gap-3 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm font-medium border rounded hover:bg-muted" @click="showCcForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90" :disabled="ccLoading">{{ ccLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ── Modal acciones ── -->
    <AppModal
      v-if="showActionModal"
      :title="`Acciones`"
      size="sm"
      @close="showActionModal = false"
    >
      <div class="grid gap-2">
        <button v-if="canEdit" class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium" @click="activeActionRow.type === 'org' ? openEditOrg(activeActionRow) : activeActionRow.type === 'branch' ? openEditBranch(activeActionRow) : activeActionRow.type === 'le' ? openEditLe(activeActionRow) : openEditCc(activeActionRow); showActionModal = false">
          <Pencil :size="16" /> Editar
        </button>
        <button v-if="canDelete" class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium text-destructive" @click="activeActionRow.type === 'org' ? deleteOrgTarget = activeActionRow : activeActionRow.type === 'branch' ? deleteBranchTarget = activeActionRow : activeActionRow.type === 'le' ? deleteLe = activeActionRow : deleteCc = activeActionRow; showActionModal = false">
          <Trash2 :size="16" /> Eliminar
        </button>
      </div>
    </AppModal>

    <!-- ══ CONFIRMACIONES ══ -->
    <ConfirmDialog v-if="deleteOrgTarget"    title="Eliminar organización"    :message="`¿Eliminar &quot;${deleteOrgTarget.name}&quot;?`"     confirm-label="Eliminar" :loading="deleteOrgLoading"    @confirm="confirmDeleteOrg"    @cancel="deleteOrgTarget = null" />
    <ConfirmDialog v-if="deleteBranchTarget" title="Eliminar sucursal"        :message="`¿Eliminar &quot;${deleteBranchTarget.name}&quot;?`"  confirm-label="Eliminar" :loading="deleteBranchLoading" @confirm="confirmDeleteBranch" @cancel="deleteBranchTarget = null" />
    <ConfirmDialog v-if="deleteLe"           title="Eliminar entidad legal"   :message="`¿Eliminar &quot;${deleteLe.name}&quot;?`"            confirm-label="Eliminar" :loading="deleteLeLoading"     @confirm="confirmDeleteLe"     @cancel="deleteLe = null" />
    <ConfirmDialog v-if="deleteCc"           title="Eliminar centro de costo" :message="`¿Eliminar &quot;${deleteCc.name}&quot;?`"            confirm-label="Eliminar" :loading="deleteCcLoading"     @confirm="confirmDeleteCc"     @cancel="deleteCc = null" />

  </section>
</template>
