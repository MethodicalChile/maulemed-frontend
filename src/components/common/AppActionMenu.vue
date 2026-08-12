<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { MoreVertical } from 'lucide-vue-next'

const isOpen = ref(false)
const menuRef = ref(null)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const closeMenu = (event) => {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div class="relative" ref="menuRef">
    <button
      class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
      @click="toggleMenu"
      title="Acciones"
    >
      <MoreVertical :size="16" />
    </button>
    <div
      v-if="isOpen"
      class="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-md shadow-lg z-50 py-1"
    >
      <slot />
    </div>
  </div>
</template>
