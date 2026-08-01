<script setup>
import { Sun, Moon } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors"
    @click="toggleTheme"
  >
    <component :is="isDark ? Sun : Moon" :size="18" class="text-primary" />
    {{ isDark ? 'Modo claro' : 'Modo oscuro' }}
  </button>
</template>
