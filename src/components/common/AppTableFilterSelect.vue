<script setup>
defineProps({
  modelValue: { type: [String, Number], default: "" },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <select
    :value="modelValue"
    class="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <slot />
  </select>
</template>
