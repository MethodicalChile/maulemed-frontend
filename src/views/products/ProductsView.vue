<script setup>
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref } from "vue";
import { useForm, Field, ErrorMessage } from "vee-validate";
import { productFormSchema } from "@/schemas/product.schema";
import {
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  History,
  Building2,
  MoreVertical,
} from "lucide-vue-next";
import { productsApi } from "@/api/products.api";
import { suppliersApi } from "@/api/suppliers.api";
import { optionsApi } from "@/api/options.api";
import { useList } from "@/composables/useList";
// REMOVED: import { useForm } from '@/composables/useForm'
import { usePermissions } from "@/composables/usePermissions";
import { useRefresh } from "@/composables/useRefresh";
import PageHeader from "@/components/common/PageHeader.vue";
import AppTable from "@/components/common/AppTable.vue";
import AppModal from "@/components/common/AppModal.vue";
import AppPagination from "@/components/common/AppPagination.vue";
import AppAlert from "@/components/common/AppAlert.vue";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import FormField from "@/components/common/FormField.vue";
import AppInput from "@/components/common/AppInput.vue";
import AppSelect from "@/components/common/AppSelect.vue";
import AppTableFilterInput from "@/components/common/AppTableFilterInput.vue";
import AppTableFilterSelect from "@/components/common/AppTableFilterSelect.vue";
import StarRating from "@/components/common/StarRating.vue";
import AppTextarea from "@/components/common/AppTextarea.vue";
import SupplierChipsCell from "@/components/common/SupplierChipsCell.vue";
import { useRouter } from "vue-router";

const router = useRouter();
const {
  canCreateProducts,
  canEditProducts,
  canDeleteProducts,
  canViewSuppliers,
} = usePermissions();

const showActionModal = ref(false);
const activeActionRow = ref(null);

function openActions(row) {
  activeActionRow.value = row;
  showActionModal.value = true;
}

// ─── Tabla principal ───────────────────────────────────────────────────────────
const columns = [
  { key: "image", label: "Imagen", width: "76px" },
  { key: "name", label: "Nombre" },
  { key: "sku", label: "SKU" },
  { key: "category", label: "Categoría" },
  { key: "unit", label: "Unidad" },
  { key: "suppliers", label: "Proveedores" },
  { key: "quality_rating", label: "Calidad", width: "120px" },
  { key: "is_active", label: "Estado", width: "100px" },
  { key: "actions", label: "", width: "132px" },
];

const { items, loading, error, pagination, params, load, setPage, setParam } =
  useList(productsApi.listProducts);

// ─── Opciones de selects ───────────────────────────────────────────────────────
const categories = ref([]);
const units = ref([]);
const allSuppliers = ref([]);

const supplierNameMap = computed(() => {
  const map = {};
  allSuppliers.value.forEach((s) => {
    map[s.uuid] = s.name;
  });
  return map;
});

const productSupplierCache = ref({});

async function fetchProductSuppliers(productUuid) {
  if (!canViewSuppliers.value) return;

  if (productSupplierCache.value[productUuid] !== undefined) return;
  try {
    const res = await suppliersApi.listSupplierProducts({
      product: productUuid,
      page_size: 100,
    });
    const data = res.data?.data ?? res.data;
    const rows = Array.isArray(data) ? data : (data.results ?? data);
    productSupplierCache.value[productUuid] = rows.map((r) => r.supplier);
  } catch {
    productSupplierCache.value[productUuid] = [];
  }
}

// ─── Estado del modal ──────────────────────────────────────────────────────────
const showForm = ref(false);
const editingItem = ref(null);
const deleteTarget = ref(null);
const deleteLoading = ref(false);

const imageInput = ref(null);
const imagePreview = ref("");
const originalImageUrl = ref("");
const imageError = ref("");

let localImageUrl = null;

// ─── Formulario de producto ────────────────────────────────────────────────────
const formLoading = ref(false);
const formError = ref("");

const {
  handleSubmit,
  setValues,
  setFieldValue,
  values: form,
  resetForm,
  errors,
} = useForm({
  validationSchema: productFormSchema,
  initialValues: {
    name: "",
    sku: "",
    barcode: "",
    internal_code: "",
    description: "",
    category: "",
    unit: "",
    requires_lot: false,
    requires_expiration_date: false,
    is_medication: false,
    is_controlled: false,
    is_active: true,
    quality_rating: 0,
    image: null,
    remove_image: false,
  },
});

function fill(data) {
  setValues(data);
}

function reset() {
  resetForm();
}

function buildProductFormData(data) {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    // Imagen
    if (key === "image") {
      if (value instanceof File) {
        formData.append("image", value);
      }

      return;
    }

    // Booleano especial para eliminar imagen
    if (key === "remove_image") {
      formData.append(
        "remove_image",
        value ? "true" : "false",
      );

      return;
    }

    // No enviar null / undefined
    if (value === null || value === undefined) {
      return;
    }

    // Booleanos
    if (typeof value === "boolean") {
      formData.append(
        key,
        value ? "true" : "false",
      );

      return;
    }

    formData.append(key, String(value));
  });

  return formData;
}

async function submit(data) {
  const payload = buildProductFormData(data);

  if (editingItem.value) {
    return await productsApi.updateProduct(
      editingItem.value.uuid,
      payload,
    );
  }

  return await productsApi.createProduct(payload);
}

// ─── Proveedores asociados ─────────────────────────────────────────────────────
const supplierRows = ref([]);
const suppliersError = ref("");
let _rowKey = 0;

const visibleSupplierRows = computed(() =>
  supplierRows.value.filter((r) => !r._deleted),
);

function newSupplierRow() {
  return {
    _key: ++_rowKey,
    uuid: null,
    supplier: "",
    supplier_sku: "",
    last_price: "",
    currency: "CLP",
    min_purchase_quantity: "",
    _deleted: false,
    _supplierName: "",
  };
}

function addSupplierRow() {
  supplierRows.value.push(newSupplierRow());
}

function removeSupplierRow(row) {
  if (row.uuid) {
    row._deleted = true;
  } else {
    supplierRows.value = supplierRows.value.filter((r) => r._key !== row._key);
  }
}

async function loadSupplierRows(productUuid) {
  supplierRows.value = [];
  try {
    const res = await suppliersApi.listSupplierProducts({
      product: productUuid,
      page_size: 100,
    });
    const data = res.data?.data ?? res.data;
    const rows = Array.isArray(data) ? data : (data.results ?? data);
    supplierRows.value = rows.map((sp) => ({
      _key: ++_rowKey,
      uuid: sp.uuid,
      supplier: sp.supplier,
      supplier_sku: sp.supplier_sku ?? "",
      last_price: sp.last_price ?? "",
      currency: sp.currency ?? "CLP",
      min_purchase_quantity: sp.min_purchase_quantity ?? "",
      _deleted: false,
      _supplierName: sp.supplier_detail?.name ?? "",
    }));
  } catch {
    supplierRows.value = [];
  }
}

async function saveSupplierRows(productUuid) {
  suppliersError.value = "";
  const operations = [];
  for (const row of supplierRows.value) {
    if (row._deleted && row.uuid) {
      operations.push(
        suppliersApi.deleteSupplierProduct(row.uuid).catch(() => null),
      );
      continue;
    }
    if (row._deleted || !row.supplier) continue;
    const payload = {
      product: productUuid,
      supplier: row.supplier,
      supplier_sku: row.supplier_sku || null,
      last_price: row.last_price ? Number(row.last_price) : null,
      currency: row.currency || "CLP",
      min_purchase_quantity: row.min_purchase_quantity
        ? Number(row.min_purchase_quantity)
        : null,
    };
    if (row.uuid)
      operations.push(suppliersApi.updateSupplierProduct(row.uuid, payload));
    else operations.push(suppliersApi.createSupplierProduct(payload));
  }
  await Promise.all(operations);
  delete productSupplierCache.value[productUuid];
}

// ─── Manejo de imagenes ────────────────────────────────────────────────────────
function releaseLocalImageUrl() {
  if (!localImageUrl) return;
  URL.revokeObjectURL(localImageUrl);
  localImageUrl = null;
}

function resetImageState() {
  releaseLocalImageUrl();

  imagePreview.value = "";
  originalImageUrl.value = "";
  imageError.value = "";

  setFieldValue("image", null);
  setFieldValue("remove_image", false);

  if (imageInput.value) {
    imageInput.value.value = "";
  }
}

function openImageSelector() {
  imageInput.value?.click();
}

function handleImageChange(event) {
  imageError.value = "";

  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type)
  ) {
    imageError.value =
      "Solo se permiten imágenes JPG, PNG o WEBP.";

    event.target.value = "";

    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    imageError.value =
      "La imagen no puede superar los 5 MB.";

    event.target.value = "";

    return;
  }

  releaseLocalImageUrl();

  localImageUrl = URL.createObjectURL(file);

  imagePreview.value = localImageUrl;

  setFieldValue("image", file);
  setFieldValue("remove_image", false);
}

function removeProductImage() {
  releaseLocalImageUrl();

  imagePreview.value = "";
  imageError.value = "";

  setFieldValue("image", null);
  setFieldValue("remove_image", true);

  if (imageInput.value) {
    imageInput.value.value = "";
  }
}

function discardImageChange() {
  releaseLocalImageUrl();

  setFieldValue("image", null);
  setFieldValue("remove_image", false);

  imagePreview.value = originalImageUrl.value;
  imageError.value = "";

  if (imageInput.value) {
    imageInput.value.value = "";
  }
}

// ─── Funciones auxiliares ─────────────────────────────────────────────────────
function openCreate() {
  editingItem.value = null;
  supplierRows.value = [];
  suppliersError.value = "";
  reset();
  resetImageState();
  showForm.value = true;
}

async function openEdit(row) {
  editingItem.value = row;
  fill({
    name: row.name,
    sku: row.sku ?? "",
    barcode: row.barcode ?? "",
    internal_code: row.internal_code ?? "",
    description: row.description ?? "",
    category: row.category,
    unit: row.unit,
    requires_lot: row.requires_lot,
    requires_expiration_date: row.requires_expiration_date,
    is_medication: row.is_medication,
    is_controlled: row.is_controlled,
    is_active: row.is_active,
    quality_rating: Number(row.quality_rating ?? 0),
    image: null,
    remove_image: false,
  });

  releaseLocalImageUrl();
  originalImageUrl.value = row.image_url ?? "";
  imagePreview.value = originalImageUrl.value;
  imageError.value = "";
  await loadSupplierRows(row.uuid);
  showForm.value = true;
}

const onSubmit = handleSubmit(async (data) => {
  formLoading.value = true;
  formError.value = "";
  suppliersError.value = "";
  try {
    const response = await submit(data);
    const productUuid =
      editingItem.value?.uuid ??
      response?.data?.data?.uuid ??
      response?.data?.uuid;
    if (productUuid) await saveSupplierRows(productUuid);
    showForm.value = false;
    await load();
  } catch (err) {
    formError.value = err.response?.data?.message ?? "Error al guardar.";
  } finally {
    formLoading.value = false;
  }
});

async function confirmDelete() {
  deleteLoading.value = true;
  try {
    await productsApi.deleteProduct(deleteTarget.value.uuid);
    deleteTarget.value = null;
    load();
  } finally {
    deleteLoading.value = false;
  }
}

async function loadData() {
  load();
  const [catRes, unitRes, supRes] = await Promise.allSettled([
    optionsApi.getProductCategories(),
    optionsApi.getUnits(),
    optionsApi.getSuppliers(),
  ]);
  if (catRes.status === "fulfilled") {
    const d = catRes.value.data?.data ?? catRes.value.data;
    categories.value = Array.isArray(d) ? d : (d.results ?? d);
  }
  if (unitRes.status === "fulfilled") {
    const d = unitRes.value.data?.data ?? unitRes.value.data;
    units.value = Array.isArray(d) ? d : (d.results ?? d);
  }
  if (supRes.status === "fulfilled") {
    const d = supRes.value.data?.data ?? supRes.value.data;
    allSuppliers.value = Array.isArray(d) ? d : (d.results ?? d);
  }
}

const { setRefreshFunction, clearRefreshFunction } = useRefresh();
onMounted(() => {
  setRefreshFunction(loadData);
  loadData();
});
onUnmounted(clearRefreshFunction);

onBeforeUnmount(releaseLocalImageUrl);

const openPriceHistory = (product) => {
  router.push({
    name: "product-price-history",
    params: { uuid: product.uuid },
  });
};

// ── BranchProducts ────────────────────────────────────────────────────────────
const showBPModal = ref(false);
const bpProduct = ref(null);
const bpList = ref([]);
const bpLoading = ref(false);
const bpError = ref("");
const allBranches = ref([]);
const showBPForm = ref(false);
const editingBP = ref(null);
const bpFormLoading = ref(false);
const bpFormError = ref("");
const bpForm = ref({
  branch: "",
  min_stock: "0",
  max_stock: "",
  critical_stock: "0",
  usual_monthly_quantity: "0",
  is_active: true,
});

async function openBPModal(product) {
  bpProduct.value = product;
  bpError.value = "";
  bpLoading.value = true;
  showBPModal.value = true;
  try {
    const [bpRes, brRes] = await Promise.allSettled([
      productsApi.listBranchProducts({ product: product.uuid, page_size: 200 }),
      optionsApi.getBranches(),
    ]);
    if (bpRes.status === "fulfilled") {
      const d = bpRes.value.data?.data ?? bpRes.value.data;
      bpList.value = Array.isArray(d) ? d : (d.results ?? d);
    }
    if (brRes.status === "fulfilled") {
      const d = brRes.value.data?.data ?? brRes.value.data;
      allBranches.value = Array.isArray(d) ? d : (d.results ?? d);
    }
  } catch (e) {
    bpError.value = e.response?.data?.message ?? "Error al cargar";
  } finally {
    bpLoading.value = false;
  }
}

function openCreateBP() {
  editingBP.value = null;
  bpFormError.value = "";
  bpForm.value = {
    branch: "",
    min_stock: "0",
    max_stock: "",
    critical_stock: "0",
    usual_monthly_quantity: "0",
    is_active: true,
  };
  showBPForm.value = true;
}
function openEditBP(bp) {
  editingBP.value = bp;
  bpFormError.value = "";
  bpForm.value = {
    branch: bp.branch,
    min_stock: bp.min_stock ?? "0",
    max_stock: bp.max_stock ?? "",
    critical_stock: bp.critical_stock ?? "0",
    usual_monthly_quantity: bp.usual_monthly_quantity ?? "0",
    is_active: bp.is_active,
  };
  showBPForm.value = true;
}
async function handleBPSubmit() {
  bpFormLoading.value = true;
  bpFormError.value = "";
  try {
    const payload = { ...bpForm.value, product: bpProduct.value.uuid };
    editingBP.value
      ? await productsApi.updateBranchProduct(editingBP.value.uuid, payload)
      : await productsApi.createBranchProduct(payload);
    showBPForm.value = false;
    await openBPModal(bpProduct.value);
  } catch (e) {
    bpFormError.value = e.response?.data?.message ?? "Error al guardar";
  } finally {
    bpFormLoading.value = false;
  }
}
async function deleteBP(bp) {
  if (!confirm("¿Eliminar configuración de esta sucursal?")) return;
  await productsApi.deleteBranchProduct(bp.uuid).catch(() => null);
  await openBPModal(bpProduct.value);
}

function fmtQty(val) {
  if (val == null || val === "") return "—";
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(
    val,
  );
}
</script>

<template>
  <section class="p-6 space-y-6">
    <PageHeader title="Productos" subtitle="Catálogo de productos del sistema">
      <button
        v-if="canCreateProducts"
        class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-md hover:bg-primary/90 transition-all hover:scale-105"
        @click="openCreate"
      >
        <Plus :size="18" /> Nuevo producto
      </button>
    </PageHeader>

    <div
      class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-card border border-border shadow-sm hidden"
    >
      <div class="relative col-span-2">
        <Search
          :size="18"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <AppInput
          type="text"
          placeholder="Buscar por nombre, SKU..."
          :model-value="params.search"
          class="pl-10"
          @update:model-value="setParam('search', $event)"
        />
      </div>

      <AppSelect
        :model-value="params.category"
        @update:model-value="setParam('category', $event)"
      >
        <option value="">Todas las categorías</option>
        <option v-for="c in categories" :key="c.uuid" :value="c.uuid">
          {{ c.name }}
        </option>
      </AppSelect>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <div
      class="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <AppTable :columns="columns" :rows="items" :loading="loading">
        <template #filter-name>
          <AppTableFilterInput
            placeholder="Buscar..."
            :model-value="params.search"
            @update:model-value="setParam('search', $event)"
          />
        </template>
        <template #filter-category>
          <AppTableFilterSelect
            :model-value="params.category"
            @update:model-value="setParam('category', $event)"
          >
            <option value="">Todas</option>
            <option v-for="c in categories" :key="c.uuid" :value="c.uuid">
              {{ c.name }}
            </option>
          </AppTableFilterSelect>
        </template>

        <template #image="{ row }">
          <div
            class="w-12 h-12 rounded-lg border bg-blue-50 overflow-hidden flex items-center justify-center"
          >
            <img
              v-if="row.image_url"
              :src="row.image_url"
              :alt="row.name"
              class="w-full h-full object-cover"
            />
            <ImagePlus v-else :size="20" class="text-primary/40" />
          </div>
        </template>
        <template #category="{ row }">
          <span
            class="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 font-semibold text-xs"
            >{{ row.category_detail?.name ?? "—" }}</span
          >
        </template>
        <template #unit="{ row }">
          <span class="text-muted-foreground font-medium">{{
            row.unit_detail?.code ?? "—"
          }}</span>
        </template>

        <template #suppliers="{ row }">
          <SupplierChipsCell
            :product-uuid="row.uuid"
            :cache="productSupplierCache"
            :name-map="supplierNameMap"
            @load="fetchProductSuppliers"
          />
        </template>

        <template #is_active="{ row }">
          <span
            :class="[
              'px-3 py-1 rounded-full text-[11px] font-bold',
              row.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-muted text-muted-foreground',
            ]"
          >
            {{ row.is_active ? "Activo" : "Inactivo" }}
          </span>
        </template>
        <template #quality_rating="{ row }">
          <StarRating
            :model-value="Number(row.quality_rating ?? 0)"
            :readonly="true"
          />
        </template>
        <template #actions="{ row }">
          <button
            v-if="canEditProducts || canDeleteProducts"
            class="grid place-items-center w-9 h-9 border border-border rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            @click="openActions(row)"
          >
            <MoreVertical :size="16" />
          </button>
        </template>
      </AppTable>
    </div>

    <!-- Modal acciones -->
    <AppModal
      v-if="showActionModal && activeActionRow"
      title="Acciones"
      size="sm"
      @close="showActionModal = false"
    >
      <div class="grid gap-2">
        <button
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="
            openPriceHistory(activeActionRow);
            showActionModal = false;
          "
        >
          <History :size="16" /> Historial de precios
        </button>
        <button
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="
            openBPModal(activeActionRow);
            showActionModal = false;
          "
        >
          <Building2 :size="16" /> Configurar stock
        </button>
        <button
          v-if="canEditProducts"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium"
          @click="
            openEdit(activeActionRow);
            showActionModal = false;
          "
        >
          <Pencil :size="16" /> Editar
        </button>
        <button
          v-if="canDeleteProducts"
          class="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted text-sm font-medium text-destructive"
          @click="
            deleteTarget = activeActionRow;
            showActionModal = false;
          "
        >
          <Trash2 :size="16" /> Eliminar
        </button>
      </div>
    </AppModal>

    <AppPagination
      :count="pagination.count"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      @change="setPage"
    />

    <AppModal
      v-if="showForm"
      :title="editingItem ? 'Editar producto' : 'Nuevo producto'"
      size="xl"
      @close="showForm = false"
    >
      <form @submit.prevent="onSubmit">
        <AppAlert v-if="formError" type="error" :message="formError" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="col-span-full flex gap-4 p-4 border rounded-lg">
            <div
              class="w-24 h-24 border rounded-md overflow-hidden flex items-center justify-center bg-muted"
            >
              <img
                v-if="imagePreview"
                :src="imagePreview"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="flex flex-col items-center text-muted-foreground"
              >
                <ImagePlus :size="34" /><span class="text-xs">Sin imagen</span>
              </div>
            </div>
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <strong class="block text-sm">Imagen del producto</strong>
                <p class="text-xs text-muted-foreground">
                  JPG, PNG o WEBP (máx 5 MB).
                </p>
              </div>
              <input
                ref="imageInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="handleImageChange"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  class="px-3 py-1 text-xs font-medium border rounded hover:bg-muted"
                  @click="openImageSelector"
                >
                  {{ imagePreview ? "Cambiar" : "Agregar" }}
                </button>
                <button
                  v-if="form.image"
                  type="button"
                  class="px-3 py-1 text-xs font-medium border rounded hover:bg-muted"
                  @click="discardImageChange"
                >
                  Descartar
                </button>
                <button
                  v-else-if="imagePreview"
                  type="button"
                  class="px-3 py-1 text-xs font-medium border rounded hover:bg-muted text-destructive"
                  @click="removeProductImage"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
          <FormField label="Nombre" required :error="errors.name">
            <Field v-slot="{ field }" name="name">
              <AppInput v-bind="field" type="text" />
            </Field>
          </FormField>
          <FormField
            label="Calidad"
            class="col-span-full"
            :error="errors.quality_rating"
          >
            <Field v-slot="{ field }" name="quality_rating">
              <StarRating
                :model-value="field.value"
                @update:model-value="field.onChange"
              />
            </Field>
          </FormField>
          <FormField label="SKU" :error="errors.sku">
            <Field v-slot="{ field }" name="sku">
              <AppInput v-bind="field" type="text" />
            </Field>
          </FormField>
          <FormField label="Código interno" :error="errors.internal_code">
            <Field v-slot="{ field }" name="internal_code">
              <AppInput v-bind="field" type="text" />
            </Field>
          </FormField>
          <FormField label="Código de barras" :error="errors.barcode">
            <Field v-slot="{ field }" name="barcode">
              <AppInput v-bind="field" type="text" />
            </Field>
          </FormField>
          <FormField label="Categoría" required :error="errors.category">
            <Field v-slot="{ field }" name="category">
              <AppSelect v-bind="field">
                <option value="">Seleccione...</option>
                <option v-for="c in categories" :key="c.uuid" :value="c.uuid">
                  {{ c.name }}
                </option>
              </AppSelect>
            </Field>
          </FormField>
          <FormField label="Unidad de medida" required :error="errors.unit">
            <Field v-slot="{ field }" name="unit">
              <AppSelect v-bind="field">
                <option value="">Seleccione...</option>
                <option v-for="u in units" :key="u.uuid" :value="u.uuid">
                  {{ u.name }}
                </option>
              </AppSelect>
            </Field>
          </FormField>
          <FormField
            label="Descripción"
            class="col-span-full"
            :error="errors.description"
          >
            <Field v-slot="{ field }" name="description">
              <AppTextarea v-bind="field" rows="2" />
            </Field>
          </FormField>
          <div class="col-span-full flex flex-wrap gap-4 pt-2">
            <label class="flex items-center gap-2 text-sm">
              <Field
                v-slot="{ field }"
                name="requires_lot"
                type="checkbox"
                :value="true"
                :unchecked-value="false"
              >
                <input v-bind="field" type="checkbox" :checked="field.value" />
              </Field>
              Requiere lote
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Field
                v-slot="{ field }"
                name="requires_expiration_date"
                type="checkbox"
                :value="true"
                :unchecked-value="false"
              >
                <input v-bind="field" type="checkbox" :checked="field.value" />
              </Field>
              Requiere vencimiento
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Field
                v-slot="{ field }"
                name="is_medication"
                type="checkbox"
                :value="true"
                :unchecked-value="false"
              >
                <input v-bind="field" type="checkbox" :checked="field.value" />
              </Field>
              Es medicamento
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Field
                v-slot="{ field }"
                name="is_controlled"
                type="checkbox"
                :value="true"
                :unchecked-value="false"
              >
                <input v-bind="field" type="checkbox" :checked="field.value" />
              </Field>
              Es controlado
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Field
                v-slot="{ field }"
                name="is_active"
                type="checkbox"
                :value="true"
                :unchecked-value="false"
              >
                <input v-bind="field" type="checkbox" :checked="field.value" />
              </Field>
              Activo
            </label>
          </div>
        </div>
        <div class="mt-6 border-t pt-6">
          <div class="flex items-center justify-between mb-4">
            <strong class="text-sm font-semibold">Proveedores</strong>
            <button
              type="button"
              class="text-xs font-semibold px-3 py-1.5 border rounded hover:bg-muted"
              @click="addSupplierRow"
            >
              <Plus :size="14" class="inline" /> Agregar
            </button>
          </div>
          <div v-if="visibleSupplierRows.length" class="space-y-3">
            <div
              v-for="row in visibleSupplierRows"
              :key="row._key"
              class="grid grid-cols-6 gap-3 items-end"
            >
              <div class="col-span-2">
                <label class="text-xs font-medium">Proveedor</label>
                <AppSelect v-model="row.supplier">
                  <option
                    v-for="s in allSuppliers"
                    :key="s.uuid"
                    :value="s.uuid"
                  >
                    {{ s.name }}
                  </option>
                </AppSelect>
              </div>
              <div>
                <label class="text-xs font-medium">SKU</label>
                <AppInput v-model="row.supplier_sku" type="text" />
              </div>
              <div>
                <label class="text-xs font-medium">Precio</label>
                <AppInput v-model.number="row.last_price" type="number" />
              </div>
              <div>
                <label class="text-xs font-medium">Moneda</label>
                <AppSelect v-model="row.currency">
                  <option value="CLP">CLP</option>
                  <option value="USD">USD</option>
                </AppSelect>
              </div>
              <div class="flex gap-2 items-end">
                <AppInput
                  v-model.number="row.min_purchase_quantity"
                  type="number"
                  placeholder="Cant"
                />
                <button
                  type="button"
                  class="p-1.5 text-muted hover:text-destructive"
                  @click="removeSupplierRow(row)"
                >
                  <X :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            type="button"
            class="px-4 py-2 border rounded hover:bg-muted"
            @click="showForm = false"
          >
            Cancelar</button
          ><button
            type="submit"
            class="px-4 py-2 bg-primary text-white rounded"
          >
            {{ formLoading ? "Guardando..." : "Guardar" }}
          </button>
        </div>
      </form>
    </AppModal>
    <ConfirmDialog
      v-if="deleteTarget"
      title="Eliminar producto"
      message="¿Seguro?"
      confirm-label="Eliminar"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
    <AppModal
      v-if="showBPModal && bpProduct"
      :title="`Stock por sucursal — ${bpProduct.name}`"
      size="xl"
      @close="showBPModal = false"
    >
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm">{{ bpList.length }} sucursal(es)</span
        ><button
          class="px-3 py-1 text-xs bg-primary text-white rounded"
          @click="openCreateBP"
        >
          Agregar
        </button>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-muted text-xs uppercase">
          <tr>
            <th class="p-3">Sucursal</th>
            <th class="p-3">Mín</th>
            <th class="p-3">Crít</th>
            <th class="p-3">Máx</th>
            <th class="p-3">Estado</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="bp in bpList" :key="bp.uuid" class="hover:bg-muted/50">
            <td class="p-3">{{ bp.branch_detail?.name }}</td>
            <td class="p-3">{{ bp.min_stock }}</td>
            <td class="p-3">{{ bp.critical_stock }}</td>
            <td class="p-3">{{ bp.max_stock }}</td>
            <td class="p-3">{{ bp.is_active ? "Activo" : "Inactivo" }}</td>
          </tr>
        </tbody>
      </table>
    </AppModal>
  </section>
</template>
