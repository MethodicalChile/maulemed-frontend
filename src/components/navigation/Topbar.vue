<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Menu, ChevronRight, RefreshCw } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useRefresh } from '@/composables/useRefresh'
import UserMenu from './UserMenu.vue'
import NotificationDropdown from './NotificationDropdown.vue'

const emit = defineEmits(['open-sidebar', 'open-settings'])

const route  = useRoute()
const { refreshFunction } = useRefresh()

// Título de la página actual
const pageTitle = computed(() => route.meta?.title ?? 'Panel de control')

// Breadcrumb: "MauleMed / Página actual"
const breadcrumb = computed(() => {
  const title = route.meta?.title
  if (!title || title === 'Dashboard') return null
  return title
})

const loading = ref(false)
async function triggerRefresh() {
  if (refreshFunction.value) {
    loading.value = true
    try {
      await refreshFunction.value()
    } finally {
      loading.value = false
    }
  }
}
</script>

<template>
  <header class="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-5">
    <!-- Hamburger mobile -->
    <button class="p-2 hover:bg-blue-50 rounded-md md:hidden" aria-label="Abrir menú" @click="emit('open-sidebar')">
      <Menu :size="22" class="text-primary" />
    </button>

    <!-- Breadcrumb / título -->
    <div class="flex-1 min-w-0">
      <nav class="flex items-center gap-1 text-sm text-muted-foreground" aria-label="breadcrumb">
        <span class="font-bold text-primary">MauleMed</span>
        <template v-if="breadcrumb">
          <ChevronRight :size="14" class="text-muted-foreground" />
          <span class="truncate font-semibold text-foreground">{{ breadcrumb }}</span>
        </template>
      </nav>
    </div>

    <!-- Right side items -->
    <div class="flex items-center gap-2">
      <!-- Badge notificaciones -->
      <NotificationDropdown />
      
      <!-- Botón de refresco global -->
      <button v-if="refreshFunction" class="p-2 hover:bg-muted rounded-md transition-colors" @click="triggerRefresh" :disabled="loading" aria-label="Actualizar">
        <RefreshCw :size="18" :class="{ 'animate-spin': loading }" class="text-muted-foreground" />
      </button>

      <UserMenu
        @open-profile="emit('open-settings', 'profile')"
        @open-password="emit('open-settings', 'password')"
      />
    </div>
  </header>
</template>
