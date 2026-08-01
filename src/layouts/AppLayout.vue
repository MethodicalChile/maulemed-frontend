<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/navigation/Sidebar.vue'
import Topbar from '@/components/navigation/Topbar.vue'
import UserSettingsModal from '@/components/user/UserSettingsModal.vue'
import ChatbotWidget from '@/components/common/ChatbotWidget.vue'
import { useAuthStore } from '@/stores/auth.store'
import { REFRESH_INTERVAL_MS } from '@/config/refresh'

const authStore = useAuthStore()
const router    = useRouter()

// ── Sidebar ───────────────────────────────────────────────────────────────────
const sidebarOpen = ref(false)
function openSidebar()  { sidebarOpen.value = true }
function closeSidebar() { sidebarOpen.value = false }

// ── Modal de configuración ────────────────────────────────────────────────────
const showSettings = ref(false)
const settingsTab  = ref('profile')
function openSettings(tab) {
  settingsTab.value  = tab ?? 'profile'
  showSettings.value = true
}

// ── Refresco periódico de permisos ────────────────────────────────────────────
// Llama a /auth/me/ cada REFRESH_INTERVAL_MS para detectar cambios de permisos
// en tiempo real (ej: el admin quitó/agregó accesos al rol del usuario activo).
let permTimer = null

async function refreshPermissions() {
  if (!authStore.isAuthenticated) return
  try {
    const prevMenu = JSON.stringify(authStore.menu)
    await authStore.fetchMe()
    // Si el menú cambió, navegar al dashboard para aplicar los nuevos accesos
    if (JSON.stringify(authStore.menu) !== prevMenu) {
      const current = router.currentRoute.value
      // Solo redirige si la ruta actual ya no está en el nuevo menú
      const allowedPaths = (authStore.menu ?? []).map(m => m.path)
      if (current.path !== '/dashboard' && !allowedPaths.includes(current.path)) {
        router.push('/dashboard')
      }
    }
  } catch {
    // Silencioso — no interrumpe al usuario
  }
}

onMounted(() => {
  permTimer = setInterval(refreshPermissions, REFRESH_INTERVAL_MS)
})

onUnmounted(() => {
  clearInterval(permTimer)
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background relative">
    <div class="watermark-fixed"></div>
    <Sidebar class="hidden md:flex z-10" />


    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/50 z-20 md:hidden"
      @click="closeSidebar"
    />

    <aside :class="['fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 md:hidden', { 'translate-x-0': sidebarOpen, '-translate-x-full': !sidebarOpen }]">
      <Sidebar @navigate="closeSidebar" />
    </aside>

    <div class="flex-1 flex flex-col overflow-hidden">
      <Topbar
        @open-sidebar="openSidebar"
        @open-settings="openSettings"
      />

      <main class="flex-1 overflow-y-auto p-5">
        <RouterView />
      </main>
    </div>
  </div>

  <!-- Modal fuera del stacking context del topbar -->
  <UserSettingsModal
    v-if="showSettings"
    :initial-tab="settingsTab"
    @close="showSettings = false"
  />
  <ChatbotWidget />
</template>
