<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Seleccionar...' },
})

const emit = defineEmits(['update:modelValue'])
const isOpen = ref(false)
const container = ref(null)

const close = (e) => {
  if (container.value && !container.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', close))
onUnmounted(() => document.removeEventListener('click', close))

const toggleOption = (val) => {
  const newValue = [...props.modelValue]
  const idx = newValue.indexOf(val)
  if (idx > -1) newValue.splice(idx, 1)
  else newValue.push(val)
  emit('update:modelValue', newValue)
}

const label = computed(() => {
  if (props.modelValue.length === 0) return props.placeholder
  return `${props.modelValue.length} seleccionado(s)`
})
</script>

<template>
  <div class="relative w-full" ref="container">
    <button
      type="button"
      @click.stop="isOpen = !isOpen"
      class="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-card text-foreground border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
    >
      <span class="truncate">{{ label }}</span>
      <ChevronDown :size="16" class="ml-2" />
    </button>
    <div
      v-if="isOpen"
      class="absolute z-[9999] w-full min-w-[150px] mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
    >
      <div
        v-for="opt in options"
        :key="opt.value"
        @click="toggleOption(opt.value)"
        class="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer text-sm"
      >
        <div :class="['w-4 h-4 border rounded flex items-center justify-center', modelValue.includes(opt.value) ? 'bg-primary border-primary' : 'border-border']">
          <Check v-if="modelValue.includes(opt.value)" :size="12" class="text-white" />
        </div>
        {{ opt.label }}
      </div>
    </div>
  </div>
</template>
