<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Plus, Pencil, KeyRound, UserCheck, UserX, Search, X, Shield, Trash2, MoreVertical } from 'lucide-vue-next'
import { usersApi } from '@/api/users.api'
import { optionsApi } from '@/api/options.api'
import { useList } from '@/composables/useList'
import { useRefresh } from '@/composables/useRefresh'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormField from '@/components/common/FormField.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppMultiSelect from '@/components/common/AppMultiSelect.vue'

const ACTIVE_STATUS_OPTIONS = [
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

// ── Tabla ─────────────────────────────────────────────────────────────────────
const columns = [
  { key: 'full_name',  label: 'Nombre' },
  { key: 'username',   label: 'Usuario' },
  { key: 'email',      label: 'Email' },
  { key: 'roles',      label: 'Roles' },
  { key: 'is_active',  label: 'Estado',  width: '100px' },
  { key: 'actions',    label: '',        width: '130px' },
]

// ── Lista paginada server-side ────────────────────────────────────────────────
const userList = useList(usersApi.listUsers)

// ── Refresh ──────────────────────────────────────────────────────────────────
const { setRefreshFunction, clearRefreshFunction } = useRefresh()
function refresh() {
  userList.load()
  loadOptions()
}
onMounted(() => {
  setRefreshFunction(refresh)
  userList.load()
  loadOptions()
})
onUnmounted(clearRefreshFunction)

// Alias para compatibilidad con las partes del template que usan `loadUsers`
function loadUsers() { userList.load() }

// ── Opciones ──────────────────────────────────────────────────────────────────
const allRoles         = ref([])
const allOrganizations = ref([])
const allBranches      = ref([])

async function loadOptions() {
  const [rolesRes, orgsRes, branchRes] = await Promise.allSettled([
    usersApi.listRoles(),
    optionsApi.getOrganizations(),
    optionsApi.getBranches(),
  ])
  if (rolesRes.status === 'fulfilled') {
    const d = rolesRes.value.data?.data ?? rolesRes.value.data
    allRoles.value = Array.isArray(d) ? d : d.results ?? d
  }
  if (orgsRes.status === 'fulfilled') {
    const d = orgsRes.value.data?.data ?? orgsRes.value.data
    allOrganizations.value = Array.isArray(d) ? d : d.results ?? d
  }
  if (branchRes.status === 'fulfilled') {
    const d = branchRes.value.data?.data ?? branchRes.value.data
    allBranches.value = Array.isArray(d) ? d : d.results ?? d
  }
}

// ── Modal crear/editar usuario ────────────────────────────────────────────────
const showActionModal = ref(false)
const activeActionRow = ref(null)

function openActions(row) {
  activeActionRow.value = row
  showActionModal.value = true
}

const showUserModal  = ref(false)
const editingUser    = ref(null)
const userFormError  = ref('')
const userFormLoading = ref(false)

const userForm = ref({
  username: '', first_name: '', last_name: '', email: '',
  password: '', password_confirm: '', is_active: true,
  rut: '', phone: '', position: '', organization: '',
})

// Roles pendientes de asignar en el formulario de creación/edición
// Cada fila: { _key, uuid?, role, organization, branch, _deleted }
const formRoleRows = ref([])
let _formRoleKey = 0

function newFormRoleRow() {
  return { _key: ++_formRoleKey, uuid: null, role: '', organization: '', branch: '', _deleted: false }
}

const visibleFormRoles = computed(() => formRoleRows.value.filter(r => !r._deleted))

function addFormRole()    { formRoleRows.value.push(newFormRoleRow()) }
function removeFormRole(r) {
  if (r.uuid) r._deleted = true
  else formRoleRows.value = formRoleRows.value.filter(x => x._key !== r._key)
}

function openCreate() {
  editingUser.value   = null
  userFormError.value = ''
  userForm.value = {
    username: '', first_name: '', last_name: '', email: '',
    password: '', password_confirm: '', is_active: true,
    rut: '', phone: '', position: '', organization: '',
  }
  formRoleRows.value = []
  showUserModal.value = true
}

function openEdit(user) {
  editingUser.value   = user
  userFormError.value = ''
  const profile = user.profile ?? {}
  userForm.value = {
    username: user.username, first_name: user.first_name,
    last_name: user.last_name, email: user.email,
    password: '', password_confirm: '', is_active: user.is_active,
    rut: profile.rut ?? '', phone: profile.phone ?? '',
    position: profile.position ?? '', organization: profile.organization ?? '',
  }
  // Cargar roles existentes para edición
  formRoleRows.value = (user.role_assignments ?? []).map(a => ({
    _key: ++_formRoleKey, uuid: a.uuid, _deleted: false,
    role: a.role, organization: a.organization ?? '', branch: a.branch ?? '',
  }))
  showUserModal.value = true
}

async function handleUserSubmit() {
  userFormLoading.value = true
  userFormError.value   = ''
  try {
    const f = userForm.value
    let userId = editingUser.value?.id

    if (!editingUser.value) {
      // ── CREAR ──
      if (!f.password) throw new Error('La contraseña es obligatoria.')
      if (f.password !== f.password_confirm) throw new Error('Las contraseñas no coinciden.')
      const res = await usersApi.createUser({
        username: f.username, first_name: f.first_name,
        last_name: f.last_name, email: f.email,
        password: f.password, password_confirm: f.password_confirm,
        is_active: f.is_active,
      })
      const newUser = res.data?.data ?? res.data
      userId = newUser.id
      if (f.rut || f.phone || f.position || f.organization) {
        await usersApi.createProfile({
          user: userId, rut: f.rut || null, phone: f.phone || null,
          position: f.position || null, organization: f.organization || null,
        }).catch(() => null)
      }
    } else {
      // ── EDITAR ──
      await usersApi.updateUser(userId, {
        username: f.username, first_name: f.first_name,
        last_name: f.last_name, email: f.email, is_active: f.is_active,
      })
      const profileUuid = editingUser.value.profile?.uuid
      const profileData = { rut: f.rut || null, phone: f.phone || null, position: f.position || null, organization: f.organization || null }
      if (profileUuid) await usersApi.updateProfile(profileUuid, profileData).catch(() => null)
      else             await usersApi.createProfile({ user: userId, ...profileData }).catch(() => null)
    }

    // ── Sincronizar roles ──
    const roleOps = formRoleRows.value.map(r => {
      // 1. Si está marcado como borrado y tiene UUID, eliminar
      if (r._deleted && r.uuid)
        return usersApi.deleteAssignment(r.uuid).catch(() => null)
      
      const data = {
        user: userId,
        role: r.role,
        organization: r.organization || null,
        legal_entity: r.legal_entity || null,
        branch: r.branch || null,
      }

      // 2. Si ya existe (tiene UUID) y NO está borrado, ACTUALIZAR
      if (!r._deleted && r.uuid)
        return usersApi.updateAssignment(r.uuid, data).catch(() => null)
      
      // 3. Si NO existe y NO está borrado, CREAR
      if (!r._deleted && !r.uuid && r.role)
        return usersApi.createAssignment(data).catch(() => null)
        
      return Promise.resolve()
    })
    await Promise.all(roleOps)

    showUserModal.value = false
    await loadUsers()
  } catch (err) {
    const d = err.response?.data
    if (d?.data && typeof d.data === 'object') {
      userFormError.value = Object.entries(d.data)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')
    } else {
      userFormError.value = d?.message ?? err.message ?? 'Error al guardar.'
    }
  } finally {
    userFormLoading.value = false
  }
}

// ── Modal contraseña ──────────────────────────────────────────────────────────
const showPwdModal   = ref(false)
const pwdTarget      = ref(null)
const pwdFormLoading = ref(false)
const pwdFormError   = ref('')
const pwdForm        = ref({ password: '', password_confirm: '' })

function openPassword(user) {
  pwdTarget.value    = user
  pwdFormError.value = ''
  pwdForm.value      = { password: '', password_confirm: '' }
  showPwdModal.value = true
}

async function handlePwdSubmit() {
  if (pwdForm.value.password !== pwdForm.value.password_confirm) {
    pwdFormError.value = 'Las contraseñas no coinciden.'
    return
  }
  pwdFormLoading.value = true
  pwdFormError.value   = ''
  try {
    await usersApi.setPassword(pwdTarget.value.id, pwdForm.value)
    showPwdModal.value = false
  } catch (err) {
    const d = err.response?.data
    pwdFormError.value = d?.message ?? d?.detail ?? 'Error al cambiar contraseña.'
  } finally {
    pwdFormLoading.value = false
  }
}

// ── Modal roles ───────────────────────────────────────────────────────────────
const showRolesModal  = ref(false)
const rolesTarget     = ref(null)   // usuario seleccionado
const rolesLoading    = ref(false)
const rolesError      = ref('')
const roleRows        = ref([])     // asignaciones actuales del usuario

// Fila nueva pendiente de guardar
const newRoleRow = ref({ uuid: null, role: '', organization: '', branch: '' })

async function openRoles(user) {
  rolesTarget.value = user
  rolesError.value  = ''
  roleRows.value    = [...(user.role_assignments ?? [])]
  newRoleRow.value  = { uuid: null, role: '', organization: '', branch: '' }
  showRolesModal.value = true
}

function editRoleAssignment(assignment) {
  newRoleRow.value = {
    uuid: assignment.uuid,
    role: assignment.role,
    organization: assignment.organization ?? '',
    branch: assignment.branch ?? ''
  }
}

async function addRoleAssignment() {
  if (!newRoleRow.value.role) { rolesError.value = 'Selecciona un rol.'; return }
  rolesLoading.value = true
  rolesError.value   = ''
  try {
    const data = {
      user:         rolesTarget.value.id,
      role:         newRoleRow.value.role,
      organization: newRoleRow.value.organization || null,
      legal_entity: newRoleRow.value.legal_entity || null,
      branch:       newRoleRow.value.branch       || null,
    }
    if (newRoleRow.value.uuid) {
      await usersApi.updateAssignment(newRoleRow.value.uuid, data)
    } else {
      await usersApi.createAssignment(data)
    }
    newRoleRow.value = { uuid: null, role: '', organization: '', branch: '' }
    // Recargar usuario para reflejar cambio
    const res = await usersApi.getUser(rolesTarget.value.id)
    const updated = res.data?.data ?? res.data
    roleRows.value = updated.role_assignments ?? []
    // Actualizar en la lista principal también
    const idx = userList.items.value.findIndex((u) => u.id === rolesTarget.value.id)
    if (idx !== -1) userList.items.value[idx] = updated
    rolesTarget.value = updated
  } catch (err) {
    const d = err.response?.data
    rolesError.value = d?.message ?? d?.detail ?? 'Error al guardar rol.'
  } finally {
    rolesLoading.value = false
  }
}

async function removeRoleAssignment(assignment) {
  rolesLoading.value = true
  try {
    await usersApi.deleteAssignment(assignment.uuid)
    roleRows.value = roleRows.value.filter((r) => r.uuid !== assignment.uuid)
    const idx = userList.items.value.findIndex((u) => u.id === rolesTarget.value.id)
    if (idx !== -1) userList.items.value[idx].role_assignments = roleRows.value
  } catch (err) {
    rolesError.value = 'Error al eliminar la asignación.'
  } finally {
    rolesLoading.value = false
  }
}

// ── Activar / desactivar usuario ──────────────────────────────────────────────
const toggleTarget  = ref(null)
const toggleLoading = ref(false)

async function confirmToggle() {
  toggleLoading.value = true
  try {
    if (toggleTarget.value.is_active) {
      await usersApi.deactivateUser(toggleTarget.value.id)
    } else {
      await usersApi.activateUser(toggleTarget.value.id)
    }
    toggleTarget.value = null
    await loadUsers()
  } finally {
    toggleLoading.value = false
  }
}

// ── Eliminar usuario ──────────────────────────────────────────────────────────
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

async function confirmDelete() {
  deleteLoading.value = true
  try {
    await usersApi.deleteUser(deleteTarget.value.id)
    deleteTarget.value = null
    await loadUsers()
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader title="Usuarios" subtitle="Gestión de cuentas y permisos del sistema">
      <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" @click="openCreate">
        <Plus :size="16" /> Nuevo usuario
      </button>
    </PageHeader>

    <AppAlert v-if="userList.error.value" type="error" :message="userList.error.value" />

    <!-- Tabla -->
    <AppTable :columns="columns" :rows="userList.items.value" :loading="userList.loading.value">
      <template #filter-full_name>
        <AppInput type="text" placeholder="Buscar..." :model-value="userList.params.search" @update:model-value="userList.setParam('search', $event)" />
      </template>
      <template #filter-is_active>
        <AppMultiSelect :options="ACTIVE_STATUS_OPTIONS" :modelValue="userList.params.is_active ? [userList.params.is_active] : []" @update:modelValue="userList.setParam('is_active', $event[0] || ''); userList.load()" />
      </template>

      <template #full_name="{ row }">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm">
            {{ (row.full_name || row.username || '?')[0].toUpperCase() }}
          </div>
          <div>
            <strong class="block text-sm">{{ row.full_name || row.username }}</strong>
            <span class="text-xs text-muted-foreground">{{ row.profile?.position ?? '' }}</span>
          </div>
        </div>
      </template>

      <template #email="{ row }">
        <span class="text-xs text-muted-foreground">{{ row.email || '—' }}</span>
      </template>

      <template #roles="{ row }">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="a in (row.role_assignments ?? []).slice(0, 3)"
            :key="a.uuid"
            class="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold"
          >
            {{ a.role_detail?.name ?? a.role_detail?.code ?? '—' }}
          </span>
          <span v-if="(row.role_assignments ?? []).length > 3" class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
            +{{ row.role_assignments.length - 3 }}
          </span>
          <span v-if="!(row.role_assignments ?? []).length" class="text-xs text-muted-foreground">Sin roles</span>
        </div>
      </template>

      <template #is_active="{ row }">
        <StatusBadge :status="row.is_active ? 'ACTIVO' : 'INACTIVO'" :map="{ ACTIVO: 'green', INACTIVO: 'neutral' }" />
      </template>

      <template #actions="{ row }">
        <button
          class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          title="Acciones"
          @click="openActions(row)"
        >
          <MoreVertical :size="16" />
        </button>
      </template>
    </AppTable>

    <AppPagination
      :count="userList.pagination.count"
      :page="userList.pagination.page"
      :page-size="userList.pagination.pageSize"
      @change="userList.setPage"
    />
  </section>

    <!-- ── Actions Modal ── -->
    <AppModal
      v-if="showActionModal"
      :title="`Acciones - ${activeActionRow?.full_name || activeActionRow?.username || 'Usuario'}`"
      size="sm"
      @close="showActionModal = false"
    >
      <div class="grid gap-2">
        <button class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium" @click="openEdit(activeActionRow); showActionModal = false">
          <Pencil :size="16" /> Editar
        </button>
        <button class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium" @click="openRoles(activeActionRow); showActionModal = false">
          <Shield :size="16" /> Roles
        </button>
        <button class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium" @click="openPassword(activeActionRow); showActionModal = false">
          <KeyRound :size="16" /> Contraseña
        </button>
        <button
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="toggleTarget = activeActionRow; showActionModal = false"
        >
          <component :is="activeActionRow.is_active ? UserX : UserCheck" :size="16" /> {{ activeActionRow.is_active ? 'Desactivar' : 'Activar' }}
        </button>
        <button class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium text-destructive" @click="deleteTarget = activeActionRow; showActionModal = false">
          <Trash2 :size="16" /> Eliminar
        </button>
      </div>
    </AppModal>

    <!-- ── Modal crear / editar usuario ── -->
    <AppModal

    v-if="showUserModal"
    :title="editingUser ? `Editar: ${editingUser.username}` : 'Nuevo usuario'"
    size="xl"
    @close="showUserModal = false"
  >
    <form @submit.prevent="handleUserSubmit">
      <AppAlert v-if="userFormError" type="error" :message="userFormError" />

      <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mt-4 mb-3">Datos de acceso</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nombre" required>
          <AppInput v-model="userForm.first_name" type="text" required />
        </FormField>
        <FormField label="Apellido" required>
          <AppInput v-model="userForm.last_name" type="text" required />
        </FormField>
        <FormField label="Nombre de usuario" required>
          <AppInput v-model="userForm.username" type="text" required autocomplete="off" />
        </FormField>
        <FormField label="Email">
          <AppInput v-model="userForm.email" type="email" />
        </FormField>

        <template v-if="!editingUser">
          <FormField label="Contraseña" required>
            <AppInput v-model="userForm.password" type="password" required autocomplete="new-password" />
          </FormField>
          <FormField label="Confirmar contraseña" required>
            <AppInput v-model="userForm.password_confirm" type="password" required autocomplete="new-password" />
          </FormField>
        </template>

        <label class="col-span-full flex items-center gap-2 text-sm">
          <input v-model="userForm.is_active" type="checkbox" /> Cuenta activa
        </label>
      </div>

      <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mt-6 mb-3">Perfil</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="RUT">
          <AppInput v-model="userForm.rut" type="text" placeholder="12.345.678-9" />
        </FormField>
        <FormField label="Teléfono">
          <AppInput v-model="userForm.phone" type="text" placeholder="+56 9 1234 5678" />
        </FormField>
        <FormField label="Cargo / Posición" class="col-span-full">
          <AppInput v-model="userForm.position" type="text" placeholder="Ej: Jefa de Sucursal" />
        </FormField>
      </div>

      <!-- ── Sección Roles ── -->
      <div class="mt-6 pt-4 border-t">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Roles asignados</p>
          <button type="button" class="text-xs font-semibold px-3 py-1.5 border rounded hover:bg-muted" @click="addFormRole">
            <Plus :size="14" /> Agregar rol
          </button>
        </div>

        <p v-if="!visibleFormRoles.length" class="text-sm text-muted-foreground italic p-2">
          Sin roles asignados. El usuario no podrá acceder a ningún módulo.
        </p>

        <div v-else class="space-y-2">
          <div v-for="r in visibleFormRoles" :key="r._key" class="flex gap-2 p-2 border rounded-md bg-muted/50 items-end">
            <!-- Rol -->
            <div class="flex-1 min-w-[120px] grid gap-1">
              <label class="text-[10px] font-bold uppercase text-muted-foreground">Rol</label>
              <AppSelect v-model="r.role" class="text-sm">
                <option value="">Seleccione...</option>
                <option v-for="rol in allRoles" :key="rol.uuid" :value="rol.uuid">{{ rol.name }}</option>
              </AppSelect>
            </div>
            <!-- Organización (scope) -->
            <div class="flex-1 min-w-[120px] grid gap-1">
              <label class="text-[10px] font-bold uppercase text-muted-foreground">Organización</label>
              <AppSelect v-model="r.organization" class="text-sm">
                <option value="">Global</option>
                <option v-for="o in allOrganizations" :key="o.uuid" :value="o.uuid">{{ o.name }}</option>
              </AppSelect>
            </div>
            <!-- Sucursal (scope) -->
            <div class="flex-1 min-w-[120px] grid gap-1">
              <label class="text-[10px] font-bold uppercase text-muted-foreground">Sucursal</label>
              <AppSelect v-model="r.branch" class="text-sm">
                <option value="">Global</option>
                <option v-for="b in allBranches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
              </AppSelect>
            </div>
            <!-- Quitar -->
            <button type="button" class="p-2 text-destructive hover:bg-destructive/10 rounded" title="Quitar" @click="removeFormRole(r)">
              <X :size="16" />
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button type="button" class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground" @click="showUserModal = false">Cancelar</button>
        <button type="submit" class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" :disabled="userFormLoading">
          {{ userFormLoading ? 'Guardando...' : (editingUser ? 'Guardar cambios' : 'Crear usuario') }}
        </button>
      </div>
    </form>
  </AppModal>

  <!-- ── Modal contraseña ── -->
  <AppModal
    v-if="showPwdModal"
    :title="`Cambiar contraseña — ${pwdTarget?.username}`"
    size="sm"
    @close="showPwdModal = false"
  >
    <form class="grid grid-cols-1 gap-4" @submit.prevent="handlePwdSubmit">
      <AppAlert v-if="pwdFormError" type="error" :message="pwdFormError" />
      <FormField label="Nueva contraseña" required>
        <AppInput v-model="pwdForm.password" type="password" required autocomplete="new-password" />
      </FormField>
      <FormField label="Confirmar contraseña" required>
        <AppInput v-model="pwdForm.password_confirm" type="password" required autocomplete="new-password" />
      </FormField>
      <div class="flex justify-end gap-3 mt-4 pt-4 border-t">
        <button type="button" class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground" @click="showPwdModal = false">Cancelar</button>
        <button type="submit" class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" :disabled="pwdFormLoading">
          {{ pwdFormLoading ? 'Guardando...' : 'Cambiar contraseña' }}
        </button>
      </div>
    </form>
  </AppModal>

  <!-- ── Modal roles ── -->
  <AppModal
    v-if="showRolesModal"
    :title="`Roles — ${rolesTarget?.full_name || rolesTarget?.username}`"
    size="lg"
    @close="showRolesModal = false"
  >
    <AppAlert v-if="rolesError" type="error" :message="rolesError" />

    <!-- Roles actuales -->
    <div class="grid gap-2 mb-6">
      <p v-if="!roleRows.length" class="text-sm text-muted-foreground italic">Este usuario no tiene roles asignados.</p>
      <div v-for="a in roleRows" :key="a.uuid" class="flex items-center justify-between p-3 border rounded-md bg-muted/30">
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{{ a.role_detail?.name ?? '—' }}</span>
          <span v-if="a.organization_detail || a.branch_detail" class="text-xs text-muted-foreground">
            {{ [a.organization_detail?.name, a.branch_detail?.name].filter(Boolean).join(' · ') }}
          </span>
        </div>
        <div class="flex items-center">
          <button class="p-2 rounded-md hover:bg-muted text-primary" title="Editar rol" :disabled="rolesLoading" @click="editRoleAssignment(a)">
            <Pencil :size="16" />
          </button>
          <button class="p-2 rounded-md hover:bg-muted text-destructive hover:bg-destructive/10" title="Quitar rol" :disabled="rolesLoading" @click="removeRoleAssignment(a)">
            <X :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Agregar nuevo rol -->
    <div class="pt-4 border-t">
      <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Asignar nuevo rol</p>
      <div class="flex gap-2 flex-wrap items-end">
        <div class="flex-1 min-w-[150px] grid gap-1">
          <label class="text-[10px] font-bold uppercase text-muted-foreground">Rol</label>
          <AppSelect v-model="newRoleRow.role" class="text-sm">
            <option value="">Seleccione...</option>
            <option v-for="r in allRoles" :key="r.uuid" :value="r.uuid">{{ r.name }}</option>
          </AppSelect>
        </div>
        <div class="flex-1 min-w-[150px] grid gap-1">
          <label class="text-[10px] font-bold uppercase text-muted-foreground">Organización</label>
          <AppSelect v-model="newRoleRow.organization" class="text-sm">
            <option value="">Global</option>
            <option v-for="o in allOrganizations" :key="o.uuid" :value="o.uuid">{{ o.name }}</option>
          </AppSelect>
        </div>
        <div class="flex-1 min-w-[150px] grid gap-1">
          <label class="text-[10px] font-bold uppercase text-muted-foreground">Sucursal</label>
          <AppSelect v-model="newRoleRow.branch" class="text-sm">
            <option value="">Global</option>
            <option v-for="b in allBranches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
          </AppSelect>
        </div>
        <button type="button" class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" :disabled="rolesLoading" @click="addRoleAssignment">
          <Plus :size="14" /> Agregar
        </button>
      </div>
    </div>
  </AppModal>

  <!-- ── Confirmar activar/desactivar ── -->
  <ConfirmDialog
    v-if="toggleTarget"
    :title="toggleTarget.is_active ? 'Desactivar usuario' : 'Activar usuario'"
    :message="toggleTarget.is_active
      ? `¿Desactivar la cuenta de &quot;${toggleTarget.username}&quot;? No podrá iniciar sesión.`
      : `¿Activar la cuenta de &quot;${toggleTarget.username}&quot;?`"
    :confirm-label="toggleTarget.is_active ? 'Desactivar' : 'Activar'"
    :loading="toggleLoading"
    @confirm="confirmToggle"
    @cancel="toggleTarget = null"
  />

  <!-- ── Confirmar eliminar ── -->
  <ConfirmDialog
    v-if="deleteTarget"
    title="Eliminar usuario"
    :message="`¿Estás seguro de eliminar permanentemente al usuario &quot;${deleteTarget.username}&quot;?`"
    confirm-label="Eliminar"
    confirm-class="bg-destructive hover:bg-destructive/90"
    :loading="deleteLoading"
    @confirm="confirmDelete"
    @cancel="deleteTarget = null"
  />
</template>
