<script setup>
defineProps({
  className: { type: String, default: "" },
});
</script>

<template>
  <div :class="['animate-pulse rounded bg-muted', className]"></div>
</template>
