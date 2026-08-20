<script setup>
defineProps({
  type: { type: String, default: "error" }, // error | success | info | warning
  message: { type: String, required: true },
});

const ICONS = {
  error: "✕",
  success: "✓",
  info: "ℹ",
  warning: "⚠",
};

const typeClasses = {
  error: "bg-destructive/10 text-destructive border-destructive",
  success: "bg-green-100 text-green-800 border-green-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
};
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="message"
      :class="[
        'flex items-start gap-3 p-4 rounded-lg border-l-4 border text-sm',
        typeClasses[type],
      ]"
      role="alert"
    >
      <span class="font-bold shrink-0">{{ ICONS[type] ?? ICONS.info }}</span>
      <span class="whitespace-pre-wrap break-words">{{ message }}</span>
    </div>
  </Transition>
</template>
