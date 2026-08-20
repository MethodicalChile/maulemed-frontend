<script setup>
import { Star, StarHalf } from "lucide-vue-next";

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const setRating = (rating, isHalf) => {
  if (props.readonly) return;
  const newRating = isHalf ? rating - 0.5 : rating;
  emit("update:modelValue", newRating);
};
</script>

<template>
  <div
    class="flex items-center gap-0.5"
    :class="{ 'cursor-pointer': !readonly }"
  >
    <div v-for="i in 5" :key="i" class="flex relative">
      <!-- Mitad izquierda (0.5) -->
      <div class="absolute w-1/2 h-full z-10" @click="setRating(i, true)"></div>
      <!-- Mitad derecha (1.0) -->
      <div
        class="absolute right-0 w-1/2 h-full z-10"
        @click="setRating(i, false)"
      ></div>

      <component
        :is="modelValue >= i ? Star : modelValue >= i - 0.5 ? StarHalf : Star"
        :size="20"
        :class="[
          'transition-colors',
          modelValue >= i - 0.5
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300',
        ]"
      />
    </div>
  </div>
</template>
