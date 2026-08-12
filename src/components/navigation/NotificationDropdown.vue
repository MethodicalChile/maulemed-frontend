<script setup>
import { ref, onMounted } from 'vue'
import { Bell, Check, X } from 'lucide-vue-next'
import { notificationsApi } from '@/api/notifications.api'
import { useNotificationCount } from '@/composables/useNotificationCount'

const { unreadCount, refresh: refreshBadge } = useNotificationCount()
const showDropdown = ref(false)
const notifications = ref([])
const loading = ref(false)
const markAllLoading = ref(false)

async function loadLatest() {
  loading.value = true
  try {
    const res = await notificationsApi.getLatest(10)
    notifications.value = res.data?.data ?? res.data ?? []
  } catch (e) {
    console.error('Error loading notifications', e)
  } finally {
    loading.value = false
  }
}

async function markRead(uuid) {
  await notificationsApi.markAsRead(uuid)
  await loadLatest()
  refreshBadge()
}

async function markAllRead() {
  markAllLoading.value = true
  try {
    await notificationsApi.markAllAsRead()
    await loadLatest()
    refreshBadge()
  } catch (e) {
    console.error('Error marking all as read', e)
  } finally {
    markAllLoading.value = false
  }
}

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    loadLatest()
  }
}
</script>

<template>
  <div class="relative">
    <button
      class="relative p-2 hover:bg-pastel-blue/50 rounded-md text-primary"
      aria-label="Notificaciones"
      @click="toggleDropdown"
    >
      <Bell :size="19" />
      <span v-if="unreadCount > 0" class="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown -->
    <div v-if="showDropdown" class="absolute right-0 mt-2 w-80 bg-white border border-border rounded-lg shadow-lg z-50">
      <div class="p-3 border-b flex justify-between items-center">
        <h3 class="font-bold text-sm">Notificaciones</h3>
        <button v-if="notifications.length > 0" class="text-xs text-primary hover:underline flex items-center gap-1" :disabled="markAllLoading" @click="markAllRead">
          <Check :size="12" />
          {{ markAllLoading ? '...' : 'Marcar todas como leídas' }}
        </button>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <div v-if="loading" class="p-4 text-center text-sm text-muted-foreground">Cargando...</div>
        <div v-else-if="!notifications.length" class="p-4 text-center text-sm text-muted-foreground">No tienes notificaciones nuevas</div>
        <div v-for="n in notifications" :key="n.uuid" :class="['p-3 border-b flex justify-between items-start', !n.is_read ? 'bg-blue-50' : '']">
          <div class="text-sm">
            <p class="font-bold">{{ n.title }}</p>
            <p class="text-xs">{{ n.body }}</p>
          </div>
          <button v-if="!n.is_read" class="text-primary hover:text-primary/80" @click="markRead(n.uuid)">
            <Check :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
