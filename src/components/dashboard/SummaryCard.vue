<script setup lang="ts">
interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  colorClass?: string;
  iconBgClass?: string;
}

defineProps<Props>();
</script>

<template>
  <article class="relative flex items-start gap-4 p-5 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
    <div :class="['flex items-center justify-center w-11 h-11 rounded-xl shrink-0', iconBgClass, colorClass]">
      <component :is="icon" :size="22" />
    </div>
    <div class="flex flex-col gap-0.5 min-w-0">
      <span class="text-xs font-semibold text-muted-foreground truncate">{{ title }}</span>
      <strong class="text-3xl font-extrabold text-foreground">{{ value }}</strong>
      <span v-if="subtitle" class="text-xs text-muted-foreground">{{ subtitle }}</span>
    </div>
  </article>
</template>
