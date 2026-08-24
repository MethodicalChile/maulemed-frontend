<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { Sun, Moon } from "lucide-vue-next";
import { useTheme } from "@/composables/useTheme";
import FormField from "@/components/common/FormField.vue";
import AppInput from "@/components/common/AppInput.vue";

const { isDark, toggleTheme } = useTheme();
const router = useRouter();
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
const errorMessage = ref("");
const googleButton = ref(null);

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const getErrorMessage = (error) => {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    "No fue posible iniciar sesión."
  );
};

const submitLogin = async () => {
  errorMessage.value = "";

  if (!username.value || !password.value) {
    errorMessage.value = "Debe ingresar usuario y contraseña.";
    return;
  }

  try {
    await authStore.login({
      username: username.value,
      password: password.value,
    });

    await router.push("/dashboard");
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
};

const handleGoogleCredential = async ({ credential }) => {
  errorMessage.value = "";

  if (!credential) {
    errorMessage.value = "Google no entregó una credencial válida.";
    return;
  }

  try {
    await authStore.loginWithGoogle(credential);

    await router.push("/dashboard");
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
};

const renderGoogleButton = async () => {
  if (!googleClientId) {
    return;
  }

  if (!window.google?.accounts?.id) {
    return;
  }

  await nextTick();

  if (!googleButton.value) {
    return;
  }

  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredential,
  });

  window.google.accounts.id.renderButton(googleButton.value, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: 360,
  });
};

const loadGoogleIdentityServices = () => {
  if (!googleClientId) {
    return;
  }

  if (window.google?.accounts?.id) {
    renderGoogleButton();
    return;
  }

  const existingScript = document.querySelector(
    "script[data-google-identity-services]",
  );

  if (existingScript) {
    existingScript.addEventListener("load", renderGoogleButton, {
      once: true,
    });

    return;
  }

  const script = document.createElement("script");

  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.dataset.googleIdentityServices = "true";

  script.addEventListener("load", renderGoogleButton, {
    once: true,
  });

  script.addEventListener(
    "error",
    () => {
      errorMessage.value = "No fue posible cargar el acceso con Google.";
    },
    {
      once: true,
    },
  );

  document.head.appendChild(script);
};

onMounted(() => {
  loadGoogleIdentityServices();
});

onBeforeUnmount(() => {
  window.google?.accounts?.id?.cancel();
});
</script>

<template>
  <section
    class="min-h-screen flex items-center justify-center bg-background p-4 relative"
  >
    <div class="watermark-fixed"></div>
    <button
      class="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors z-20"
      @click="toggleTheme"
    >
      <component :is="isDark ? Sun : Moon" :size="20" class="text-primary" />
    </button>
    <div
      class="w-full max-w-sm bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-8 z-10"
    >
      <div v-if="googleClientId" class="mb-6 flex justify-center">
        <div ref="googleButton" class="h-10"></div>
      </div>

      <div
        v-if="googleClientId"
        class="relative mb-6 text-center text-xs font-semibold text-muted-foreground before:absolute before:top-1/2 before:left-0 before:w-full before:border-t before:border-border before:-z-0"
      >
        <span class="relative bg-card px-2">o ingrese con su usuario</span>
      </div>

      <form class="space-y-4" @submit.prevent="submitLogin">
        <FormField label="Usuario">
          <AppInput
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="Ingrese su usuario"
          />
        </FormField>

        <FormField label="Contraseña">
          <AppInput
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="Ingrese su contraseña"
          />
        </FormField>

        <p v-if="errorMessage" class="text-sm text-destructive">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          class="w-full px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
          :disabled="authStore.loading"
        >
          {{ authStore.loading ? "Ingresando..." : "Ingresar" }}
        </button>
      </form>
    </div>
  </section>
</template>
