<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import emitter from '@/utils/eventBus'
import AppAlert from '@/components/common/AppAlert.vue'

const error = ref(null)

const handleError = (response) => {
  error.value = response.data?.message || 'Error inesperado'
  setTimeout(() => {
    error.value = null
  }, 5000)
}

onMounted(() => {
  emitter.on('api:error', handleError)
})

onUnmounted(() => {
  emitter.off('api:error', handleError)
})
</script>

<template>
  <div class="fixed top-4 right-4 z-50 w-full max-w-sm">
    <AppAlert v-if="error" :message="error" type="error" />
  </div>
</template>
