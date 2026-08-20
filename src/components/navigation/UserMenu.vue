<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { LogOut, KeyRound, UserCircle, ChevronDown } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth.store";
import ThemeToggle from "@/components/common/ThemeToggle.vue";

const emit = defineEmits(["open-password", "open-profile"]);

const router = useRouter();
const authStore = useAuthStore();

const open = ref(false);
const menuRef = ref(null);

// Inicial del nombre para el avatar
const initial = computed(() => {
  const name = authStore.fullName || authStore.user?.username || "?";
  return name[0].toUpperCase();
});

const displayName = computed(
  () => authStore.fullName || authStore.user?.username || "",
);

const roleLabel = computed(() => authStore.roleCodes?.join(", ") || "");

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function logout() {
  close();
  authStore.logout();
  router.push("/login");
}

function openPassword() {
  close();
  emit("open-password");
}

function openProfile() {
  close();
  emit("open-profile");
}

// Cerrar al hacer click fuera
function handleOutsideClick(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    close();
  }
}

onMounted(() => document.addEventListener("mousedown", handleOutsideClick));
onUnmounted(() =>
  document.removeEventListener("mousedown", handleOutsideClick),
);
</script>

<template>
  <div ref="menuRef" class="relative">
    <!-- Trigger -->
    <button
      class="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-blue-50 transition-colors"
      :class="{ 'bg-blue-50': open }"
      @click="toggle"
    >
      <div
        class="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-sm"
      >
        {{ initial }}
      </div>
      <div class="hidden md:flex flex-col items-start text-left">
        <span class="text-sm font-semibold text-foreground leading-tight">{{
          displayName
        }}</span>
        <span
          class="text-[10px] font-bold uppercase text-primary tracking-wider"
          >{{ roleLabel }}</span
        >
      </div>
      <ChevronDown
        :size="16"
        class="text-muted-foreground transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-64 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-50"
      >
        <!-- Cabecera -->
        <div class="flex items-center gap-3 p-4 bg-primary/10">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-sm"
          >
            {{ initial }}
          </div>
          <div class="flex flex-col min-w-0">
            <strong class="text-sm font-semibold text-foreground truncate">{{
              displayName
            }}</strong>
            <span
              class="text-[10px] font-bold uppercase text-primary tracking-wider truncate"
              >{{ roleLabel }}</span
            >
          </div>
        </div>

        <div class="border-t border-border" />

        <!-- Opciones -->
        <div class="p-1">
          <button
            class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors"
            @click="openProfile"
          >
            <UserCircle :size="18" class="text-primary" />
            Mi perfil
          </button>
          <button
            class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground rounded-lg hover:bg-muted transition-colors"
            @click="openPassword"
          >
            <KeyRound :size="18" class="text-primary" />
            Cambiar contraseña
          </button>
          <ThemeToggle />
        </div>

        <div class="border-t border-border" />

        <div class="p-1">
          <button
            class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive rounded-lg hover:bg-red-50 transition-colors"
            @click="logout"
          >
            <LogOut :size="18" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
