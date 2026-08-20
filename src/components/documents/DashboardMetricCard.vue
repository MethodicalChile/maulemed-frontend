<script setup>
import { computed } from "vue";

import {
  Activity,
  Banknote,
  Building2,
  Clock3,
  FileBarChart,
  Hash,
  Percent,
  Receipt,
  Users,
} from "lucide-vue-next";


const props = defineProps({
  metric: {
    type: Object,
    required: true,
  },
});


const formattedValue = computed(() => {
  const metric = props.metric ?? {};

  return formatValue(
    metric.value,
    metric.format,
  );
});


const iconComponent = computed(() => {
  const key =
    props.metric?.key ?? "";

  const format =
    props.metric?.format ?? "";

  if (
    key.includes("provider") ||
    key.includes("user") ||
    key.includes("patient")
  ) {
    return Users;
  }

  if (
    key.includes("branch") ||
    key.includes("room")
  ) {
    return Building2;
  }

  if (
    format === "currency"
  ) {
    return Banknote;
  }

  if (
    format === "percentage"
  ) {
    return Percent;
  }

  if (
    format === "minutes"
  ) {
    return Clock3;
  }

  if (
    key.includes("appointment") ||
    key.includes("procedure")
  ) {
    return Receipt;
  }

  if (
    key.includes("event") ||
    key.includes("log")
  ) {
    return Activity;
  }

  if (
    format === "number"
  ) {
    return Hash;
  }

  return FileBarChart;
});


function formatValue(
  value,
  format,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    format === "text"
  ) {
    return String(
      value
    );
  }

  const number =
    Number(value);

  if (
    Number.isNaN(
      number
    )
  ) {
    return String(
      value
    );
  }

  if (
    format === "currency"
  ) {
    return new Intl.NumberFormat(
      "es-CL",
      {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      },
    ).format(
      number
    );
  }

  if (
    format === "percentage"
  ) {
    return new Intl.NumberFormat(
      "es-CL",
      {
        maximumFractionDigits: 2,
      },
    ).format(
      number
    ) + "%";
  }

  if (
    format === "minutes"
  ) {
    return `${new Intl.NumberFormat(
      "es-CL",
      {
        maximumFractionDigits: 1,
      },
    ).format(
      number
    )} min`;
  }

  return new Intl.NumberFormat(
    "es-CL",
    {
      maximumFractionDigits: 2,
    },
  ).format(
    number
  );
}
</script>


<template>
  <div
    class="
      rounded-xl
      border
      border-border
      bg-card
      p-5
    "
  >
    <div
      class="
        flex
        items-start
        justify-between
        gap-4
      "
    >
      <div
        class="
          min-w-0
          flex-1
        "
      >
        <p
          class="
            text-xs
            font-medium
            uppercase
            tracking-wide
            text-muted-foreground
          "
        >
          {{ metric.label }}
        </p>

        <p
          class="
            mt-2
            text-2xl
            font-bold
            text-foreground
            break-words
          "
        >
          {{ formattedValue }}
        </p>

        <p
          v-if="metric.description"
          class="
            mt-2
            text-xs
            text-muted-foreground
          "
        >
          {{ metric.description }}
        </p>
      </div>

      <div
        class="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-lg
          bg-primary/10
          text-primary
        "
      >
        <component
          :is="iconComponent"
          :size="20"
        />
      </div>
    </div>
  </div>
</template>