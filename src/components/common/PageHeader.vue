<script setup>
defineProps({
  title:    { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="flex items-center justify-between gap-4 pb-6 border-b border-border mb-6">
    <div class="flex-1 min-w-0">
      <h1 class="text-3xl font-extrabold text-primary">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-muted-foreground">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.default" class="flex items-center gap-2 flex-shrink-0">
      <slot />
    </div>
  </div>
</template>
