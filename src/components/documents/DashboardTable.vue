<script setup>
import { computed } from "vue";


const props = defineProps({
  table: {
    type: Object,
    required: true,
  },
});


const columns = computed(() => {
  return props.table?.columns ?? [];
});


const rows = computed(() => {
  return props.table?.rows ?? [];
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

  if (
    format === "currency"
  ) {
    const number =
      Number(value ?? 0);

    if (
      Number.isNaN(number)
    ) {
      return String(value);
    }

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
    format === "number"
  ) {
    const number =
      Number(value ?? 0);

    if (
      Number.isNaN(number)
    ) {
      return String(value);
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

  if (
    format === "percentage"
  ) {
    const number =
      Number(value ?? 0);

    if (
      Number.isNaN(number)
    ) {
      return String(value);
    }

    return (
      new Intl.NumberFormat(
        "es-CL",
        {
          maximumFractionDigits: 2,
        },
      ).format(
        number
      ) + "%"
    );
  }

  if (
    format === "minutes"
  ) {
    const number =
      Number(value ?? 0);

    if (
      Number.isNaN(number)
    ) {
      return String(value);
    }

    return `${new Intl.NumberFormat(
      "es-CL",
      {
        maximumFractionDigits: 1,
      },
    ).format(
      number
    )} min`;
  }

  if (
    format === "date"
  ) {
    return formatDate(
      value
    );
  }

  if (
    format === "datetime"
  ) {
    return formatDateTime(
      value
    );
  }

  return String(
    value
  );
}


function formatDate(
  value,
) {
  if (!value) {
    return "—";
  }

  const text =
    String(value);

  /*
   * Esperamos principalmente:
   *
   * 2026-07-21
   */

  const match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    const [
      ,
      year,
      month,
      day,
    ] = match;

    return `${day}-${month}-${year}`;
  }

  return text;
}


function formatDateTime(
  value,
) {
  if (!value) {
    return "—";
  }

  const text =
    String(value);

  /*
   * Ejemplo:
   *
   * 2026-07-21T14:30:00
   */

  const match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
    );

  if (!match) {
    return text;
  }

  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
  ] = match;

  return (
    `${day}-${month}-${year} ` +
    `${hour}:${minute}`
  );
}


function isNumericFormat(
  format,
) {
  return [
    "currency",
    "number",
    "percentage",
    "minutes",
  ].includes(
    format
  );
}
</script>


<template>
  <div
    class="
      overflow-hidden
      rounded-xl
      border
      border-border
      bg-card
    "
  >
    <!-- Header -->
    <div
      class="
        flex
        flex-col
        gap-1
        border-b
        border-border
        px-5
        py-4
      "
    >
      <h3
        class="
          font-semibold
          text-foreground
        "
      >
        {{ table.title }}
      </h3>

      <p
        v-if="table.description"
        class="
          text-xs
          text-muted-foreground
        "
      >
        {{ table.description }}
      </p>

      <p
        class="
          text-xs
          text-muted-foreground
        "
      >
        {{
          rows.length
        }}
        registro{{
          rows.length === 1
            ? ""
            : "s"
        }}
      </p>
    </div>


    <!-- Tabla -->
    <div
      v-if="
        columns.length &&
        rows.length
      "
      class="
        max-h-[520px]
        overflow-auto
      "
    >
      <table
        class="
          w-max
          min-w-full
          border-collapse
          text-sm
        "
      >
        <thead
          class="
            sticky
            top-0
            z-10
            bg-muted
          "
        >
          <tr>
            <th
              class="
                sticky
                left-0
                z-20
                border
                border-border
                bg-muted
                px-3
                py-2.5
                text-left
                text-xs
                font-medium
                text-muted-foreground
              "
            >
              #
            </th>

            <th
              v-for="column in columns"
              :key="column.key"
              class="
                border
                border-border
                bg-muted
                px-3
                py-2.5
                font-semibold
                whitespace-nowrap
              "
              :class="
                isNumericFormat(
                  column.format,
                )
                  ? 'text-right'
                  : 'text-left'
              "
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(
              row,
              rowIndex
            ) in rows"
            :key="
              row.id ??
              row.uuid ??
              rowIndex
            "
            class="
              hover:bg-muted/20
            "
          >
            <td
              class="
                sticky
                left-0
                bg-card
                border
                border-border
                px-3
                py-2.5
                text-xs
                text-muted-foreground
              "
            >
              {{
                rowIndex + 1
              }}
            </td>

            <td
              v-for="
                column
                in columns
              "
              :key="
                column.key
              "
              class="
                border
                border-border
                px-3
                py-2.5
                align-top
              "
              :class="[
                isNumericFormat(
                  column.format,
                )
                  ? 'text-right whitespace-nowrap'
                  : '',
                column.format ===
                'text'
                  ? 'max-w-[520px]'
                  : '',
              ]"
            >
              <span
                v-if="
                  column.format ===
                  'text'
                "
                class="
                  block
                  whitespace-normal
                  break-words
                "
                :title="
                  String(
                    row[
                      column.key
                    ] ?? '',
                  )
                "
              >
                {{
                  formatValue(
                    row[
                      column.key
                    ],
                    column.format,
                  )
                }}
              </span>

              <span
                v-else
                class="
                  whitespace-nowrap
                "
              >
                {{
                  formatValue(
                    row[
                      column.key
                    ],
                    column.format,
                  )
                }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>


    <!-- Sin filas -->
    <div
      v-else
      class="
        px-5
        py-12
        text-center
        text-sm
        text-muted-foreground
      "
    >
      No hay información disponible
      para esta tabla.
    </div>
  </div>
</template>