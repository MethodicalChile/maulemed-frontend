<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Plus, Pencil, Trash2, Check, X, Search, Users, ShieldCheck } from 'lucide-vue-next'
import { usersApi } from '@/api/users.api'
import { useAuthStore } from '@/stores/auth.store'
import { useList } from '@/composables/useList'
import { useForm } from '@/composables/useForm'
import { useRefresh } from '@/composables/useRefresh'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import AppModal from '@/components/common/AppModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormField from '@/components/common/FormField.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'list',   label: 'Roles del sistema',  icon: Users },
  { key: 'matrix', label: 'Matriz de permisos', icon: ShieldCheck },
]
const activeTab = ref('list')

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — LISTA DE ROLES
// ─────────────────────────────────────────────────────────────────────────────
const roleCols = [
  { key: 'name',        label: 'Nombre' },
  { key: 'code',        label: 'Código' },
  { key: 'description', label: 'Descripción' },
  { key: 'is_active',   label: 'Estado',   width: '100px' },
  { key: 'perms',       label: 'Accesos',  width: '90px' },
  { key: 'actions',     label: '',         width: '90px' },
]

// useList con búsqueda server-side y debounce incorporado
const roleList = useList(usersApi.listRoles, { page_size: 100 })

// Alias para acceso directo desde el resto del script
const roles        = roleList.items
const loadError    = roleList.error
const loadingRoles = roleList.loading

async function loadRoles() {
  await roleList.load()
}

// Códigos de roles que existen en BD
const existingCodes = computed(() => new Set(roles.value.map(r => r.code)))

// CRUD
const showRoleForm  = ref(false)
const editingRole   = ref(null)
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

const { form: roleForm, loading: roleLoading, error: roleError,
        reset: roleReset, fill: roleFill, submit: roleSubmit } = useForm(
  { code: '', name: '', description: '', is_active: true },
  (data) => editingRole.value
    ? usersApi.updateRole(editingRole.value.uuid, data)
    : usersApi.createRole(data)
)

function openCreate() {
  editingRole.value  = null
  roleReset()
  showRoleForm.value = true
}

function openEdit(row) {
  editingRole.value = row
  roleFill({
    code:        row.code,
    name:        row.name,
    description: row.description ?? '',
    is_active:   row.is_active,
  })
  showRoleForm.value = true
}

async function handleRoleSubmit() {
  try {
    await roleSubmit()
    showRoleForm.value = false
    await loadRoles()
    await loadMatrix()
  } catch {
    // roleError ya está seteado por useForm
  }
}

async function confirmDelete() {
  deleteLoading.value = true
  try {
    await usersApi.deleteRole(deleteTarget.value.uuid)
    deleteTarget.value = null
    loadRoles()
  } finally {
    deleteLoading.value = false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — MATRIZ DE PERMISOS
// Columnas = roles creados en BD + roles del sistema no creados aún
// ─────────────────────────────────────────────────────────────────────────────
const allRoleCodes  = ref([])
const matrixModules = ref([])
const matrixError   = ref('')
const loadingMatrix = ref(false)
const matrixSearch  = ref('')

const visibleCodes = computed(() => {
  const q = matrixSearch.value.trim().toLowerCase()
  // Mostrar primero los roles existentes en BD, luego el resto
  const sorted = [...allRoleCodes.value].sort((a, b) => {
    const aExists = existingCodes.value.has(a) ? 0 : 1
    const bExists = existingCodes.value.has(b) ? 0 : 1
    return aExists - bExists || a.localeCompare(b)
  })
  if (!q) return sorted
  return sorted.filter(c => c.toLowerCase().includes(q))
})

async function loadMatrix() {
  loadingMatrix.value = true
  matrixError.value   = ''
  try {
    const res = await usersApi.getRolePermissionsMatrix()
    const d   = res.data?.data ?? res.data
    // El backend devuelve roles como objetos {uuid, code, name} — extraemos solo el código
    const rawRoles = d.roles ?? []
    allRoleCodes.value  = rawRoles.map(r => typeof r === 'string' ? r : r.code)
    matrixModules.value = d.matrix ?? []
  } catch (err) {
    matrixError.value = err.response?.data?.message ?? 'Error al cargar la matriz.'
  } finally {
    loadingMatrix.value = false
  }
}

function hasPerm(permKey, roleCode) {
  for (const mod of matrixModules.value) {
    const p = mod.permissions.find(p => p.key === permKey)
    if (p) return p.roles?.includes(roleCode) ?? false
  }
  return false
}

function permCount(roleCode) {
  let n = 0
  matrixModules.value.forEach(m =>
    m.permissions.forEach(p => { if (p.roles?.includes(roleCode)) n++ })
  )
  return n
}

// Nombre corto para columna (usa el nombre real si existe en BD)
function colLabel(code) {
  const role = roles.value.find(r => r.code === code)
  if (role) {
    // Nombre corto: primeras 2 palabras, max 8 chars
    return role.name.split(' ').slice(0, 2).join(' ').slice(0, 8)
  }
  const SHORT = {
    ADMIN: 'Admin', GERENTE: 'Gerente', ABASTECIMIENTO: 'Abast.',
    FINANZAS: 'Finanzas', RRHH: 'RRHH', JEFA_SUCURSAL: 'J.Suc.',
    SECRETARIA: 'Secret.', TENS: 'TENS', TECNOLOGA_MEDICA: 'T.Med.',
    DOCTOR: 'Doctor', BODEGUERO: 'Bodeg.', PROVEEDOR: 'Prov.',
    MARKETING: 'Mkt.', CALIDAD: 'Calidad',
  }
  return SHORT[code] ?? code.slice(0, 7)
}

const authStore = useAuthStore()

// ─── Toggle permiso desde la matriz ──────────────────────────────────────────
const savingPerm = ref(null)  // 'roleCode:permKey' mientras se guarda

async function togglePerm(permKey, roleCode) {
  const key = `${roleCode}:${permKey}`
  if (savingPerm.value === key) return   // evitar doble click

  const wasGranted = hasPerm(permKey, roleCode)
  savingPerm.value  = key

  try {
    // Encontrar el UUID del rol
    const role = roles.value.find(r => r.code === roleCode)
    if (!role) return

    await usersApi.updateRolePermission({
      role_uuid:      role.uuid,
      permission_key: permKey,
      granted:        !wasGranted,
    })

    // Actualizar la matriz localmente
    for (const mod of matrixModules.value) {
      const perm = mod.permissions.find(p => p.key === permKey)
      if (perm) {
        if (!wasGranted) {
          if (!perm.roles.includes(roleCode)) perm.roles.push(roleCode)
        } else {
          perm.roles = perm.roles.filter(r => r !== roleCode)
        }
        break
      }
    }
    
    // Si el usuario actual está editando su propio rol, refrescar sus permisos
    await authStore.fetchMe()

  } catch (err) {
    matrixError.value = err.response?.data?.message ?? 'Error al actualizar el permiso.'
  } finally {
    savingPerm.value = null
  }
}

function isSaving(permKey, roleCode) {
  return savingPerm.value === `${roleCode}:${permKey}`
}
function autoGenerateCode() {
  if (!editingRole.value && !roleForm.code && roleForm.name) {
    roleForm.code = roleForm.name
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }
}

// ── Mount ─────────────────────────────────────────────────────────────────────
// v2 - botones habilitados
const { setRefreshFunction, clearRefreshFunction } = useRefresh()
function refresh() {
  loadRoles()
  loadMatrix()
}
onMounted(() => {
  setRefreshFunction(refresh)
  loadRoles()
  loadMatrix()
})
onUnmounted(clearRefreshFunction)
</script>

<template>
  <section class="space-y-6">
    <PageHeader title="Roles" subtitle="Crea y gestiona los roles del sistema. Define quién puede hacer qué.">
      <button v-if="activeTab === 'list'" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" @click="openCreate">
        <Plus :size="16" /> Nuevo rol
      </button>
    </PageHeader>

    <!-- ── Tabs ── -->
    <div class="flex border-b border-border mb-6">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        :class="['px-4 py-2 text-sm font-semibold border-b-2 transition-colors', activeTab === tab.key ? 'text-primary border-primary' : 'text-muted-foreground hover:text-foreground border-transparent']"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" :size="15" class="inline mr-2 -mt-0.5" />
        {{ tab.label }}
      </button>
    </div>


    <!-- ════════════════════════════════════════════
         TAB 1 — LISTA DE ROLES
         ════════════════════════════════════════════ -->
    <template v-if="activeTab === 'list'">

      <!-- Buscador -->
      <div class="flex items-center gap-4 mb-6">
        <div class="relative w-full md:w-64">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <AppInput
            type="text"
            placeholder="Buscar por nombre o código..."
            :model-value="roleList.params.search"
            @update:model-value="roleList.setParam('search', $event)"
            class="pl-10"
          />
        </div>
      </div>

      <AppAlert v-if="loadError" type="error" :message="loadError" />

      <!-- Estado vacío -->
      <div v-if="!loadingRoles && !roles.length" class="text-center py-16 text-muted-foreground space-y-4">
        <ShieldCheck :size="40" class="mx-auto" />
        <div>
          <strong class="block text-lg text-foreground">Sin roles configurados</strong>
          <p class="text-sm">Crea el primer rol con el botón "+ Nuevo rol".</p>
        </div>
        <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" @click="openCreate"><Plus :size="16" /> Crear primer rol</button>
      </div>

      <!-- Cards de roles (más visual que tabla) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="role in roles"
          :key="role.uuid"
          :class="['flex items-start gap-4 p-5 border rounded-lg bg-card shadow-sm transition-shadow', !role.is_active && 'opacity-60 bg-muted/50']"
        >
          <!-- Avatar del rol -->
          <div class="w-10 h-10 flex-shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-lg">
            {{ role.name[0]?.toUpperCase() ?? '?' }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm">{{ role.name }}</div>
            <div class="text-xs font-mono text-muted-foreground mt-0.5">{{ role.code }}</div>
            <div v-if="role.description" class="text-xs text-muted-foreground mt-1 truncate">{{ role.description }}</div>
          </div>

          <!-- Badges & Actions -->
          <div class="flex flex-col items-end gap-2">
            <div class="flex flex-col items-end gap-1">
              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold', role.is_active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground']">
                {{ role.is_active ? 'Activo' : 'Inactivo' }}
              </span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{{ permCount(role.code) }} accesos</span>
            </div>
            <div class="flex gap-1">
              <button class="p-2 rounded-md hover:bg-muted" title="Editar rol" @click="openEdit(role)">
                <Pencil :size="14" />
              </button>
              <button class="p-2 rounded-md hover:bg-muted text-destructive hover:bg-destructive/10" title="Eliminar rol" @click="deleteTarget = role">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ════════════════════════════════════════════
         TAB 2 — MATRIZ DE PERMISOS
         ════════════════════════════════════════════ -->
    <template v-if="activeTab === 'matrix'">

      <div class="flex flex-wrap items-center gap-4 mb-6">
        <div class="flex items-center gap-2 px-3 py-2 border rounded-md">
          <Search :size="16" class="text-muted-foreground" />
          <input v-model="matrixSearch" type="text" placeholder="Filtrar columnas por rol..." class="bg-transparent text-sm focus:outline-none" />
        </div>
        <div class="flex items-center gap-4 text-xs text-muted-foreground">
          <div class="flex items-center gap-1"><span class="flex items-center justify-center text-green-600"><Check :size="16" stroke-width="3" /></span> Con acceso</div>
          <div class="flex items-center gap-1"><span class="flex items-center justify-center text-red-500"><X :size="16" stroke-width="3" /></span> Sin acceso</div>
          <div class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-primary"></span> Creado en BD</div>
        </div>
      </div>

      <div v-if="loadingMatrix" class="text-center py-12 text-muted-foreground">Cargando matriz de permisos...</div>

      <div v-else-if="matrixError">
        <AppAlert type="error" :message="matrixError" />
      </div>

      <div v-else class="border rounded-lg overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-muted/50 text-left">
              <th class="p-3 border-b font-semibold text-xs uppercase text-muted-foreground whitespace-nowrap min-w-[200px]">Módulo / Acción</th>
              <th
                v-for="code in visibleCodes"
                :key="code"
                class="p-3 border-b font-semibold text-center whitespace-nowrap"
              >
                <div class="flex flex-col items-center gap-1">
                  <span v-if="existingCodes.has(code)" class="w-2 h-2 rounded-full bg-primary"></span>
                  <span class="text-[10px] font-bold text-foreground" :title="code">{{ colLabel(code) }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <template v-for="mod in matrixModules" :key="mod.key">
              <tr class="bg-primary/5 border-t border-border">
                <td :colspan="visibleCodes.length + 1" class="px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary">
                  {{ mod.module }}
                </td>
              </tr>
              <tr
                v-for="perm in mod.permissions"
                :key="perm.key"
                class="hover:bg-muted/30 even:bg-muted/5 transition-colors"
              >
                <td class="px-3 py-2 text-sm">{{ perm.action }}</td>
                <td
                  v-for="code in visibleCodes"
                  :key="code"
                  class="text-center cursor-pointer p-1"
                  :class="[
                    existingCodes.has(code) ? 'hover:bg-sky-100' : 'cursor-not-allowed',
                  ]"
                  :title="existingCodes.has(code)
                    ? (hasPerm(perm.key, code) ? 'Clic para quitar acceso' : 'Clic para dar acceso')
                    : 'Crea este rol primero para editar'"
                  @click="existingCodes.has(code) && togglePerm(perm.key, code)"
                >
                  <div class="flex justify-center items-center h-full">
                    <span v-if="isSaving(perm.key, code)" class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    <span v-else-if="hasPerm(perm.key, code)" class="w-5 h-5 flex items-center justify-center rounded-full text-green-600 font-bold">
                      <Check :size="16" stroke-width="3" />
                    </span>
                    <span v-else class="w-5 h-5 flex items-center justify-center rounded-full text-red-500 font-bold">
                      <X :size="16" stroke-width="3" />
                    </span>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-muted-foreground pt-4">
        <span class="inline-block w-2 h-2 rounded-full bg-primary"></span> Roles marcados están creados en la BD y asignables a usuarios.
      </p>
    </template>

    <!-- ══ Modal crear / editar rol ══ -->
    <AppModal
      v-if="showRoleForm"
      :title="editingRole ? `Editar rol: ${editingRole.name}` : 'Nuevo rol'"
      size="md"
      @close="showRoleForm = false"
    >
      <form class="grid grid-cols-1 gap-4" @submit.prevent="handleRoleSubmit">
        <AppAlert v-if="roleError" type="error" :message="roleError" />

        <FormField label="Nombre del rol" required>
          <AppInput
            v-model="roleForm.name"
            required
            placeholder="Ej: Kinesiólogo, Enfermera, Bodeguero..."
            @blur="autoGenerateCode"
          />
        </FormField>

        <FormField label="Código único" required>
          <AppInput
            v-model="roleForm.code"
            required
            :disabled="!!editingRole"
            placeholder="Ej: KINESIOLOGO"
            @input="roleForm.code = roleForm.code.toUpperCase().replace(/\s/g, '_').replace(/[^A-Z0-9_]/g, '')"
          />
        </FormField>

        <p class="text-xs text-muted-foreground -mt-3" v-if="!editingRole">
          Se genera automáticamente desde el nombre. Solo mayúsculas y guiones bajos.
        </p>

        <FormField label="Descripción">
          <AppTextarea
            v-model="roleForm.description"
            rows="2"
            placeholder="¿Qué hace este rol? ¿Qué responsabilidades tiene?..."
          />
        </FormField>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="roleForm.is_active" type="checkbox" />
          Rol activo (puede asignarse a usuarios)
        </label>

        <!-- Preview de accesos si ya existe en la matriz -->
        <div
          v-if="roleForm.code && permCount(roleForm.code) > 0"
          class="bg-card border rounded-md p-4 mt-2"
        >
          <p class="text-sm font-semibold text-foreground mb-2 flex items-center justify-between">
            Accesos del sistema
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{{ permCount(roleForm.code) }} accesos</span>
          </p>
          <div class="grid gap-1 max-h-40 overflow-y-auto text-xs">
            <template v-for="mod in matrixModules" :key="mod.key">
              <div
                v-for="perm in mod.permissions.filter(p => p.roles?.includes(roleForm.code))"
                :key="perm.key"
                class="flex items-center gap-2"
              >
                <Check :size="16" stroke-width="3" class="text-green-600 flex-shrink-0" />
                <span><strong>{{ mod.module }}</strong> — {{ perm.action }}</span>
              </div>
            </template>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-4 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground" @click="showRoleForm = false">Cancelar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90" :disabled="roleLoading">
            {{ roleLoading ? 'Guardando...' : (editingRole ? 'Guardar cambios' : 'Crear rol') }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ Confirmar eliminar ══ -->
    <ConfirmDialog
      v-if="deleteTarget"
      title="Eliminar rol"
      :message="`¿Eliminar el rol &quot;${deleteTarget.name}&quot;? Los usuarios con este rol perderán la asignación.`"
      confirm-label="Eliminar"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </section>
</template>

