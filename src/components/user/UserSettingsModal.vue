<script setup>
/**
 * UserSettingsModal
 * Modal de configuración personal del usuario autenticado.
 * Tabs: Mi perfil | Editar perfil | Cambiar contraseña
 */
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { usersApi } from '@/api/users.api'
import AppModal from '@/components/common/AppModal.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import FormField from '@/components/common/FormField.vue'

const props = defineProps({
  initialTab: { type: String, default: 'profile' },
})

const emit = defineEmits(['close'])
const authStore = useAuthStore()

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref(props.initialTab)
watch(() => props.initialTab, (val) => { activeTab.value = val })

// ── Perfil ────────────────────────────────────────────────────────────────────
const profile = authStore.user?.profile ?? {}
const profileForm = ref({
  first_name: authStore.user?.first_name ?? '',
  last_name:  authStore.user?.last_name  ?? '',
  rut:        profile.rut      ?? '',
  phone:      profile.phone    ?? '',
  position:   profile.position ?? '',
})

const profileLoading = ref(false)
const profileError   = ref('')
const profileSuccess = ref('')

async function saveProfile() {
  profileLoading.value = true
  profileError.value   = ''
  profileSuccess.value = ''
  try {
    await usersApi.updateMyProfile({
      first_name: profileForm.value.first_name || null,
      last_name:  profileForm.value.last_name  || null,
      rut:        profileForm.value.rut        || null,
      phone:      profileForm.value.phone      || null,
      position:   profileForm.value.position   || null,
    })
    profileSuccess.value = 'Perfil actualizado correctamente.'
    await authStore.fetchMe()
  } catch (err) {
    const d = err.response?.data
    profileError.value = d?.message ?? d?.detail ?? 'Error al actualizar el perfil.'
  } finally {
    profileLoading.value = false
  }
}

// ── Contraseña ────────────────────────────────────────────────────────────────
const pwdForm = ref({ password: '', password_confirm: '' })
const pwdLoading = ref(false)
const pwdError   = ref('')
const pwdSuccess = ref('')

async function savePassword() {
  pwdError.value   = ''
  pwdSuccess.value = ''
  if (!pwdForm.value.password) { pwdError.value = 'Ingresa la nueva contraseña.'; return }
  if (pwdForm.value.password !== pwdForm.value.password_confirm) { pwdError.value = 'Las contraseñas no coinciden.'; return }
  pwdLoading.value = true
  try {
    await usersApi.changeMyPassword({ password: pwdForm.value.password, password_confirm: pwdForm.value.password_confirm })
    pwdSuccess.value = 'Contraseña actualizada.'
    pwdForm.value = { password: '', password_confirm: '' }
  } catch (err) {
    const d = err.response?.data
    pwdError.value = d?.data && typeof d.data === 'object' ? Object.values(d.data).flat().join(' ') : (d?.message ?? d?.detail ?? 'Error al cambiar la contraseña.')
  } finally { pwdLoading.value = false }
}
</script>

<template>
  <AppModal title="Configuración de mi cuenta" size="md" @close="emit('close')">
    
    <!-- Tabs -->
    <div class="flex border-b border-border mb-6">
      <button
        v-for="tab in [
          {key:'profile', label:'Mi perfil'}, 
          {key:'edit_profile', label:'Editar perfil'},
          {key:'password', label:'Contraseña'}
        ]"
        :key="tab.key"
        :class="['px-4 py-2 text-sm font-semibold border-b-2 transition-colors', activeTab === tab.key ? 'text-primary border-primary' : 'text-muted-foreground hover:text-foreground border-transparent']"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ── TAB PERFIL (VIEW) ── -->
    <div v-if="activeTab === 'profile'" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 p-4 bg-pastel-blue/20 rounded-lg border border-pastel-blue">
        <div class="flex flex-col"><span class="text-[10px] font-bold text-primary uppercase">Usuario</span><span class="text-sm font-medium">{{ authStore.user?.username }}</span></div>
        <div class="flex flex-col"><span class="text-[10px] font-bold text-primary uppercase">Email</span><span class="text-sm font-medium">{{ authStore.user?.email || '—' }}</span></div>
        <div class="flex flex-col"><span class="text-[10px] font-bold text-primary uppercase">Rol(es)</span><span class="text-sm font-medium">{{ authStore.roleCodes?.join(', ') || '—' }}</span></div>
        <div class="flex flex-col"><span class="text-[10px] font-bold text-primary uppercase">Nombre completo</span><span class="text-sm font-medium">{{ authStore.fullName || '—' }}</span></div>
        <div class="flex flex-col"><span class="text-[10px] font-bold text-primary uppercase">Cargo</span><span class="text-sm font-medium">{{ profile.position || '—' }}</span></div>
      </div>
      <div class="flex justify-end pt-2">
        <button class="px-4 py-2 text-sm font-medium border rounded hover:bg-muted" @click="emit('close')">Cerrar</button>
      </div>
    </div>

    <!-- ── TAB EDITAR PERFIL ── -->
    <div v-if="activeTab === 'edit_profile'" class="space-y-4">
      <AppAlert v-if="profileError" type="error" :message="profileError" />
      <AppAlert v-if="profileSuccess" type="success" :message="profileSuccess" />

      <form class="grid grid-cols-2 gap-4" @submit.prevent="saveProfile">
        <FormField label="Nombre" required><input v-model="profileForm.first_name" type="text" class="w-full px-3 py-2 border rounded-md" required /></FormField>
        <FormField label="Apellido" required><input v-model="profileForm.last_name" type="text" class="w-full px-3 py-2 border rounded-md" required /></FormField>
        <FormField label="RUT"><input v-model="profileForm.rut" type="text" class="w-full px-3 py-2 border rounded-md" /></FormField>
        <FormField label="Teléfono"><input v-model="profileForm.phone" type="text" class="w-full px-3 py-2 border rounded-md" /></FormField>
        <FormField label="Cargo / Posición" class="col-span-full"><input v-model="profileForm.position" type="text" class="w-full px-3 py-2 border rounded-md" /></FormField>
        <div class="col-span-full flex justify-end gap-3 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm font-medium border rounded hover:bg-muted" @click="emit('close')">Cerrar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90" :disabled="profileLoading">{{ profileLoading ? 'Guardando...' : 'Guardar perfil' }}</button>
        </div>
      </form>
    </div>

    <!-- ── TAB CONTRASEÑA ── -->
    <div v-if="activeTab === 'password'" class="space-y-4">
      <AppAlert v-if="pwdError" type="error" :message="pwdError" />
      <AppAlert v-if="pwdSuccess" type="success" :message="pwdSuccess" />

      <form class="space-y-4" @submit.prevent="savePassword">
        <FormField label="Nueva contraseña" required><input v-model="pwdForm.password" type="password" class="w-full px-3 py-2 border rounded-md" required /></FormField>
        <FormField label="Confirmar contraseña" required><input v-model="pwdForm.password_confirm" type="password" class="w-full px-3 py-2 border rounded-md" required /></FormField>
        <div class="flex justify-end gap-3 pt-4 border-t">
          <button type="button" class="px-4 py-2 text-sm font-medium border rounded hover:bg-muted" @click="emit('close')">Cerrar</button>
          <button type="submit" class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90" :disabled="pwdLoading">{{ pwdLoading ? 'Cambiando...' : 'Cambiar contraseña' }}</button>
        </div>
      </form>
    </div>
  </AppModal>
</template>

