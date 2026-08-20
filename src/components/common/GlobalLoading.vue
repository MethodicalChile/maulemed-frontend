<script setup>
import { useUiStore } from "@/stores/ui.store";
const uiStore = useUiStore();
</script>

<template>
  <div
    v-if="uiStore.isLoading"
    class="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
  >
    <div
      class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
    ></div>
  </div>
</template>
