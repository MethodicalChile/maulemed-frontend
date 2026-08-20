<script setup>
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

const props = defineProps({
  count: { type: Number, required: true },
  page: { type: Number, required: true },
  pageSize: { type: Number, default: 20 },
});

const emit = defineEmits(["change"]);

const totalPages = computed(() => Math.ceil(props.count / props.pageSize));

const pages = computed(() => {
  const total = totalPages.value;
  const current = props.page;
  const range = [];
  const delta = 2;

  for (
    let i = Math.max(1, current - delta);
    i <= Math.min(total, current + delta);
    i++
  ) {
    range.push(i);
  }

  if (range[0] > 2) range.unshift("...");
  if (range[0] !== 1) range.unshift(1);
  if (range[range.length - 1] < total - 1) range.push("...");
  if (range[range.length - 1] !== total) range.push(total);

  return range;
});

const from = computed(() => (props.page - 1) * props.pageSize + 1);
const to = computed(() => Math.min(props.page * props.pageSize, props.count));
</script>

<template>
  <div
    v-if="totalPages > 1"
    class="flex items-center justify-between gap-4 mt-6"
  >
    <span class="text-sm font-medium text-foreground">
      {{ from }}–{{ to }} de {{ count.toLocaleString("es-CL") }}
    </span>

    <div class="flex items-center gap-1">
      <button
        class="flex items-center justify-center w-9 h-9 border border-border rounded-lg bg-card text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        :disabled="page === 1"
        aria-label="Página anterior"
        @click="emit('change', page - 1)"
      >
        <ChevronLeft :size="16" />
      </button>

      <template v-for="p in pages" :key="`p-${p}`">
        <span v-if="p === '...'" class="px-2 text-muted-foreground">…</span>
        <button
          v-else
          :class="[
            'w-9 h-9 rounded-lg text-sm font-semibold transition-colors',
            p === page
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'border border-border bg-card text-foreground hover:bg-muted',
          ]"
          @click="emit('change', p)"
        >
          {{ p }}
        </button>
      </template>

      <button
        class="flex items-center justify-center w-9 h-9 border border-border rounded-lg bg-card text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        :disabled="page === totalPages"
        aria-label="Página siguiente"
        @click="emit('change', page + 1)"
      >
        <ChevronRight :size="16" />
      </button>
    </div>
  </div>

  <div v-else-if="count > 0" class="flex items-center mt-6">
    <span
      class="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20"
    >
      {{ count.toLocaleString("es-CL") }} registro{{ count !== 1 ? "s" : "" }}
    </span>
  </div>
</template>
