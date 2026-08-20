<script setup>
defineProps({
  label: { type: String, required: true },
  error: { type: String, default: "" },
  required: { type: Boolean, default: false },
});
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <label class="text-xs font-bold text-primary uppercase tracking-wider">
      {{ label }}<span v-if="required" class="text-destructive ml-1">*</span>
    </label>
    <div
      :aria-describedby="
        error ? 'error-' + label.replace(/\s+/g, '-').toLowerCase() : undefined
      "
    >
      <slot />
    </div>
    <span
      v-if="error"
      :id="'error-' + label.replace(/\s+/g, '-').toLowerCase()"
      class="text-xs text-destructive"
      >{{ error }}</span
    >
  </div>
</template>
