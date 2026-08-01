<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { Menu, Bell, ChevronRight } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import UserMenu from './UserMenu.vue'
import { useNotificationCount } from '@/composables/useNotificationCount'

const emit = defineEmits(['open-sidebar', 'open-settings'])

const route  = useRoute()
const router = useRouter()

// Título de la página actual
const pageTitle = computed(() => route.meta?.title ?? 'Panel de control')

// Breadcrumb: "MauleMed / Página actual"
const breadcrumb = computed(() => {
  const title = route.meta?.title
  if (!title || title === 'Dashboard') return null
  return title
})

// ── Badge notificaciones ──────────────────────────────────────────────────────
const { unreadCount, refresh: fetchUnreadCount } = useNotificationCount()
let pollInterval = null

function goToNotifications() { router.push('/notifications') }

onMounted(() => {
  fetchUnreadCount()
  pollInterval = setInterval(fetchUnreadCount, 60_000)
})
onUnmounted(() => clearInterval(pollInterval))
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

    <!-- Badge notificaciones -->
    <button
      class="relative p-2 hover:bg-pastel-blue/50 rounded-md text-primary"
      aria-label="Notificaciones"
      :title="unreadCount > 0 ? `${unreadCount} sin leer` : 'Notificaciones'"
      @click="goToNotifications"
    >
      <Bell :size="19" />
      <span v-if="unreadCount > 0" class="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <UserMenu
      @open-profile="emit('open-settings', 'profile')"
      @open-password="emit('open-settings', 'password')"
    />
  </header>
</template>
