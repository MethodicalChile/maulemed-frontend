<script setup>
defineProps({
  modelValue: String,
  placeholder: { type: String, default: "" },
  rows: { type: [String, Number], default: 3 },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <textarea
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    :required="required"
    :disabled="disabled"
    class="w-full px-3 py-2 border rounded-md bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary border-border transition-colors disabled:opacity-50"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>
