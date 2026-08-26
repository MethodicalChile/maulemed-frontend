<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import {
  Plus,
  Eye,
  Search,
  CheckCircle,
  Send,
  Truck,
  XCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Lock,
} from "lucide-vue-next";
import { transfersApi } from "@/api/transfers.api";
import { optionsApi } from "@/api/options.api";
import { useList } from "@/composables/useList";
import { useForm } from "@/composables/useForm";
import { usePermissions } from "@/composables/usePermissions";
import { useRefresh } from "@/composables/useRefresh";
import PageHeader from "@/components/common/PageHeader.vue";
import AppTable from "@/components/common/AppTable.vue";
import AppModal from "@/components/common/AppModal.vue";
import AppPagination from "@/components/common/AppPagination.vue";
import AppAlert from "@/components/common/AppAlert.vue";
import StatusBadge from "@/components/common/StatusBadge.vue";
import FormField from "@/components/common/FormField.vue";
import AppInput from "@/components/common/AppInput.vue";
import AppSelect from "@/components/common/AppSelect.vue";
import AppMultiSelect from "@/components/common/AppMultiSelect.vue";
import AppTextarea from "@/components/common/AppTextarea.vue";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";

const showTransferActionModal = ref(false);
const activeTransferRow = ref(null);

function openTransferActions(row) {
  activeTransferRow.value = row;
  showTransferActionModal.value = true;
}

function closeTransferActions() {
  showTransferActionModal.value = false;
  activeTransferRow.value = null;
}

function viewTransferFromActions() {
  if (!activeTransferRow.value) return;

  const row = activeTransferRow.value;

  closeTransferActions();
  openDetail(row);
}

const editingTransfer = ref(null);

function editTransferFromActions() {
  if (!activeTransferRow.value) return;

  const row = activeTransferRow.value;

  editingTransfer.value = row;

  form.origin_branch =
    row.origin_branch_detail?.uuid ??
    row.origin_branch ??
    "";

  form.destination_branch =
    row.destination_branch_detail?.uuid ??
    row.destination_branch ??
    "";

  form.transfer_type =
    row.transfer_type ?? "TRASPASO";

  form.reason =
    row.reason ?? "";

  closeTransferActions();

  showCreateModal.value = true;
}

const {
  canViewTransfers,
  canCreateTransfers,
  canEditTransfers,
  canDeleteTransfers,
} = usePermissions();

const columns = [
  { key: "transfer_type", label: "Tipo", width: "110px" },
  { key: "origin", label: "Origen" },
  { key: "destination", label: "Destino" },
  { key: "status", label: "Estado", width: "130px" },
  { key: "requested_by", label: "Solicitante" },
  { key: "requested_at", label: "Fecha", width: "110px" },
  { key: "actions", label: "", width: "70px" },
];

const { items, loading, error, pagination, params, load, setPage, setParam } =
  useList(transfersApi.listTransfers);

const STATUS_OPTIONS = [
  { value: "SOLICITADO", label: "Solicitado" },
  { value: "APROBADO", label: "Aprobado" },
  { value: "ENVIADO", label: "Enviado" },
  { value: "RECIBIDO", label: "Recibido" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "CERRADO", label: "Cerrado" },
];

const TYPE_OPTIONS = [
  { value: "TRASPASO", label: "Traspaso" },
  { value: "PRESTAMO", label: "Préstamo" },
  { value: "DEVOLUCION", label: "Devolución" },
];

// ── Opciones ──────────────────────────────────────────────────────────────────
const branches = ref([]);
const products = ref([]);
const lots = ref([]);

async function loadData() {
  await load();

  const [brRes, prRes, lotRes] =
    await Promise.allSettled([
      optionsApi.getBranches(),
      optionsApi.getProducts(),
      optionsApi.getInventoryLots(),
    ]);

  const ext = (res) => {
    if (res.status !== "fulfilled") return [];

    const d =
      res.value.data?.data ??
      res.value.data;

    return Array.isArray(d)
      ? d
      : (d?.results ?? []);
  };

  branches.value = ext(brRes);
  products.value = ext(prRes);
  lots.value = ext(lotRes);
}

const { setRefreshFunction, clearRefreshFunction } = useRefresh();
onMounted(() => {
  setRefreshFunction(loadData);
  loadData();
});
onUnmounted(clearRefreshFunction);

// ── Crear traspaso (cabecera) ─────────────────────────────────────────────────
const showCreateModal = ref(false);
const createError = ref("");

const emptyForm = {
  origin_branch: "",
  destination_branch: "",
  transfer_type: "TRASPASO",
  reason: "",
};
const {
  form,
  loading: formLoading,
  error: formError,
  reset,
  submit,
} = useForm(emptyForm, transfersApi.createTransfer);

const showDeleteTransferDialog = ref(false);
const transferToDelete = ref(null);
const deleteTransferLoading = ref(false);
const deleteTransferError = ref("");

function deleteTransferFromActions() {
  if (!activeTransferRow.value) return;

  transferToDelete.value = activeTransferRow.value;
  deleteTransferError.value = "";

  closeTransferActions();

  showDeleteTransferDialog.value = true;
}

function closeDeleteTransferDialog() {
  if (deleteTransferLoading.value) return;

  showDeleteTransferDialog.value = false;
  transferToDelete.value = null;
  deleteTransferError.value = "";
}

async function confirmDeleteTransfer() {
  if (!transferToDelete.value) return;

  deleteTransferLoading.value = true;

  try {
    await transfersApi.deleteTransfer(
      transferToDelete.value.uuid,
    );

    showDeleteTransferDialog.value = false;
    transferToDelete.value = null;

    await load();
  } catch (e) {
    const data = e.response?.data;

    console.error(
      "Error eliminando traspaso:",
      JSON.stringify(data, null, 2),
    );

    deleteTransferError.value =
      data?.message ??
      data?.detail ??
      "No se pudo eliminar el traspaso.";
  } finally {
    deleteTransferLoading.value = false;
  }
}

function openCreate() {
  editingTransfer.value = null;

  reset();

  createError.value = "";

  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
  editingTransfer.value = null;
  createError.value = "";
}

async function handleCreate() {
  createError.value = "";

  try {
    if (editingTransfer.value) {
      await transfersApi.updateTransfer(
        editingTransfer.value.uuid,
        {
          origin_branch: form.origin_branch,
          destination_branch: form.destination_branch,
          transfer_type: form.transfer_type,
          reason: form.reason,
        },
      );
    } else {
      await submit();
    }

    if (!formError.value) {
      showCreateModal.value = false;
      editingTransfer.value = null;

      await load();
    }
  } catch (e) {
    const data = e.response?.data;

    console.error(
      "Error guardando traspaso:",
      JSON.stringify(data, null, 2),
    );

    createError.value =
      data?.message ??
      data?.detail ??
      "No se pudo guardar el traspaso.";
  }
}

// ── Detalle de traspaso (ítems + acciones de flujo) ───────────────────────────
const showDetailModal = ref(false);
const viewingTransfer = ref(null);
const transferItems = ref([]);
const detailError = ref("");
const actionLoading = ref(false);

// Modal de rechazo con motivo obligatorio
const showRejectModal = ref(false);
const rejectReason = ref("");
const rejectLoading = ref(false);
const rejectError = ref("");

// Formulario inline para agregar ítems
const itemForm = ref({
  product: "",
  requested_quantity: 1,
  lot: "",
});

const selectedTransferProduct = computed(() =>
  products.value.find(
    (product) =>
      product.uuid === itemForm.value.product,
  ),
);

const availableLots = computed(() =>
  lots.value.filter((lot) => {
    const productUuid =
      lot.product ??
      lot.product_uuid ??
      lot.product_detail?.uuid;

    const branchUuid =
      lot.branch_uuid ??
      lot.warehouse_detail?.branch?.uuid;

    return (
      productUuid === itemForm.value.product &&
      branchUuid ===
        viewingTransfer.value?.origin_branch_detail?.uuid
    );
  }),
);

const itemLoading = ref(false);
const itemError = ref("");

async function openDetail(row) {
  detailError.value = "";
  viewingTransfer.value = row;
  try {
    const res = await transfersApi.getTransfer(row.uuid);
    const d = res.data?.data ?? res.data;
    viewingTransfer.value = d;
    transferItems.value = d.items ?? [];
  } catch {
    transferItems.value = row.items ?? [];
  }
  showDetailModal.value = true;
}

async function addItem() {
  if (!viewingTransfer.value) return;

  itemError.value = "";

  if (!itemForm.value.product) {
    itemError.value = "Debes seleccionar un producto.";
    return;
  }

  if (
    !itemForm.value.requested_quantity ||
    Number(itemForm.value.requested_quantity) <= 0
  ) {
    itemError.value = "La cantidad debe ser mayor a 0.";
    return;
  }

  if (
    selectedTransferProduct.value?.requires_lot &&
    !itemForm.value.lot
  ) {
    itemError.value =
      "Debes seleccionar un lote para este producto.";
    return;
  }

  itemLoading.value = true;

  try {
    await transfersApi.createItem({
      stock_transfer: viewingTransfer.value.uuid,
      product: itemForm.value.product,
      requested_quantity:
        itemForm.value.requested_quantity,
      lot: itemForm.value.lot || null,
    });

    itemForm.value = {
      product: "",
      requested_quantity: 1,
      lot: "",
    };

    await openDetail(viewingTransfer.value);
  } catch (e) {
    const data = e.response?.data;

    itemError.value =
      data?.message ??
      data?.detail ??
      data?.lot?.[0] ??
      "Error al agregar ítem";
  } finally {
    itemLoading.value = false;
  }
}

async function removeItem(uuid) {
  itemLoading.value = true;
  try {
    await transfersApi.deleteItem(uuid);
    await openDetail(viewingTransfer.value);
  } catch (e) {
    itemError.value = e.response?.data?.message ?? "Error al eliminar ítem";
  } finally {
    itemLoading.value = false;
  }
}

async function doAction(action) {
  if (!viewingTransfer.value) return;

  actionLoading.value = true;
  detailError.value = "";

  try {
    const map = {
      approve: () =>
        transfersApi.approveTransfer(
          viewingTransfer.value.uuid,
        ),

      send: () =>
        transfersApi.sendTransfer(
          viewingTransfer.value.uuid,
        ),

      receive: () =>
        transfersApi.receiveTransfer(
          viewingTransfer.value.uuid,
        ),

      close: () =>
        transfersApi.closeTransfer(
          viewingTransfer.value.uuid,
        ),
    };

    if (!map[action]) {
      detailError.value = "Acción no válida.";
      return;
    }

    await map[action]();

    showDetailModal.value = false;

    await load();
  } catch (e) {
    const data = e.response?.data;

    console.error(
      "Error procesando traspaso:",
      JSON.stringify(data, null, 2),
    );

    if (typeof data?.message === "string") {
      detailError.value = data.message;
      return;
    }

    if (typeof data?.detail === "string") {
      detailError.value = data.detail;
      return;
    }

    if (Array.isArray(data?.detail)) {
      detailError.value = data.detail.join(" ");
      return;
    }

    if (data?.errors && typeof data.errors === "object") {
      const messages = Object.entries(data.errors).flatMap(
        ([field, errors]) => {
          const list = Array.isArray(errors)
            ? errors
            : [errors];

          return list.map(
            (message) => `${field}: ${message}`,
          );
        },
      );

      detailError.value =
        messages.join(" ") ||
        "No se pudo procesar el traspaso.";

      return;
    }

    if (data && typeof data === "object") {
      const messages = Object.entries(data).flatMap(
        ([field, errors]) => {
          if (
            field === "status" ||
            field === "success"
          ) {
            return [];
          }

          const list = Array.isArray(errors)
            ? errors
            : [errors];

          return list
            .filter(
              (message) =>
                typeof message === "string",
            )
            .map(
              (message) =>
                `${field}: ${message}`,
            );
        },
      );

      detailError.value =
        messages.join(" ") ||
        "No se pudo procesar el traspaso.";

      return;
    }

    detailError.value =
      "No se pudo procesar el traspaso.";
  } finally {
    actionLoading.value = false;
  }
}

function openRejectModal() {
  rejectReason.value = "";
  rejectError.value = "";
  showRejectModal.value = true;
}

async function handleReject() {
  if (!rejectReason.value.trim()) {
    rejectError.value = "El motivo de rechazo es obligatorio.";
    return;
  }
  rejectLoading.value = true;
  rejectError.value = "";
  try {
    await transfersApi.rejectTransfer(viewingTransfer.value.uuid, {
      rejection_reason: rejectReason.value.trim(),
    });
    showRejectModal.value = false;
    showDetailModal.value = false;
    load();
  } catch (e) {
    rejectError.value = e.response?.data?.message ?? "Error al rechazar";
  } finally {
    rejectLoading.value = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("es-CL");
}

function fmtQty(val) {
  if (val == null) return "—";
  return parseFloat(val).toLocaleString("es-CL", { maximumFractionDigits: 3 });
}
</script>

<template>
  <section class="page">
    <PageHeader
      title="Traspasos"
      subtitle="Traspasos y préstamos de stock entre sucursales"
    >
      <button
        v-if="canCreateTransfers"
        class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-md hover:bg-primary/90 transition-all hover:scale-105"
        @click="openCreate"
      >
        <Plus :size="18" /> Nuevo traspaso
      </button>
    </PageHeader>

    <div class="filters-row hidden">
      <div class="search-input">
        <Search :size="16" />
        <input
          type="text"
          placeholder="Buscar..."
          :value="params.search"
          @input="setParam('search', $event.target.value)"
        />
      </div>
      <select
        :value="params.status"
        @change="setParam('status', $event.target.value)"
      >
        <option value="">Todos los estados</option>
        <option value="SOLICITADO">Solicitado</option>
        <option value="APROBADO">Aprobado</option>
        <option value="ENVIADO">Enviado</option>
        <option value="RECIBIDO">Recibido</option>
        <option value="CANCELADO">Cancelado</option>
        <option value="CERRADO">Cerrado</option>
      </select>
      <select
        :value="params.transfer_type"
        @change="setParam('transfer_type', $event.target.value)"
      >
        <option value="">Todos los tipos</option>
        <option value="TRASPASO">Traspaso</option>
        <option value="PRESTAMO">Préstamo</option>
        <option value="DEVOLUCION">Devolución</option>
      </select>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <AppTable :columns="columns" :rows="items" :loading="loading">
      <template #filter-transfer_type>
        <AppMultiSelect
          :options="TYPE_OPTIONS"
          :model-value="params.transfer_type || []"
          @update:model-value="setParam('transfer_type', $event)"
        />
      </template>
      <template #filter-status>
        <AppMultiSelect
          :options="STATUS_OPTIONS"
          :model-value="params.status || []"
          @update:model-value="setParam('status', $event)"
        />
      </template>
      <template #filter-origin>
        <AppInput
          type="text"
          placeholder="Buscar..."
          :model-value="params.search"
          @update:model-value="setParam('search', $event)"
        />
      </template>

      <template #transfer_type="{ row }"
        ><StatusBadge :status="row.transfer_type"
      /></template>
      <template #status="{ row }"
        ><StatusBadge :status="row.status"
      /></template>
      <template #origin="{ row }">{{
        row.origin_branch_detail?.name ?? "—"
      }}</template>
      <template #destination="{ row }">{{
        row.destination_branch_detail?.name ?? "—"
      }}</template>
      <template #requested_by="{ row }">{{
        row.requested_by_detail?.full_name ?? "—"
      }}</template>
      <template #requested_at="{ row }">{{
        fmtDate(row.requested_at)
      }}</template>
      <template #actions="{ row }">
        <div class="flex justify-end">
          <button
            type="button"
            class="
              grid place-items-center
              w-9 h-9
              border border-border
              rounded-md
              text-muted-foreground
              hover:bg-muted
              hover:text-foreground
              transition-colors
            "
            title="Acciones"
            @click="openTransferActions(row)"
          >
            <MoreVertical :size="17" />
          </button>
        </div>
      </template>
    </AppTable>

    <AppModal
      v-if="showTransferActionModal && activeTransferRow"
      title="Acciones del traspaso"
      size="sm"
      @close="closeTransferActions"
    >
      <div class="flex flex-col gap-2">
        <button
          v-if="canViewTransfers"
          type="button"
          class="
            flex items-center gap-3
            w-full px-4 py-3
            text-sm text-left
            rounded-md
            hover:bg-muted
          "
          @click="viewTransferFromActions"
        >
          <Eye :size="17" />
          Ver detalle
        </button>

        <button
          v-if="
            canEditTransfers &&
            activeTransferRow.status === 'SOLICITADO'
          "
          type="button"
          class="
            flex items-center gap-3
            w-full px-4 py-3
            text-sm text-left
            rounded-md
            hover:bg-muted
          "
          @click="editTransferFromActions"
        >
          <Pencil :size="17" />
          Editar
        </button>

        <button
          v-if="
            canDeleteTransfers &&
            activeTransferRow.status === 'SOLICITADO'
          "
          type="button"
          class="
            flex items-center gap-3
            w-full px-4 py-3
            text-sm text-left
            rounded-md
            text-destructive
            hover:bg-destructive/10
          "
          @click="deleteTransferFromActions"
        >
          <Trash2 :size="17" />
          Eliminar
        </button>
      </div>
    </AppModal>

    <AppAlert
      v-if="showDeleteTransferDialog && deleteTransferError"
      type="error"
      :message="deleteTransferError"
    />

    <ConfirmDialog
      v-if="showDeleteTransferDialog && transferToDelete"
      title="Eliminar traspaso"
      :message="`¿Está seguro de eliminar el traspaso ${transferToDelete.origin_branch_detail?.name ?? ''} → ${transferToDelete.destination_branch_detail?.name ?? ''}? Esta acción no se puede deshacer.`"
      confirm-label="Eliminar"
      cancel-label="Cancelar"
      variant="danger"
      :loading="deleteTransferLoading"
      @confirm="confirmDeleteTransfer"
      @cancel="closeDeleteTransferDialog"
    />

    <AppPagination
      :count="pagination.count"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      @change="setPage"
    />

    <!-- ══ MODAL: Nuevo traspaso ══ -->
    <AppModal
      v-if="showCreateModal"
      :title="
        editingTransfer
          ? 'Editar traspaso'
          : 'Nuevo traspaso'
      "
      size="md"
      @close="closeCreateModal"
    >
      <form
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
        @submit.prevent="handleCreate"
      >
        <AppAlert
          v-if="formError || createError"
          type="error"
          :message="formError || createError"
        />
        <FormField label="Sucursal origen" required class="col-span-full">
          <select
            v-model="form.origin_branch"
            required
            class="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Seleccione...</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">
              {{ b.name }}
            </option>
          </select>
        </FormField>
        <FormField label="Sucursal destino" required class="col-span-full">
          <select
            v-model="form.destination_branch"
            required
            class="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Seleccione...</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">
              {{ b.name }}
            </option>
          </select>
        </FormField>
        <FormField label="Tipo" class="col-span-full">
          <select
            v-model="form.transfer_type"
            class="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="TRASPASO">Traspaso</option>
            <option value="PRESTAMO">Préstamo</option>
          </select>
        </FormField>
        <FormField label="Motivo" class="col-span-full">
          <textarea
            v-model="form.reason"
            rows="2"
            class="w-full px-3 py-2 border rounded-md text-sm"
          />
        </FormField>
        <div class="flex justify-end gap-3 mt-4 pt-4 border-t col-span-full">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
            @click="closeCreateModal"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            :disabled="formLoading"
          >
            {{
              formLoading
                ? "Guardando..."
                : editingTransfer
                  ? "Guardar cambios"
                  : "Crear traspaso"
            }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Detalle / gestión del traspaso ══ -->
    <AppModal
      v-if="showDetailModal && viewingTransfer"
      :title="`Traspaso — ${viewingTransfer.origin_branch_detail?.name ?? '?'} → ${viewingTransfer.destination_branch_detail?.name ?? '?'}`"
      size="xl"
      @close="showDetailModal = false"
    >
      <div class="transfer-detail">
        <!-- Cabecera info -->
        <div class="transfer-meta">
          <span
            ><strong>Estado:</strong>
            <StatusBadge :status="viewingTransfer.status"
          /></span>
          <span
            ><strong>Tipo:</strong>
            <StatusBadge :status="viewingTransfer.transfer_type"
          /></span>
          <span v-if="viewingTransfer.reason"
            ><strong>Motivo:</strong> {{ viewingTransfer.reason }}</span
          >
        </div>

        <AppAlert v-if="detailError" type="error" :message="detailError" />

        <!-- Ítems -->
        <h4 class="section-subtitle">Productos a traspasar</h4>
        <table v-if="transferItems.length" class="mini-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Lote</th>
              <th>Solicitado</th>
              <th>Aprobado</th>
              <th>Enviado</th>
              <th>Recibido</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in transferItems" :key="item.uuid">
              <td>
                {{ item.product_detail?.name ?? item.product }}
              </td>

              <td>
                {{
                  item.lot_detail?.lot_number ??
                  item.lot_detail?.batch_number ??
                  "—"
                }}
              </td>

              <td>
                {{ fmtQty(item.requested_quantity) }}
              </td>
              <td>
                {{
                  item.approved_quantity ? fmtQty(item.approved_quantity) : "—"
                }}
              </td>
              <td>
                {{ item.sent_quantity ? fmtQty(item.sent_quantity) : "—" }}
              </td>
              <td>
                {{
                  item.received_quantity ? fmtQty(item.received_quantity) : "—"
                }}
              </td>
              <td>
                <button
                v-if="
                  canEditTransfers &&
                  viewingTransfer.status === 'SOLICITADO'
                "
                class="icon-btn"
                title="Eliminar ítem"
                @click="removeItem(item.uuid)"
              >
                <XCircle :size="14" />
              </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-note">Sin ítems todavía.</p>

        <!-- Agregar ítem (solo cuando está solicitado) -->
        <template
          v-if="
            canEditTransfers &&
            viewingTransfer.status === 'SOLICITADO'
          "
        >
          <h4 class="section-subtitle">
            Agregar producto
          </h4>

          <AppAlert
            v-if="itemError"
            type="error"
            :message="itemError"
          />

          <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
            <FormField
              label="Producto"
              required
              class="md:col-span-5"
            >
              <AppSelect
                v-model="itemForm.product"
                @update:model-value="itemForm.lot = ''"
              >
                <option value="">
                  Seleccionar producto
                </option>

                <option
                  v-for="p in products"
                  :key="p.uuid"
                  :value="p.uuid"
                >
                  {{ p.name }}
                </option>
              </AppSelect>
            </FormField>

            <FormField
              label="Cantidad"
              required
              class="md:col-span-2"
            >
              <AppInput
                v-model.number="itemForm.requested_quantity"
                type="number"
                min="0.001"
                step="0.001"
              />
            </FormField>

            <FormField
              v-if="selectedTransferProduct?.requires_lot"
              label="Lote"
              required
              class="md:col-span-3"
            >
              <AppSelect v-model="itemForm.lot">
                <option value="">
                  Seleccionar lote
                </option>

                <option
                  v-for="lot in availableLots"
                  :key="lot.uuid"
                  :value="lot.uuid"
                >
                  {{
                    lot.lot_number ??
                    lot.batch_number ??
                    lot.uuid
                  }}
                </option>
              </AppSelect>
            </FormField>

            <div
              class="md:col-span-2 flex items-end"
            >
              <button
                type="button"
                class="btn btn--primary w-full"
                :disabled="
                  itemLoading ||
                  !itemForm.product ||
                  !itemForm.requested_quantity ||
                  (
                    selectedTransferProduct?.requires_lot &&
                    !itemForm.lot
                  )
                "
                @click="addItem"
              >
                {{ itemLoading ? "Agregando..." : "Agregar" }}
              </button>
            </div>
          </div>
        </template>

        <!-- Botones de flujo -->
        <div class="form-actions" style="margin-top: 16px">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showDetailModal = false"
          >
            Cerrar
          </button>

          <button
            v-if="
              canEditTransfers &&
              viewingTransfer.status === 'SOLICITADO'
            "
            type="button"
            class="btn btn--primary"
            :disabled="actionLoading"
            @click="doAction('approve')"
          >
            <CheckCircle :size="14" />
            Aprobar
          </button>

          <button
            v-if="
              canEditTransfers &&
              viewingTransfer.status === 'SOLICITADO'
            "
            type="button"
            class="btn btn--danger"
            :disabled="actionLoading"
            @click="openRejectModal"
          >
            <XCircle :size="14" />
            Rechazar
          </button>

          <button
            v-if="
              canEditTransfers &&
              viewingTransfer.status === 'APROBADO'
            "
            type="button"
            class="btn btn--primary"
            :disabled="actionLoading"
            @click="doAction('send')"
          >
            <Send :size="14" />
            Enviar (descuenta stock)
          </button>

          <button
            v-if="
              canEditTransfers &&
              viewingTransfer.status === 'ENVIADO'
            "
            type="button"
            class="btn btn--primary"
            :disabled="actionLoading"
            @click="doAction('receive')"
          >
            <Truck :size="14" />
            Recibir (ingresa stock)
          </button>

          <button
            v-if="
              canEditTransfers &&
              viewingTransfer.status === 'RECIBIDO'
            "
            type="button"
            class="btn btn--ghost"
            :disabled="actionLoading"
            @click="doAction('close')"
          >
            <Lock :size="14" />
            Cerrar traspaso
          </button>
        </div>
      </div>
    </AppModal>
    <!-- ══ MODAL: Rechazar traspaso (motivo obligatorio) ══ -->
    <AppModal
      v-if="showRejectModal"
      title="Rechazar traspaso"
      size="sm"
      @close="showRejectModal = false"
    >
      <div class="form-grid">
        <AppAlert v-if="rejectError" type="error" :message="rejectError" />
        <FormField label="Motivo de rechazo" required class="full-width">
          <textarea
            v-model="rejectReason"
            rows="3"
            placeholder="Describe el motivo del rechazo..."
            required
          />
        </FormField>
        <div class="form-actions full-width">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showRejectModal = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn--danger"
            :disabled="rejectLoading"
            @click="handleReject"
          >
            {{ rejectLoading ? "Rechazando..." : "Confirmar rechazo" }}
          </button>
        </div>
      </div>
    </AppModal>
  </section>
</template>

<style scoped>
.transfer-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.transfer-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  font-size: 0.875rem;
  align-items: center;
}
.section-subtitle {
  margin: 8px 0 4px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.mini-table th,
.mini-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
.mini-table th {
  background: var(--color-surface);
  font-weight: 600;
}
.empty-note {
  color: var(--color-muted);
  font-size: 0.875rem;
}
.inline-form {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.inline-form select,
.inline-form input {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
.btn--danger {
  background: var(--color-error, #ef4444);
  color: #fff;
  border: none;
}
.btn--danger:hover {
  opacity: 0.9;
}
</style>
