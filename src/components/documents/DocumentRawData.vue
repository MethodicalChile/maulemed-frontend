<script setup>
import { computed, ref, watch } from "vue";

import {
  FileSpreadsheet,
  FileText,
} from "lucide-vue-next";


const props = defineProps({
  result: {
    type: Object,
    required: true,
  },
});


const selectedSheetIndex = ref(0);


/*
 * DocumentParser devuelve:
 *
 * {
 *   file_name,
 *   document_type,
 *   document_type_label,
 *   data: {
 *      ...resultado PDF/ExcelParser
 *   }
 * }
 */
const parserResult = computed(() => {
  return props.result?.data ?? null;
});


const isPdf = computed(() => {
  return (
    parserResult.value?.type === "pdf"
  );
});


const isSpreadsheet = computed(() => {
  return (
    parserResult.value?.type ===
    "spreadsheet"
  );
});


/*
 * Para PDF:
 *
 * result.data.data
 *
 * contiene los datos especializados.
 */
const structuredPdfData = computed(() => {
  if (!isPdf.value) {
    return null;
  }

  return (
    parserResult.value?.data ??
    null
  );
});


/*
 * Para Excel:
 *
 * result.data.raw_data
 *
 * contiene:
 *
 * sheets
 * rows
 * headers
 * data_rows
 * etc.
 */
const spreadsheetData = computed(() => {
  if (!isSpreadsheet.value) {
    return null;
  }

  return (
    parserResult.value?.raw_data ??
    null
  );
});


const spreadsheetSheets = computed(() => {
  return (
    spreadsheetData.value?.sheets ??
    []
  );
});


const selectedSheet = computed(() => {
  return (
    spreadsheetSheets.value[
      selectedSheetIndex.value
    ] ?? null
  );
});


const spreadsheetHeaders = computed(() => {
  return (
    selectedSheet.value?.headers ??
    []
  );
});


const spreadsheetRows = computed(() => {
  return (
    selectedSheet.value?.data_rows ??
    []
  );
});


const pdfPages = computed(() => {
  return (
    parserResult.value?.pages ??
    []
  );
});


const pdfText = computed(() => {
  return (
    parserResult.value?.text ??
    ""
  );
});


const providers = computed(() => {
  return (
    structuredPdfData.value
      ?.providers ??
    []
  );
});


const branches = computed(() => {
  return (
    structuredPdfData.value
      ?.branches ??
    []
  );
});


const isDetalleCaja = computed(() => {
  return (
    props.result?.document_type ===
    "detalle_caja"
  );
});


watch(
  () => props.result,
  () => {
    selectedSheetIndex.value = 0;
  },
);


function formatMoney(value) {
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


function paymentMethodLabel(value) {
  const labels = {
    EFECTIVO: "Efectivo",
    DEBITO: "Débito",
    CREDITO: "Crédito",
    CHEQUE: "Cheque",
  };

  return (
    labels[value] ??
    value
  );
}
</script>


<template>
  <div class="space-y-6">

    <!-- ====================================================== -->
    <!-- HEADER                                                 -->
    <!-- ====================================================== -->

    <div
      class="
        flex
        items-start
        gap-3
      "
    >
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
        <FileSpreadsheet
          v-if="isSpreadsheet"
          :size="20"
        />

        <FileText
          v-else
          :size="20"
        />
      </div>

      <div>
        <h2
          class="
            text-lg
            font-semibold
            text-foreground
          "
        >
          Datos extraídos
        </h2>

        <p
          class="
            mt-1
            text-sm
            text-muted-foreground
          "
        >
          Visualización del contenido
          original procesado desde el
          documento.
        </p>
      </div>
    </div>


    <!-- ====================================================== -->
    <!-- PDF - DETALLE CAJA                                     -->
    <!-- ====================================================== -->

    <template
      v-if="
        isPdf &&
        isDetalleCaja
      "
    >

      <!-- Información general -->

      <div
        class="
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
        "
      >
        <div
          class="
            border-b
            border-border
            bg-muted/30
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
            {{
              structuredPdfData?.title ??
              "Detalle de Caja"
            }}
          </h3>

          <p
            v-if="
              structuredPdfData
                ?.source_document_title
            "
            class="
              mt-1
              text-xs
              text-muted-foreground
            "
          >
            {{
              structuredPdfData
                .source_document_title
            }}
          </p>
        </div>


        <div
          class="
            grid
            grid-cols-1
            gap-5
            p-5
            sm:grid-cols-2
            lg:grid-cols-4
          "
        >
          <div>
            <p
              class="
                text-xs
                uppercase
                tracking-wide
                text-muted-foreground
              "
            >
              Desde
            </p>

            <p
              class="
                mt-1
                font-medium
              "
            >
              {{
                structuredPdfData
                  ?.date_from ??
                "—"
              }}
            </p>
          </div>


          <div>
            <p
              class="
                text-xs
                uppercase
                tracking-wide
                text-muted-foreground
              "
            >
              Hasta
            </p>

            <p
              class="
                mt-1
                font-medium
              "
            >
              {{
                structuredPdfData
                  ?.date_to ??
                "—"
              }}
            </p>
          </div>


          <div>
            <p
              class="
                text-xs
                uppercase
                tracking-wide
                text-muted-foreground
              "
            >
              Usuario
            </p>

            <p
              class="
                mt-1
                font-medium
              "
            >
              {{
                structuredPdfData
                  ?.user ??
                "—"
              }}
            </p>
          </div>


          <div>
            <p
              class="
                text-xs
                uppercase
                tracking-wide
                text-muted-foreground
              "
            >
              Prestadores
            </p>

            <p
              class="
                mt-1
                font-medium
              "
            >
              {{ providers.length }}
            </p>
          </div>
        </div>
      </div>


      <!-- Sucursales -->

      <div
        v-if="branches.length"
        class="
          rounded-xl
          border
          border-border
          bg-card
          p-5
        "
      >
        <h3
          class="
            text-sm
            font-semibold
          "
        >
          Sucursales
        </h3>

        <div
          class="
            mt-3
            flex
            flex-wrap
            gap-2
          "
        >
          <span
            v-for="branch in branches"
            :key="branch"
            class="
              rounded-full
              border
              border-border
              bg-muted
              px-3
              py-1.5
              text-xs
              font-medium
            "
          >
            {{ branch }}
          </span>
        </div>
      </div>


      <!-- Prestadores -->

      <div class="space-y-5">
        <div
          v-for="provider in providers"
          :key="provider.rut"
          class="
            overflow-hidden
            rounded-xl
            border
            border-border
            bg-card
          "
        >
          <div
            class="
              border-b
              border-border
              bg-muted/30
              px-5
              py-4
            "
          >
            <p
              class="
                font-semibold
                text-foreground
              "
            >
              {{ provider.name }}
            </p>

            <p
              class="
                mt-1
                text-xs
                text-muted-foreground
              "
            >
              RUT {{ provider.rut }}
            </p>
          </div>


          <div class="overflow-x-auto">
            <table
              class="
                w-full
                min-w-[700px]
                text-sm
              "
            >
              <thead
                class="
                  bg-muted/40
                "
              >
                <tr>
                  <th
                    class="
                      px-4
                      py-3
                      text-left
                      font-semibold
                    "
                  >
                    Medio de pago
                  </th>

                  <th
                    class="
                      px-4
                      py-3
                      text-right
                      font-semibold
                    "
                  >
                    Particular
                  </th>

                  <th
                    class="
                      px-4
                      py-3
                      text-right
                      font-semibold
                    "
                  >
                    Copago
                  </th>

                  <th
                    class="
                      px-4
                      py-3
                      text-right
                      font-semibold
                    "
                  >
                    Retiro
                  </th>

                  <th
                    class="
                      px-4
                      py-3
                      text-right
                      font-semibold
                    "
                  >
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="
                    payment
                    in provider.payments
                  "
                  :key="
                    payment.payment_method
                  "
                  class="
                    border-t
                    border-border
                    hover:bg-muted/20
                  "
                >
                  <td
                    class="
                      px-4
                      py-3
                      font-medium
                    "
                  >
                    {{
                      paymentMethodLabel(
                        payment
                          .payment_method
                      )
                    }}
                  </td>

                  <td
                    class="
                      px-4
                      py-3
                      text-right
                    "
                  >
                    {{
                      formatMoney(
                        payment.particular
                      )
                    }}
                  </td>

                  <td
                    class="
                      px-4
                      py-3
                      text-right
                    "
                  >
                    {{
                      formatMoney(
                        payment.copay
                      )
                    }}
                  </td>

                  <td
                    class="
                      px-4
                      py-3
                      text-right
                    "
                  >
                    {{
                      formatMoney(
                        payment.withdrawal
                      )
                    }}
                  </td>

                  <td
                    class="
                      px-4
                      py-3
                      text-right
                      font-semibold
                    "
                  >
                    {{
                      formatMoney(
                        payment.total
                      )
                    }}
                  </td>
                </tr>


                <!-- Total prestador -->

                <tr
                  class="
                    border-t-2
                    border-border
                    bg-muted/30
                  "
                >
                  <td
                    class="
                      px-4
                      py-3
                      font-bold
                    "
                  >
                    Total
                  </td>

                  <td
                    class="
                      px-4
                      py-3
                      text-right
                      font-bold
                    "
                  >
                    {{
                      formatMoney(
                        provider
                          .totals
                          ?.particular
                      )
                    }}
                  </td>

                  <td
                    class="
                      px-4
                      py-3
                      text-right
                      font-bold
                    "
                  >
                    {{
                      formatMoney(
                        provider
                          .totals
                          ?.copay
                      )
                    }}
                  </td>

                  <td
                    class="
                      px-4
                      py-3
                      text-right
                      font-bold
                    "
                  >
                    {{
                      formatMoney(
                        provider
                          .totals
                          ?.withdrawal
                      )
                    }}
                  </td>

                  <td
                    class="
                      px-4
                      py-3
                      text-right
                      font-bold
                    "
                  >
                    {{
                      formatMoney(
                        provider
                          .totals
                          ?.total
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>


      <!-- Texto PDF original -->

      <details
        v-if="pdfText"
        class="
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
        "
      >
        <summary
          class="
            cursor-pointer
            px-5
            py-4
            text-sm
            font-semibold
            hover:bg-muted/30
          "
        >
          Ver texto extraído del PDF
        </summary>

        <pre
          class="
            max-h-[600px]
            overflow-auto
            border-t
            border-border
            bg-background
            p-5
            text-xs
            whitespace-pre-wrap
            break-words
          "
        >{{ pdfText }}</pre>
      </details>

    </template>


    <!-- ====================================================== -->
    <!-- OTRO PDF                                               -->
    <!-- ====================================================== -->

    <template
      v-else-if="isPdf"
    >
      <div
        class="
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
        "
      >
        <div
          class="
            border-b
            border-border
            bg-muted/30
            px-5
            py-4
          "
        >
          <h3 class="font-semibold">
            Contenido del PDF
          </h3>

          <p
            class="
              mt-1
              text-xs
              text-muted-foreground
            "
          >
            {{
              parserResult?.page_count ??
              pdfPages.length
            }}
            página{{
              (
                parserResult?.page_count ??
                pdfPages.length
              ) === 1
                ? ""
                : "s"
            }}
          </p>
        </div>

        <pre
          class="
            max-h-[700px]
            overflow-auto
            bg-background
            p-5
            text-xs
            whitespace-pre-wrap
            break-words
          "
        >{{ pdfText }}</pre>
      </div>
    </template>


    <!-- ====================================================== -->
    <!-- EXCEL / CSV                                            -->
    <!-- ====================================================== -->

    <template
      v-else-if="isSpreadsheet"
    >
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
            justify-between
            gap-3
            border-b
            border-border
            bg-muted/40
            px-5
            py-4
            md:flex-row
            md:items-center
          "
        >
          <div>
            <h3
              class="
                font-semibold
                text-foreground
              "
            >
              Contenido de la planilla
            </h3>

            <p
              class="
                mt-1
                text-xs
                text-muted-foreground
              "
            >
              {{
                spreadsheetData
                  ?.sheet_count ??
                spreadsheetSheets.length
              }}
              hoja{{
                (
                  spreadsheetData
                    ?.sheet_count ??
                  spreadsheetSheets.length
                ) === 1
                  ? ""
                  : "s"
              }}
              detectada{{
                (
                  spreadsheetData
                    ?.sheet_count ??
                  spreadsheetSheets.length
                ) === 1
                  ? ""
                  : "s"
              }}
            </p>
          </div>


          <!-- Selector hojas -->

          <div
            v-if="
              spreadsheetSheets.length > 1
            "
            class="
              flex
              flex-wrap
              gap-2
            "
          >
            <button
              v-for="(
                sheet,
                index
              ) in spreadsheetSheets"
              :key="
                `${sheet.name}-${index}`
              "
              type="button"
              :class="[
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                selectedSheetIndex === index
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              ]"
              @click="
                selectedSheetIndex =
                  index
              "
            >
              {{ sheet.name }}
            </button>
          </div>
        </div>


        <!-- Metadata hoja -->

        <div
          v-if="selectedSheet"
          class="
            border-b
            border-border
            bg-background
            px-5
            py-3
          "
        >
          <div
            class="
              flex
              flex-wrap
              items-center
              gap-x-6
              gap-y-2
              text-xs
              text-muted-foreground
            "
          >
            <span>
              Hoja:

              <strong
                class="
                  text-foreground
                "
              >
                {{
                  selectedSheet.name
                }}
              </strong>
            </span>

            <span>
              Filas:

              <strong
                class="
                  text-foreground
                "
              >
                {{
                  selectedSheet
                    .row_count ??
                  0
                }}
              </strong>
            </span>

            <span>
              Filas con datos:

              <strong
                class="
                  text-foreground
                "
              >
                {{
                  selectedSheet
                    .non_empty_row_count ??
                  selectedSheet
                    .row_count ??
                  0
                }}
              </strong>
            </span>

            <span>
              Columnas:

              <strong
                class="
                  text-foreground
                "
              >
                {{
                  selectedSheet
                    .column_count ??
                  0
                }}
              </strong>
            </span>
          </div>
        </div>


        <!-- Tabla usando header detectado -->

        <div
          v-if="
            spreadsheetHeaders.length
          "
          class="
            max-h-[700px]
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
                    py-2
                    text-xs
                    font-medium
                    text-muted-foreground
                  "
                >
                  #
                </th>

                <th
                  v-for="(
                    header,
                    index
                  ) in spreadsheetHeaders"
                  :key="index"
                  class="
                    border
                    border-border
                    bg-muted
                    px-3
                    py-2.5
                    text-left
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  {{
                    header ||
                    `Columna ${
                      index + 1
                    }`
                  }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(
                  row,
                  rowIndex
                ) in spreadsheetRows"
                :key="rowIndex"
                class="
                  hover:bg-muted/20
                "
              >
                <td
                  class="
                    sticky
                    left-0
                    border
                    border-border
                    bg-card
                    px-3
                    py-2
                    text-xs
                    text-muted-foreground
                  "
                >
                  {{
                    rowIndex + 1
                  }}
                </td>

                <td
                  v-for="(
                    _,
                    columnIndex
                  ) in spreadsheetHeaders"
                  :key="columnIndex"
                  class="
                    max-w-[450px]
                    overflow-hidden
                    border
                    border-border
                    px-3
                    py-2
                    text-ellipsis
                    whitespace-nowrap
                  "
                  :title="
                    String(
                      row[
                        columnIndex
                      ] ?? '',
                    )
                  "
                >
                  {{
                    row[
                      columnIndex
                    ] ?? ""
                  }}
                </td>
              </tr>


              <tr
                v-if="
                  !spreadsheetRows.length
                "
              >
                <td
                  :colspan="
                    spreadsheetHeaders
                      .length + 1
                  "
                  class="
                    px-4
                    py-12
                    text-center
                    text-muted-foreground
                  "
                >
                  No hay registros
                  para mostrar.
                </td>
              </tr>
            </tbody>
          </table>
        </div>


        <!-- Sin header detectado -->

        <div
          v-else-if="
            selectedSheet?.rows?.length
          "
          class="
            max-h-[700px]
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
            <tbody>
              <tr
                v-for="(
                  row,
                  rowIndex
                ) in selectedSheet.rows"
                :key="rowIndex"
              >
                <td
                  class="
                    border
                    border-border
                    bg-muted/30
                    px-3
                    py-2
                    text-xs
                    text-muted-foreground
                  "
                >
                  {{ rowIndex + 1 }}
                </td>

                <td
                  v-for="(
                    cell,
                    cellIndex
                  ) in row"
                  :key="cellIndex"
                  class="
                    border
                    border-border
                    px-3
                    py-2
                    whitespace-nowrap
                  "
                >
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>


        <!-- Hoja vacía -->

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
          La hoja seleccionada no
          contiene información.
        </div>
      </div>
    </template>


    <!-- ====================================================== -->
    <!-- FALLBACK                                               -->
    <!-- ====================================================== -->

    <div
      v-else
      class="
        rounded-xl
        border
        border-border
        bg-card
        px-5
        py-12
        text-center
      "
    >
      <FileText
        :size="28"
        class="
          mx-auto
          text-muted-foreground
        "
      />

      <p
        class="
          mt-4
          font-medium
          text-foreground
        "
      >
        No hay datos para visualizar
      </p>

      <p
        class="
          mt-1
          text-sm
          text-muted-foreground
        "
      >
        El documento fue procesado,
        pero no se encontró contenido
        compatible con esta vista.
      </p>
    </div>

  </div>
</template>