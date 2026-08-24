<script setup>
import { ref, onErrorCaptured } from "vue";
import AppAlert from "@/components/common/AppAlert.vue";

const error = ref(null);

onErrorCaptured((err, instance, info) => {
  console.error("ErrorBoundary captured error:", err, info);
  error.value = err;
  return false; // Prevent error from propagating further
});

const resetError = () => {
  error.value = null;
  window.location.reload(); // Or router.push('/') to reset
};
</script>

<template>
  <div
    v-if="error"
    class="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4"
  >
    <div class="max-w-md w-full">
      <AppAlert
        type="error"
        message="Ha ocurrido un error inesperado en esta sección."
      />
      <p class="text-sm text-muted-foreground mt-2 text-center">
        Por favor, intenta recargar la página o volver al dashboard.
      </p>
      <div class="mt-6 flex justify-center">
        <button
          class="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90"
          @click="resetError"
        >
          Recargar página
        </button>
      </div>
    </div>
  </div>
  <slot v-else />
</template>
