<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRefresh } from "@/composables/useRefresh";
import {
  Plus,
  Pencil,
  Eye,
  Search,
  Send,
  CheckCircle,
  XCircle,
  Truck,
  AlertTriangle,
  MoreVertical,
  Sparkles,
} from "lucide-vue-next";
import { purchasingApi } from "@/api/purchasing.api";
import { optionsApi } from "@/api/options.api";
import { useList } from "@/composables/useList";
import { useForm } from "@/composables/useForm";
import { usePermissions } from "@/composables/usePermissions";
import PageHeader from "@/components/common/PageHeader.vue";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
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
      lot.product_detail?.uuid;

    return productUuid === itemForm.value.product;
  }),
);

const {
  // Solicitudes
  canViewSupplyRequests,
  canCreateSupplyRequest,
  canEditSupplyRequest,
  canApproveSupplyRequest,

  // Órdenes
  canViewPurchaseOrders,
  canCreatePurchaseOrders,
  canEditPurchaseOrders,
  canDeletePurchaseOrders,

  // Recepciones
  canViewPurchaseReceipts,
  canCreatePurchaseReceipts,
  canEditPurchaseReceipts,
  canDeletePurchaseReceipts,
  canProcessPurchaseReceipts,

  // Reclamos
  canViewSupplierClaims,
  canCreateSupplierClaims,
  canEditSupplierClaims,
  canDeleteSupplierClaims,
} = usePermissions();

const { setRefreshFunction, clearRefreshFunction } = useRefresh();

const lots = ref([]);

async function loadAll() {
  const tasks = [];

  if (canViewSupplyRequests.value) {
    tasks.push(srList.load());
  }

  if (canViewPurchaseOrders.value) {
    tasks.push(poList.load());
  }

  if (canViewPurchaseReceipts.value) {
    tasks.push(receiptList.load());
  }

  if (canViewSupplierClaims.value) {
    tasks.push(claimList.load());
  }

  await Promise.all(tasks);
}

const tabs = computed(() => {
  const result = [];

  if (canViewSupplyRequests.value) {
    result.push("Solicitudes");
  }

  if (canViewPurchaseOrders.value) {
    result.push("Órdenes de Compra");
  }

  if (canViewPurchaseReceipts.value) {
    result.push("Recepciones");
  }

  if (canViewSupplierClaims.value) {
    result.push("Reclamos");
  }

  return result;
});

const activeTab = ref("");

const headerButton = computed(() => {
  if (activeTab.value === "Solicitudes" && canCreateSupplyRequest.value) {
    return {
      label: "Nueva solicitud",
      action: openCreateSR,
    };
  }

  if (
    activeTab.value === "Órdenes de Compra" &&
    canCreatePurchaseOrders.value
  ) {
    return {
      label: "Nueva orden",
      action: openCreatePO,
    };
  }

  if (activeTab.value === "Recepciones" && canCreatePurchaseReceipts.value) {
    return {
      label: "Nueva recepción",
      action: openCreateReceipt,
    };
  }

  if (activeTab.value === "Reclamos" && canCreateSupplierClaims.value) {
    return {
      label: "Nuevo reclamo",
      action: openCreateClaim,
    };
  }

  return null;
});

// ─── OPTIONS ────────────────────────────────────────────────────────────────
const branches = ref([]);
const suppliers = ref([]);
const warehouses = ref([]);
const products = ref([]);
const purchaseOrders = ref([]);

const SR_STATUS_OPTIONS = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "OBSERVADA", label: "Observada" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "RECHAZADA", label: "Rechazada" },
];
const PO_STATUS_OPTIONS = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "EN_APROBACION", label: "En aprobación" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "ENVIADA_PROVEEDOR", label: "Enviada a proveedor" },
  { value: "RECIBIDA", label: "Recibida" },
  { value: "CANCELADA", label: "Cancelada" },
];

// ─── SOLICITUDES ─────────────────────────────────────────────────────────────
const srColumns = [
  { key: "branch", label: "Sucursal" },
  { key: "period", label: "Período" },
  { key: "status", label: "Estado" },
  { key: "requested_by", label: "Solicitante" },
  { key: "actions", label: "", width: "70px" },
];
const srList = useList(purchasingApi.listSupplyRequests);

// Modal detalle / edición de solicitud
const showSRModal = ref(false);
const viewingSR = ref(null);
const srActionError = ref("");
const srActionLoading = ref(false);

// Modal nueva solicitud
const showSRCreateModal = ref(false);
const emptySRForm = {
  branch: "",
  period_year: new Date().getFullYear(),
  period_month: new Date().getMonth() + 1,
  comments: "",
};
const {
  form: srForm,
  loading: srLoading,
  error: srError,
  reset: srReset,
  submit: srSubmit,
} = useForm(emptySRForm, (data) => purchasingApi.createSupplyRequest(data));

// Ítems dentro del modal de solicitud
const srItems = ref([]);
const srItemForm = ref({
  product: "",
  requested_quantity: 1,
  justification: "",
});
const srItemLoading = ref(false);
const srItemError = ref("");

// ─── ÓRDENES DE COMPRA ───────────────────────────────────────────────────────
const poColumns = [
  { key: "order_number", label: "N° Orden" },
  { key: "supplier", label: "Proveedor" },
  { key: "branch", label: "Sucursal" },
  { key: "status", label: "Estado" },
  { key: "total_amount", label: "Total" },
  { key: "actions", label: "", width: "70px" },
];
const poList = useList(purchasingApi.listPurchaseOrders);
const showPOModal = ref(false);
const editingPO = ref(null);
const poActionLoading = ref(false);
const poActionError = ref("");
const showPOActionModal = ref(false);
const activePORow = ref(null);

// ─── SUGERENCIAS DE COMPRA ───────────────────────────────────────────────────
const showPurchaseSuggestionsModal = ref(false);
const purchaseSuggestionsLoading = ref(false);
const purchaseSuggestionsError = ref("");
const purchaseSuggestions = ref([]);
const purchaseSuggestionsSummary = ref(null);
const purchaseSuggestionsBranch = ref("");

async function loadPurchaseSuggestions() {
  purchaseSuggestionsLoading.value = true;
  purchaseSuggestionsError.value = "";

  try {
    const params = {};

    if (purchaseSuggestionsBranch.value) {
      params.branch = purchaseSuggestionsBranch.value;
    }

    const res = await purchasingApi.getPurchaseSuggestions(params);
    const data = res.data?.data ?? res.data ?? {};

    purchaseSuggestions.value = Array.isArray(data?.suggestions)
      ? data.suggestions
      : [];

    purchaseSuggestionsSummary.value = data?.summary ?? {
      products_to_buy: 0,
      critical_products: 0,
      high_priority_products: 0,
      estimated_total: 0,
    };
  } catch (e) {
    purchaseSuggestions.value = [];
    purchaseSuggestionsSummary.value = null;
    purchaseSuggestionsError.value =
      e.response?.data?.message ??
      e.response?.data?.detail ??
      e.response?.data?.data?.detail ??
      "No se pudieron obtener las sugerencias de compra.";
  } finally {
    purchaseSuggestionsLoading.value = false;
  }
}

async function openPurchaseSuggestions() {
  purchaseSuggestionsBranch.value = "";
  purchaseSuggestionsError.value = "";
  purchaseSuggestions.value = [];
  purchaseSuggestionsSummary.value = null;
  showPurchaseSuggestionsModal.value = true;

  await loadPurchaseSuggestions();
}

function closePurchaseSuggestions() {
  showPurchaseSuggestionsModal.value = false;
  purchaseSuggestionsError.value = "";
}

function purchasePriorityLabel(priority) {
  if (priority === "CRITICAL") return "Crítica";
  if (priority === "HIGH") return "Alta";
  return priority || "—";
}

function openPOActions(row) {
  activePORow.value = row;
  showPOActionModal.value = true;
}

function closePOActions() {
  showPOActionModal.value = false;
  activePORow.value = null;
}

function editPOFromActions() {
  if (!activePORow.value) return;

  const row = activePORow.value;

  editingPO.value = row;
  poFill({ ...row });
  poActionError.value = "";
  showPOModal.value = true;

  closePOActions();
}

function viewPOFromActions() {
  if (!activePORow.value) return;

  const row = activePORow.value;

  closePOActions();
  openPODetail(row);
}

const emptyPOForm = {
  order_number: "",
  supplier: "",
  branch: "",
  status: "BORRADOR",
  purchase_type: "ORDEN_COMPRA",
  payment_type: "",
  expected_delivery_date: "",
  notes: "",
};
const {
  form: poForm,
  loading: poLoading,
  error: poError,
  reset: poReset,
  fill: poFill,
  submit: poSubmit,
} = useForm(emptyPOForm, (data) =>
  editingPO.value
    ? purchasingApi.updatePurchaseOrder(editingPO.value.uuid, data)
    : purchasingApi.createPurchaseOrder(data),
);

// ─── RECEPCIONES ─────────────────────────────────────────────────────────────
const receiptColumns = [
  { key: "purchase_order", label: "Orden de compra" },
  { key: "branch", label: "Sucursal" },
  { key: "warehouse", label: "Bodega" },
  { key: "status", label: "Estado" },
  { key: "received_at", label: "Fecha recepción" },
  { key: "actions", label: "", width: "70px" },
];
const receiptList = useList(purchasingApi.listPurchaseReceipts);
const showReceiptModal = ref(false);
const receiptActionError = ref("");

const editingReceipt = ref(null);
const deleteReceipt = ref(null);
const deleteReceiptLoading = ref(false);

const showReceiptActionModal = ref(false);
const activeReceiptRow = ref(null);

function openReceiptActions(row) {
  activeReceiptRow.value = row;
  showReceiptActionModal.value = true;
}

function closeReceiptActions() {
  showReceiptActionModal.value = false;
  activeReceiptRow.value = null;
}

function viewReceiptFromActions() {
  if (!activeReceiptRow.value) return;

  const row = activeReceiptRow.value;

  closeReceiptActions();
  openReceiptDetail(row);
}

function editReceiptFromActions() {
  if (!activeReceiptRow.value) return;

  const row = activeReceiptRow.value;

  closeReceiptActions();
  openEditReceipt(row);
}

function openEditReceipt(row) {
  if (!canEditPurchaseReceipts.value) return;

  editingReceipt.value = row;

  receiptReset();

  Object.assign(receiptForm, {
    purchase_order: row.purchase_order ?? "",
    branch: row.branch ?? "",
    warehouse: row.warehouse ?? "",
    status: row.status ?? "RECIBIDO_OK",
    received_at: row.received_at ? row.received_at.slice(0, 16) : "",
    comments: row.comments ?? "",
  });

  receiptActionError.value = "";
  showReceiptModal.value = true;
}

const emptyReceiptForm = {
  purchase_order: "",
  branch: "",
  warehouse: "",
  status: "RECIBIDO_OK",
  received_at: new Date().toISOString().slice(0, 16),
  comments: "",
};
const {
  form: receiptForm,
  loading: receiptLoading,
  error: receiptCreateError,
  reset: receiptReset,
  submit: receiptSubmit,
} = useForm(emptyReceiptForm, (data) =>
  editingReceipt.value
    ? purchasingApi.updatePurchaseReceipt(editingReceipt.value.uuid, data)
    : purchasingApi.createPurchaseReceipt(data),
);

// ─── DETALLE ORDEN DE COMPRA (ítems inline) ───────────────────────────────────
const showPODetailModal = ref(false);
const viewingPO = ref(null);
const poItems = ref([]);

const poItemForm = ref({
  product: "",
  quantity: 1,
  unit_price: 0,
});

const poItemLoading = ref(false);
const poItemError = ref("");

async function openPODetail(row) {
  poItemError.value = "";
  viewingPO.value = row;

  try {
    const res = await purchasingApi.getPurchaseOrder(row.uuid);
    const d = res.data?.data ?? res.data;

    viewingPO.value = d;
    poItems.value = d.items ?? [];
  } catch {
    poItems.value = row.items ?? [];
  }

  showPODetailModal.value = true;
}

async function addPOItem() {
  if (!canEditPurchaseOrders.value) return;
  if (!viewingPO.value) return;

  poItemError.value = "";
  poItemLoading.value = true;

  try {
    await purchasingApi.createPurchaseOrderItem({
      purchase_order: viewingPO.value.uuid,
      product: poItemForm.value.product,
      quantity: poItemForm.value.quantity,
      unit_price: poItemForm.value.unit_price,
    });

    itemForm.value = {
      product: "",
      requested_quantity: 1,
      lot: "",
    };

    await openPODetail(viewingPO.value);
  } catch (e) {
    poItemError.value =
      e.response?.data?.message ??
      "Error al agregar ítem";
  } finally {
    poItemLoading.value = false;
  }
}

async function removePOItem(itemUuid) {
  if (!canEditPurchaseOrders.value) return;

  poItemLoading.value = true;

  try {
    await purchasingApi.deletePurchaseOrderItem(itemUuid);

    await openPODetail(viewingPO.value);
  } catch (e) {
    poItemError.value =
      e.response?.data?.message ??
      "Error al eliminar ítem";
  } finally {
    poItemLoading.value = false;
  }
}

// ─── RECLAMOS A PROVEEDORES ──────────────────────────────────────────────────
const CLAIM_TYPES = [
  { value: "DEVOLUCION_PRODUCTO", label: "Devolución de producto" },
  { value: "NOTA_CREDITO", label: "Nota de crédito" },
  { value: "REPOSICION", label: "Reposición" },
  { value: "CAMBIO_PRODUCTO", label: "Cambio de producto" },
];

const CLAIM_STATUS_OPTIONS = [
  { value: "ABIERTO", label: "Abierto" },
  { value: "EN_GESTION", label: "En gestión" },
  { value: "RESUELTO", label: "Resuelto" },
  { value: "CANCELADO", label: "Cancelado" },
];

const claimColumns = [
  { key: "supplier", label: "Proveedor" },
  { key: "claim_type", label: "Tipo" },
  { key: "status", label: "Estado" },
  { key: "description", label: "Descripción" },
  { key: "created_at", label: "Creado" },
  { key: "actions", label: "", width: "70px" },
];

const claimList = useList(purchasingApi.listSupplierClaims);
const showClaimModal = ref(false);
const editingClaim = ref(null);
const showClaimDetail = ref(false);
const viewingClaim = ref(null);
const claimActionError = ref("");
const deleteClaim = ref(null);
const deleteClaimLoading = ref(false);

const showClaimActionModal = ref(false);
const activeClaimRow = ref(null);

function openClaimActions(row) {
  activeClaimRow.value = row;
  showClaimActionModal.value = true;
}

function closeClaimActions() {
  showClaimActionModal.value = false;
  activeClaimRow.value = null;
}

function viewClaimFromActions() {
  if (!activeClaimRow.value) return;

  const row = activeClaimRow.value;

  closeClaimActions();
  openClaimDetail(row);
}

function editClaimFromActions() {
  if (!activeClaimRow.value) return;

  const row = activeClaimRow.value;

  closeClaimActions();
  openEditClaim(row);
}

const emptyClaimForm = {
  supplier: "",
  purchase_receipt: "",
  claim_type: "DEVOLUCION_PRODUCTO",
  description: "",
  requested_solution: "",
  credit_note_number: "",
};
const {
  form: claimForm,
  loading: claimLoading,
  error: claimError,
  reset: claimReset,
  fill: claimFill,
  submit: claimSubmit,
} = useForm(emptyClaimForm, (data) =>
  editingClaim.value
    ? purchasingApi.updateSupplierClaim(editingClaim.value.uuid, data)
    : purchasingApi.createSupplierClaim(data),
);

function openCreateClaim() {
  if (!canCreateSupplierClaims.value) return;

  editingClaim.value = null;
  claimReset();
  claimActionError.value = "";
  showClaimModal.value = true;
}

function openEditClaim(row) {
  if (!canEditSupplierClaims.value) return;

  editingClaim.value = row;

  claimFill({
    supplier: row.supplier ?? "",
    purchase_receipt: row.purchase_receipt ?? "",
    claim_type: row.claim_type ?? "DEVOLUCION_PRODUCTO",
    description: row.description ?? "",
    requested_solution: row.requested_solution ?? "",
    credit_note_number: row.credit_note_number ?? "",
  });

  claimActionError.value = "";
  showClaimModal.value = true;
}

async function handleClaimSubmit() {
  if (editingClaim.value) {
    if (!canEditSupplierClaims.value) return;
  } else {
    if (!canCreateSupplierClaims.value) return;
  }

  try {
    await claimSubmit();
    if (!claimError.value) {
      showClaimModal.value = false;
      claimList.load();
    }
  } catch {
    // Evitar crash por error no capturado de useForm
  }
}

async function confirmDeleteClaim() {
  if (!canDeleteSupplierClaims.value) return;
  if (!deleteClaim.value) return;

  deleteClaimLoading.value = true;
  claimActionError.value = "";

  try {
    await purchasingApi.deleteSupplierClaim(deleteClaim.value.uuid);

    deleteClaim.value = null;
    await claimList.load();
  } catch (e) {
    claimActionError.value =
      e.response?.data?.message ?? "Error al eliminar reclamo";
  } finally {
    deleteClaimLoading.value = false;
  }
}

function openClaimDetail(row) {
  viewingClaim.value = row;
  claimActionError.value = "";
  showClaimDetail.value = true;
}

async function updateClaimStatus(newStatus) {
  if (!canEditSupplierClaims.value) return;
  if (!viewingClaim.value) return;

  claimActionError.value = "";

  try {
    await purchasingApi.updateSupplierClaim(viewingClaim.value.uuid, {
      status: newStatus,
    });

    showClaimDetail.value = false;
    claimList.load();
  } catch (e) {
    claimActionError.value =
      e.response?.data?.message ?? "Error al actualizar estado";
  }
}

function claimTypeLabel(val) {
  return CLAIM_TYPES.find((t) => t.value === val)?.label ?? val;
}

// ─── MOUNT ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  activeTab.value = tabs.value[0] ?? "";

  await loadAll();
  setRefreshFunction(loadAll);

  // Opciones generales
  const [brRes, supRes, whRes, prRes] = await Promise.allSettled([
    optionsApi.getBranches(),
    optionsApi.getSuppliers(),
    optionsApi.getWarehouses(),
    optionsApi.getProducts(),
  ]);

  const extract = (res) => {
    if (!res || res.status !== "fulfilled") return [];

    const d = res.value.data?.data ?? res.value.data;

    return Array.isArray(d) ? d : (d?.results ?? []);
  };

  branches.value = extract(brRes);
  suppliers.value = extract(supRes);
  warehouses.value = extract(whRes);
  products.value = extract(prRes);

  // Las órdenes se usan como opción en Recepciones.
  // Solo consultarlas si el usuario tiene permiso para ver órdenes.
  if (canViewPurchaseOrders.value) {
    const poRes = await Promise.allSettled([
      purchasingApi.listPurchaseOrders({
        page_size: 200,
      }),
    ]);

    purchaseOrders.value = extract(poRes[0]);
  } else {
    purchaseOrders.value = [];
  }
});

onUnmounted(clearRefreshFunction);

// ─── HANDLERS SOLICITUDES ────────────────────────────────────────────────────
function openCreateSR() {
  if (!canCreateSupplyRequest.value) return;

  srReset();
  showSRCreateModal.value = true;
}

async function handleSRCreate() {
  if (!canCreateSupplyRequest.value) return;

  try {
    await srSubmit();
    if (!srError.value) {
      showSRCreateModal.value = false;
      srList.load();
    }
  } catch {
    // Evitar crash por error no capturado de useForm
  }
}

// Saldo del centro de costo frente al costo estimado de la solicitud. Es el
// control que hoy no existe: la compra se decide sin saber si hay presupuesto.
const srBudget = ref(null);

async function loadSRBudget(uuid) {
  srBudget.value = null;
  try {
    const res = await purchasingApi.budgetCheckSupplyRequest(uuid);
    srBudget.value = res.data?.data ?? null;
  } catch {
    srBudget.value = null;
  }
}

function fmtMoney(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

async function openSRDetail(row) {
  srActionError.value = "";
  viewingSR.value = row;
  loadSRBudget(row.uuid);
  // cargar ítems actualizados
  try {
    const res = await purchasingApi.getSupplyRequest(row.uuid);
    const d = res.data?.data ?? res.data;
    viewingSR.value = d;
    srItems.value = d.items ?? [];
  } catch {
    srItems.value = row.items ?? [];
  }
  showSRModal.value = true;
}

async function addSRItem() {
  if (!canEditSupplyRequest.value) return;

  if (!viewingSR.value) return;
  srItemError.value = "";
  srItemLoading.value = true;
  try {
    await purchasingApi.createSupplyRequestItem({
      supply_request: viewingSR.value.uuid,
      product: srItemForm.value.product,
      requested_quantity: srItemForm.value.requested_quantity,
      justification: srItemForm.value.justification,
    });
    itemForm.value = {
      product: "",
      requested_quantity: 1,
      lot: "",
    };
    await openSRDetail(viewingSR.value);
  } catch (e) {
    srItemError.value = e.response?.data?.message ?? "Error al agregar ítem";
  } finally {
    srItemLoading.value = false;
  }
}

async function removeSRItem(itemUuid) {
  if (!canEditSupplyRequest.value) return;

  srItemLoading.value = true;
  try {
    await purchasingApi.deleteSupplyRequestItem(itemUuid);
    await openSRDetail(viewingSR.value);
  } catch (e) {
    srItemError.value = e.response?.data?.message ?? "Error al eliminar ítem";
  } finally {
    srItemLoading.value = false;
  }
}

async function srAction(action) {
  if (!viewingSR.value) return;

  if (action === "submit" && !canCreateSupplyRequest.value) {
    return;
  }

  if (
    ["approve", "reject", "observe"].includes(action) &&
    !canApproveSupplyRequest.value
  ) {
    return;
  }

  srActionLoading.value = true;
  srActionError.value = "";

  try {
    const map = {
      submit: () => purchasingApi.submitSupplyRequest(viewingSR.value.uuid),

      approve: () => purchasingApi.approveSupplyRequest(viewingSR.value.uuid),

      reject: () =>
        purchasingApi.rejectSupplyRequest(viewingSR.value.uuid, {
          comments: "",
        }),

      observe: () =>
        purchasingApi.observeSupplyRequest(viewingSR.value.uuid, {
          comments: "",
        }),
    };

    await map[action]();

    showSRModal.value = false;
    srList.load();
  } catch (e) {
    srActionError.value =
      e.response?.data?.message ?? "Error al ejecutar acción";
  } finally {
    srActionLoading.value = false;
  }
}

const deletePO = ref(null);
const deletePOLoading = ref(false);

async function confirmDeletePO() {
  if (!canDeletePurchaseOrders.value) return;
  if (!deletePO.value) return;

  deletePOLoading.value = true;

  try {
    await purchasingApi.deletePurchaseOrder(deletePO.value.uuid);

    deletePO.value = null;

    await poList.load();
  } finally {
    deletePOLoading.value = false;
  }
}

// ─── CONVERSIÓN SOLICITUD → OC ───────────────────────────────────────────────
const showConvertModal = ref(false);
const convertLoading = ref(false);
const convertError = ref("");
const convertForm = ref({
  supplier: "",
  expected_delivery_date: "",
  notes: "",
  tax_rate: 19,
});

function openConvertModal() {
  convertForm.value = {
    supplier: "",
    expected_delivery_date: "",
    notes: "",
    tax_rate: 19,
  };
  convertError.value = "";
  showConvertModal.value = true;
}

async function handleConvert() {
  if (!viewingSR.value) return;
  convertLoading.value = true;
  convertError.value = "";
  try {
    const payload = {
      supplier_uuid: convertForm.value.supplier,
      tax_rate: convertForm.value.tax_rate,
    };
    if (convertForm.value.expected_delivery_date)
      payload.expected_delivery_date = convertForm.value.expected_delivery_date;
    if (convertForm.value.notes) payload.notes = convertForm.value.notes;

    await purchasingApi.convertSupplyRequestToPO(viewingSR.value.uuid, payload);
    showConvertModal.value = false;
    showSRModal.value = false;
    srList.load();
    poList.load();
    // cambiar al tab de OC para que el usuario vea el resultado
    activeTab.value = "Órdenes de Compra";
  } catch (e) {
    convertError.value =
      e.response?.data?.message ?? "Error al convertir la solicitud";
  } finally {
    convertLoading.value = false;
  }
}

// ─── HANDLERS ÓRDENES ────────────────────────────────────────────────────────
function openCreatePO() {
  if (!canCreatePurchaseOrders.value) return;

  editingPO.value = null;
  poReset();
  poActionError.value = "";
  showPOModal.value = true;
}

async function handlePOSubmit() {
  if (editingPO.value) {
    if (!canEditPurchaseOrders.value) return;
  } else {
    if (!canCreatePurchaseOrders.value) return;
  }

  try {
    await poSubmit();
    if (!poError.value) {
      showPOModal.value = false;
      poList.load();
    }
  } catch {
    // Evitar crash por error no capturado de useForm
  }
}

async function poAction(action, row) {
  if (!canEditPurchaseOrders.value) return;

  poActionLoading.value = true;
  poActionError.value = "";

  try {
    if (action === "sendToApproval") {
      const res = await purchasingApi.getPurchaseOrder(row.uuid);
      const order = res.data?.data ?? res.data;

      const items = order.items ?? [];

      if (!items.length) {
        poActionError.value =
          "Debes agregar al menos un producto antes de enviar la orden a aprobación.";

        return;
      }
    }

    const map = {
      sendToApproval: () =>
        purchasingApi.updatePurchaseOrder(row.uuid, {
          status: "EN_APROBACION",
        }),

      approve: () =>
        purchasingApi.approvePurchaseOrder(row.uuid),

      send: () =>
        purchasingApi.sendPurchaseOrder(row.uuid),

      cancel: () =>
        purchasingApi.cancelPurchaseOrder(row.uuid),

      close: () =>
        purchasingApi.closePurchaseOrder(row.uuid),
    };

    if (!map[action]) {
      poActionError.value =
        "La acción solicitada no es válida.";
      return;
    }

    await map[action]();

    await poList.load();
  } catch (e) {
    poActionError.value =
      e.response?.data?.message ??
      e.response?.data?.detail ??
      "Error al ejecutar acción";
  } finally {
    poActionLoading.value = false;
  }
}

// ─── DETALLE RECEPCIÓN (ítems inline) ────────────────────────────────────────
const showReceiptDetailModal = ref(false);
const viewingReceipt = ref(null);
const receiptItems = ref([]);
const receiptItemForm = ref({
  product: "",
  received_quantity: 1,
  accepted_quantity: 1,
  rejected_quantity: 0,
  lot_number: "",
  expiration_date: "",
});
const selectedReceiptProduct = computed(() =>
  products.value.find(
    (product) => product.uuid === receiptItemForm.value.product,
  ),
);
const receiptItemLoading = ref(false);
const receiptItemError = ref("");

async function openReceiptDetail(row) {
  receiptItemError.value = "";
  viewingReceipt.value = row;
  try {
    const res = await purchasingApi.getPurchaseReceipt(row.uuid);
    const d = res.data?.data ?? res.data;
    viewingReceipt.value = d;
    receiptItems.value = d.items ?? [];
  } catch {
    receiptItems.value = row.items ?? [];
  }
  showReceiptDetailModal.value = true;
}

async function addReceiptItem() {
  if (!canEditPurchaseReceipts.value) return;
  if (!viewingReceipt.value) return;

  receiptItemError.value = "";

  if (
    selectedReceiptProduct.value?.requires_lot &&
    !receiptItemForm.value.lot_number
  ) {
    receiptItemError.value =
      "Este producto requiere número de lote.";

    return;
  }

  if (
    selectedReceiptProduct.value?.requires_expiration_date &&
    !receiptItemForm.value.expiration_date
  ) {
    receiptItemError.value =
      "Este producto requiere fecha de vencimiento.";

    return;
  }

  receiptItemLoading.value = true;

  try {
    await purchasingApi.createPurchaseReceiptItem({
      purchase_receipt: viewingReceipt.value.uuid,
      product: receiptItemForm.value.product,
      received_quantity:
        receiptItemForm.value.received_quantity,
      accepted_quantity:
        receiptItemForm.value.accepted_quantity,
      rejected_quantity:
        receiptItemForm.value.rejected_quantity,
      lot_number:
        receiptItemForm.value.lot_number || null,
      expiration_date:
        receiptItemForm.value.expiration_date || null,
    });

    receiptItemForm.value = {
      product: "",
      received_quantity: 1,
      accepted_quantity: 1,
      rejected_quantity: 0,
      lot_number: "",
      expiration_date: "",
    };

    await openReceiptDetail(viewingReceipt.value);
  } catch (e) {
    receiptItemError.value =
      e.response?.data?.message ??
      e.response?.data?.detail ??
      "Error al agregar ítem";
  } finally {
    receiptItemLoading.value = false;
  }
}

async function removeReceiptItem(itemUuid) {
  if (!canEditPurchaseReceipts.value) return;

  receiptItemLoading.value = true;
  try {
    await purchasingApi.deletePurchaseReceiptItem(itemUuid);
    await openReceiptDetail(viewingReceipt.value);
  } catch (e) {
    receiptItemError.value =
      e.response?.data?.message ?? "Error al eliminar ítem";
  } finally {
    receiptItemLoading.value = false;
  }
}

// ─── HANDLERS RECEPCIONES ────────────────────────────────────────────────────
function openCreateReceipt() {
  if (!canCreatePurchaseReceipts.value) return;

  editingReceipt.value = null;
  receiptReset();
  receiptActionError.value = "";
  showReceiptModal.value = true;
}

async function handleReceiptCreate() {
  if (editingReceipt.value) {
    if (!canEditPurchaseReceipts.value) return;
  } else {
    if (!canCreatePurchaseReceipts.value) return;
  }

  try {
    await receiptSubmit();
    if (!receiptCreateError.value) {
      showReceiptModal.value = false;
      editingReceipt.value = null;
      receiptList.load();
    }
  } catch {
    // Evitar crash por error no capturado de useForm
  }
}

async function confirmDeleteReceipt() {
  if (!canDeletePurchaseReceipts.value) return;
  if (!deleteReceipt.value) return;

  deleteReceiptLoading.value = true;
  receiptActionError.value = "";

  try {
    await purchasingApi.deletePurchaseReceipt(deleteReceipt.value.uuid);

    deleteReceipt.value = null;
    await receiptList.load();
  } catch (e) {
    receiptActionError.value =
      e.response?.data?.message ?? "Error al eliminar recepción";
  } finally {
    deleteReceiptLoading.value = false;
  }
}

async function processReceipt(row) {
  if (!canProcessPurchaseReceipts.value) return;

  receiptActionError.value = "";

  try {
    await purchasingApi.processPurchaseReceipt(row.uuid);

    await receiptList.load();
  } catch (e) {
    console.error(
      "Error procesando recepción:",
      e.response?.data
    );

    const data = e.response?.data;

    if (typeof data?.message === "string") {
      receiptActionError.value = data.message;
    } else if (typeof data?.detail === "string") {
      receiptActionError.value = data.detail;
    } else if (Array.isArray(data?.detail)) {
      receiptActionError.value = data.detail.join(" ");
    } else if (Array.isArray(data?.errors)) {
      receiptActionError.value = data.errors.join(" ");
    } else if (data && typeof data === "object") {
      const firstError = Object.values(data).flat()[0];

      receiptActionError.value =
        typeof firstError === "string"
          ? firstError
          : "No se pudo procesar la recepción.";
    } else {
      receiptActionError.value =
        "No se pudo procesar la recepción.";
    }
  }
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function fmt(val) {
  if (val == null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(val);
}
function fmtDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("es-CL");
}
</script>

<template>
  <section class="page">
    <PageHeader
      title="Compras"
      subtitle="Solicitudes, órdenes de compra y recepciones"
    >
      <template v-if="activeTab === 'Solicitudes' && canCreateSupplyRequest">
        <button
          class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          @click="openCreateSR"
        >
          <Plus :size="16" /> Nueva solicitud
        </button>
      </template>
      <template
        v-else-if="activeTab === 'Órdenes de Compra' && canCreatePurchaseOrders"
      >
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border border-border bg-background text-foreground hover:bg-muted transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="purchaseSuggestionsLoading"
            @click="openPurchaseSuggestions"
          >
            <Sparkles :size="16" />
            {{ purchaseSuggestionsLoading ? "Analizando..." : "Sugerir compras" }}
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            @click="openCreatePO"
          >
            <Plus :size="16" /> Nueva orden
          </button>
        </div>
      </template>
      <template
        v-else-if="activeTab === 'Recepciones' && canCreatePurchaseReceipts"
      >
        <button
          class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          @click="openCreateReceipt"
        >
          <Plus :size="16" /> Nueva recepción
        </button>
      </template>
      <template v-else-if="activeTab === 'Reclamos' && canCreateSupplierClaims">
        <button
          class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          @click="openCreateClaim"
        >
          <Plus :size="16" /> Nuevo reclamo
        </button>
      </template>
    </PageHeader>

    <div class="flex border-b border-border mb-6">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="[
          'px-4 py-2 text-sm font-semibold border-b-2 transition-colors',
          activeTab === tab
            ? 'text-primary border-primary'
            : 'text-muted-foreground hover:text-foreground border-transparent',
        ]"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- ── SOLICITUDES ── -->
    <template v-if="activeTab === 'Solicitudes'">
      <AppAlert
        v-if="srList.error.value"
        type="error"
        :message="srList.error.value"
      />
      <AppTable
        :columns="srColumns"
        :rows="srList.items.value"
        :loading="srList.loading.value"
      >
        <template #filter-status>
          <AppMultiSelect
            :options="SR_STATUS_OPTIONS"
            :model-value="srList.params.status || []"
            @update:model-value="srList.setParam('status', $event)"
          />
        </template>
        <template #branch="{ row }">{{
          row.branch_detail?.name ?? "—"
        }}</template>
        <template #period="{ row }"
          >{{ row.period_month }}/{{ row.period_year }}</template
        >
        <template #status="{ row }"
          ><StatusBadge :status="row.status"
        /></template>
        <template #requested_by="{ row }">{{
          row.requested_by_detail?.full_name ?? "—"
        }}</template>
        <template #actions="{ row }">
          <div class="flex justify-end">
            <button
              type="button"
              class="grid place-items-center w-9 h-9 border border-border rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Acciones"
              @click="openSRDetail(row)"
            >
              <MoreVertical :size="17" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="srList.pagination.count"
        :page="srList.pagination.page"
        :page-size="srList.pagination.pageSize"
        @change="srList.setPage"
      />
    </template>

    <!-- ── ÓRDENES DE COMPRA ── -->
    <template v-if="activeTab === 'Órdenes de Compra'">
      <AppAlert
        v-if="poList.error.value || poActionError"
        type="error"
        :message="poList.error.value || poActionError"
      />
      <AppTable
        :columns="poColumns"
        :rows="poList.items.value"
        :loading="poList.loading.value || poActionLoading"
      >
        <template #filter-order_number>
          <AppInput
            type="text"
            placeholder="Buscar..."
            :model-value="poList.params.search"
            class="w-full"
            @update:model-value="poList.setParam('search', $event)"
          />
        </template>
        <template #filter-status>
          <AppMultiSelect
            :options="PO_STATUS_OPTIONS"
            :model-value="poList.params.status || []"
            @update:model-value="poList.setParam('status', $event)"
          />
        </template>

        <template #supplier="{ row }">{{
          row.supplier_detail?.name ?? "—"
        }}</template>
        <template #branch="{ row }">{{
          row.branch_detail?.name ?? "—"
        }}</template>
        <template #status="{ row }"
          ><StatusBadge :status="row.status"
        /></template>
        <template #total_amount="{ row }">{{ fmt(row.total_amount) }}</template>
        <template #actions="{ row }">
          <div class="flex justify-end">
            <button
              type="button"
              class="grid place-items-center w-9 h-9 border border-border rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Acciones"
              @click="openPOActions(row)"
            >
              <MoreVertical :size="17" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="poList.pagination.count"
        :page="poList.pagination.page"
        :page-size="poList.pagination.pageSize"
        @change="poList.setPage"
      />
    </template>

    <!-- ══ MODAL: Sugerencias de compra ══ -->
    <AppModal
      v-if="showPurchaseSuggestionsModal"
      title="Sugerencias de compra"
      size="xl"
      @close="closePurchaseSuggestions"
    >
      <div class="grid gap-5">
        <div class="flex flex-col md:flex-row md:items-end gap-3">
          <FormField label="Sucursal" class="flex-1">
            <AppSelect v-model="purchaseSuggestionsBranch">
              <option value="">Todas las sucursales permitidas</option>
              <option
                v-for="branch in branches"
                :key="branch.uuid"
                :value="branch.uuid"
              >
                {{ branch.name }}
              </option>
            </AppSelect>
          </FormField>

          <button
            type="button"
            class="btn btn--primary"
            :disabled="purchaseSuggestionsLoading"
            @click="loadPurchaseSuggestions"
          >
            <Sparkles :size="15" />
            {{ purchaseSuggestionsLoading ? "Analizando..." : "Actualizar sugerencias" }}
          </button>
        </div>

        <AppAlert
          v-if="purchaseSuggestionsError"
          type="error"
          :message="purchaseSuggestionsError"
        />

        <div
          v-if="purchaseSuggestionsSummary"
          class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"
        >
          <div class="purchase-suggestion-kpi">
            <span class="purchase-suggestion-kpi__label">Productos a comprar</span>
            <strong>{{ purchaseSuggestionsSummary.products_to_buy ?? 0 }}</strong>
          </div>
          <div class="purchase-suggestion-kpi">
            <span class="purchase-suggestion-kpi__label">Críticos</span>
            <strong>{{ purchaseSuggestionsSummary.critical_products ?? 0 }}</strong>
          </div>
          <div class="purchase-suggestion-kpi">
            <span class="purchase-suggestion-kpi__label">Prioridad alta</span>
            <strong>{{ purchaseSuggestionsSummary.high_priority_products ?? 0 }}</strong>
          </div>
          <div class="purchase-suggestion-kpi">
            <span class="purchase-suggestion-kpi__label">Costo estimado</span>
            <strong>{{ fmtMoney(purchaseSuggestionsSummary.estimated_total ?? 0) }}</strong>
          </div>
        </div>

        <div
          v-if="purchaseSuggestionsLoading"
          class="py-10 text-center text-sm text-muted-foreground"
        >
          Analizando inventario, márgenes y precios de proveedores...
        </div>

        <div
          v-else-if="!purchaseSuggestions.length && !purchaseSuggestionsError"
          class="rounded-lg border border-border bg-muted/20 p-6 text-center"
        >
          <CheckCircle :size="28" class="mx-auto mb-2 text-muted-foreground" />
          <p class="font-semibold">No hay productos que requieran reposición.</p>
          <p class="text-sm text-muted-foreground mt-1">
            El stock disponible se encuentra dentro de los márgenes configurados.
          </p>
        </div>

        <div v-else class="grid gap-4">
          <article
            v-for="suggestion in purchaseSuggestions"
            :key="`${suggestion.branch_uuid}-${suggestion.product_uuid}`"
            class="purchase-suggestion-card"
          >
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-semibold text-base">{{ suggestion.product_name }}</h3>
                  <span
                    :class="[
                      'purchase-priority',
                      suggestion.priority === 'CRITICAL'
                        ? 'purchase-priority--critical'
                        : 'purchase-priority--high',
                    ]"
                  >
                    {{ purchasePriorityLabel(suggestion.priority) }}
                  </span>
                </div>

                <div class="text-sm text-muted-foreground mt-1">
                  {{ suggestion.branch_name }}
                  <span v-if="suggestion.product_internal_code">
                    · {{ suggestion.product_internal_code }}
                  </span>
                </div>
              </div>

              <div class="text-left lg:text-right">
                <div class="text-xs uppercase tracking-wide text-muted-foreground">
                  Compra sugerida
                </div>
                <div class="text-2xl font-bold text-primary">
                  {{ suggestion.suggested_quantity }}
                  <span class="text-sm font-medium text-muted-foreground">
                    {{ suggestion.unit || "un." }}
                  </span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
              <div class="purchase-stock-cell">
                <span>Disponible</span>
                <strong>{{ suggestion.stock?.available_quantity ?? 0 }}</strong>
              </div>
              <div class="purchase-stock-cell">
                <span>Crítico</span>
                <strong>{{ suggestion.stock?.critical_stock ?? 0 }}</strong>
              </div>
              <div class="purchase-stock-cell">
                <span>Mínimo</span>
                <strong>{{ suggestion.stock?.min_stock ?? 0 }}</strong>
              </div>
              <div class="purchase-stock-cell">
                <span>Máximo</span>
                <strong>{{ suggestion.stock?.max_stock ?? 0 }}</strong>
              </div>
              <div class="purchase-stock-cell">
                <span>Objetivo</span>
                <strong>{{ suggestion.stock?.target_stock ?? 0 }}</strong>
              </div>
            </div>

            <div class="mt-4 rounded-lg border border-border p-3">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div class="text-xs uppercase tracking-wide text-muted-foreground">
                    Proveedor recomendado
                  </div>
                  <template v-if="suggestion.recommended_supplier">
                    <div class="font-semibold mt-1">
                      {{ suggestion.recommended_supplier.supplier_name }}
                    </div>
                    <div class="text-sm text-muted-foreground">
                      {{ suggestion.recommended_supplier.unit_price != null
                        ? fmtMoney(suggestion.recommended_supplier.unit_price) + ' / unidad'
                        : 'Precio no informado' }}
                      <span
                        v-if="suggestion.recommended_supplier.delivery_days != null"
                      >
                        · {{ suggestion.recommended_supplier.delivery_days }} días de entrega
                      </span>
                    </div>
                  </template>
                  <div v-else class="text-sm text-muted-foreground mt-1">
                    No hay proveedor activo configurado para este producto.
                  </div>
                </div>

                <div v-if="suggestion.recommended_supplier" class="text-left lg:text-right">
                  <div class="text-xs uppercase tracking-wide text-muted-foreground">
                    Total estimado
                  </div>
                  <strong>
                    {{
                      suggestion.recommended_supplier.estimated_total != null
                        ? fmtMoney(suggestion.recommended_supplier.estimated_total)
                        : "—"
                    }}
                  </strong>
                </div>
              </div>

              <details
                v-if="suggestion.supplier_options?.length > 1"
                class="mt-3"
              >
                <summary class="cursor-pointer text-sm font-medium text-primary">
                  Ver otros proveedores ({{ suggestion.supplier_options.length - 1 }})
                </summary>

                <div class="overflow-x-auto mt-2">
                  <table class="mini-table">
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th>Precio</th>
                        <th>Total estimado</th>
                        <th>Entrega</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="option in suggestion.supplier_options.slice(1)"
                        :key="option.supplier_product_uuid"
                      >
                        <td>{{ option.supplier_name }}</td>
                        <td>{{ option.unit_price != null ? fmtMoney(option.unit_price) : "—" }}</td>
                        <td>{{ option.estimated_total != null ? fmtMoney(option.estimated_total) : "—" }}</td>
                        <td>{{ option.delivery_days != null ? `${option.delivery_days} días` : "—" }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>

            <div class="mt-3 text-xs text-muted-foreground">
              Calificación del producto:
              <strong>{{ suggestion.quality_rating ?? "—" }}</strong>
            </div>
          </article>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn--ghost"
            @click="closePurchaseSuggestions"
          >
            Cerrar
          </button>
        </div>
      </div>
    </AppModal>

    <!-- ══ MODAL: Acciones Orden de Compra ══ -->
    <AppModal
      v-if="showPOActionModal && activePORow"
      :title="`Acciones - OC ${activePORow.order_number}`"
      size="sm"
      @close="closePOActions"
    >
      <div class="grid gap-2">
        <!-- Ver detalle -->
        <button
          v-if="canViewPurchaseOrders"
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="viewPOFromActions"
        >
          <Eye :size="16" />
          Ver detalle e ítems
        </button>

        <!-- Editar -->
        <button
          v-if="canEditPurchaseOrders"
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="editPOFromActions"
        >
          <Pencil :size="16" />
          Editar orden
        </button>

        <!-- Enviar a aprobación -->
        <button
          v-if="
            canEditPurchaseOrders &&
            activePORow.status === 'BORRADOR'
          "
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="
            poAction('sendToApproval', activePORow);
            closePOActions();
          "
        >
          <Send :size="16" />
          Enviar a aprobación
        </button>

        <!-- Aprobar -->
        <button
          v-if="
            canEditPurchaseOrders &&
            activePORow.status === 'EN_APROBACION'
          "
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="
            poAction('approve', activePORow);
            closePOActions();
          "
        >
          <CheckCircle :size="16" />
          Aprobar orden
        </button>

        <!-- Enviar al proveedor -->
        <button
          v-if="
            canEditPurchaseOrders &&
            activePORow.status === 'APROBADA'
          "
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="
            poAction('send', activePORow);
            closePOActions();
          "
        >
          <Truck :size="16" />
          Enviar a proveedor
        </button>

        <!-- Cerrar -->
        <button
          v-if="
            canEditPurchaseOrders &&
            activePORow.status === 'RECIBIDA'
          "
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="
            poAction('close', activePORow);
            closePOActions();
          "
        >
          <CheckCircle :size="16" />
          Cerrar orden
        </button>

        <!-- Cancelar -->
        <button
          v-if="
            canEditPurchaseOrders &&
            !['CANCELADA', 'CERRADA', 'RECIBIDA'].includes(
              activePORow.status
            )
          "
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-destructive/10 text-sm font-medium text-destructive"
          @click="
            poAction('cancel', activePORow);
            closePOActions();
          "
        >
          <XCircle :size="16" />
          Cancelar orden
        </button>

        <!-- Eliminar -->
        <button
          v-if="canDeletePurchaseOrders"
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-destructive/10 text-sm font-medium text-destructive"
          @click="
            deletePO = activePORow;
            closePOActions();
          "
        >
          <XCircle :size="16" />
          Eliminar orden
        </button>
      </div>
    </AppModal>

    <!-- ── RECEPCIONES ── -->
    <template v-if="activeTab === 'Recepciones'">
      <AppAlert
        v-if="receiptList.error.value || receiptActionError"
        type="error"
        :message="receiptList.error.value || receiptActionError"
      />
      <AppTable
        :columns="receiptColumns"
        :rows="receiptList.items.value"
        :loading="receiptList.loading.value"
      >
        <template #filter-purchase_order>
          <AppInput
            type="text"
            placeholder="Buscar..."
            :model-value="receiptList.params.search"
            @update:model-value="receiptList.setParam('search', $event)"
          />
        </template>

        <template #purchase_order="{ row }">{{
          row.purchase_order_detail?.order_number ?? "—"
        }}</template>
        <template #branch="{ row }">{{
          row.branch_detail?.name ?? "—"
        }}</template>
        <template #warehouse="{ row }">{{
          row.warehouse_detail?.name ?? "—"
        }}</template>
        <template #status="{ row }"
          ><StatusBadge :status="row.status"
        /></template>
        <template #received_at="{ row }">{{
          fmtDate(row.received_at)
        }}</template>
        <template #actions="{ row }">
          <div class="flex justify-end">
            <button
              type="button"
              class="grid place-items-center w-9 h-9 border border-border rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Acciones"
              @click="openReceiptActions(row)"
            >
              <MoreVertical :size="17" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="receiptList.pagination.count"
        :page="receiptList.pagination.page"
        :page-size="receiptList.pagination.pageSize"
        @change="receiptList.setPage"
      />
    </template>

    <!-- ══ MODAL: Acciones Recepción ══ -->
    <AppModal
      v-if="showReceiptActionModal && activeReceiptRow"
      :title="`Acciones - Recepción ${activeReceiptRow.purchase_order_detail?.order_number ?? ''}`"
      size="sm"
      @close="closeReceiptActions"
    >
      <div class="grid gap-2">
        <!-- Ver -->
        <button
          v-if="canViewPurchaseReceipts"
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="viewReceiptFromActions"
        >
          <Eye :size="16" />
          Ver detalle y productos
        </button>

        <!-- Editar -->
        <button
          v-if="canEditPurchaseReceipts"
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="editReceiptFromActions"
        >
          <Pencil :size="16" />
          Editar recepción
        </button>

        <!-- Procesar -->
        <button
          v-if="
            canProcessPurchaseReceipts &&
            activeReceiptRow.status !== 'PROCESADO'
          "
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="
            processReceipt(activeReceiptRow);
            closeReceiptActions();
          "
        >
          <Truck :size="16" />
          Procesar recepción
        </button>

        <!-- Eliminar -->
        <button
          v-if="canDeletePurchaseReceipts"
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-destructive/10 text-sm font-medium text-destructive"
          @click="
            deleteReceipt = activeReceiptRow;
            closeReceiptActions();
          "
        >
          <XCircle :size="16" />
          Eliminar recepción
        </button>
      </div>
    </AppModal>

    <!-- ── RECLAMOS ── -->
    <template v-if="activeTab === 'Reclamos'">
      <AppAlert
        v-if="claimList.error.value || claimActionError"
        type="error"
        :message="claimList.error.value || claimActionError"
      />
      <AppTable
        :columns="claimColumns"
        :rows="claimList.items.value"
        :loading="claimList.loading.value"
      >
        <template #filter-status>
          <AppMultiSelect
            :options="CLAIM_STATUS_OPTIONS"
            :model-value="claimList.params.status || []"
            @update:model-value="claimList.setParam('status', $event)"
          />
        </template>
        <template #filter-claim_type>
          <AppMultiSelect
            :options="CLAIM_TYPES"
            :model-value="claimList.params.claim_type || []"
            @update:model-value="claimList.setParam('claim_type', $event)"
          />
        </template>

        <template #supplier="{ row }">{{
          row.supplier_detail?.name ?? "—"
        }}</template>
        <template #claim_type="{ row }">{{
          claimTypeLabel(row.claim_type)
        }}</template>
        <template #status="{ row }"
          ><StatusBadge :status="row.status"
        /></template>
        <template #description="{ row }">
          <span class="truncate max-w-[260px] block">
            {{ row.description ?? "—" }}
          </span>
        </template>
        <template #created_at="{ row }">{{ fmtDate(row.created_at) }}</template>
        <template #actions="{ row }">
          <div class="flex justify-end">
            <button
              type="button"
              class="grid place-items-center w-9 h-9 border border-border rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Acciones"
              @click="openClaimActions(row)"
            >
              <MoreVertical :size="17" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="claimList.pagination.count"
        :page="claimList.pagination.page"
        :page-size="claimList.pagination.pageSize"
        @change="claimList.setPage"
      />
    </template>

    <!-- ══ MODAL: Acciones Reclamo ══ -->
    <AppModal
      v-if="showClaimActionModal && activeClaimRow"
      title="Acciones - Reclamo"
      size="sm"
      @close="closeClaimActions"
    >
      <div class="grid gap-2">
        <button
          v-if="canViewSupplierClaims"
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="viewClaimFromActions"
        >
          <Eye :size="16" />
          Ver detalle
        </button>

        <button
          v-if="canEditSupplierClaims"
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="editClaimFromActions"
        >
          <Pencil :size="16" />
          Editar reclamo
        </button>

        <button
          v-if="canDeleteSupplierClaims"
          type="button"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-destructive/10 text-sm font-medium text-destructive"
          @click="
            deleteClaim = activeClaimRow;
            closeClaimActions();
          "
        >
          <XCircle :size="16" />
          Eliminar reclamo
        </button>
      </div>
    </AppModal>

    <!-- ══ MODAL: Nueva solicitud ══ -->
    <AppModal
      v-if="showSRCreateModal"
      title="Nueva solicitud de insumos"
      size="md"
      @close="showSRCreateModal = false"
    >
      <form class="form-grid" @submit.prevent="handleSRCreate">
        <AppAlert v-if="srError" type="error" :message="srError" />
        <FormField label="Sucursal" required>
          <AppSelect v-model="srForm.branch" required>
            <option value="">Seleccionar sucursal</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">
              {{ b.name }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Año">
          <AppInput
            v-model.number="srForm.period_year"
            type="number"
            min="2020"
            max="2099"
            required
          />
        </FormField>
        <FormField label="Mes">
          <AppSelect v-model.number="srForm.period_month" required>
            <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
          </AppSelect>
        </FormField>
        <FormField label="Comentarios" class="full-width">
          <AppTextarea v-model="srForm.comments" rows="2" />
        </FormField>
        <div class="form-actions full-width">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showSRCreateModal = false"
          >
            Cancelar
          </button>
          <button type="submit" class="btn btn--primary" :disabled="srLoading">
            {{ srLoading ? "Creando..." : "Crear solicitud" }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Detalle / gestión de solicitud ══ -->
    <AppModal
      v-if="showSRModal && viewingSR"
      :title="`Solicitud — ${viewingSR.period_month}/${viewingSR.period_year}`"
      size="xl"
      @close="showSRModal = false"
    >
      <div class="sr-detail">
        <div class="sr-meta">
          <span
            ><strong>Sucursal:</strong>
            {{ viewingSR.branch_detail?.name ?? "—" }}</span
          >
          <span
            ><strong>Estado:</strong> <StatusBadge :status="viewingSR.status"
          /></span>
          <span
            ><strong>Solicitado por:</strong>
            {{ viewingSR.requested_by_detail?.full_name ?? "—" }}</span
          >
        </div>

        <AppAlert v-if="srActionError" type="error" :message="srActionError" />

        <!-- Presupuesto del centro de costo -->
        <div
          v-if="srBudget"
          class="sr-budget"
          :class="
            srBudget.found && !srBudget.within_budget ? 'sr-budget--over' : ''
          "
        >
          <template v-if="srBudget.found">
            <div class="sr-budget__row">
              <span
                ><strong>Disponible:</strong>
                {{ fmtMoney(srBudget.available_amount) }}</span
              >
              <span
                ><strong>Estimado:</strong>
                {{ fmtMoney(srBudget.estimated_amount) }}</span
              >
              <span v-if="!srBudget.within_budget" class="sr-budget__warn"
                >Excede por {{ fmtMoney(srBudget.shortfall_amount) }}</span
              >
            </div>
            <p v-if="srBudget.estimate_is_partial" class="sr-budget__note">
              Estimación parcial: hay precio de referencia para
              {{ srBudget.priced_items }} de {{ srBudget.total_items }} ítems.
            </p>
          </template>
          <p v-else class="sr-budget__note">
            Sin presupuesto definido para esta sucursal y centro de costo.
          </p>
        </div>

        <!-- Ítems -->
        <h4 class="section-subtitle">Ítems solicitados</h4>
        <table v-if="srItems.length" class="mini-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Justificación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in srItems" :key="item.uuid">
              <td>{{ item.product_detail?.name ?? item.product }}</td>
              <td>{{ item.requested_quantity }}</td>
              <td>{{ item.justification ?? "—" }}</td>
              <td>
                <button
                  v-if="canEditSupplyRequest && viewingSR.status === 'BORRADOR'"
                  class="icon-btn"
                  title="Eliminar"
                  @click="removeSRItem(item.uuid)"
                >
                  <XCircle :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-note">Sin ítems todavía.</p>

        <!-- Agregar ítem (solo borrador) -->
        <template
          v-if="canEditSupplyRequest && viewingSR.status === 'BORRADOR'"
        >
          <h4 class="section-subtitle">Agregar ítem</h4>
          <AppAlert v-if="srItemError" type="error" :message="srItemError" />
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div class="p-3 rounded-lg border border-border bg-muted/20">
              <div class="text-xs text-muted-foreground uppercase tracking-wide">
                Sucursal
              </div>
              <div class="mt-1 font-medium">
                {{ viewingSR.branch_detail?.name || "—" }}
              </div>
            </div>

            <div class="p-3 rounded-lg border border-border bg-muted/20">
              <div class="text-xs text-muted-foreground uppercase tracking-wide">
                Estado
              </div>
              <div class="mt-1">
                <span class="status-pill">
                  {{ viewingSR.status_label || viewingSR.status || "—" }}
                </span>
              </div>
            </div>

            <div class="p-3 rounded-lg border border-border bg-muted/20">
              <div class="text-xs text-muted-foreground uppercase tracking-wide">
                Solicitado por
              </div>
              <div class="mt-1 font-medium">
                {{ viewingSR.requested_by_name || "—" }}
              </div>
            </div>

            <div class="p-3 rounded-lg border border-border bg-muted/20">
              <div class="text-xs text-muted-foreground uppercase tracking-wide">
                Presupuesto
              </div>
              <div class="mt-1 font-medium">
                {{ viewingSR.budget_message || "Sin presupuesto definido para esta sucursal y centro de costo." }}
              </div>
            </div>
          </div>
        </template>

        <!-- Acciones de estado -->
        <div class="form-actions" style="margin-top: 16px">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showSRModal = false"
          >
            Cerrar
          </button>
          <button
            v-if="canCreateSupplyRequest && viewingSR.status === 'BORRADOR'"
            type="button"
            class="btn btn--primary"
            :disabled="srActionLoading"
            @click="srAction('submit')"
          >
            <Send :size="14" /> Enviar solicitud
          </button>
          <button
            v-if="canApproveSupplyRequest && viewingSR.status === 'ENVIADA'"
            type="button"
            class="btn btn--primary"
            :disabled="srActionLoading"
            @click="srAction('approve')"
          >
            <CheckCircle :size="14" /> Aprobar
          </button>
          <button
            v-if="
              canApproveSupplyRequest &&
              ['ENVIADA', 'EN_REVISION'].includes(viewingSR.status)
            "
            type="button"
            class="btn btn--danger"
            :disabled="srActionLoading"
            @click="srAction('reject')"
          >
            <XCircle :size="14" /> Rechazar
          </button>
          <button
            v-if="
              canApproveSupplyRequest &&
              ['ENVIADA', 'EN_REVISION'].includes(viewingSR.status)
            "
            type="button"
            class="btn btn--ghost"
            :disabled="srActionLoading"
            @click="srAction('observe')"
          >
            <AlertTriangle :size="14" /> Observar
          </button>
          <button
            v-if="canCreatePurchaseOrders && viewingSR.status === 'APROBADA'"
            type="button"
            class="btn btn--primary"
            :disabled="srActionLoading"
            @click="openConvertModal"
          >
            <Send :size="14" /> Convertir a OC
          </button>
        </div>
      </div>
    </AppModal>

    <!-- ══ MODAL: Crear / editar orden de compra ══ -->
    <AppModal
      v-if="showPOModal"
      :title="editingPO ? 'Editar orden de compra' : 'Nueva orden de compra'"
      size="lg"
      @close="showPOModal = false"
    >
      <form class="form-grid" @submit.prevent="handlePOSubmit">
        <AppAlert
          v-if="poError || poActionError"
          type="error"
          :message="poError || poActionError"
        />
        <FormField label="N° Orden" required>
          <AppInput v-model="poForm.order_number" type="text" required />
        </FormField>
        <FormField label="Proveedor">
          <AppSelect v-model="poForm.supplier">
            <option value="">Sin proveedor</option>
            <option v-for="s in suppliers" :key="s.uuid" :value="s.uuid">
              {{ s.name }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Sucursal">
          <AppSelect v-model="poForm.branch">
            <option value="">Sin sucursal</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">
              {{ b.name }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Tipo de compra">
          <AppSelect v-model="poForm.purchase_type">
            <option value="ORDEN_COMPRA">Orden de compra</option>
            <option value="COMPRA_WEB">Compra web</option>
            <option value="COMPRA_CORREO">Compra por correo</option>
            <option value="COMPRA_MENOR">Compra menor</option>
            <option value="COMPRA_URGENTE">Compra urgente</option>
            <option value="COMPRA_GERENCIA">Compra gerencia</option>
          </AppSelect>
        </FormField>
        <FormField label="Fecha entrega esperada">
          <AppInput v-model="poForm.expected_delivery_date" type="date" />
        </FormField>
        <FormField label="Notas" class="full-width">
          <AppTextarea v-model="poForm.notes" rows="2" />
        </FormField>
        <div class="form-actions full-width">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showPOModal = false"
          >
            Cancelar
          </button>
          <button type="submit" class="btn btn--primary" :disabled="poLoading">
            {{ poLoading ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Nueva recepción ══ -->
    <AppModal
      v-if="showReceiptModal"
      :title="
        editingReceipt
          ? 'Editar recepción de compra'
          : 'Nueva recepción de compra'
      "
      size="lg"
      @close="showReceiptModal = false"
    >
      <form class="form-grid" @submit.prevent="handleReceiptCreate">
        <AppAlert
          v-if="receiptCreateError"
          type="error"
          :message="receiptCreateError"
        />
        <FormField label="Orden de compra">
          <AppSelect v-model="receiptForm.purchase_order">
            <option value="">Sin orden asociada</option>
            <option
              v-for="po in purchaseOrders"
              :key="po.uuid"
              :value="po.uuid"
            >
              {{ po.order_number }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Sucursal" required>
          <AppSelect v-model="receiptForm.branch" required>
            <option value="">Seleccionar sucursal</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">
              {{ b.name }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Bodega">
          <AppSelect v-model="receiptForm.warehouse">
            <option value="">Sin bodega</option>
            <option v-for="w in warehouses" :key="w.uuid" :value="w.uuid">
              {{ w.name }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Estado">
          <AppSelect v-model="receiptForm.status">
            <option value="RECIBIDO_OK">Recibido OK</option>
            <option value="RECIBIDO_PARCIAL">Recibido parcial</option>
            <option value="CON_INCIDENCIA">Con incidencia</option>
            <option value="RECHAZADO">Rechazado</option>
          </AppSelect>
        </FormField>
        <FormField label="Fecha de recepción">
          <AppInput v-model="receiptForm.received_at" type="datetime-local" />
        </FormField>
        <FormField label="Comentarios" class="full-width">
          <AppTextarea v-model="receiptForm.comments" rows="2" />
        </FormField>
        <div class="form-actions full-width">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showReceiptModal = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn btn--primary"
            :disabled="receiptLoading"
          >
            {{
              receiptLoading
                ? "Guardando..."
                : editingReceipt
                  ? "Guardar cambios"
                  : "Crear recepción"
            }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Convertir solicitud a OC ══ -->
    <AppModal
      v-if="showConvertModal && viewingSR"
      :title="`Convertir solicitud a Orden de Compra`"
      size="md"
      @close="showConvertModal = false"
    >
      <form class="form-grid" @submit.prevent="handleConvert">
        <AppAlert v-if="convertError" type="error" :message="convertError" />
        <p
          style="
            font-size: 0.875rem;
            color: var(--color-muted);
            margin: 0 0 8px;
          "
          class="full-width"
        >
          Se creará una OC a partir de los ítems aprobados de la solicitud
          <strong
            >{{ viewingSR.period_month }}/{{ viewingSR.period_year }}</strong
          >.
        </p>
        <FormField label="Proveedor" required>
          <AppSelect v-model="convertForm.supplier" required>
            <option value="">Seleccionar proveedor</option>
            <option v-for="s in suppliers" :key="s.uuid" :value="s.uuid">
              {{ s.name }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Tasa IVA (%)">
          <AppInput
            v-model.number="convertForm.tax_rate"
            type="number"
            min="0"
            max="100"
            step="1"
          />
        </FormField>
        <FormField label="Fecha entrega esperada">
          <AppInput v-model="convertForm.expected_delivery_date" type="date" />
        </FormField>
        <FormField label="Notas" class="full-width">
          <AppTextarea v-model="convertForm.notes" rows="2" />
        </FormField>
        <div class="form-actions full-width">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showConvertModal = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn btn--primary"
            :disabled="convertLoading"
          >
            {{ convertLoading ? "Convirtiendo..." : "Crear orden de compra" }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Detalle OC con ítems ══ -->
    <AppModal
      v-if="showPODetailModal && viewingPO"
      :title="`OC — ${viewingPO.order_number}`"
      size="xl"
      @close="showPODetailModal = false"
    >
      <div class="sr-detail">
        <div class="sr-meta">
          <span
            ><strong>Proveedor:</strong>
            {{ viewingPO.supplier_detail?.name ?? "—" }}</span
          >
          <span
            ><strong>Sucursal:</strong>
            {{ viewingPO.branch_detail?.name ?? "—" }}</span
          >
          <span
            ><strong>Estado:</strong> <StatusBadge :status="viewingPO.status"
          /></span>
          <span><strong>Total:</strong> {{ fmt(viewingPO.total_amount) }}</span>
        </div>

        <AppAlert v-if="poItemError" type="error" :message="poItemError" />

        <!-- Tabla de ítems -->
        <h4 class="section-subtitle">Ítems de la orden</h4>
        <table v-if="poItems.length" class="mini-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio unit.</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in poItems" :key="item.uuid">
              <td>{{ item.product_detail?.name ?? item.product }}</td>
              <td>{{ item.quantity }}</td>
              <td>{{ fmt(item.unit_price) }}</td>
              <td>{{ fmt(item.total_amount) }}</td>
              <td>
                <button
                  v-if="
                    canEditPurchaseOrders && viewingPO.status === 'BORRADOR'
                  "
                  class="icon-btn"
                  title="Eliminar ítem"
                  @click="removePOItem(item.uuid)"
                >
                  <XCircle :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-note">Sin ítems todavía.</p>

        <!-- Agregar ítem (solo cuando está en borrador) -->
        <template
          v-if="canEditPurchaseOrders && viewingPO.status === 'BORRADOR'"
        >
          <h4 class="section-subtitle">Agregar producto a la orden</h4>

          <AppAlert
            v-if="poItemError"
            type="error"
            :message="poItemError"
          />

          <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <!-- Producto -->
            <FormField
              label="Producto"
              required
              class="md:col-span-6"
            >
              <AppSelect v-model="poItemForm.product">
                <option value="">Seleccionar producto</option>

                <option
                  v-for="p in products"
                  :key="p.uuid"
                  :value="p.uuid"
                >
                  {{ p.name }}
                </option>
              </AppSelect>
            </FormField>

            <!-- Cantidad -->
            <FormField
              label="Cantidad"
              required
              class="md:col-span-2"
            >
              <AppInput
                v-model.number="poItemForm.quantity"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="Ej: 1"
              />
            </FormField>

            <!-- Precio unitario -->
            <FormField
              label="Precio unitario"
              required
              class="md:col-span-2"
            >
              <AppInput
                v-model.number="poItemForm.unit_price"
                type="number"
                min="0"
                step="1"
                placeholder="$ 0"
              />
            </FormField>

            <!-- Botón -->
            <div class="md:col-span-2">
              <button
                type="button"
                class="w-full btn btn--primary"
                :disabled="
                  poItemLoading ||
                  !poItemForm.product ||
                  !poItemForm.quantity
                "
                @click="addPOItem"
              >
                {{ poItemLoading ? "Agregando..." : "Agregar" }}
              </button>
            </div>
          </div>

          <!-- Resumen -->
          <div
            v-if="poItemForm.quantity"
            class="mt-3 p-3 rounded-lg bg-muted/40 text-sm"
          >
            <div class="flex justify-between gap-4">
              <span class="text-muted-foreground">
                Cantidad:
              </span>

              <strong>
                {{ poItemForm.quantity }}
              </strong>
            </div>

            <div class="flex justify-between gap-4 mt-1">
              <span class="text-muted-foreground">
                Precio unitario:
              </span>

              <strong>
                {{ fmt(poItemForm.unit_price || 0) }}
              </strong>
            </div>

            <div
              class="flex justify-between gap-4 mt-2 pt-2 border-t border-border"
            >
              <span class="font-semibold">
                Subtotal:
              </span>

              <strong class="text-primary">
                {{
                  fmt(
                    Number(poItemForm.quantity || 0) *
                      Number(poItemForm.unit_price || 0),
                  )
                }}
              </strong>
            </div>
          </div>
        </template>

        <div class="form-actions" style="margin-top: 16px">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showPODetailModal = false"
          >
            Cerrar
          </button>
        </div>
      </div>
    </AppModal>

    <!-- ══ MODAL: Detalle recepción con ítems ══ -->
    <AppModal
      v-if="showReceiptDetailModal && viewingReceipt"
      :title="`Recepción — ${viewingReceipt.purchase_order_detail?.order_number ?? viewingReceipt.uuid}`"
      size="xl"
      @close="showReceiptDetailModal = false"
    >
      <div class="sr-detail">
        <div class="sr-meta">
          <span
            ><strong>Sucursal:</strong>
            {{ viewingReceipt.branch_detail?.name ?? "—" }}</span
          >
          <span
            ><strong>Bodega:</strong>
            {{ viewingReceipt.warehouse_detail?.name ?? "—" }}</span
          >
          <span
            ><strong>Estado:</strong>
            <StatusBadge :status="viewingReceipt.status"
          /></span>
          <span
            ><strong>Recibido:</strong>
            {{ fmtDate(viewingReceipt.received_at) }}</span
          >
        </div>

        <AppAlert
          v-if="receiptItemError"
          type="error"
          :message="receiptItemError"
        />

        <h4 class="section-subtitle">Productos recibidos</h4>
        <table v-if="receiptItems.length" class="mini-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Recibido</th>
              <th>Aceptado</th>
              <th>Rechazado</th>
              <th>Lote</th>
              <th>Vencimiento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in receiptItems" :key="item.uuid">
              <td>{{ item.product_detail?.name ?? item.product }}</td>
              <td>{{ item.received_quantity }}</td>
              <td>{{ item.accepted_quantity }}</td>
              <td>{{ item.rejected_quantity }}</td>
              <td>{{ item.lot_number ?? "—" }}</td>
              <td>
                {{ item.expiration_date ? fmtDate(item.expiration_date) : "—" }}
              </td>
              <td>
                <button
                  v-if="
                    canEditPurchaseReceipts &&
                    viewingReceipt.status !== 'PROCESADO'
                  "
                  class="icon-btn"
                  title="Eliminar"
                  @click="removeReceiptItem(item.uuid)"
                >
                  <XCircle :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-note">Sin productos registrados todavía.</p>

        <!-- Agregar producto (solo si no está procesado) -->
        <template
          v-if="
            canEditPurchaseReceipts && viewingReceipt.status !== 'PROCESADO'
          "
        >
          <h4 class="section-subtitle">
            Agregar producto recibido
          </h4>

          <div class="p-4 rounded-xl border border-border bg-muted/20">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
              <FormField
                label="Producto"
                required
                class="md:col-span-6"
              >
                <AppSelect v-model="receiptItemForm.product">
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
                label="Cantidad recibida"
                required
                class="md:col-span-2"
              >
                <AppInput
                  v-model.number="receiptItemForm.received_quantity"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Ej: 10"
                />
              </FormField>

              <FormField
                label="Cantidad aceptada"
                required
                class="md:col-span-2"
              >
                <AppInput
                  v-model.number="receiptItemForm.accepted_quantity"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Ej: 10"
                />
              </FormField>

              <FormField
                label="Cantidad rechazada"
                class="md:col-span-2"
              >
                <AppInput
                  v-model.number="receiptItemForm.rejected_quantity"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0"
                />
              </FormField>

              <FormField
                label="Número de lote"
                :required="selectedReceiptProduct?.requires_lot"
                class="md:col-span-6"
              >
                <AppInput
                  v-model="receiptItemForm.lot_number"
                  type="text"
                  :placeholder="
                    selectedReceiptProduct?.requires_lot
                      ? 'Obligatorio para este producto'
                      : 'Ej: LOT-2026-001'
                  "
                  :required="selectedReceiptProduct?.requires_lot"
                />

                <p
                  v-if="selectedReceiptProduct?.requires_lot"
                  class="mt-1 text-xs text-muted-foreground"
                >
                  Este producto requiere número de lote.
                </p>
              </FormField>

              <FormField
                label="Fecha de vencimiento"
                :required="selectedReceiptProduct?.requires_expiration_date"
                class="md:col-span-4"
              >
                <AppInput
                  v-model="receiptItemForm.expiration_date"
                  type="date"
                  :required="selectedReceiptProduct?.requires_expiration_date"
                />

                <p
                  v-if="selectedReceiptProduct?.requires_expiration_date"
                  class="mt-1 text-xs text-muted-foreground"
                >
                  Este producto requiere fecha de vencimiento.
                </p>
              </FormField>

              <div class="md:col-span-2 flex items-end">
                <button
                  type="button"
                  class="btn btn--primary w-full"
                  :disabled="
                    receiptItemLoading ||
                    !receiptItemForm.product ||
                    !receiptItemForm.received_quantity ||
                    (
                      selectedReceiptProduct?.requires_lot &&
                      !receiptItemForm.lot_number
                    ) ||
                    (
                      selectedReceiptProduct?.requires_expiration_date &&
                      !receiptItemForm.expiration_date
                    )
                  "
                  @click="addReceiptItem"
                >
                  {{
                    receiptItemLoading
                      ? "Agregando..."
                      : "Agregar producto"
                  }}
                </button>
              </div>
            </div>

            <div
              v-if="receiptItemForm.received_quantity"
              class="mt-4 pt-4 border-t border-border"
            >
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="p-3 rounded-lg bg-background border border-border">
                  <div class="text-xs text-muted-foreground">
                    Recibido
                  </div>

                  <div class="text-lg font-semibold mt-1">
                    {{ receiptItemForm.received_quantity || 0 }}
                  </div>
                </div>

                <div class="p-3 rounded-lg bg-background border border-border">
                  <div class="text-xs text-muted-foreground">
                    Aceptado
                  </div>

                  <div class="text-lg font-semibold mt-1">
                    {{ receiptItemForm.accepted_quantity || 0 }}
                  </div>
                </div>

                <div class="p-3 rounded-lg bg-background border border-border">
                  <div class="text-xs text-muted-foreground">
                    Rechazado
                  </div>

                  <div class="text-lg font-semibold mt-1">
                    {{ receiptItemForm.rejected_quantity || 0 }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div class="form-actions" style="margin-top: 16px">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showReceiptDetailModal = false"
          >
            Cerrar
          </button>
          <button
            v-if="
              canProcessPurchaseReceipts &&
              viewingReceipt.status !== 'PROCESADO'
            "
            type="button"
            class="btn btn--primary"
            @click="
              processReceipt(viewingReceipt);
              showReceiptDetailModal = false;
            "
          >
            <Truck :size="14" /> Procesar recepción
          </button>
        </div>
      </div>
    </AppModal>

    <!-- ══ MODAL: Nuevo / editar reclamo ══ -->
    <AppModal
      v-if="showClaimModal"
      :title="editingClaim ? 'Editar reclamo' : 'Nuevo reclamo a proveedor'"
      size="lg"
      @close="showClaimModal = false"
    >
      <form class="form-grid" @submit.prevent="handleClaimSubmit">
        <AppAlert v-if="claimError" type="error" :message="claimError" />
        <FormField label="Proveedor" required>
          <AppSelect v-model="claimForm.supplier" required>
            <option value="">Seleccionar proveedor</option>
            <option v-for="s in suppliers" :key="s.uuid" :value="s.uuid">
              {{ s.name }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Tipo de reclamo" required>
          <AppSelect v-model="claimForm.claim_type" required>
            <option v-for="t in CLAIM_TYPES" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Descripción" class="full-width">
          <AppTextarea
            v-model="claimForm.description"
            rows="3"
            placeholder="Describe el problema..."
          />
        </FormField>
        <FormField label="Solución solicitada" class="full-width">
          <AppTextarea v-model="claimForm.requested_solution" rows="2" />
        </FormField>
        <FormField label="N° Nota de crédito">
          <AppInput v-model="claimForm.credit_note_number" type="text" />
        </FormField>
        <div class="form-actions full-width">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showClaimModal = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn btn--primary"
            :disabled="claimLoading"
          >
            {{ claimLoading ? "Guardando..." : "Guardar reclamo" }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Detalle de reclamo ══ -->
    <AppModal
      v-if="showClaimDetail && viewingClaim"
      :title="`Reclamo — ${claimTypeLabel(viewingClaim.claim_type)}`"
      size="lg"
      @close="showClaimDetail = false"
    >
      <div class="sr-detail">
        <div class="sr-meta">
          <span
            ><strong>Proveedor:</strong>
            {{ viewingClaim.supplier_detail?.name ?? "—" }}</span
          >
          <span
            ><strong>Estado:</strong>
            <StatusBadge :status="viewingClaim.status"
          /></span>
          <span
            ><strong>Fecha:</strong>
            {{ fmtDate(viewingClaim.created_at) }}</span
          >
        </div>

        <AppAlert
          v-if="claimActionError"
          type="error"
          :message="claimActionError"
        />

        <template v-if="viewingClaim.description">
          <h4 class="section-subtitle">Descripción</h4>
          <p style="font-size: 0.9rem">{{ viewingClaim.description }}</p>
        </template>

        <template v-if="viewingClaim.requested_solution">
          <h4 class="section-subtitle">Solución solicitada</h4>
          <p style="font-size: 0.9rem">{{ viewingClaim.requested_solution }}</p>
        </template>

        <template v-if="viewingClaim.resolution">
          <h4 class="section-subtitle">Resolución</h4>
          <p style="font-size: 0.9rem">{{ viewingClaim.resolution }}</p>
        </template>

        <template v-if="viewingClaim.credit_note_number">
          <h4 class="section-subtitle">N° Nota de crédito</h4>
          <p style="font-size: 0.9rem">{{ viewingClaim.credit_note_number }}</p>
        </template>

        <div class="form-actions" style="margin-top: 16px">
          <button
            type="button"
            class="btn btn--ghost"
            @click="showClaimDetail = false"
          >
            Cerrar
          </button>
          <button
            v-if="canEditSupplierClaims && viewingClaim.status === 'ABIERTO'"
            type="button"
            class="btn btn--primary"
            @click="updateClaimStatus('EN_GESTION')"
          >
            <AlertTriangle :size="14" /> Iniciar gestión
          </button>
          <button
            v-if="
              canEditSupplierClaims &&
              ['ABIERTO', 'EN_GESTION'].includes(viewingClaim.status)
            "
            type="button"
            class="btn btn--primary"
            @click="updateClaimStatus('RESUELTO')"
          >
            <CheckCircle :size="14" /> Marcar resuelto
          </button>

          <button
            v-if="
              canEditSupplierClaims &&
              ['ABIERTO', 'EN_GESTION'].includes(viewingClaim.status)
            "
            type="button"
            class="btn btn--danger"
            @click="updateClaimStatus('CANCELADO')"
          >
            <XCircle :size="14" /> Cancelar
          </button>
        </div>
      </div>
    </AppModal>

    <ConfirmDialog
      v-if="deletePO"
      title="Eliminar orden de compra"
      message="¿Seguro que deseas eliminar esta orden de compra?"
      confirm-text="Eliminar"
      :loading="deletePOLoading"
      @confirm="confirmDeletePO"
      @cancel="deletePO = null"
    />

    <ConfirmDialog
      v-if="deleteReceipt"
      title="Eliminar recepción"
      message="¿Seguro que deseas eliminar esta recepción?"
      confirm-text="Eliminar"
      :loading="deleteReceiptLoading"
      @confirm="confirmDeleteReceipt"
      @cancel="deleteReceipt = null"
    />

    <ConfirmDialog
      v-if="deleteClaim"
      title="Eliminar reclamo"
      message="¿Seguro que deseas eliminar este reclamo?"
      confirm-text="Eliminar"
      :loading="deleteClaimLoading"
      @confirm="confirmDeleteClaim"
      @cancel="deleteClaim = null"
    />
  </section>
</template>

<style scoped>
.sr-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sr-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  font-size: 0.9rem;
  align-items: center;
}
.sr-budget {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.9rem;
}
.sr-budget--over {
  border-color: rgb(217 119 6);
  background: rgb(254 243 199 / 0.5);
}
.sr-budget__row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: center;
}
.sr-budget__warn {
  font-weight: 600;
  color: rgb(180 83 9);
}
.sr-budget__note {
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--color-muted);
}
.section-subtitle {
  margin: 8px 0 4px;
  font-size: 0.85rem;
  font-weight: 600;
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

.purchase-suggestion-kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}
.purchase-suggestion-kpi strong {
  font-size: 1.2rem;
}
.purchase-suggestion-kpi__label {
  font-size: 0.75rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.purchase-suggestion-card {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}
.purchase-priority {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.purchase-priority--critical {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}
.purchase-priority--high {
  background: rgb(254 243 199);
  color: rgb(180 83 9);
}
.purchase-stock-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border-radius: 8px;
  background: var(--color-background, rgba(127, 127, 127, 0.06));
}
.purchase-stock-cell span {
  font-size: 0.72rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.purchase-stock-cell strong {
  font-size: 1rem;
}
</style>
