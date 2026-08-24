<script setup>
/**
 * @component App
 * @description Componente raíz de la aplicación. Gestiona la autenticación,
 *              la expiración de sesión y el layout principal.
 */
import { RouterView, useRouter } from "vue-router";
import NotificationHandler from "@/components/common/NotificationHandler.vue";
import AppModal from "@/components/common/AppModal.vue";
import GlobalLoading from "@/components/common/GlobalLoading.vue";
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
import { useAuthStore } from "@/stores/auth.store";
import { useSessionTimeout } from "@/composables/useSessionTimeout";

const authStore = useAuthStore();
const router = useRouter();

const { showWarning, remainingTime, refreshSession } = useSessionTimeout(() => {
  if (authStore.isAuthenticated) {
    authStore.logout();
    router.push("/login");
  }
});
</script>

<template>
  <GlobalLoading />
  <NotificationHandler />
  <ErrorBoundary>
    <RouterView />
  </ErrorBoundary>

  <!-- El modal solo se puede cerrar haciendo clic en "Mantener sesión" -->
  <AppModal v-if="showWarning" title="Sesión por expirar" size="sm">
    <p class="text-sm text-muted-foreground mb-4">
      Tu sesión se cerrará en <strong>{{ remainingTime }} segundos</strong> por
      inactividad. ¿Deseas continuar?
    </p>
    <template #footer>
      <button
        class="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90"
        @click="refreshSession"
      >
        Mantener sesión
      </button>
    </template>
  </AppModal>
</template>
