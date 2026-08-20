<script setup>
import {
  computed,
  ref,
} from "vue";

import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Database,
  FileText,
  RefreshCw,
  Upload,
} from "lucide-vue-next";

import PageHeader
  from "@/components/common/PageHeader.vue";

import DocumentDashboard
  from "@/components/documents/DocumentDashboard.vue";

import DocumentRawData
  from "@/components/documents/DocumentRawData.vue";

import {
  documentsApi,
} from "@/api/documents.api";


const fileInputRef = ref(null);

const selectedFile = ref(null);

const loading = ref(false);

const error = ref("");

const result = ref(null);

/*
 * Vista principal después de procesar:
 *
 * dashboard
 * raw
 */
const activeTab = ref(
  "dashboard"
);


// ============================================================
// RESPUESTA DEL BACKEND
// ============================================================

/*
 * DocumentParser:
 *
 * {
 *   file_name,
 *   extension,
 *   document_type,
 *   document_type_label,
 *   data: {
 *      ...
 *   }
 * }
 */
const parserResult = computed(() => {
  return (
    result.value?.data ??
    null
  );
});


/*
 * PDF:
 *
 * result
 *   .data
 *   .data
 *   .dashboard
 *
 *
 * Excel:
 *
 * result
 *   .data
 *   .data
 *   .dashboard
 *
 * Es decir, después de los cambios que hicimos,
 * ambos convergen en la misma ruta.
 */
const specializedData = computed(() => {
  return (
    parserResult.value?.data ??
    null
  );
});


const dashboard = computed(() => {
  return (
    specializedData.value
      ?.dashboard ??
    null
  );
});


const documentType = computed(() => {
  return (
    result.value
      ?.document_type ??
    specializedData.value
      ?.document_type ??
    ""
  );
});


const documentTypeLabel = computed(() => {
  return (
    result.value
      ?.document_type_label ??
    specializedData.value
      ?.title ??
    "Documento"
  );
});


const hasDashboard = computed(() => {
  const value =
    dashboard.value;

  if (!value) {
    return false;
  }

  return Boolean(
    value.metrics?.length ||
    value.charts?.length ||
    value.tables?.length ||
    value.summary?.text
  );
});


// ============================================================
// FILE
// ============================================================

function openFilePicker() {
  fileInputRef.value?.click();
}


function onFileChange(event) {
  const file =
    event.target
      .files?.[0];

  if (!file) {
    return;
  }

  processFile(
    file
  );
}


function onDrop(event) {
  event.preventDefault();

  const file =
    event.dataTransfer
      ?.files?.[0];

  if (!file) {
    return;
  }

  processFile(
    file
  );
}


// ============================================================
// PROCESS
// ============================================================

async function processFile(file) {
  selectedFile.value =
    file;

  result.value = null;

  error.value = "";

  loading.value = true;

  /*
   * Siempre queremos abrir el dashboard
   * primero después de cargar un archivo.
   */
  activeTab.value =
    "dashboard";

  try {
    result.value =
      await documentsApi
        .analyzeDocument(
          file
        );

  } catch (e) {
    console.error(
      "Error procesando documento:",
      e,
    );

    error.value =
      extractErrorMessage(
        e
      );

  } finally {
    loading.value =
      false;
  }
}


// ============================================================
// ERROR
// ============================================================

function extractErrorMessage(errorObject) {
  const response =
    errorObject
      ?.response
      ?.data;

  const detail =
    response
      ?.data
      ?.detail;

  /*
   * El backend puede devolver:
   *
   * detail: "mensaje"
   *
   * o:
   *
   * detail: {
   *   file: "mensaje"
   * }
   */
  if (
    typeof detail ===
    "string"
  ) {
    return detail;
  }

  if (
    detail &&
    typeof detail ===
    "object"
  ) {
    if (
      detail.file
    ) {
      return String(
        detail.file
      );
    }

    return Object.values(
      detail
    )
      .map(
        (value) =>
          String(value)
      )
      .join(" ");
  }

  return (
    response?.message ||
    errorObject?.message ||
    "No fue posible procesar el documento."
  );
}


// ============================================================
// RESET
// ============================================================

function reset() {
  selectedFile.value =
    null;

  result.value =
    null;

  error.value =
    "";

  loading.value =
    false;

  activeTab.value =
    "dashboard";

  if (
    fileInputRef.value
  ) {
    fileInputRef.value.value =
      "";
  }
}


function loadAnother() {
  reset();

  setTimeout(
    () => {
      openFilePicker();
    },
    0,
  );
}


// ============================================================
// FORMAT
// ============================================================

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 B";
  }

  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}
</script>


<template>
  <section
    class="
      space-y-6
    "
  >

    <!-- ====================================================== -->
    <!-- HEADER                                                 -->
    <!-- ====================================================== -->

    <PageHeader
      title="Carga de documentos"
      subtitle="Carga un documento para analizar y visualizar su información"
    />


    <!-- Input oculto -->

    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept=".pdf,.xlsx,.xls,.csv"
      @change="onFileChange"
    />


    <!-- ====================================================== -->
    <!-- ESTADO INICIAL                                         -->
    <!-- ====================================================== -->

    <div
      v-if="!selectedFile"
      class="
        flex
        min-h-[420px]
        items-center
        justify-center
        rounded-xl
        border-2
        border-dashed
        border-border
        bg-card
        transition-colors
        hover:border-primary/50
      "
      @dragover.prevent
      @drop="onDrop"
    >
      <div
        class="
          flex
          flex-col
          items-center
          px-6
          py-12
          text-center
        "
      >
        <div
          class="
            mb-5
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-full
            bg-primary/10
          "
        >
          <Upload
            :size="28"
            class="
              text-primary
            "
          />
        </div>

        <h2
          class="
            text-lg
            font-semibold
            text-foreground
          "
        >
          Carga un documento
        </h2>

        <p
          class="
            mt-2
            max-w-md
            text-sm
            text-muted-foreground
          "
        >
          Arrastra un archivo hasta
          esta zona o selecciónalo
          desde tu equipo.
        </p>

        <button
          type="button"
          class="
            mt-6
            inline-flex
            items-center
            gap-2
            rounded-md
            bg-primary
            px-5
            py-2.5
            text-sm
            font-semibold
            text-primary-foreground
            transition-colors
            hover:bg-primary/90
          "
          @click="
            openFilePicker
          "
        >
          <Upload :size="17" />

          Seleccionar documento
        </button>

        <p
          class="
            mt-4
            text-xs
            text-muted-foreground
          "
        >
          Documentos soportados:
          DETALLE-CAJA.pdf,
          FLUJO-CAJA-PPTO.xlsx,
          LOGS.xlsx y REPORTE.xlsx
        </p>
      </div>
    </div>


    <!-- ====================================================== -->
    <!-- ARCHIVO SELECCIONADO                                   -->
    <!-- ====================================================== -->

    <template v-else>

      <div
        class="
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
        "
      >

        <!-- ================================================== -->
        <!-- ARCHIVO                                            -->
        <!-- ================================================== -->

        <div
          class="
            flex
            flex-col
            justify-between
            gap-4
            border-b
            border-border
            px-5
            py-4
            md:flex-row
            md:items-center
          "
        >
          <div
            class="
              flex
              min-w-0
              items-center
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
              "
            >
              <FileText
                :size="21"
                class="
                  text-primary
                "
              />
            </div>

            <div
              class="
                min-w-0
              "
            >
              <p
                class="
                  truncate
                  font-semibold
                "
              >
                {{
                  selectedFile.name
                }}
              </p>

              <div
                class="
                  mt-1
                  flex
                  flex-wrap
                  items-center
                  gap-x-3
                  gap-y-1
                  text-xs
                  text-muted-foreground
                "
              >
                <span>
                  {{
                    formatFileSize(
                      selectedFile.size
                    )
                  }}
                </span>

                <template
                  v-if="
                    result &&
                    documentTypeLabel
                  "
                >
                  <span>
                    •
                  </span>

                  <span
                    class="
                      font-medium
                      text-foreground
                    "
                  >
                    {{
                      documentTypeLabel
                    }}
                  </span>
                </template>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-md
              border
              border-border
              px-4
              py-2
              text-sm
              font-medium
              transition-colors
              hover:bg-muted
            "
            @click="
              loadAnother
            "
          >
            <RefreshCw
              :size="16"
            />

            Cargar otro documento
          </button>
        </div>


        <!-- ================================================== -->
        <!-- LOADING                                            -->
        <!-- ================================================== -->

        <div
          v-if="loading"
          class="
            flex
            min-h-[350px]
            flex-col
            items-center
            justify-center
            gap-4
          "
        >
          <div
            class="
              h-10
              w-10
              animate-spin
              rounded-full
              border-4
              border-primary/20
              border-t-primary
            "
          />

          <div
            class="
              text-center
            "
          >
            <p
              class="
                font-medium
              "
            >
              Procesando documento
            </p>

            <p
              class="
                mt-1
                text-sm
                text-muted-foreground
              "
            >
              Identificando archivo,
              extrayendo datos y
              construyendo dashboard...
            </p>
          </div>
        </div>


        <!-- ================================================== -->
        <!-- ERROR                                              -->
        <!-- ================================================== -->

        <div
          v-else-if="error"
          class="
            flex
            min-h-[300px]
            items-center
            justify-center
            p-6
          "
        >
          <div
            class="
              w-full
              max-w-lg
              rounded-lg
              border
              border-destructive/30
              bg-destructive/5
              p-5
            "
          >
            <div
              class="
                flex
                items-start
                gap-3
              "
            >
              <AlertCircle
                :size="20"
                class="
                  mt-0.5
                  shrink-0
                  text-destructive
                "
              />

              <div>
                <p
                  class="
                    font-semibold
                    text-destructive
                  "
                >
                  No fue posible procesar
                  el documento
                </p>

                <p
                  class="
                    mt-1
                    text-sm
                    text-muted-foreground
                  "
                >
                  {{ error }}
                </p>
              </div>
            </div>
          </div>
        </div>


        <!-- ================================================== -->
        <!-- RESULTADO                                          -->
        <!-- ================================================== -->

        <div
          v-else-if="result"
          class="
            space-y-5
            p-5
          "
        >

          <!-- Estado -->

          <div
            class="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div
              class="
                flex
                items-center
                gap-2
                text-sm
                text-emerald-600
              "
            >
              <CheckCircle2
                :size="17"
              />

              Documento procesado
              correctamente
            </div>

            <div
              v-if="documentType"
              class="
                rounded-full
                border
                border-border
                bg-muted/40
                px-3
                py-1
                text-xs
                font-medium
                text-muted-foreground
              "
            >
              {{
                documentType
              }}
            </div>
          </div>


          <!-- ================================================ -->
          <!-- TABS                                             -->
          <!-- ================================================ -->

          <div
            class="
              border-b
              border-border
            "
          >
            <div
              class="
                flex
                items-center
                gap-1
              "
            >
              <button
                type="button"
                class="
                  relative
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-3
                  text-sm
                  font-medium
                  transition-colors
                "
                :class="
                  activeTab ===
                  'dashboard'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                "
                @click="
                  activeTab =
                    'dashboard'
                "
              >
                <BarChart3
                  :size="17"
                />

                Dashboard

                <span
                  v-if="
                    activeTab ===
                    'dashboard'
                  "
                  class="
                    absolute
                    inset-x-0
                    bottom-0
                    h-0.5
                    bg-primary
                  "
                />
              </button>


              <button
                type="button"
                class="
                  relative
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-3
                  text-sm
                  font-medium
                  transition-colors
                "
                :class="
                  activeTab ===
                  'raw'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                "
                @click="
                  activeTab =
                    'raw'
                "
              >
                <Database
                  :size="17"
                />

                Datos extraídos

                <span
                  v-if="
                    activeTab ===
                    'raw'
                  "
                  class="
                    absolute
                    inset-x-0
                    bottom-0
                    h-0.5
                    bg-primary
                  "
                />
              </button>
            </div>
          </div>


          <!-- ================================================ -->
          <!-- DASHBOARD                                        -->
          <!-- ================================================ -->

          <div
            v-if="
              activeTab ===
              'dashboard'
            "
          >
            <DocumentDashboard
              v-if="hasDashboard"
              :dashboard="dashboard"
              :document-type="
                documentType
              "
              :document-type-label="
                documentTypeLabel
              "
            />

            <div
              v-else
              class="
                flex
                min-h-[300px]
                items-center
                justify-center
                rounded-xl
                border
                border-border
                bg-card
                p-8
              "
            >
              <div
                class="
                  max-w-md
                  text-center
                "
              >
                <BarChart3
                  :size="30"
                  class="
                    mx-auto
                    text-muted-foreground
                  "
                />

                <h3
                  class="
                    mt-4
                    font-semibold
                    text-foreground
                  "
                >
                  Dashboard no disponible
                </h3>

                <p
                  class="
                    mt-2
                    text-sm
                    text-muted-foreground
                  "
                >
                  El documento fue
                  procesado, pero no se
                  recibieron indicadores
                  para construir el
                  dashboard.
                </p>

                <button
                  type="button"
                  class="
                    mt-5
                    inline-flex
                    items-center
                    gap-2
                    rounded-md
                    border
                    border-border
                    px-4
                    py-2
                    text-sm
                    font-medium
                    hover:bg-muted
                  "
                  @click="
                    activeTab =
                      'raw'
                  "
                >
                  <Database
                    :size="16"
                  />

                  Ver datos extraídos
                </button>
              </div>
            </div>
          </div>


          <!-- ================================================ -->
          <!-- DATOS EXTRAÍDOS                                  -->
          <!-- ================================================ -->

          <div
            v-else-if="
              activeTab ===
              'raw'
            "
          >
            <DocumentRawData
              :result="result"
            />
          </div>

        </div>
      </div>
    </template>

  </section>
</template>