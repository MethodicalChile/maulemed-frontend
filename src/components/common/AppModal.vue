<script setup>
import { onMounted, onUnmounted } from "vue";
import { FocusTrap } from "focus-trap-vue";

defineProps({
  title: { type: String, default: "" },
  size: { type: String, default: "md" }, // sm | md | lg | xl
});

const emit = defineEmits(["close"]);

// Cerrar con Escape
function onKeydown(e) {
  if (e.key === "Escape") emit("close");
}
onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.body.style.overflow = "hidden";
});
onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <FocusTrap v-if="true" active>
            <div
              :class="[
                'w-full bg-card rounded-xl shadow-2xl border-t-4 border-t-primary flex flex-col max-h-[90vh]',
                sizeClasses[size],
              ]"
              role="dialog"
              aria-modal="true"
            >
              <div
                class="flex items-center justify-between p-5 border-b border-blue-100 bg-blue-50/30"
              >
                <strong class="text-lg font-bold text-primary">{{
                  title
                }}</strong>
                <button
                  class="p-1.5 rounded-full hover:bg-red-100 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Cerrar"
                  @click="emit('close')"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  >
                    <path d="M1 1l12 12M13 1L1 13" />
                  </svg>
                </button>
              </div>
              <div class="p-6 overflow-y-auto">
                <slot />
              </div>
              <div
                v-if="$slots.footer"
                class="p-4 border-t border-border bg-slate-50 flex justify-end gap-3 rounded-b-xl"
              >
                <slot name="footer" />
              </div>
            </div>
          </FocusTrap>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
