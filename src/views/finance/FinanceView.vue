<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Plus, Pencil, Trash2, Search } from "lucide-vue-next";
import { financeApi } from "@/api/finance.api";
import { optionsApi } from "@/api/options.api";
import { useList } from "@/composables/useList";
import { useForm } from "@/composables/useForm";
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
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();

const hasFullAccess = computed(() => {
  if (authStore.user?.is_superuser) {
    return true;
  }

  return ["ADMIN", "GERENTE"].some((role) =>
    authStore.roleCodes?.includes(role),
  );
});

const canCreateFinance = computed(
  () =>
    hasFullAccess.value || Boolean(authStore.permissions?.can_create_finance),
);

const canEditFinance = computed(
  () => hasFullAccess.value || Boolean(authStore.permissions?.can_edit_finance),
);

const canDeleteFinance = computed(
  () =>
    hasFullAccess.value || Boolean(authStore.permissions?.can_delete_finance),
);

const INVOICE_STATUS_OPTIONS = [
  { value: "RECIBIDA", label: "Recibida" },
  { value: "VALIDADA", label: "Validada" },
  { value: "PARCIALMENTE_PAGADA", label: "Parcialmente pagada" },
  { value: "PAGADA", label: "Pagada" },
  { value: "ANULADA", label: "Anulada" },
];

// ── Tabs ──────────────────────────────────────────────────────────────────────
const tabs = ["Facturas", "Pagos", "Presupuestos"];
const activeTab = ref("Facturas");

// ── Facturas ──────────────────────────────────────────────────────────────────
const invoiceColumns = [
  { key: "supplier", label: "Proveedor" },
  { key: "invoice_number", label: "N° Factura" },
  { key: "issue_date", label: "Emisión" },
  { key: "total_amount", label: "Total" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "", width: "90px" },
];
const invoiceList = useList(financeApi.listInvoices);

const showInvoiceForm = ref(false);
const editingInvoice = ref(null);
const deleteInvoice = ref(null);
const deleteInvLoading = ref(false);

const emptyInvoiceForm = {
  supplier: "",
  legal_entity: "",
  branch: "",
  purchase_order: "",
  invoice_number: "",
  issue_date: "",
  due_date: "",
  net_amount: "",
  tax_amount: "",
  total_amount: "",
  status: "RECIBIDA",
  notes: "",
};

const {
  form: invForm,
  loading: invLoading,
  error: invError,
  reset: invReset,
  fill: invFill,
  submit: invSubmit,
} = useForm(emptyInvoiceForm, (data) =>
  editingInvoice.value
    ? financeApi.updateInvoice(editingInvoice.value.uuid, data)
    : financeApi.createInvoice(data),
);

function openCreateInvoice() {
  if (!canCreateFinance.value) return;

  editingInvoice.value = null;
  invReset();
  showInvoiceForm.value = true;
}

function openEditInvoice(row) {
  if (!canEditFinance.value) return;

  editingInvoice.value = row;

  invFill({
    supplier: row.supplier,
    legal_entity: row.legal_entity,
    branch: row.branch,
    purchase_order: row.purchase_order,
    invoice_number: row.invoice_number,
    issue_date: row.issue_date ?? "",
    due_date: row.due_date ?? "",
    net_amount: row.net_amount,
    tax_amount: row.tax_amount,
    total_amount: row.total_amount,
    status: row.status,
    notes: row.notes ?? "",
  });

  showInvoiceForm.value = true;
}

async function handleInvoiceSubmit() {
  if (editingInvoice.value) {
    if (!canEditFinance.value) return;
  } else {
    if (!canCreateFinance.value) return;
  }

  await invSubmit();

  showInvoiceForm.value = false;
  await invoiceList.load();

  const res = await financeApi
    .listInvoices({ page_size: 200 })
    .catch(() => null);

  if (res) {
    const d = res.data?.data ?? res.data;

    invoices.value = Array.isArray(d) ? d : (d.results ?? d);
  }
}

async function confirmDeleteInvoice() {
  if (!canDeleteFinance.value) return;

  deleteInvLoading.value = true;

  try {
    await financeApi.deleteInvoice(deleteInvoice.value.uuid);

    deleteInvoice.value = null;

    await invoiceList.load();
  } finally {
    deleteInvLoading.value = false;
  }
}

// ── Pagos ─────────────────────────────────────────────────────────────────────
const paymentColumns = [
  { key: "invoice", label: "Factura" },
  { key: "payment_method", label: "Método" },
  { key: "payment_date", label: "Fecha" },
  { key: "amount", label: "Monto" },
  { key: "status", label: "Estado" },
  { key: "actions", label: "", width: "90px" },
];
const paymentList = useList(financeApi.listPayments);

const showPaymentForm = ref(false);
const editingPayment = ref(null);
const deletePayment = ref(null);
const deletePayLoading = ref(false);

const emptyPaymentForm = {
  supplier_invoice: "",
  legal_entity: "",
  payment_method: "TRANSFERENCIA",
  payment_date: "",
  amount: "",
  status: "PENDIENTE",
  check_number: "",
  bank_account: "",
  transaction_reference: "",
  notes: "",
};

const {
  form: payForm,
  loading: payLoading,
  error: payError,
  reset: payReset,
  fill: payFill,
  submit: paySubmit,
} = useForm(emptyPaymentForm, (data) =>
  editingPayment.value
    ? financeApi.updatePayment(editingPayment.value.uuid, data)
    : financeApi.createPayment(data),
);

async function handlePaymentSubmit() {
  if (editingPayment.value) {
    if (!canEditFinance.value) return;
  } else {
    if (!canCreateFinance.value) return;
  }

  await paySubmit();

  showPaymentForm.value = false;

  await paymentList.load();
}

async function confirmDeletePayment() {
  if (!canDeleteFinance.value) return;

  deletePayLoading.value = true;

  try {
    await financeApi.deletePayment(deletePayment.value.uuid);

    deletePayment.value = null;

    await paymentList.load();
  } finally {
    deletePayLoading.value = false;
  }
}

// ── Presupuestos ──────────────────────────────────────────────────────────────
const budgetColumns = [
  { key: "legal_entity", label: "Entidad" },
  { key: "budget_category", label: "Línea" },
  // El centro de costo es el eje del control presupuestario; sin esta columna
  // dos presupuestos de la misma sociedad se leen como filas repetidas.
  { key: "cost_center", label: "Centro de costo" },
  { key: "branch", label: "Sucursal" },
  { key: "period", label: "Período" },
  { key: "budget_amount", label: "Presupuesto" },
  // Comprometido: aprobado en una orden y todavía sin factura. Sin esta
  // columna, dos compras seguidas parecen tener el mismo saldo libre.
  { key: "committed_amount", label: "Comprometido" },
  { key: "consumed_amount", label: "Consumido" },
  { key: "available", label: "Disponible" },
  { key: "actions", label: "", width: "90px" },
];
const budgetList = useList(financeApi.listBudgets);

const showBudgetForm = ref(false);
const editingBudget = ref(null);
const deleteBudget = ref(null);
const deleteBudgetLoading = ref(false);

const emptyBudgetForm = {
  legal_entity: "",
  branch: "",
  cost_center: "",
  category: "",
  period_year: new Date().getFullYear(),
  period_month: new Date().getMonth() + 1,
  budget_amount: "",
  notes: "",
};

const {
  form: budForm,
  loading: budLoading,
  error: budError,
  reset: budReset,
  fill: budFill,
  submit: budSubmit,
} = useForm(emptyBudgetForm, (data) =>
  editingBudget.value
    ? financeApi.updateBudget(editingBudget.value.uuid, data)
    : financeApi.createBudget(data),
);

async function handleBudgetSubmit() {
  if (editingBudget.value) {
    if (!canEditFinance.value) return;
  } else {
    if (!canCreateFinance.value) return;
  }

  await budSubmit();

  showBudgetForm.value = false;

  await budgetList.load();
}

async function confirmDeleteBudget() {
  if (!canDeleteFinance.value) return;

  deleteBudgetLoading.value = true;

  try {
    await financeApi.deleteBudget(deleteBudget.value.uuid);

    deleteBudget.value = null;

    await budgetList.load();
  } finally {
    deleteBudgetLoading.value = false;
  }
}

function openCreatePayment() {
  if (!canCreateFinance.value) return;

  editingPayment.value = null;
  payReset();
  showPaymentForm.value = true;
}

function openEditPayment(row) {
  if (!canEditFinance.value) return;

  editingPayment.value = row;

  payFill({
    supplier_invoice: row.supplier_invoice,
    legal_entity: row.legal_entity,
    payment_method: row.payment_method,
    payment_date: row.payment_date ?? "",
    amount: row.amount,
    status: row.status,
    check_number: row.check_number ?? "",
    bank_account: row.bank_account ?? "",
    transaction_reference: row.transaction_reference ?? "",
    notes: row.notes ?? "",
  });

  showPaymentForm.value = true;
}

function openCreateBudget() {
  if (!canCreateFinance.value) return;

  editingBudget.value = null;
  budReset();
  showBudgetForm.value = true;
}

function openEditBudget(row) {
  if (!canEditFinance.value) return;

  editingBudget.value = row;

  budFill({
    legal_entity: row.legal_entity,
    branch: row.branch,
    cost_center: row.cost_center,
    category: row.category,
    period_year: row.period_year,
    period_month: row.period_month,
    budget_amount: row.budget_amount,
    notes: row.notes ?? "",
  });

  showBudgetForm.value = true;
}

// ── Opciones & mount ──────────────────────────────────────────────────────────
const suppliers = ref([]);
const invoices = ref([]); // para el selector de facturas en el formulario de pago

async function loadData() {
  await Promise.all([
    invoiceList.load(),
    paymentList.load(),
    budgetList.load(),
  ]);

  // Estas opciones solo se necesitan para crear/editar
  if (!canCreateFinance.value && !canEditFinance.value) {
    suppliers.value = [];
    invoices.value = [];
    return;
  }

  const [supRes, invRes] = await Promise.allSettled([
    optionsApi.getSuppliers(),
    financeApi.listInvoices({
      page_size: 200,
    }),
  ]);

  if (supRes.status === "fulfilled") {
    const d = supRes.value.data?.data ?? supRes.value.data;

    suppliers.value = Array.isArray(d) ? d : (d.results ?? d);
  }

  if (invRes.status === "fulfilled") {
    const d = invRes.value.data?.data ?? invRes.value.data;

    invoices.value = Array.isArray(d) ? d : (d.results ?? d);
  }
}

const { setRefreshFunction, clearRefreshFunction } = useRefresh();
onMounted(() => {
  setRefreshFunction(loadData);
  loadData();
});
onUnmounted(clearRefreshFunction);

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  <section class="space-y-6">
    <PageHeader title="Finanzas" subtitle="Facturas, pagos y presupuestos">
      <button
        v-if="canCreateFinance && activeTab === 'Facturas'"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
        @click="openCreateInvoice"
      >
        <Plus :size="16" /> Nueva factura
      </button>
      <button
        v-if="canCreateFinance && activeTab === 'Pagos'"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
        @click="openCreatePayment"
      >
        <Plus :size="16" /> Registrar pago
      </button>
      <button
        v-if="canCreateFinance && activeTab === 'Presupuestos'"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
        @click="openCreateBudget"
      >
        <Plus :size="16" /> Nuevo presupuesto
      </button>
    </PageHeader>

    <div class="flex gap-2 border-b border-border">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="[
          'px-4 py-2 text-sm font-semibold border-b-2 transition-colors',
          activeTab === tab
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        ]"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- ── FACTURAS ── -->
    <template v-if="activeTab === 'Facturas'">
      <AppAlert
        v-if="invoiceList.error.value"
        type="error"
        :message="invoiceList.error.value"
      />
      <AppTable
        :columns="invoiceColumns"
        :rows="invoiceList.items.value"
        :loading="invoiceList.loading.value"
      >
        <template #filter-invoice_number>
          <AppInput
            type="text"
            placeholder="Buscar..."
            :model-value="invoiceList.params.search"
            @update:model-value="invoiceList.setParam('search', $event)"
          />
        </template>
        <template #filter-status>
          <AppMultiSelect
            :options="INVOICE_STATUS_OPTIONS"
            :model-value="invoiceList.params.status || []"
            @update:model-value="invoiceList.setParam('status', $event)"
          />
        </template>

        <template #supplier="{ row }">{{
          row.supplier_detail?.name ?? "—"
        }}</template>
        <template #total_amount="{ row }">{{ fmt(row.total_amount) }}</template>
        <template #issue_date="{ row }">{{ fmtDate(row.issue_date) }}</template>
        <template #status="{ row }"
          ><StatusBadge :status="row.status"
        /></template>
        <template #actions="{ row }">
          <div class="flex gap-1 justify-end">
            <button
              v-if="canEditFinance"
              class="p-1 rounded hover:bg-muted"
              title="Editar"
              @click="openEditInvoice(row)"
            >
              <Pencil :size="16" />
            </button>

            <button
              v-if="canDeleteFinance"
              class="p-1 rounded hover:bg-muted text-destructive hover:bg-destructive/10"
              title="Eliminar"
              @click="deleteInvoice = row"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="invoiceList.pagination.count"
        :page="invoiceList.pagination.page"
        :page-size="invoiceList.pagination.pageSize"
        @change="invoiceList.setPage"
      />
    </template>

    <!-- ── PAGOS ── -->
    <template v-if="activeTab === 'Pagos'">
      <AppAlert
        v-if="paymentList.error.value"
        type="error"
        :message="paymentList.error.value"
      />
      <AppTable
        :columns="paymentColumns"
        :rows="paymentList.items.value"
        :loading="paymentList.loading.value"
      >
        <template #invoice="{ row }">{{
          row.supplier_invoice_detail?.invoice_number ?? "—"
        }}</template>
        <template #amount="{ row }">{{ fmt(row.amount) }}</template>
        <template #payment_date="{ row }">{{
          fmtDate(row.payment_date)
        }}</template>
        <template #status="{ row }"
          ><StatusBadge :status="row.status"
        /></template>
        <template #actions="{ row }">
          <div v-if="canEditFinance || canDeleteFinance" class="flex gap-1">
            <button
              v-if="canEditFinance"
              class="p-2 rounded-md hover:bg-muted"
              title="Editar"
              @click="openEditPayment(row)"
            >
              <Pencil :size="15" />
            </button>

            <button
              v-if="canDeleteFinance"
              class="p-2 rounded-md hover:bg-muted text-destructive hover:bg-destructive/10"
              title="Eliminar"
              @click="deletePayment = row"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="paymentList.pagination.count"
        :page="paymentList.pagination.page"
        :page-size="paymentList.pagination.pageSize"
        @change="paymentList.setPage"
      />
    </template>

    <!-- ── PRESUPUESTOS ── -->
    <template v-if="activeTab === 'Presupuestos'">
      <AppAlert
        v-if="budgetList.error.value"
        type="error"
        :message="budgetList.error.value"
      />
      <AppTable
        :columns="budgetColumns"
        :rows="budgetList.items.value"
        :loading="budgetList.loading.value"
      >
        <template #legal_entity="{ row }">{{
          row.legal_entity_detail?.name ?? "—"
        }}</template>
        <template #budget_category="{ row }">{{
          row.budget_category_detail?.name ?? "—"
        }}</template>
        <template #cost_center="{ row }">{{
          row.cost_center_detail?.name ?? "—"
        }}</template>
        <template #branch="{ row }">{{
          row.branch_detail?.name ?? "—"
        }}</template>
        <template #period="{ row }"
          >{{ row.period_month }}/{{ row.period_year }}</template
        >
        <template #budget_amount="{ row }">{{
          fmt(row.budget_amount)
        }}</template>
        <template #committed_amount="{ row }">{{
          fmt(row.committed_amount)
        }}</template>
        <template #consumed_amount="{ row }">{{
          fmt(row.consumed_amount)
        }}</template>
        <template #available="{ row }">
          <span
            :class="
              parseFloat(row.available_amount) < 0
                ? 'text-destructive font-semibold'
                : ''
            "
          >
            {{ fmt(row.available_amount) }}
          </span>
        </template>
        <template #actions="{ row }">
          <div v-if="canEditFinance || canDeleteFinance" class="flex gap-1">
            <button
              v-if="canEditFinance"
              class="p-2 rounded-md hover:bg-muted"
              title="Editar"
              @click="openEditBudget(row)"
            >
              <Pencil :size="15" />
            </button>

            <button
              v-if="canDeleteFinance"
              class="p-2 rounded-md hover:bg-muted text-destructive hover:bg-destructive/10"
              title="Eliminar"
              @click="deleteBudget = row"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="budgetList.pagination.count"
        :page="budgetList.pagination.page"
        :page-size="budgetList.pagination.pageSize"
        @change="budgetList.setPage"
      />
    </template>

    <!-- ── Modal Factura ── -->
    <AppModal
      v-if="showInvoiceForm"
      :title="editingInvoice ? 'Editar factura' : 'Nueva factura'"
      size="lg"
      @close="showInvoiceForm = false"
    >
      <form
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
        @submit.prevent="handleInvoiceSubmit"
      >
        <AppAlert
          v-if="invError"
          type="error"
          :message="invError"
          class="col-span-full"
        />
        <FormField label="N° Factura" required
          ><AppInput v-model="invForm.invoice_number" type="text" required
        /></FormField>
        <FormField label="Proveedor">
          <AppSelect v-model="invForm.supplier">
            <option value="">Sin proveedor</option>
            <option v-for="s in suppliers" :key="s.uuid" :value="s.uuid">
              {{ s.name }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Fecha emisión"
          ><AppInput v-model="invForm.issue_date" type="date"
        /></FormField>
        <FormField label="Fecha vencimiento"
          ><AppInput v-model="invForm.due_date" type="date"
        /></FormField>
        <FormField label="Monto neto"
          ><AppInput
            v-model="invForm.net_amount"
            type="number"
            min="0"
            step="0.01"
        /></FormField>
        <FormField label="IVA"
          ><AppInput
            v-model="invForm.tax_amount"
            type="number"
            min="0"
            step="0.01"
        /></FormField>
        <FormField label="Total"
          ><AppInput
            v-model="invForm.total_amount"
            type="number"
            min="0"
            step="0.01"
        /></FormField>
        <FormField label="Estado">
          <AppSelect v-model="invForm.status">
            <option value="RECIBIDA">Recibida</option>
            <option value="VALIDADA">Validada</option>
            <option value="PARCIALMENTE_PAGADA">Parcialmente pagada</option>
            <option value="PAGADA">Pagada</option>
            <option value="ANULADA">Anulada</option>
          </AppSelect>
        </FormField>
        <FormField label="Notas" class="col-span-full"
          ><AppTextarea v-model="invForm.notes" rows="2"
        /></FormField>
        <div class="col-span-full flex justify-end gap-3 mt-4 pt-4 border-t">
          <button
            type="button"
            class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            @click="showInvoiceForm = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
            :disabled="invLoading"
          >
            {{ invLoading ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ── Modal Pago ── -->
    <AppModal
      v-if="showPaymentForm"
      :title="editingPayment ? 'Editar pago' : 'Registrar pago'"
      size="md"
      @close="showPaymentForm = false"
    >
      <form
        class="grid grid-cols-1 gap-4"
        @submit.prevent="handlePaymentSubmit"
      >
        <AppAlert v-if="payError" type="error" :message="payError" />
        <FormField label="Factura" required>
          <AppSelect v-model="payForm.supplier_invoice" required>
            <option value="">Seleccionar factura</option>
            <option v-for="inv in invoices" :key="inv.uuid" :value="inv.uuid">
              N° {{ inv.invoice_number }} —
              {{ inv.supplier_detail?.name ?? "—" }} —
              {{ fmt(inv.total_amount) }}
            </option>
          </AppSelect>
        </FormField>
        <FormField label="Método de pago" required>
          <AppSelect v-model="payForm.payment_method" required>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="CHEQUE">Cheque</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="OTRO">Otro</option>
          </AppSelect>
        </FormField>
        <FormField label="Fecha de pago"
          ><AppInput v-model="payForm.payment_date" type="date"
        /></FormField>
        <FormField label="Monto" required
          ><AppInput
            v-model="payForm.amount"
            type="number"
            min="0.01"
            step="0.01"
            required
        /></FormField>
        <FormField label="Estado">
          <AppSelect v-model="payForm.status">
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
            <option value="ANULADO">Anulado</option>
          </AppSelect>
        </FormField>
        <FormField label="N° Cheque"
          ><AppInput v-model="payForm.check_number" type="text"
        /></FormField>
        <FormField label="Referencia"
          ><AppInput v-model="payForm.transaction_reference" type="text"
        /></FormField>
        <FormField label="Notas"
          ><AppTextarea v-model="payForm.notes" rows="2"
        /></FormField>
        <div class="flex justify-end gap-3 mt-4 pt-4 border-t">
          <button
            type="button"
            class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            @click="showPaymentForm = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
            :disabled="payLoading"
          >
            {{ payLoading ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ── Modal Presupuesto ── -->
    <AppModal
      v-if="showBudgetForm"
      :title="editingBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'"
      size="md"
      @close="showBudgetForm = false"
    >
      <form class="grid grid-cols-1 gap-4" @submit.prevent="handleBudgetSubmit">
        <AppAlert v-if="budError" type="error" :message="budError" />
        <FormField label="Año" required
          ><AppInput v-model="budForm.period_year" type="number" required
        /></FormField>
        <FormField label="Mes" required>
          <AppSelect v-model="budForm.period_month" required>
            <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
          </AppSelect>
        </FormField>
        <FormField label="Monto presupuesto" required
          ><AppInput
            v-model="budForm.budget_amount"
            type="number"
            min="0"
            step="0.01"
            required
        /></FormField>
        <FormField label="Notas"
          ><AppTextarea v-model="budForm.notes" rows="2"
        /></FormField>
        <div class="flex justify-end gap-3 mt-4 pt-4 border-t">
          <button
            type="button"
            class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            @click="showBudgetForm = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
            :disabled="budLoading"
          >
            {{ budLoading ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ── Confirmaciones ── -->
    <ConfirmDialog
      v-if="deleteInvoice"
      title="Eliminar factura"
      :message="`¿Eliminar factura N° ${deleteInvoice.invoice_number}?`"
      confirm-label="Eliminar"
      :loading="deleteInvLoading"
      @confirm="confirmDeleteInvoice"
      @cancel="deleteInvoice = null"
    />
    <ConfirmDialog
      v-if="deletePayment"
      title="Eliminar pago"
      :message="`¿Eliminar este pago de ${fmt(deletePayment.amount)}? Esta acción no puede deshacerse.`"
      confirm-label="Eliminar"
      :loading="deletePayLoading"
      @confirm="confirmDeletePayment"
      @cancel="deletePayment = null"
    />
    <ConfirmDialog
      v-if="deleteBudget"
      title="Eliminar presupuesto"
      :message="`¿Eliminar presupuesto ${deleteBudget.period_month}/${deleteBudget.period_year}?`"
      confirm-label="Eliminar"
      :loading="deleteBudgetLoading"
      @confirm="confirmDeleteBudget"
      @cancel="deleteBudget = null"
    />
  </section>
</template>
