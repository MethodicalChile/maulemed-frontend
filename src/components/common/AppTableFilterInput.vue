<script setup>
defineProps({
  modelValue: { type: [String, Number], default: "" },
  placeholder: { type: String, default: "Buscar..." },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <input
    type="text"
    :placeholder="placeholder"
    :value="modelValue"
    class="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>
