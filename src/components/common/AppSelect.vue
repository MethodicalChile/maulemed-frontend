<script setup>
defineProps({
  modelValue: [String, Number],
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <select
    :value="modelValue"
    :required="required"
    :disabled="disabled"
    class="w-full px-3 py-2 border rounded-md bg-card text-foreground border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:opacity-50"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <slot />
  </select>
</template>
