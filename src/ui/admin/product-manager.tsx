"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, MoreHorizontal, Plus, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";
import type { ProductFeature } from "@/modules/catalog/contracts/catalog.contract";
import type { AdminWarehouseItem } from "@/modules/inventory/contracts/inventory.contract";

const checkboxClassName = "h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-text)] focus:ring-2 focus:ring-[color:var(--color-border)]";

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Brand = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
};

type Supplier = {
  id: string;
  slug: string;
  name: string;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

type AttributeDefinition = {
  id: string;
  slug: string;
  name: string;
  displayType: "TEXT" | "COLOR" | "NUMBER";
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

type ProductAttributeLink = {
  attributeDefinitionId: string;
  isVariantAxis: boolean;
  sortOrder?: number;
};

type ProductVariantValue = {
  attributeDefinitionId: string;
  value: string;
};

type ProductVariant = {
  id?: string;
  slug: string;
  sku: string;
  barcode: string;
  title: string;
  optionSummary: string;
  priceOverride: string;
  purchasePriceOverride: string;
  compareAtPriceOverride: string;
  imageUrl: string;
  imageUrls: string[];
  stockOverride: string;
  salesEnabled: boolean;
  isDefault: boolean;
  sortOrder: string;
  attributes: ProductVariantValue[];
};

type Product = {
  id: string;
  slug: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string;
  productType: "PHYSICAL" | "SERVICE" | "RAW_MATERIAL" | "SEMI_FINISHED";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  unitType: "PIECE" | "KILOGRAM" | "GRAM" | "LITER" | "MILLILITER" | "METER" | "CENTIMETER" | "BOX" | "PACK";
  price: number;
  purchasePrice: number | null;
  compareAtPrice: number | null;
  discountRate: number | null;
  stock: number;
  inStock: boolean;
  currency: string;
  vatRate: number;
  stockTrackingEnabled: boolean;
  salesEnabled: boolean;
  purchaseEnabled: boolean;
  internalNote: string | null;
  searchKeywords: string[];
  brandId: string | null;
  brandName: string | null;
  primarySupplierId: string | null;
  primarySupplierName: string | null;
  preferredSalesWarehouseId: string | null;
  preferredPurchaseWarehouseId: string | null;
  imageUrl: string;
  imageUrls?: string[];
  features: ProductFeature[];
  categoryId: string | null;
  categoryName: string | null;
  variantCount: number;
  variantAxisCount: number;
  orderCount: number;
  soldQuantity: number;
  grossRevenue: number;
  averageUnitCost: number | null;
  lastPurchaseUnitCost: number | null;
  stockValue: number;
  grossProfit: number;
  grossMarginRate: number | null;
  lastOrderedAt: string | null;
  attributeLinks?: ProductAttributeLink[];
  variants?: Array<{
    id?: string;
    slug: string;
    sku: string;
    barcode?: string | null;
    title: string;
    optionSummary: string;
    priceOverride?: number | null;
    purchasePriceOverride?: number | null;
    compareAtPriceOverride?: number | null;
    imageUrl?: string | null;
    imageUrls?: string[];
    stockOverride?: number | null;
    salesEnabled?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
    attributes: ProductVariantValue[];
  }>;
};

type Labels = {
  title: string;
  createTitle: string;
  listTitle: string;
  search: string;
  allCategories: string;
  page: string;
  prev: string;
  next: string;
  slug: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  productType: string;
  brand: string;
  supplier: string;
  statusLabel: string;
  statusDraft: string;
  statusActive: string;
  statusArchived: string;
  unitType: string;
  price: string;
  purchasePrice: string;
  compareAtPrice: string;
  stock: string;
  vatRate: string;
  stockTrackingEnabled: string;
  salesEnabled: string;
  purchaseEnabled: string;
  internalNote: string;
  searchKeywords: string;
  searchKeywordsHint: string;
  allStatuses: string;
  allBrands: string;
  allSuppliers: string;
  createBrand: string;
  createSupplier: string;
  manageBrands: string;
  manageSuppliers: string;
  searchBrand: string;
  searchSupplier: string;
  noBrandResults: string;
  noSupplierResults: string;
  createAttributeDefinition: string;
  manageAttributeDefinitions: string;
  attributesTitle: string;
  attributeName: string;
  attributeDisplayType: string;
  attributeDisplayText: string;
  attributeDisplayColor: string;
  attributeDisplayNumber: string;
  variantAxes: string;
  variantAxesHint: string;
  variantsTitle: string;
  variantsHint: string;
  addVariant: string;
  variantTitle: string;
  variantOptionSummary: string;
  variantPriceOverride: string;
  variantPurchasePriceOverride: string;
  variantCompareAtPriceOverride: string;
  variantImageUrl: string;
  variantStockOverride: string;
  variantDefault: string;
  variantSalesEnabled: string;
  variantAttributeValue: string;
  variantDetails: string;
  variantEmptyState: string;
  variantAxisDeleteConfirm: string;
  variantAxisDeleteBlocked: string;
  variantAxisUsageCount: string;
  selectedVariantAxes: string;
  generateVariants: string;
  generateVariantsTitle: string;
  generateVariantsHint: string;
  generateVariantsValues: string;
  generateVariantsApply: string;
  generateVariantsEmptyAxes: string;
  generateVariantsSuggestions: string;
  generateVariantsUseAllSuggestions: string;
  orderCount: string;
  soldQuantity: string;
  grossRevenue: string;
  averageUnitCost: string;
  lastPurchaseUnitCost: string;
  stockValue: string;
  grossProfit: string;
  grossMarginRate: string;
  lastOrderedAt: string;
  decisionAlerts: string;
  alertLowMargin: string;
  alertSlowSales: string;
  alertStockRisk: string;
  alertHealthy: string;
  reviewInventory: string;
  reviewTransactions: string;
  trendyolPreflight: string;
  trendyolPreflightReady: string;
  trendyolPreflightBlocked: string;
  trendyolPreflightWarnings: string;
  trendyolPreflightIssues: string;
  trendyolDraftPayload: string;
  trendyolQueueProductSync: string;
  pazaramaPreflight: string;
  pazaramaPreflightReady: string;
  pazaramaPreflightBlocked: string;
  pazaramaPreflightWarnings: string;
  pazaramaPreflightIssues: string;
  pazaramaDraftPayload: string;
  pazaramaQueueProductSync: string;
  pazaramaProductSyncQueued: string;
  pazaramaProductSyncTracking: string;
  pazaramaProductSyncJobStatus: string;
  pazaramaProductSyncCheckAgain: string;
  n11Preflight: string;
  n11PreflightReady: string;
  n11PreflightBlocked: string;
  n11PreflightWarnings: string;
  n11PreflightIssues: string;
  n11DraftPayload: string;
  n11QueueProductSync: string;
  n11ProductSyncQueued: string;
  n11ProductSyncTracking: string;
  n11ProductSyncJobStatus: string;
  n11ProductSyncCheckAgain: string;
  hepsiburadaPreflight: string;
  hepsiburadaPreflightReady: string;
  hepsiburadaPreflightBlocked: string;
  hepsiburadaPreflightWarnings: string;
  hepsiburadaPreflightIssues: string;
  hepsiburadaDraftPayload: string;
  hepsiburadaQueueProductSync: string;
  hepsiburadaProductSyncQueued: string;
  hepsiburadaProductSyncTracking: string;
  hepsiburadaProductSyncJobStatus: string;
  hepsiburadaProductSyncCheckAgain: string;
  trendyolProductSyncQueued: string;
  trendyolProductSyncTracking: string;
  trendyolProductSyncJobStatus: string;
  trendyolProductSyncCheckAgain: string;
  brandName: string;
  supplierName: string;
  supplierTaxNumber: string;
  supplierEmail: string;
  supplierPhone: string;
  preferredSalesWarehouse: string;
  preferredPurchaseWarehouse: string;
  imageUrl: string;
  additionalImageUrls: string;
  additionalImageUrlsHint: string;
  category: string;
  discount: string;
  stockStatus: string;
  inStock: string;
  outOfStock: string;
  save: string;
  create: string;
  edit: string;
  delete: string;
  cancel: string;
  empty: string;
  opFailed: string;
  validationRequired: string;
  validationPrice: string;
  validationStock: string;
  validationCompareAtPrice: string;
  validationImageUrl: string;
  validationImageUrls: string;
  validationImageUrlsLimit: string;
  validationVariantRequired: string;
  validationVariantAttributes: string;
  validationVariantImageUrl: string;
  uploadImage: string;
  uploadImages: string;
  uploadingImage: string;
  uploadingImages: string;
  imageUploadFailed: string;
  imageUploadHint: string;
  features: string;
  featuresHint: string;
  featureKey: string;
  featureValue: string;
  highlightFeature: string;
  addFeature: string;
  removeFeature: string;
  importCsv: string;
  importTemplate: string;
  exportCsv: string;
  importHint: string;
  importSuccess: string;
  importFailed: string;
  exportFailed: string;
  createEntity: string;
  loading: string;
  notSpecified: string;
};

type ProductManagerProps = {
  labels: Labels;
  locale: Locale;
  initialResult: {
    items: Product[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  initialQuery: {
    search: string;
    categoryId: string;
    status: string;
    brandId: string;
    supplierId: string;
  };
  categories: Category[];
  brands: Brand[];
  suppliers: Supplier[];
  attributeDefinitions: AttributeDefinition[];
  warehouses: AdminWarehouseItem[];
  canDelete: boolean;
  canManageIntegrations: boolean;
};

type ProductForm = {
  slug: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  productType: string;
  status: string;
  unitType: string;
  price: string;
  purchasePrice: string;
  compareAtPrice: string;
  stock: string;
  vatRate: string;
  stockTrackingEnabled: boolean;
  salesEnabled: boolean;
  purchaseEnabled: boolean;
  internalNote: string;
  searchKeywords: string;
  brandId: string;
  primarySupplierId: string;
  preferredSalesWarehouseId: string;
  preferredPurchaseWarehouseId: string;
  imageUrl: string;
  imageUrls: string[];
  categoryId: string;
  features: ProductFeature[];
  attributeLinks: ProductAttributeLink[];
  variants: ProductVariant[];
};

type DrawerMode = "create" | "edit" | "variants";

type TrendyolPreflightResult = {
  productId: string;
  sku: string;
  title: string;
  readyForTrendyolProductV2: boolean;
  blockingIssues: string[];
  warnings: string[];
  mappedAttributeValueCount: number;
  variantCount: number;
  productV2DraftPayload: { items: unknown[] } | null;
};

type N11PreflightResult = {
  productId: string;
  sku: string;
  status: string;
  salesEnabled: boolean;
  descriptionLength: number;
  vatRate: number;
  derivedProductMainId: string;
  maxPurchaseQuantity: number;
  blockingIssues: string[];
  warnings: string[];
  readyForN11ProductUpdate: boolean;
  draftPayload: { payload: { skus: unknown[] } } | null;
};

type PazaramaPreflightResult = {
  productId: string;
  sku: string;
  title: string;
  readyForPazaramaProductSync: boolean;
  blockingIssues: string[];
  warnings: string[];
  mappedAttributeValueCount: number;
  variantCount: number;
  draftPayload: { products: unknown[] } | null;
};

type HepsiburadaPreflightResult = {
  productId: string;
  hbSku: string;
  sku: string;
  barcode: string | null;
  status: string;
  salesEnabled: boolean;
  descriptionLength: number;
  imageCount: number;
  blockingIssues: string[];
  warnings: string[];
  readyForHepsiburadaProductUpdate: boolean;
  draftPayload: { merchantId: string | null; items: unknown[] } | null;
};

type TrendyolProductSyncTracking = {
  productId: string;
  productTitle: string;
  sku: string;
  jobId: string | null;
  status: string;
};

type PazaramaProductSyncTracking = {
  productId: string;
  sku: string;
  title: string;
  jobId: string | null;
  status: string;
  batchRequestId: string | null;
  detailStatus: string | null;
  recommendedAction: string | null;
  lastCheckedAt: string | null;
};

type N11ProductSyncTracking = {
  productId: string;
  sku: string;
  jobId: string | null;
  status: string;
  taskId: string | null;
  detailStatus: string | null;
  recommendedAction: string | null;
  lastCheckedAt: string | null;
};

type HepsiburadaProductSyncTracking = {
  productId: string;
  hbSku: string;
  jobId: string | null;
  status: string;
};

type SyncTrackingCardData = {
  tone: "cyan" | "amber";
  label: string;
  title: string;
  sku: string;
  statusLabel: string;
  status: string;
  jobId: string | null;
  detailStatus: string | null;
  recommendedAction: string | null;
  lastCheckedAt: string | null;
  productId: string;
  busy: boolean;
  refreshLabel: string;
  onRefresh: () => void;
  onClose: () => void;
};

type PreflightCardData = {
  label: string;
  title: string;
  summary: string;
  ready: boolean;
  issuesLabel: string;
  warningsLabel: string;
  draftLabel: string;
  issues: string[];
  warnings: string[];
  draftPayload: unknown | null;
  canQueue: boolean;
  queueBusy: boolean;
  queueLabel: string;
  onQueue: () => void;
  onClose: () => void;
};

type ProductSyncJobResponse = {
  jobs?: Array<{ id: string; status: string }>;
};

type ProductSyncJobItem = {
  id: string;
  status: string;
};

type N11TaskResultResponse = {
  jobId: string;
  batchRequestId: string;
  result: Record<string, unknown>;
};

type PazaramaBatchResultResponse = {
  jobId: string;
  batchRequestId: string;
  result: {
    data?: {
      status?: number;
      failedProducts?: Array<{
        errorReason?: string;
      }>;
    };
  };
};

type VariantGenerationState = Record<string, string>;

const NONE_VALUE = "__none__";
const MAX_PRODUCT_IMAGES = 6;

const PRODUCT_TYPE_OPTIONS = [
  { value: "PHYSICAL", tr: "Fiziksel", en: "Physical" },
  { value: "SERVICE", tr: "Hizmet", en: "Service" },
  { value: "RAW_MATERIAL", tr: "Hammadde", en: "Raw Material" },
  { value: "SEMI_FINISHED", tr: "Yarı Mamul", en: "Semi Finished" },
] as const;

const PRODUCT_STATUS_OPTIONS = [
  { value: "DRAFT", labelKey: "statusDraft" },
  { value: "ACTIVE", labelKey: "statusActive" },
  { value: "ARCHIVED", labelKey: "statusArchived" },
] as const;

function renderSyncTrackingCard(data: SyncTrackingCardData, loadingLabel: string, cancelLabel: string) {
  const toneClass = data.tone === "cyan"
    ? "border-cyan-200 bg-cyan-50"
    : "border-amber-200 bg-amber-50";
  const labelClass = data.tone === "cyan"
    ? "text-cyan-700"
    : "text-amber-700";

  return (
    <div className={`mb-4 rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${labelClass}`}>{data.label}</p>
          <h3 className="mt-1 text-base font-semibold text-[color:var(--color-text)]">{data.title}</h3>
          <p className="mt-1 text-sm text-[color:var(--color-text)]">
            SKU: {data.sku} • {data.statusLabel}: {data.status}
            {data.jobId ? ` • Job: ${data.jobId}` : ""}
          </p>
          {data.detailStatus || data.recommendedAction || data.lastCheckedAt ? (
            <div className="mt-2 space-y-1 text-xs text-[color:var(--color-text)]">
              {data.detailStatus ? <p>Task durumu: {data.detailStatus}</p> : null}
              {data.recommendedAction ? <p>Önerilen aksiyon: {data.recommendedAction}</p> : null}
              {data.lastCheckedAt ? <p>Son kontrol: {data.lastCheckedAt}</p> : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={data.busy} onClick={data.onRefresh}>
            {data.busy ? loadingLabel : data.refreshLabel}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={data.onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderPreflightCard(data: PreflightCardData, loadingLabel: string, cancelLabel: string) {
  return (
    <div className={`mb-4 rounded-2xl border p-4 ${data.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{data.label}</p>
          <h3 className="mt-1 text-base font-semibold text-[color:var(--color-text)]">{data.title}</h3>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{data.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.canQueue ? (
            <Button type="button" size="sm" onClick={data.onQueue} disabled={data.queueBusy}>
              {data.queueBusy ? loadingLabel : data.queueLabel}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={data.onClose}>
            {cancelLabel}
          </Button>
        </div>
      </div>
      {data.issues.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-amber-900">{data.issuesLabel}</p>
          <ul className="mt-2 grid gap-1 text-sm text-amber-900">
            {data.issues.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.warnings.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-[color:var(--color-text)]">{data.warningsLabel}</p>
          <ul className="mt-2 grid gap-1 text-sm text-[color:var(--color-text)]">
            {data.warnings.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.draftPayload ? (
        <details className="mt-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-text)]">{data.draftLabel}</summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-50">
            {JSON.stringify(data.draftPayload, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readReason(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => readString(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(" | ") : null;
  }

  return null;
}

function normalizeN11ActionHint(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.includes("CONFIG_NOT_FOUND") || value.includes("CONFIG_INCOMPLETE")) {
    return "N11 bağlantı ayarlarını kontrol edin.";
  }

  if (value.includes("PRODUCT_NOT_FOUND")) {
    return "Ürün kaydını kontrol edin.";
  }

  if (value.includes("STOCK_CODE_REQUIRED")) {
    return "Stok kodunu tamamlayın.";
  }

  if (value.includes("TASK_ID_NOT_FOUND")) {
    return "N11 task referansı oluşmadı; işi yeniden kuyruğa alın.";
  }

  if (value.toUpperCase().includes("FAIL")) {
    return "N11 task sonucundaki hata nedenini inceleyin ve ürünü tekrar gönderin.";
  }

  return value;
}

async function readJsonSafely<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null;
}

const UNIT_TYPE_OPTIONS = [
  { value: "PIECE", tr: "Adet", en: "Piece" },
  { value: "KILOGRAM", tr: "Kilogram", en: "Kilogram" },
  { value: "GRAM", tr: "Gram", en: "Gram" },
  { value: "LITER", tr: "Litre", en: "Liter" },
  { value: "MILLILITER", tr: "Mililitre", en: "Milliliter" },
  { value: "METER", tr: "Metre", en: "Meter" },
  { value: "CENTIMETER", tr: "Santimetre", en: "Centimeter" },
  { value: "BOX", tr: "Kutu", en: "Box" },
  { value: "PACK", tr: "Paket", en: "Pack" },
] as const;

function isVariantRowEmpty(variant: ProductVariant) {
  return ![
    variant.slug,
    variant.sku,
    variant.barcode,
    variant.title,
    variant.optionSummary,
    variant.priceOverride,
    variant.purchasePriceOverride,
    variant.compareAtPriceOverride,
    variant.imageUrl,
    variant.stockOverride,
    variant.sortOrder,
    ...variant.attributes.map((attribute) => attribute.value),
  ].some((value) => value.trim());
}

function toPayload(form: ProductForm, options: { includeVariants?: boolean } = {}) {
  const stockTrackingEnabled = form.productType === "SERVICE" ? false : form.stockTrackingEnabled;
  const compareAtPrice = form.compareAtPrice.trim() ? Number(form.compareAtPrice) : null;
  const mergedImages = Array.from(
    new Set([form.imageUrl, ...(form.imageUrls ?? [])].map((value) => value.trim()).filter(Boolean)),
  ).slice(0, MAX_PRODUCT_IMAGES);
  const mainImage = mergedImages[0] ?? "";
  const additionalImages = mergedImages.slice(1);

  const imageUrls = Array.from(
    new Set(
      additionalImages
        .map((value) => value.trim())
        .filter((value) => Boolean(value) && value !== mainImage),
    ),
  );

  const features = form.features
    .map((feature) => ({
      key: feature.key.trim(),
      value: feature.value.trim(),
      highlighted: Boolean(feature.highlighted),
    }))
    .filter((feature) => feature.key && feature.value);

  const attributeLinks = form.attributeLinks
    .map((link, index) => ({
      attributeDefinitionId: link.attributeDefinitionId,
      isVariantAxis: Boolean(link.isVariantAxis),
      sortOrder: link.sortOrder ?? index,
    }))
    .filter((link) => link.attributeDefinitionId);

  const variants = form.variants
    .filter((variant) => !isVariantRowEmpty(variant))
    .map((variant, index) => ({
      ...(variant.id ? { id: variant.id } : {}),
      slug: variant.slug.trim(),
      sku: variant.sku.trim(),
      barcode: variant.barcode.trim() || null,
      title: variant.title.trim(),
      optionSummary: variant.optionSummary.trim(),
      priceOverride: variant.priceOverride.trim() ? Number(variant.priceOverride) : null,
      purchasePriceOverride: variant.purchasePriceOverride.trim() ? Number(variant.purchasePriceOverride) : null,
      compareAtPriceOverride: variant.compareAtPriceOverride.trim() ? Number(variant.compareAtPriceOverride) : null,
      imageUrl: variant.imageUrl.trim() || null,
      imageUrls: variant.imageUrls.map((item) => item.trim()).filter(Boolean),
      stockOverride: variant.stockOverride.trim() ? Number(variant.stockOverride) : null,
      salesEnabled: Boolean(variant.salesEnabled),
      isDefault: Boolean(variant.isDefault),
      sortOrder: variant.sortOrder.trim() ? Number(variant.sortOrder) : index,
      attributes: variant.attributes
        .map((attribute) => ({
          attributeDefinitionId: attribute.attributeDefinitionId,
          value: attribute.value.trim(),
        }))
        .filter((attribute) => attribute.attributeDefinitionId && attribute.value),
    }));

  return {
    slug: form.slug,
    sku: form.sku,
    barcode: form.barcode.trim() || null,
    name: form.name,
    description: form.description,
    productType: form.productType,
    status: form.status,
    unitType: form.unitType,
    price: Number(form.price),
    purchasePrice: form.purchasePrice.trim() ? Number(form.purchasePrice) : null,
    compareAtPrice,
    stock: stockTrackingEnabled ? Number(form.stock) : 0,
    vatRate: Number(form.vatRate),
    stockTrackingEnabled,
    salesEnabled: form.salesEnabled,
    purchaseEnabled: form.purchaseEnabled,
    internalNote: form.internalNote.trim() || null,
    searchKeywords: form.searchKeywords.split(",").map((item) => item.trim()).filter(Boolean),
    brandId: form.brandId.trim() || null,
    primarySupplierId: form.primarySupplierId.trim() || null,
    preferredSalesWarehouseId: form.preferredSalesWarehouseId.trim() || null,
    preferredPurchaseWarehouseId: form.preferredPurchaseWarehouseId.trim() || null,
    imageUrl: mainImage,
    imageUrls,
    features,
    categoryId: form.categoryId || null,
    ...(options.includeVariants ? { attributeLinks, variants } : {}),
  };
}

function createEmptyFeature(): ProductFeature {
  return {
    key: "",
    value: "",
    highlighted: false,
  };
}

function createEmptyVariant(): ProductVariant {
  return {
    slug: "",
    sku: "",
    barcode: "",
    title: "",
    optionSummary: "",
    priceOverride: "",
    purchasePriceOverride: "",
    compareAtPriceOverride: "",
    imageUrl: "",
    imageUrls: [],
    stockOverride: "",
    salesEnabled: true,
    isDefault: false,
    sortOrder: "",
    attributes: [],
  };
}

function buildVariantOptionSummary(
  attributes: ProductVariantValue[],
  activeAttributeLinks: ProductAttributeLink[],
  attributeDefinitions: AttributeDefinition[],
) {
  return activeAttributeLinks
    .map((link) => {
      const definition = attributeDefinitions.find((item) => item.id === link.attributeDefinitionId);
      const value = attributes.find((attribute) => attribute.attributeDefinitionId === link.attributeDefinitionId)?.value.trim() ?? "";

      if (!definition || !value) {
        return null;
      }

      return `${definition.name}: ${value}`;
    })
    .filter((item): item is string => Boolean(item))
    .join(" / ");
}

function buildVariantTitle(
  productName: string,
  attributes: ProductVariantValue[],
  activeAttributeLinks: ProductAttributeLink[],
  attributeDefinitions: AttributeDefinition[],
) {
  const baseName = productName.trim();
  const optionSummary = buildVariantOptionSummary(attributes, activeAttributeLinks, attributeDefinitions);

  if (!baseName) {
    return optionSummary;
  }

  if (!optionSummary) {
    return baseName;
  }

  return `${baseName} - ${optionSummary}`;
}

function normalizeSegment(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildVariantSuffix(
  attributes: ProductVariantValue[],
  activeAttributeLinks: ProductAttributeLink[],
) {
  return activeAttributeLinks
    .map((link) => attributes.find((attribute) => attribute.attributeDefinitionId === link.attributeDefinitionId)?.value.trim() ?? "")
    .filter(Boolean)
    .map((value) => normalizeSegment(value))
    .filter(Boolean)
    .join("-");
}

function buildVariantSlug(
  productSlug: string,
  attributes: ProductVariantValue[],
  activeAttributeLinks: ProductAttributeLink[],
) {
  const baseSlug = normalizeSegment(productSlug);
  const suffix = buildVariantSuffix(attributes, activeAttributeLinks);

  if (!baseSlug) {
    return suffix;
  }

  if (!suffix) {
    return baseSlug;
  }

  return `${baseSlug}-${suffix}`;
}

function buildVariantSku(
  productSku: string,
  attributes: ProductVariantValue[],
  activeAttributeLinks: ProductAttributeLink[],
) {
  const baseSku = productSku.trim().toUpperCase();
  const suffix = activeAttributeLinks
    .map((link) => attributes.find((attribute) => attribute.attributeDefinitionId === link.attributeDefinitionId)?.value.trim() ?? "")
    .filter(Boolean)
    .map((value) =>
      normalizeSegment(value)
        .replace(/-/g, "")
        .toUpperCase(),
    )
    .filter(Boolean)
    .join("-");

  if (!baseSku) {
    return suffix;
  }

  if (!suffix) {
    return baseSku;
  }

  return `${baseSku}-${suffix}`;
}

function parseGenerationValues(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getGalleryImages(form: ProductForm) {
  return Array.from(new Set([form.imageUrl, ...(form.imageUrls ?? [])].map((value) => value.trim()).filter(Boolean))).slice(0, MAX_PRODUCT_IMAGES);
}

function formatPrice(price: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    style: "currency",
    currency,
  }).format(price);
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function differenceInDays(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

export function ProductManager({
  labels,
  locale,
  initialResult,
  initialQuery,
  categories,
  brands,
  suppliers,
  attributeDefinitions,
  warehouses,
  canDelete,
  canManageIntegrations,
}: ProductManagerProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [variantDrawerProduct, setVariantDrawerProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery.search);
  const [categoryFilter, setCategoryFilter] = useState(initialQuery.categoryId);
  const [statusFilter, setStatusFilter] = useState(initialQuery.status || "all");
  const [brandFilter, setBrandFilter] = useState(initialQuery.brandId);
  const [supplierFilter, setSupplierFilter] = useState(initialQuery.supplierId);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [drawerFullscreen, setDrawerFullscreen] = useState(false);
  const [variantEditorIndex, setVariantEditorIndex] = useState<number | null>(null);
  const [openVariantActionMenuIndex, setOpenVariantActionMenuIndex] = useState<number | null>(null);
  const [variantAxisPickerOpen, setVariantAxisPickerOpen] = useState(false);
  const [variantAxisQuery, setVariantAxisQuery] = useState("");
  const [variantGenerationValues, setVariantGenerationValues] = useState<VariantGenerationState>({});
  const [variantGenerationOpen, setVariantGenerationOpen] = useState(false);
  const [openProductActionMenuId, setOpenProductActionMenuId] = useState<string | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [trendyolPreflightBusyId, setTrendyolPreflightBusyId] = useState<string | null>(null);
  const [trendyolPreflightResult, setTrendyolPreflightResult] = useState<TrendyolPreflightResult | null>(null);
  const [trendyolProductSyncBusyId, setTrendyolProductSyncBusyId] = useState<string | null>(null);
  const [trendyolProductSyncTracking, setTrendyolProductSyncTracking] = useState<TrendyolProductSyncTracking | null>(null);
  const [pazaramaPreflightBusyId, setPazaramaPreflightBusyId] = useState<string | null>(null);
  const [pazaramaPreflightResult, setPazaramaPreflightResult] = useState<PazaramaPreflightResult | null>(null);
  const [pazaramaProductSyncBusyId, setPazaramaProductSyncBusyId] = useState<string | null>(null);
  const [pazaramaProductSyncTracking, setPazaramaProductSyncTracking] = useState<PazaramaProductSyncTracking | null>(null);
  const [n11PreflightBusyId, setN11PreflightBusyId] = useState<string | null>(null);
  const [n11PreflightResult, setN11PreflightResult] = useState<N11PreflightResult | null>(null);
  const [n11ProductSyncBusyId, setN11ProductSyncBusyId] = useState<string | null>(null);
  const [n11ProductSyncTracking, setN11ProductSyncTracking] = useState<N11ProductSyncTracking | null>(null);
  const [hepsiburadaPreflightBusyId, setHepsiburadaPreflightBusyId] = useState<string | null>(null);
  const [hepsiburadaPreflightResult, setHepsiburadaPreflightResult] = useState<HepsiburadaPreflightResult | null>(null);
  const [hepsiburadaProductSyncBusyId, setHepsiburadaProductSyncBusyId] = useState<string | null>(null);
  const [hepsiburadaProductSyncTracking, setHepsiburadaProductSyncTracking] = useState<HepsiburadaProductSyncTracking | null>(null);
  const [brandOptions, setBrandOptions] = useState<Brand[]>(brands);
  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>(suppliers);
  const [attributeDefinitionOptions, setAttributeDefinitionOptions] = useState<AttributeDefinition[]>(attributeDefinitions);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const productActionMenuRef = useRef<HTMLDivElement | null>(null);
  const variantActionMenuRef = useRef<HTMLDivElement | null>(null);
  const variantAxisPickerRef = useRef<HTMLDivElement | null>(null);

  const emptyForm = useMemo<ProductForm>(
    () => ({
      slug: "",
      sku: "",
      barcode: "",
      name: "",
      description: "",
      productType: "PHYSICAL",
      status: "ACTIVE",
      unitType: "PIECE",
      price: "",
      purchasePrice: "",
      compareAtPrice: "",
      stock: "0",
      vatRate: "20",
      stockTrackingEnabled: true,
      salesEnabled: true,
      purchaseEnabled: true,
      internalNote: "",
      searchKeywords: "",
      brandId: "",
      primarySupplierId: "",
      preferredSalesWarehouseId: "",
      preferredPurchaseWarehouseId: "",
      imageUrl: "",
      imageUrls: [],
      categoryId: "",
      features: [],
      attributeLinks: [],
      variants: [],
    }),
    [],
  );

  const [createForm, setCreateForm] = useState<ProductForm>(emptyForm);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);

  const activeForm = drawerMode === "edit" || drawerMode === "variants" || variantDrawerProduct ? editForm : createForm;
  const activeTitle = drawerMode === "edit" ? labels.edit : labels.createTitle;
  const activeSubmit = drawerMode === "edit" ? labels.save : labels.create;
  const isStockManaged = activeForm.stockTrackingEnabled && activeForm.productType !== "SERVICE";
  const activeVariantEditor = variantEditorIndex !== null ? activeForm.variants[variantEditorIndex] ?? null : null;
  const selectedVariantAxisDefinitions = useMemo(
    () => activeForm.attributeLinks
      .map((link) => attributeDefinitionOptions.find((item) => item.id === link.attributeDefinitionId))
      .filter((item): item is AttributeDefinition => Boolean(item)),
    [activeForm.attributeLinks, attributeDefinitionOptions],
  );
  const filteredVariantAxisOptions = useMemo(() => {
    const normalizedQuery = variantAxisQuery.trim().toLocaleLowerCase("tr-TR");
    const activeDefinitions = attributeDefinitionOptions.filter((item) => item.isActive);

    if (!normalizedQuery) {
      return activeDefinitions;
    }

    return activeDefinitions.filter((item) =>
      item.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery)
      || item.slug.toLocaleLowerCase("tr-TR").includes(normalizedQuery),
    );
  }, [attributeDefinitionOptions, variantAxisQuery]);
  const variantGenerationSuggestions = useMemo(
    () =>
      selectedVariantAxisDefinitions.reduce<Record<string, string[]>>((acc, definition) => {
        acc[definition.id] = Array.from(
          new Set(
            activeForm.variants
              .map((variant) => variant.attributes.find((attribute) => attribute.attributeDefinitionId === definition.id)?.value.trim() ?? "")
              .filter(Boolean),
          ),
        );
        return acc;
      }, {}),
    [activeForm.variants, selectedVariantAxisDefinitions],
  );
  const currentEditingProduct = useMemo(
    () => (editingId ? initialResult.items.find((item) => item.id === editingId) ?? null : null),
    [editingId, initialResult.items],
  );
  const activeCurrency = currentEditingProduct?.currency ?? "TRY";

  useEffect(() => {
    if (!openProductActionMenuId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!productActionMenuRef.current?.contains(event.target as Node)) {
        setOpenProductActionMenuId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openProductActionMenuId]);

  useEffect(() => {
    if (openVariantActionMenuIndex === null) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!variantActionMenuRef.current?.contains(event.target as Node)) {
        setOpenVariantActionMenuIndex(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openVariantActionMenuIndex]);

  useEffect(() => {
    if (!variantAxisPickerOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!variantAxisPickerRef.current?.contains(event.target as Node)) {
        setVariantAxisPickerOpen(false);
        setVariantAxisQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [variantAxisPickerOpen]);

  const currentDecisionAlerts = useMemo(() => {
    if (!currentEditingProduct) {
      return [];
    }

    const alerts: Array<{ tone: "rose" | "amber" | "emerald"; text: string; href: string; cta: string }> = [];
    const margin = currentEditingProduct.grossMarginRate ?? null;
    const daysSinceLastOrder = currentEditingProduct.lastOrderedAt ? differenceInDays(currentEditingProduct.lastOrderedAt) : null;
    const inventoryHref = `/${locale}/admin/inventory/products?search=${encodeURIComponent(currentEditingProduct.sku)}`;
    const transactionHref = `/${locale}/admin/inventory/transactions?transactionSku=${encodeURIComponent(currentEditingProduct.sku)}`;

    if (margin != null && margin < 15) {
      alerts.push({ tone: "rose", text: labels.alertLowMargin, href: transactionHref, cta: labels.reviewTransactions });
    }

    if (currentEditingProduct.stock > 0 && (currentEditingProduct.soldQuantity === 0 || (daysSinceLastOrder != null && daysSinceLastOrder > 45))) {
      alerts.push({ tone: "amber", text: labels.alertSlowSales, href: transactionHref, cta: labels.reviewTransactions });
    }

    if (currentEditingProduct.stockValue > 0 && currentEditingProduct.stock > 0 && currentEditingProduct.inStock && currentEditingProduct.orderCount <= 1) {
      alerts.push({ tone: "amber", text: labels.alertStockRisk, href: inventoryHref, cta: labels.reviewInventory });
    }

    if (alerts.length === 0) {
      alerts.push({ tone: "emerald", text: labels.alertHealthy, href: inventoryHref, cta: labels.reviewInventory });
    }

    return alerts;
  }, [
    currentEditingProduct,
    labels.alertHealthy,
    labels.alertLowMargin,
    labels.alertSlowSales,
    labels.alertStockRisk,
    labels.reviewInventory,
    labels.reviewTransactions,
    locale,
  ]);

  function pushQuery(next: {
    search: string;
    categoryId: string;
    status: string;
    brandId: string;
    supplierId: string;
    page: number;
  }) {
    const params = new URLSearchParams();

    if (next.search.trim()) {
      params.set("search", next.search.trim());
    }

    if (next.categoryId.trim()) {
      params.set("categoryId", next.categoryId.trim());
    }

    if (next.status.trim() && next.status !== "all") {
      params.set("status", next.status.trim());
    }

    if (next.brandId.trim()) {
      params.set("brandId", next.brandId.trim());
    }

    if (next.supplierId.trim()) {
      params.set("supplierId", next.supplierId.trim());
    }

    if (next.page > 1) {
      params.set("page", String(next.page));
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function validateForm(form: ProductForm) {
    const requiresStock = form.stockTrackingEnabled && form.productType !== "SERVICE";

    if (!form.slug.trim() || !form.sku.trim() || !form.name.trim() || !form.description.trim() || !form.price.trim() || (requiresStock && !form.stock.trim()) || !form.vatRate.trim() || !form.imageUrl.trim()) {
      return labels.validationRequired;
    }

    const numericPrice = Number(form.price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      return labels.validationPrice;
    }

    const numericStock = Number(form.stock || "0");
    if (requiresStock && (!Number.isInteger(numericStock) || numericStock < 0)) {
      return labels.validationStock;
    }

    const numericVatRate = Number(form.vatRate);
    if (!Number.isInteger(numericVatRate) || numericVatRate < 0 || numericVatRate > 100) {
      return labels.validationRequired;
    }

    if (form.compareAtPrice.trim()) {
      const numericCompareAtPrice = Number(form.compareAtPrice);
      if (Number.isNaN(numericCompareAtPrice) || numericCompareAtPrice <= numericPrice) {
        return labels.validationCompareAtPrice;
      }
    }

    if (!isValidHttpUrl(form.imageUrl)) {
      return labels.validationImageUrl;
    }

    if ((form.imageUrls ?? []).some((item) => !isValidHttpUrl(item))) {
      return labels.validationImageUrls;
    }

    if (getGalleryImages(form).length > MAX_PRODUCT_IMAGES) {
      return labels.validationImageUrlsLimit;
    }

    return null;
  }

  function validateVariantForm(form: ProductForm) {
    const activeVariantAxisIds = form.attributeLinks
      .filter((link) => link.attributeDefinitionId && link.isVariantAxis)
      .map((link) => link.attributeDefinitionId);

    for (const variant of form.variants) {
      if (isVariantRowEmpty(variant)) {
        continue;
      }

      if (!variant.slug.trim() || !variant.sku.trim() || !variant.title.trim() || !variant.optionSummary.trim()) {
        return labels.validationVariantRequired;
      }

      if (variant.imageUrl.trim() && !isValidHttpUrl(variant.imageUrl)) {
        return labels.validationVariantImageUrl;
      }

      const filledAttributeCount = variant.attributes.filter(
        (attribute) => activeVariantAxisIds.includes(attribute.attributeDefinitionId) && attribute.value.trim(),
      ).length;

      if (filledAttributeCount !== activeVariantAxisIds.length) {
        return labels.validationVariantAttributes;
      }
    }

    return null;
  }

  function patchActiveForm(updater: (current: ProductForm) => ProductForm) {
    if (drawerMode === "edit" || drawerMode === "variants" || variantDrawerProduct) {
      setEditForm((prev) => updater(prev));
      return;
    }

    setCreateForm((prev) => updater(prev));
  }

  function patchActiveField(field: keyof ProductForm, value: string) {
    patchActiveForm((prev) => {
      if (field !== "name" && field !== "slug" && field !== "sku") {
        return { ...prev, [field]: value };
      }

      const nextName = field === "name" ? value : prev.name;
      const nextSlugBase = field === "slug" ? value : prev.slug;
      const nextSkuBase = field === "sku" ? value : prev.sku;

      return {
        ...prev,
        [field]: value,
        variants: prev.variants.map((variant) => {
          const previousTitle = buildVariantTitle(prev.name, variant.attributes, prev.attributeLinks, attributeDefinitionOptions);
          const nextTitle = buildVariantTitle(nextName, variant.attributes, prev.attributeLinks, attributeDefinitionOptions);
          const previousSlug = buildVariantSlug(prev.slug, variant.attributes, prev.attributeLinks);
          const nextSlug = buildVariantSlug(nextSlugBase, variant.attributes, prev.attributeLinks);
          const previousSku = buildVariantSku(prev.sku, variant.attributes, prev.attributeLinks);
          const nextSku = buildVariantSku(nextSkuBase, variant.attributes, prev.attributeLinks);

          return {
            ...variant,
            title: !variant.title.trim() || variant.title.trim() === previousTitle ? nextTitle : variant.title,
            slug: !variant.slug.trim() || variant.slug.trim() === previousSlug ? nextSlug : variant.slug,
            sku: !variant.sku.trim() || variant.sku.trim() === previousSku ? nextSku : variant.sku,
          };
        }),
      };
    });
  }

  function openCreateDrawer() {
    setError(null);
    setImportSummary(null);
    setEditingId(null);
    setCreateForm(emptyForm);
    setImageFiles([]);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
    setDrawerFullscreen(false);
    setDrawerMode("create");
  }

  function buildProductForm(product: Product): ProductForm {
    return {
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode ?? "",
      name: product.name,
      description: product.description,
      productType: product.productType,
      status: product.status,
      unitType: product.unitType,
      price: String(product.price),
      purchasePrice: product.purchasePrice ? String(product.purchasePrice) : "",
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "",
      stock: String(product.stock),
      vatRate: String(product.vatRate),
      stockTrackingEnabled: product.stockTrackingEnabled,
      salesEnabled: product.salesEnabled,
      purchaseEnabled: product.purchaseEnabled,
      internalNote: product.internalNote ?? "",
      searchKeywords: product.searchKeywords.join(", "),
      brandId: product.brandId ?? "",
      primarySupplierId: product.primarySupplierId ?? "",
      preferredSalesWarehouseId: product.preferredSalesWarehouseId ?? "",
      preferredPurchaseWarehouseId: product.preferredPurchaseWarehouseId ?? "",
      imageUrl: product.imageUrl,
      imageUrls: (product.imageUrls ?? []).slice(0, MAX_PRODUCT_IMAGES - 1),
      categoryId: product.categoryId ?? "",
      features: product.features.length > 0 ? product.features.map((feature) => ({ ...feature })) : [],
      attributeLinks: product.attributeLinks?.map((link, index) => ({
        attributeDefinitionId: link.attributeDefinitionId,
        isVariantAxis: link.isVariantAxis,
        sortOrder: link.sortOrder ?? index,
      })) ?? [],
      variants: product.variants?.map((variant, index) => ({
        id: variant.id,
        slug: variant.slug,
        sku: variant.sku,
        barcode: variant.barcode ?? "",
        title: variant.title,
        optionSummary: variant.optionSummary,
        priceOverride: variant.priceOverride != null ? String(variant.priceOverride) : "",
        purchasePriceOverride: variant.purchasePriceOverride != null ? String(variant.purchasePriceOverride) : "",
        compareAtPriceOverride: variant.compareAtPriceOverride != null ? String(variant.compareAtPriceOverride) : "",
        imageUrl: variant.imageUrl ?? "",
        imageUrls: variant.imageUrls ?? [],
        stockOverride: variant.stockOverride != null ? String(variant.stockOverride) : "",
        salesEnabled: variant.salesEnabled ?? true,
        isDefault: variant.isDefault ?? false,
        sortOrder: String(variant.sortOrder ?? index),
        attributes: variant.attributes.map((attribute) => ({ ...attribute })),
      })) ?? [],
    };
  }

  function openEditDrawer(product: Product) {
    setError(null);
    setImportSummary(null);
    setEditingId(product.id);
    setVariantDrawerProduct(null);
    setEditForm(buildProductForm(product));
    setImageFiles([]);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
    setDrawerFullscreen(false);
    setDrawerMode("edit");
  }

  function openVariantDrawer(product: Product) {
    setError(null);
    setImportSummary(null);
    setEditingId(product.id);
    setVariantDrawerProduct(product);
    setEditForm(buildProductForm(product));
    setVariantEditorIndex(null);
    setVariantGenerationOpen(false);
    setVariantAxisPickerOpen(false);
    setOpenVariantActionMenuIndex(null);
    setDrawerFullscreen(false);
    setDrawerMode("variants");
  }

  function closeDrawer() {
    if (loading) {
      return;
    }

    setDrawerMode(null);
    setEditingId(null);
    setVariantDrawerProduct(null);
    setImageFiles([]);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
    setDrawerFullscreen(false);
    setError(null);
  }

  function closeVariantDrawer(options: { force?: boolean } = {}) {
    if (loading && !options.force) {
      return;
    }

    setVariantDrawerProduct(null);
    setEditingId(null);
    setDrawerMode(null);
    setVariantEditorIndex(null);
    setVariantGenerationOpen(false);
    setVariantAxisPickerOpen(false);
    setOpenVariantActionMenuIndex(null);
    setError(null);
  }

  function openVariantEditor(index: number) {
    setError(null);
    setVariantEditorIndex(index);
  }

  function closeVariantEditor() {
    if (loading) {
      return;
    }

    setVariantEditorIndex(null);
  }

  function openVariantGenerationModal() {
    if (selectedVariantAxisDefinitions.length === 0) {
      setError(labels.generateVariantsEmptyAxes);
      return;
    }

    setError(null);
    setVariantGenerationValues(
      selectedVariantAxisDefinitions.reduce<VariantGenerationState>((acc, definition) => {
        acc[definition.id] = "";
        return acc;
      }, {}),
    );
    setVariantGenerationOpen(true);
  }

  function closeVariantGenerationModal() {
    if (loading) {
      return;
    }

    setVariantGenerationOpen(false);
  }

  function applyVariantGenerationSuggestion(definitionId: string, suggestion: string) {
    setVariantGenerationValues((prev) => {
      const currentValues = parseGenerationValues(prev[definitionId] ?? "");
      if (currentValues.includes(suggestion)) {
        return prev;
      }

      return {
        ...prev,
        [definitionId]: [...currentValues, suggestion].join(", "),
      };
    });
  }

  function applyAllVariantGenerationSuggestions() {
    setVariantGenerationValues((prev) =>
      selectedVariantAxisDefinitions.reduce<VariantGenerationState>((acc, definition) => {
        const currentValues = parseGenerationValues(prev[definition.id] ?? "");
        const suggestions = variantGenerationSuggestions[definition.id] ?? [];
        const merged = Array.from(new Set([...currentValues, ...suggestions]));
        acc[definition.id] = merged.join(", ");
        return acc;
      }, { ...prev }),
    );
  }


  function handleImageFileChange(files: FileList | null) {
    setImageFiles(files ? Array.from(files) : []);
  }

  function setMainImage(url: string) {
    patchActiveForm((prev) => {
      const merged = Array.from(new Set([url.trim(), prev.imageUrl.trim(), ...(prev.imageUrls ?? [])].map((value) => value.trim()).filter(Boolean))).slice(0, MAX_PRODUCT_IMAGES);
      const nextMain = merged.find((value) => value === url.trim()) ?? merged[0] ?? "";

      return {
        ...prev,
        imageUrl: nextMain,
        imageUrls: merged.filter((value) => value !== nextMain),
      };
    });
  }

  function removeImage(url: string) {
    patchActiveForm((prev) => {
      const remaining = getGalleryImages(prev).filter((value) => value !== url);
      const nextMain = remaining[0] ?? "";

      return {
        ...prev,
        imageUrl: nextMain,
        imageUrls: remaining.slice(1),
      };
    });
  }

  async function uploadImage() {
    if (imageFiles.length === 0) {
      return;
    }

    setImageUploading(true);
    setError(null);

    try {
      const galleryCount = getGalleryImages(activeForm).length;
      const availableSlots = MAX_PRODUCT_IMAGES - galleryCount;

      if (availableSlots <= 0) {
        setError(labels.validationImageUrlsLimit);
        return;
      }

      const filesToUpload = imageFiles.slice(0, availableSlots);
      const uploadedUrls: string[] = [];

      for (const imageFile of filesToUpload) {
        const formData = new FormData();
        formData.append("file", imageFile);

        if (activeForm.slug.trim()) {
          formData.append("slug", activeForm.slug.trim());
        }

        const response = await fetch("/api/admin/uploads/product-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          setError(payload?.message ?? labels.imageUploadFailed);
          return;
        }

        const payload = (await response.json()) as { item?: { url?: string } };
        const uploadedUrl = payload.item?.url;

        if (!uploadedUrl) {
          setError(labels.imageUploadFailed);
          return;
        }

        uploadedUrls.push(uploadedUrl);
      }

      if (uploadedUrls.length === 0) {
        setError(labels.imageUploadFailed);
        return;
      }

      patchActiveForm((prev) => {
        const uniqueUploaded = Array.from(new Set(uploadedUrls));
        const mergedGallery = Array.from(new Set([
          ...getGalleryImages(prev),
          ...uniqueUploaded,
        ]))
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, MAX_PRODUCT_IMAGES);

        const primaryImage = prev.imageUrl.trim() && mergedGallery.includes(prev.imageUrl.trim())
          ? prev.imageUrl.trim()
          : (mergedGallery[0] ?? "");

        return {
          ...prev,
          imageUrl: primaryImage,
          imageUrls: mergedGallery.filter((value) => value !== primaryImage),
        };
      });

      setImageFiles([]);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = "";
      }
    } catch {
      setError(labels.imageUploadFailed);
    } finally {
      setImageUploading(false);
    }
  }

  function patchFeature(index: number, patch: Partial<ProductFeature>) {
    if (drawerMode === "edit") {
      setEditForm((prev) => ({
        ...prev,
        features: prev.features.map((feature, featureIndex) => (
          featureIndex === index ? { ...feature, ...patch } : feature
        )),
      }));
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      features: prev.features.map((feature, featureIndex) => (
        featureIndex === index ? { ...feature, ...patch } : feature
      )),
    }));
  }

  function addFeatureRow() {
    if (drawerMode === "edit") {
      setEditForm((prev) => ({ ...prev, features: [...prev.features, createEmptyFeature()] }));
      return;
    }

    setCreateForm((prev) => ({ ...prev, features: [...prev.features, createEmptyFeature()] }));
  }

  function removeFeatureRow(index: number) {
    if (drawerMode === "edit") {
      setEditForm((prev) => ({
        ...prev,
        features: prev.features.filter((_, featureIndex) => featureIndex !== index),
      }));
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, featureIndex) => featureIndex !== index),
    }));
  }

  function toggleAttributeAxis(attributeDefinitionId: string) {
    patchActiveForm((prev) => {
      const existing = prev.attributeLinks.find((item) => item.attributeDefinitionId === attributeDefinitionId);
      if (existing) {
        return {
          ...prev,
          attributeLinks: prev.attributeLinks.filter((item) => item.attributeDefinitionId !== attributeDefinitionId),
          variants: prev.variants.map((variant) => {
            const nextAttributes = variant.attributes.filter((attribute) => attribute.attributeDefinitionId !== attributeDefinitionId);
            const previousSummary = buildVariantOptionSummary(variant.attributes, prev.attributeLinks, attributeDefinitionOptions);
            const nextLinks = prev.attributeLinks.filter((item) => item.attributeDefinitionId !== attributeDefinitionId);
            const nextSummary = buildVariantOptionSummary(nextAttributes, nextLinks, attributeDefinitionOptions);
            const previousTitle = buildVariantTitle(prev.name, variant.attributes, prev.attributeLinks, attributeDefinitionOptions);
            const nextTitle = buildVariantTitle(prev.name, nextAttributes, nextLinks, attributeDefinitionOptions);
            const previousSlug = buildVariantSlug(prev.slug, variant.attributes, prev.attributeLinks);
            const nextSlug = buildVariantSlug(prev.slug, nextAttributes, nextLinks);
            const previousSku = buildVariantSku(prev.sku, variant.attributes, prev.attributeLinks);
            const nextSku = buildVariantSku(prev.sku, nextAttributes, nextLinks);

            return {
              ...variant,
              attributes: nextAttributes,
              title: !variant.title.trim() || variant.title.trim() === previousTitle ? nextTitle : variant.title,
              slug: !variant.slug.trim() || variant.slug.trim() === previousSlug ? nextSlug : variant.slug,
              sku: !variant.sku.trim() || variant.sku.trim() === previousSku ? nextSku : variant.sku,
              optionSummary: !variant.optionSummary.trim() || variant.optionSummary.trim() === previousSummary ? nextSummary : variant.optionSummary,
            };
          }),
        };
      }

      return {
        ...prev,
        attributeLinks: [...prev.attributeLinks, { attributeDefinitionId, isVariantAxis: true, sortOrder: prev.attributeLinks.length }],
      };
    });
  }

  function patchVariant(index: number, patch: Partial<ProductVariant>) {
    patchActiveForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) => (variantIndex === index ? { ...variant, ...patch } : variant)),
    }));
  }

  function addVariantRow() {
    patchActiveForm((prev) => ({
      ...prev,
      variants: [...prev.variants, createEmptyVariant()],
    }));
  }

  function generateVariantRows() {
    const axisValueGroups = selectedVariantAxisDefinitions.map((definition) => ({
      definition,
      values: parseGenerationValues(variantGenerationValues[definition.id] ?? ""),
    }));

    if (axisValueGroups.some((group) => group.values.length === 0)) {
      setError(labels.validationVariantAttributes);
      return;
    }

    const combinations = axisValueGroups.reduce<Array<Array<{ attributeDefinitionId: string; value: string }>>>(
      (acc, group) => acc.flatMap((current) => group.values.map((value) => [...current, { attributeDefinitionId: group.definition.id, value }])),
      [[]],
    );

    patchActiveForm((prev) => {
      const existingKeys = new Set(
        prev.variants.map((variant) =>
          buildVariantOptionSummary(variant.attributes, prev.attributeLinks, attributeDefinitionOptions),
        ),
      );

      const nextVariants = [...prev.variants];

      for (const attributes of combinations) {
        const optionSummary = buildVariantOptionSummary(attributes, prev.attributeLinks, attributeDefinitionOptions);
        if (!optionSummary || existingKeys.has(optionSummary)) {
          continue;
        }

        const title = buildVariantTitle(prev.name, attributes, prev.attributeLinks, attributeDefinitionOptions);
        const slug = buildVariantSlug(prev.slug, attributes, prev.attributeLinks);
        const sku = buildVariantSku(prev.sku, attributes, prev.attributeLinks);

        nextVariants.push({
          ...createEmptyVariant(),
          title,
          slug,
          sku,
          optionSummary,
          sortOrder: String(nextVariants.length),
          attributes,
        });
        existingKeys.add(optionSummary);
      }

      return {
        ...prev,
        variants: nextVariants,
      };
    });

    setVariantGenerationOpen(false);
  }

  function removeVariantRow(index: number) {
    if (variantEditorIndex !== null) {
      if (variantEditorIndex === index) {
        setVariantEditorIndex(null);
      } else if (variantEditorIndex > index) {
        setVariantEditorIndex(variantEditorIndex - 1);
      }
    }

    patchActiveForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  function patchVariantAttribute(index: number, attributeDefinitionId: string, value: string) {
    patchActiveForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) {
          return variant;
        }

        const existing = variant.attributes.find((attribute) => attribute.attributeDefinitionId === attributeDefinitionId);
        let nextAttributes: ProductVariantValue[];
        if (existing) {
          nextAttributes = variant.attributes.map((attribute) => (
            attribute.attributeDefinitionId === attributeDefinitionId
              ? { ...attribute, value }
              : attribute
          ));

        } else {
          nextAttributes = [...variant.attributes, { attributeDefinitionId, value }];
        }

        const previousSummary = buildVariantOptionSummary(variant.attributes, prev.attributeLinks, attributeDefinitionOptions);
        const nextSummary = buildVariantOptionSummary(nextAttributes, prev.attributeLinks, attributeDefinitionOptions);
        const previousTitle = buildVariantTitle(prev.name, variant.attributes, prev.attributeLinks, attributeDefinitionOptions);
        const nextTitle = buildVariantTitle(prev.name, nextAttributes, prev.attributeLinks, attributeDefinitionOptions);
        const previousSlug = buildVariantSlug(prev.slug, variant.attributes, prev.attributeLinks);
        const nextSlug = buildVariantSlug(prev.slug, nextAttributes, prev.attributeLinks);
        const previousSku = buildVariantSku(prev.sku, variant.attributes, prev.attributeLinks);
        const nextSku = buildVariantSku(prev.sku, nextAttributes, prev.attributeLinks);

        return {
          ...variant,
          attributes: nextAttributes,
          title: !variant.title.trim() || variant.title.trim() === previousTitle ? nextTitle : variant.title,
          slug: !variant.slug.trim() || variant.slug.trim() === previousSlug ? nextSlug : variant.slug,
          sku: !variant.sku.trim() || variant.sku.trim() === previousSku ? nextSku : variant.sku,
          optionSummary: !variant.optionSummary.trim() || variant.optionSummary.trim() === previousSummary ? nextSummary : variant.optionSummary,
        };
      }),
    }));
  }

  async function exportProducts() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      if (categoryFilter.trim()) {
        params.set("categoryId", categoryFilter.trim());
      }
      if (statusFilter.trim() && statusFilter !== "all") {
        params.set("status", statusFilter.trim());
      }
      if (brandFilter.trim()) {
        params.set("brandId", brandFilter.trim());
      }
      if (supplierFilter.trim()) {
        params.set("supplierId", supplierFilter.trim());
      }

      const response = await fetch(`/api/admin/products/export?${params.toString()}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.exportFailed);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "products-export.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      setError(labels.exportFailed);
    } finally {
      setLoading(false);
    }
  }

  async function downloadImportTemplate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/products/import/template");
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.exportFailed);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "2bem-product-import-template.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      setError(labels.exportFailed);
    } finally {
      setLoading(false);
    }
  }

  async function importProductsCsv(file: File | null) {
    if (!file) {
      return;
    }

    setImportingCsv(true);
    setError(null);
    setImportSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        createdCount?: number;
        failedCount?: number;
        validatedCount?: number;
        errors?: Array<{ rowNumber: number; sheetName?: string; message: string }>;
      } | null;

      if (!response.ok) {
        setError(payload?.message ?? labels.importFailed);
        return;
      }

      const firstError = payload?.errors?.[0];
      setImportSummary(firstError
        ? `${labels.importSuccess} ${payload?.createdCount ?? 0} | ${labels.importFailed} ${payload?.failedCount ?? 0} | ${firstError.sheetName ? `${firstError.sheetName} ` : ""}Satır ${firstError.rowNumber}: ${firstError.message}`
        : `${labels.importSuccess} ${payload?.createdCount ?? 0}`);
      router.refresh();
    } catch {
      setError(labels.importFailed);
    } finally {
      setImportingCsv(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
    }
  }

  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = drawerMode === "edit" ? editForm : createForm;
    const validationError = validateForm(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(drawerMode === "edit" && editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
        method: drawerMode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toPayload(form)),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      setCreateForm(emptyForm);
      setDrawerMode(null);
      setEditingId(null);
      router.refresh();
    } catch {
      setError(labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  async function submitVariants(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const productId = variantDrawerProduct?.id ?? editingId;
    const validationError = validateVariantForm(editForm);

    if (!productId) {
      setError(labels.opFailed);
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = toPayload(editForm, { includeVariants: true });
      const response = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attributeLinks: payload.attributeLinks,
          variants: payload.variants,
        }),
      });

      if (!response.ok) {
        const responsePayload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(responsePayload?.message ?? labels.opFailed);
        return;
      }

      closeVariantDrawer({ force: true });
      router.refresh();
    } catch {
      setError(labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  async function checkTrendyolPreflight(productId: string) {
    await runMarketplacePreflight({
      productId,
      channel: "TRENDYOL",
      setBusyId: setTrendyolPreflightBusyId,
      onSuccess: (payload) => setTrendyolPreflightResult(payload as TrendyolPreflightResult),
    });
  }

  async function checkN11Preflight(productId: string) {
    await runMarketplacePreflight({
      productId,
      channel: "N11",
      setBusyId: setN11PreflightBusyId,
      onSuccess: (payload) => setN11PreflightResult(payload as N11PreflightResult),
    });
  }

  async function checkPazaramaPreflight(productId: string) {
    await runMarketplacePreflight({
      productId,
      channel: "PAZARAMA",
      setBusyId: setPazaramaPreflightBusyId,
      onSuccess: (payload) => setPazaramaPreflightResult(payload as PazaramaPreflightResult),
    });
  }

  async function checkHepsiburadaPreflight(productId: string) {
    await runMarketplacePreflight({
      productId,
      channel: "HEPSIBURADA",
      setBusyId: setHepsiburadaPreflightBusyId,
      onSuccess: (payload) => setHepsiburadaPreflightResult(payload as HepsiburadaPreflightResult),
    });
  }

  async function refreshN11ProductSyncTracking(tracking: N11ProductSyncTracking) {
    if (!tracking.jobId) {
      await checkN11Preflight(tracking.productId);
      return;
    }

    setN11PreflightBusyId(tracking.productId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/integrations/jobs/${tracking.jobId}/n11-task`);

      if (!response.ok) {
        const payload = await readJsonSafely<{ message?: string }>(response);
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      const payload = await response.json() as N11TaskResultResponse;
      const result = payload.result ?? {};
      const detailStatus = readString(result.status);
      const reason = readReason((result as { reasons?: unknown }).reasons)
        ?? readReason((result as { reason?: unknown }).reason)
        ?? readReason((result as { message?: unknown }).message);

      setN11ProductSyncTracking((current) => current && current.productId === tracking.productId
        ? {
            ...current,
            status: detailStatus?.toUpperCase().includes("FAIL") ? "FAILED" : current.status,
            taskId: payload.batchRequestId,
            detailStatus,
            recommendedAction: normalizeN11ActionHint(reason ?? detailStatus),
            lastCheckedAt: new Date().toLocaleString("tr-TR"),
          }
        : current);
    } catch {
      setError(labels.opFailed);
    } finally {
      setN11PreflightBusyId(null);
    }
  }

  async function refreshPazaramaProductSyncTracking(tracking: PazaramaProductSyncTracking) {
    if (!tracking.jobId) {
      await checkPazaramaPreflight(tracking.productId);
      return;
    }

    setPazaramaProductSyncBusyId(tracking.productId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/integrations/jobs/${tracking.jobId}/pazarama-batch`);

      if (!response.ok) {
        const payload = await readJsonSafely<{ message?: string }>(response);
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      const payload = await response.json() as PazaramaBatchResultResponse;
      const batchStatus = payload.result?.data?.status ?? null;
      const failedReason = payload.result?.data?.failedProducts?.map((item) => readString(item.errorReason)).filter((item): item is string => Boolean(item)).join(" | ") ?? null;
      const detailStatus = batchStatus === 1 ? "InProgress" : batchStatus === 2 ? "Done" : batchStatus === 3 ? "Error" : null;

      setPazaramaProductSyncTracking((current) => current && current.productId === tracking.productId
        ? {
            ...current,
            status: batchStatus === 3 ? "FAILED" : batchStatus === 2 ? "SUCCESS" : current.status,
            batchRequestId: payload.batchRequestId,
            detailStatus,
            recommendedAction: failedReason,
            lastCheckedAt: new Date().toLocaleString("tr-TR"),
          }
        : current);
    } catch {
      setError(labels.opFailed);
    } finally {
      setPazaramaProductSyncBusyId(null);
    }
  }

  async function queueTrendyolProductSync(result: TrendyolPreflightResult) {
    if (!result.readyForTrendyolProductV2) {
      return;
    }

    await queueMarketplaceProductSync({
      channel: "TRENDYOL",
      productId: result.productId,
      sku: result.sku,
      setBusyId: setTrendyolProductSyncBusyId,
      onSuccess: (job) => {
        setTrendyolProductSyncTracking({
          productId: result.productId,
          productTitle: result.title,
          sku: result.sku,
          jobId: job?.id ?? null,
          status: job?.status ?? "PENDING",
        });
        setImportSummary(labels.trendyolProductSyncQueued);
      },
    });
  }

  async function queuePazaramaProductSync(result: PazaramaPreflightResult) {
    if (!result.readyForPazaramaProductSync) {
      return;
    }

    await queueMarketplaceProductSync({
      channel: "PAZARAMA",
      productId: result.productId,
      sku: result.sku,
      setBusyId: setPazaramaProductSyncBusyId,
      onSuccess: (job) => {
        setPazaramaProductSyncTracking({
          productId: result.productId,
          sku: result.sku,
          title: result.title,
          jobId: job?.id ?? null,
          status: job?.status ?? "PENDING",
          batchRequestId: null,
          detailStatus: null,
          recommendedAction: null,
          lastCheckedAt: null,
        });
        setImportSummary(labels.pazaramaProductSyncQueued);
      },
    });
  }

  async function queueN11ProductSync(result: N11PreflightResult) {
    if (!result.readyForN11ProductUpdate) {
      return;
    }

    await queueMarketplaceProductSync({
      channel: "N11",
      productId: result.productId,
      sku: result.sku,
      setBusyId: setN11ProductSyncBusyId,
      onSuccess: (job) => {
        setN11ProductSyncTracking({
          productId: result.productId,
          sku: result.sku,
          jobId: job?.id ?? null,
          status: job?.status ?? "PENDING",
          taskId: null,
          detailStatus: null,
          recommendedAction: null,
          lastCheckedAt: null,
        });
        setImportSummary(labels.n11ProductSyncQueued);
      },
    });
  }

  async function queueHepsiburadaProductSync(result: HepsiburadaPreflightResult) {
    if (!result.readyForHepsiburadaProductUpdate) {
      return;
    }

    await queueMarketplaceProductSync({
      channel: "HEPSIBURADA",
      productId: result.productId,
      sku: result.hbSku,
      setBusyId: setHepsiburadaProductSyncBusyId,
      onSuccess: (job) => {
        setHepsiburadaProductSyncTracking({
          productId: result.productId,
          hbSku: result.hbSku,
          jobId: job?.id ?? null,
          status: job?.status ?? "PENDING",
        });
        setImportSummary(labels.hepsiburadaProductSyncQueued);
      },
    });
  }

  async function runMarketplacePreflight(args: {
    productId: string;
    channel: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA";
    setBusyId: (value: string | null) => void;
    onSuccess: (payload: TrendyolPreflightResult | PazaramaPreflightResult | N11PreflightResult | HepsiburadaPreflightResult) => void;
  }) {
    args.setBusyId(args.productId);
    setError(null);

    try {
      const query = args.channel === "TRENDYOL" ? "" : `?channel=${args.channel}`;
      const response = await fetch(`/api/admin/integrations/marketplaces/products/${args.productId}/preflight${query}`);

      if (!response.ok) {
        const payload = await readJsonSafely<{ message?: string }>(response);
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      const payload = await response.json() as TrendyolPreflightResult | PazaramaPreflightResult | N11PreflightResult | HepsiburadaPreflightResult;
      args.onSuccess(payload);
    } catch {
      setError(labels.opFailed);
    } finally {
      args.setBusyId(null);
    }
  }

  async function queueMarketplaceProductSync(args: {
    channel: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA";
    productId: string;
    sku: string;
    setBusyId: (value: string | null) => void;
    onSuccess: (job: ProductSyncJobItem | null) => void;
  }) {
    args.setBusyId(args.productId);
    setError(null);
    setImportSummary(null);

    try {
      const response = await fetch("/api/admin/integrations/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: args.channel,
          jobType: "PRODUCT_SYNC",
          entityType: "PRODUCT",
          entityIds: [args.productId],
          maxAttempts: 3,
          idempotencySuffix: `${args.sku}:${new Date().toISOString()}`,
          payload: {
            trigger: "PRODUCT_UPDATE",
            reference: args.sku,
          },
        }),
      });

      if (!response.ok) {
        const payload = await readJsonSafely<{ message?: string }>(response);
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      const payload = await response.json() as ProductSyncJobResponse;
      args.onSuccess(payload.jobs?.[0] ?? null);
    } catch {
      setError(labels.opFailed);
    } finally {
      args.setBusyId(null);
    }
  }

  async function deleteProduct(productId: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      router.refresh();
    } catch {
      setError(labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushQuery({
      search: searchQuery,
      categoryId: categoryFilter,
      status: statusFilter,
      brandId: brandFilter,
      supplierId: supplierFilter,
      page: 1,
    });
  }

  function goToPage(nextPage: number) {
    pushQuery({
      search: searchQuery,
      categoryId: categoryFilter,
      status: statusFilter,
      brandId: brandFilter,
      supplierId: supplierFilter,
      page: nextPage,
    });
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.listTitle}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{initialResult.total} ürün listeleniyor</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importFileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(event) => importProductsCsv(event.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="secondary" disabled={loading} onClick={downloadImportTemplate}>
            {labels.importTemplate}
          </Button>
          <Button type="button" variant="secondary" disabled={importingCsv} onClick={() => importFileInputRef.current?.click()}>
            {labels.importCsv}
          </Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={exportProducts}>
            {labels.exportCsv}
          </Button>
          <Button type="button" onClick={openCreateDrawer}>
            {labels.createTitle}
          </Button>
        </div>
      </div>

      <div className="p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
        {importSummary ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{importSummary}</p> : null}
        {trendyolProductSyncTracking ? renderSyncTrackingCard({
          tone: "cyan",
          label: labels.trendyolProductSyncTracking,
          title: trendyolProductSyncTracking.productTitle,
          sku: trendyolProductSyncTracking.sku,
          statusLabel: labels.trendyolProductSyncJobStatus,
          status: trendyolProductSyncTracking.status,
          jobId: trendyolProductSyncTracking.jobId,
          detailStatus: null,
          recommendedAction: null,
          lastCheckedAt: null,
          productId: trendyolProductSyncTracking.productId,
          busy: trendyolPreflightBusyId === trendyolProductSyncTracking.productId,
          refreshLabel: labels.trendyolProductSyncCheckAgain,
          onRefresh: () => void checkTrendyolPreflight(trendyolProductSyncTracking.productId),
          onClose: () => setTrendyolProductSyncTracking(null),
        }, labels.loading, labels.cancel) : null}
        {pazaramaProductSyncTracking ? renderSyncTrackingCard({
          tone: "amber",
          label: labels.pazaramaProductSyncTracking,
          title: pazaramaProductSyncTracking.title,
          sku: pazaramaProductSyncTracking.sku,
          statusLabel: labels.pazaramaProductSyncJobStatus,
          status: pazaramaProductSyncTracking.status,
          jobId: pazaramaProductSyncTracking.jobId,
          detailStatus: pazaramaProductSyncTracking.detailStatus,
          recommendedAction: pazaramaProductSyncTracking.recommendedAction,
          lastCheckedAt: pazaramaProductSyncTracking.lastCheckedAt,
          productId: pazaramaProductSyncTracking.productId,
          busy: pazaramaProductSyncBusyId === pazaramaProductSyncTracking.productId,
          refreshLabel: labels.pazaramaProductSyncCheckAgain,
          onRefresh: () => void refreshPazaramaProductSyncTracking(pazaramaProductSyncTracking),
          onClose: () => setPazaramaProductSyncTracking(null),
        }, labels.loading, labels.cancel) : null}
        {n11ProductSyncTracking ? renderSyncTrackingCard({
          tone: "amber",
          label: labels.n11ProductSyncTracking,
          title: n11ProductSyncTracking.sku,
          sku: n11ProductSyncTracking.sku,
          statusLabel: labels.n11ProductSyncJobStatus,
          status: n11ProductSyncTracking.status,
          jobId: n11ProductSyncTracking.jobId,
          detailStatus: n11ProductSyncTracking.detailStatus,
          recommendedAction: n11ProductSyncTracking.recommendedAction,
          lastCheckedAt: n11ProductSyncTracking.lastCheckedAt,
          productId: n11ProductSyncTracking.productId,
          busy: n11PreflightBusyId === n11ProductSyncTracking.productId,
          refreshLabel: labels.n11ProductSyncCheckAgain,
          onRefresh: () => void refreshN11ProductSyncTracking(n11ProductSyncTracking),
          onClose: () => setN11ProductSyncTracking(null),
        }, labels.loading, labels.cancel) : null}
        {hepsiburadaProductSyncTracking ? renderSyncTrackingCard({
          tone: "cyan",
          label: labels.hepsiburadaProductSyncTracking,
          title: hepsiburadaProductSyncTracking.hbSku,
          sku: hepsiburadaProductSyncTracking.hbSku,
          statusLabel: labels.hepsiburadaProductSyncJobStatus,
          status: hepsiburadaProductSyncTracking.status,
          jobId: hepsiburadaProductSyncTracking.jobId,
          detailStatus: null,
          recommendedAction: null,
          lastCheckedAt: null,
          productId: hepsiburadaProductSyncTracking.productId,
          busy: hepsiburadaPreflightBusyId === hepsiburadaProductSyncTracking.productId,
          refreshLabel: labels.hepsiburadaProductSyncCheckAgain,
          onRefresh: () => void checkHepsiburadaPreflight(hepsiburadaProductSyncTracking.productId),
          onClose: () => setHepsiburadaProductSyncTracking(null),
        }, labels.loading, labels.cancel) : null}
        {trendyolPreflightResult ? renderPreflightCard({
          label: labels.trendyolPreflight,
          title: trendyolPreflightResult.title,
          summary: `${trendyolPreflightResult.readyForTrendyolProductV2 ? labels.trendyolPreflightReady : labels.trendyolPreflightBlocked} SKU: ${trendyolPreflightResult.sku} • Varyant: ${trendyolPreflightResult.variantCount} • Mapping: ${trendyolPreflightResult.mappedAttributeValueCount}${trendyolPreflightResult.productV2DraftPayload ? ` • Payload item: ${trendyolPreflightResult.productV2DraftPayload.items.length}` : ""}`,
          ready: trendyolPreflightResult.readyForTrendyolProductV2,
          issuesLabel: labels.trendyolPreflightIssues,
          warningsLabel: labels.trendyolPreflightWarnings,
          draftLabel: labels.trendyolDraftPayload,
          issues: trendyolPreflightResult.blockingIssues,
          warnings: trendyolPreflightResult.warnings,
          draftPayload: trendyolPreflightResult.productV2DraftPayload,
          canQueue: trendyolPreflightResult.readyForTrendyolProductV2 && canManageIntegrations,
          queueBusy: trendyolProductSyncBusyId === trendyolPreflightResult.productId,
          queueLabel: labels.trendyolQueueProductSync,
          onQueue: () => void queueTrendyolProductSync(trendyolPreflightResult),
          onClose: () => setTrendyolPreflightResult(null),
        }, labels.loading, labels.cancel) : null}
        {pazaramaPreflightResult ? renderPreflightCard({
          label: labels.pazaramaPreflight,
          title: pazaramaPreflightResult.title,
          summary: `${pazaramaPreflightResult.readyForPazaramaProductSync ? labels.pazaramaPreflightReady : labels.pazaramaPreflightBlocked} SKU: ${pazaramaPreflightResult.sku} • Varyant: ${pazaramaPreflightResult.variantCount} • Mapping: ${pazaramaPreflightResult.mappedAttributeValueCount}${pazaramaPreflightResult.draftPayload ? ` • Payload ürün: ${pazaramaPreflightResult.draftPayload.products.length}` : ""}`,
          ready: pazaramaPreflightResult.readyForPazaramaProductSync,
          issuesLabel: labels.pazaramaPreflightIssues,
          warningsLabel: labels.pazaramaPreflightWarnings,
          draftLabel: labels.pazaramaDraftPayload,
          issues: pazaramaPreflightResult.blockingIssues,
          warnings: pazaramaPreflightResult.warnings,
          draftPayload: pazaramaPreflightResult.draftPayload,
          canQueue: pazaramaPreflightResult.readyForPazaramaProductSync && canManageIntegrations,
          queueBusy: pazaramaProductSyncBusyId === pazaramaPreflightResult.productId,
          queueLabel: labels.pazaramaQueueProductSync,
          onQueue: () => void queuePazaramaProductSync(pazaramaPreflightResult),
          onClose: () => setPazaramaPreflightResult(null),
        }, labels.loading, labels.cancel) : null}
        {n11PreflightResult ? renderPreflightCard({
          label: labels.n11Preflight,
          title: n11PreflightResult.sku,
          summary: `${n11PreflightResult.readyForN11ProductUpdate ? labels.n11PreflightReady : labels.n11PreflightBlocked} SKU: ${n11PreflightResult.sku} • KDV: %${n11PreflightResult.vatRate} • Açıklama: ${n11PreflightResult.descriptionLength} karakter${n11PreflightResult.draftPayload ? ` • Payload item: ${n11PreflightResult.draftPayload.payload.skus.length}` : ""}`,
          ready: n11PreflightResult.readyForN11ProductUpdate,
          issuesLabel: labels.n11PreflightIssues,
          warningsLabel: labels.n11PreflightWarnings,
          draftLabel: labels.n11DraftPayload,
          issues: n11PreflightResult.blockingIssues,
          warnings: n11PreflightResult.warnings,
          draftPayload: n11PreflightResult.draftPayload,
          canQueue: n11PreflightResult.readyForN11ProductUpdate && canManageIntegrations,
          queueBusy: n11ProductSyncBusyId === n11PreflightResult.productId,
          queueLabel: labels.n11QueueProductSync,
          onQueue: () => void queueN11ProductSync(n11PreflightResult),
          onClose: () => setN11PreflightResult(null),
        }, labels.loading, labels.cancel) : null}
        {hepsiburadaPreflightResult ? renderPreflightCard({
          label: labels.hepsiburadaPreflight,
          title: hepsiburadaPreflightResult.hbSku,
          summary: `${hepsiburadaPreflightResult.readyForHepsiburadaProductUpdate ? labels.hepsiburadaPreflightReady : labels.hepsiburadaPreflightBlocked} hbSku: ${hepsiburadaPreflightResult.hbSku} • Görsel: ${hepsiburadaPreflightResult.imageCount} • Açıklama: ${hepsiburadaPreflightResult.descriptionLength} karakter${hepsiburadaPreflightResult.draftPayload ? ` • Payload item: ${hepsiburadaPreflightResult.draftPayload.items.length}` : ""}`,
          ready: hepsiburadaPreflightResult.readyForHepsiburadaProductUpdate,
          issuesLabel: labels.hepsiburadaPreflightIssues,
          warningsLabel: labels.hepsiburadaPreflightWarnings,
          draftLabel: labels.hepsiburadaDraftPayload,
          issues: hepsiburadaPreflightResult.blockingIssues,
          warnings: hepsiburadaPreflightResult.warnings,
          draftPayload: hepsiburadaPreflightResult.draftPayload,
          canQueue: hepsiburadaPreflightResult.readyForHepsiburadaProductUpdate && canManageIntegrations,
          queueBusy: hepsiburadaProductSyncBusyId === hepsiburadaPreflightResult.productId,
          queueLabel: labels.hepsiburadaQueueProductSync,
          onQueue: () => void queueHepsiburadaProductSync(hepsiburadaPreflightResult),
          onClose: () => setHepsiburadaPreflightResult(null),
        }, labels.loading, labels.cancel) : null}
        <p className="mb-4 text-sm text-[color:var(--color-text-muted)]">{labels.importHint}</p>
        <form className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_220px_220px_220px_220px_auto]" onSubmit={applyFilters}>
          <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={labels.search} />
          <Select value={categoryFilter || NONE_VALUE} onValueChange={(value) => setCategoryFilter(value === NONE_VALUE ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder={labels.allCategories} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>{labels.allCategories}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={labels.allStatuses} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.allStatuses}</SelectItem>
              <SelectItem value="DRAFT">{labels.statusDraft}</SelectItem>
              <SelectItem value="ACTIVE">{labels.statusActive}</SelectItem>
              <SelectItem value="ARCHIVED">{labels.statusArchived}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={brandFilter || NONE_VALUE} onValueChange={(value) => setBrandFilter(value === NONE_VALUE ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder={labels.allBrands} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>{labels.allBrands}</SelectItem>
              {brandOptions.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supplierFilter || NONE_VALUE} onValueChange={(value) => setSupplierFilter(value === NONE_VALUE ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder={labels.allSuppliers} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>{labels.allSuppliers}</SelectItem>
              {supplierOptions.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">
            {labels.search}
          </Button>
        </form>

        <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)]">
          <div className="hidden grid-cols-[80px_1.15fr_1fr_1fr_150px_160px_180px_140px_80px] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
            <span>Görsel</span>
            <span>{labels.name}</span>
            <span>{labels.brand}</span>
            <span>{labels.category}</span>
            <span>{labels.price}</span>
            <span>{labels.variantsTitle}</span>
            <span>{labels.statusLabel}</span>
            <span>{labels.stockStatus}</span>
            <span className="text-right">İşlem</span>
          </div>

          {initialResult.items.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-border)]">
              {initialResult.items.map((product) => (
                <article key={product.id} className="grid gap-4 p-4 lg:grid-cols-[80px_1.15fr_1fr_1fr_150px_160px_180px_140px_80px] lg:items-center">
                  <div className="h-20 w-20 overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[color:var(--color-text)]">{product.name}</h3>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{product.slug} • {product.sku}</p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{labels.barcode}: {product.barcode ?? labels.notSpecified}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-[color:var(--color-text-muted)] lg:hidden">{product.description}</p>
                  </div>
                  <div className="text-sm text-[color:var(--color-text-muted)]">
                    <p>{product.brandName ?? labels.notSpecified}</p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{product.primarySupplierName ?? labels.notSpecified}</p>
                  </div>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{product.categoryName ?? labels.notSpecified}</p>
                  <div className="text-sm">
                    <p className="font-semibold text-[color:var(--color-text)]">{formatPrice(product.price, product.currency, locale)}</p>
                    {product.compareAtPrice ? (
                      <p className="text-xs text-[color:var(--color-text-muted)] line-through">{formatPrice(product.compareAtPrice, product.currency, locale)}</p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-3 text-sm">
                    <p className={`font-medium ${product.variantCount > 0 ? "text-[color:var(--color-text)]" : "text-amber-700"}`}>
                      {product.variantCount > 0 ? `${product.variantCount} varyant` : "Varyant yok"}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{product.variantAxisCount} eksen</p>
                    <Button
                      type="button"
                      size="sm"
                      variant={product.variantCount > 0 ? "secondary" : "outline"}
                      disabled={loading}
                      onClick={() => openVariantDrawer(product)}
                      className="mt-2 w-full"
                    >
                      {product.variantCount > 0 ? "Yönet" : "Tanımla"}
                    </Button>
                  </div>
                  <p className="text-sm font-medium text-[color:var(--color-text)]">
                    {product.status === "DRAFT" ? labels.statusDraft : product.status === "ARCHIVED" ? labels.statusArchived : labels.statusActive}
                  </p>
                  <div className="text-sm">
                    <p className={`font-medium ${product.inStock ? "text-emerald-700" : "text-red-600"}`}>
                      {product.inStock ? labels.inStock : labels.outOfStock} ({product.stock})
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {labels.orderCount}: {product.orderCount} • {labels.soldQuantity}: {product.soldQuantity}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {labels.grossRevenue}: {formatPrice(product.grossRevenue, product.currency, locale)}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {labels.averageUnitCost}: {product.averageUnitCost != null ? formatPrice(product.averageUnitCost, product.currency, locale) : labels.notSpecified}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {labels.stockValue}: {formatPrice(product.stockValue, product.currency, locale)}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {labels.grossProfit}: {formatPrice(product.grossProfit, product.currency, locale)}
                      {product.grossMarginRate != null ? ` • ${labels.grossMarginRate}: %${product.grossMarginRate}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {labels.lastOrderedAt}: {product.lastOrderedAt ? formatDate(product.lastOrderedAt, locale) : labels.notSpecified}
                    </p>
                  </div>
                  <div ref={openProductActionMenuId === product.id ? productActionMenuRef : null} className="relative flex justify-start lg:justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      disabled={loading && openProductActionMenuId !== product.id}
                      onClick={() => setOpenProductActionMenuId((current) => current === product.id ? null : product.id)}
                      aria-label="İşlemler"
                      title="İşlemler"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {openProductActionMenuId === product.id ? (
                      <div className="absolute right-auto top-11 z-10 min-w-48 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2 shadow-xl lg:right-0">
                        <button
                          type="button"
                          disabled={trendyolPreflightBusyId === product.id}
                          onClick={() => {
                            setOpenProductActionMenuId(null);
                            void checkTrendyolPreflight(product.id);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {trendyolPreflightBusyId === product.id ? labels.loading : labels.trendyolPreflight}
                        </button>
                        <button
                          type="button"
                          disabled={pazaramaPreflightBusyId === product.id}
                          onClick={() => {
                            setOpenProductActionMenuId(null);
                            void checkPazaramaPreflight(product.id);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pazaramaPreflightBusyId === product.id ? labels.loading : labels.pazaramaPreflight}
                        </button>
                        <button
                          type="button"
                          disabled={n11PreflightBusyId === product.id}
                          onClick={() => {
                            setOpenProductActionMenuId(null);
                            void checkN11Preflight(product.id);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {n11PreflightBusyId === product.id ? labels.loading : labels.n11Preflight}
                        </button>
                        <button
                          type="button"
                          disabled={hepsiburadaPreflightBusyId === product.id}
                          onClick={() => {
                            setOpenProductActionMenuId(null);
                            void checkHepsiburadaPreflight(product.id);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {hepsiburadaPreflightBusyId === product.id ? labels.loading : labels.hepsiburadaPreflight}
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setOpenProductActionMenuId(null);
                            openEditDrawer(product);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {labels.edit}
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setOpenProductActionMenuId(null);
                            openVariantDrawer(product);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {labels.variantsTitle}
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                              setOpenProductActionMenuId(null);
                              void deleteProduct(product.id);
                            }}
                            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {labels.delete}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" disabled={initialResult.page <= 1} onClick={() => goToPage(Math.max(1, initialResult.page - 1))}>
            {labels.prev}
          </Button>
          <span className="text-sm text-[color:var(--color-text-muted)]">
            {labels.page} {initialResult.page}/{initialResult.totalPages}
          </span>
          <Button type="button" variant="secondary" disabled={initialResult.page >= initialResult.totalPages} onClick={() => goToPage(Math.min(initialResult.totalPages, initialResult.page + 1))}>
            {labels.next}
          </Button>
        </div>
      </div>

      {drawerMode ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          {drawerMode !== "variants" ? (
          <aside className={`absolute right-0 top-0 flex h-full w-full flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl ${drawerFullscreen ? "max-w-none" : "max-w-xl"}`}>
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{activeTitle}</h3>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setDrawerFullscreen((prev) => !prev)}
                  disabled={loading}
                  aria-label={drawerFullscreen ? "Daralt" : "Tam ekran"}
                  title={drawerFullscreen ? "Daralt" : "Tam ekran"}
                >
                  {drawerFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={loading}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <form className="grid gap-5 p-5" onSubmit={submitProduct}>
              <section className="grid gap-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Ürün Kartı</p>
                  <h4 className="mt-1 text-base font-semibold text-[color:var(--color-text)]">Temel ürün bilgileri</h4>
                  <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Ürünün kimlik, tür ve vitrin bilgisini bu alandan yönetin.</p>
                </div>

                <div className="grid gap-2">
                  <Label>{labels.name}</Label>
                  <Input value={activeForm.name} onChange={(event) => patchActiveField("name", event.target.value)} required />
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>{labels.slug}</Label>
                    <Input value={activeForm.slug} onChange={(event) => patchActiveField("slug", event.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>{labels.sku}</Label>
                    <Input value={activeForm.sku} onChange={(event) => patchActiveField("sku", event.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>{labels.barcode}</Label>
                    <Input value={activeForm.barcode} onChange={(event) => patchActiveField("barcode", event.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>{labels.productType}</Label>
                    <Select value={activeForm.productType} onValueChange={(value) => patchActiveField("productType", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.tr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{labels.statusLabel}</Label>
                    <Select value={activeForm.status} onValueChange={(value) => patchActiveField("status", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {labels[option.labelKey]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{labels.unitType}</Label>
                    <Select value={activeForm.unitType} onValueChange={(value) => patchActiveField("unitType", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.tr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Label>{labels.category}</Label>
                  <div className="grid gap-2">
                    <Select value={activeForm.categoryId || NONE_VALUE} onValueChange={(value) => patchActiveField("categoryId", value === NONE_VALUE ? "" : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={labels.notSpecified} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>{labels.notSpecified}</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{labels.brand}</Label>
                    <div className="grid gap-2">
                      <SearchableSelect
                        value={activeForm.brandId || NONE_VALUE}
                        onValueChange={(value) => patchActiveField("brandId", value === NONE_VALUE ? "" : value)}
                        options={[
                          { value: NONE_VALUE, label: labels.notSpecified },
                          ...brandOptions
                            .filter((brand) => brand.isActive)
                            .map((brand) => ({ value: brand.id, label: brand.name })),
                        ]}
                        placeholder={labels.notSpecified}
                        searchPlaceholder={labels.searchBrand}
                        emptyLabel={labels.noBrandResults}
                      />
                      <Link href={`/${locale}/admin/brands`} className="text-xs font-medium text-[color:var(--color-text-muted)] underline underline-offset-4">
                        {labels.manageBrands}
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>{labels.description}</Label>
                  <Textarea value={activeForm.description} onChange={(event) => patchActiveField("description", event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>{labels.searchKeywords}</Label>
                  <Input value={activeForm.searchKeywords} onChange={(event) => patchActiveField("searchKeywords", event.target.value)} placeholder="anahtar1, anahtar2" />
                  <p className="text-xs text-[color:var(--color-text-muted)]">{labels.searchKeywordsHint}</p>
                </div>
              </section>

              <section className="grid gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Stok Kartı</p>
                    <h4 className="mt-1 text-base font-semibold text-[color:var(--color-text)]">Stok ve satın alma ayarları</h4>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Paraşüt benzeri stok takibi, depo tercihi ve maliyet alanlarını birlikte yönetin.</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-[color:var(--color-surface)]/80 px-3 py-2 text-xs text-[color:var(--color-text-muted)] shadow-sm">
                    <p className="font-semibold text-[color:var(--color-text)]">Stok durumu</p>
                    <p className="mt-1">{isStockManaged ? "Takip aktif" : "Takip kapalı"}</p>
                  </div>
                </div>

                {drawerMode === "edit" && currentEditingProduct ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <article className="rounded-xl border border-emerald-200 bg-[color:var(--color-surface)]/90 p-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">{labels.grossProfit}</p>
                        <p className="mt-2 text-lg font-semibold text-[color:var(--color-text)]">
                          {formatPrice(currentEditingProduct.grossProfit, currentEditingProduct.currency, locale)}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                          {currentEditingProduct.grossMarginRate != null ? `${labels.grossMarginRate}: %${currentEditingProduct.grossMarginRate}` : labels.notSpecified}
                        </p>
                      </article>
                      <article className="rounded-xl border border-cyan-200 bg-[color:var(--color-surface)]/90 p-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">{labels.stockValue}</p>
                        <p className="mt-2 text-lg font-semibold text-[color:var(--color-text)]">
                          {formatPrice(currentEditingProduct.stockValue, currentEditingProduct.currency, locale)}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                          {labels.averageUnitCost}: {currentEditingProduct.averageUnitCost != null ? formatPrice(currentEditingProduct.averageUnitCost, currentEditingProduct.currency, locale) : labels.notSpecified}
                        </p>
                      </article>
                      <article className="rounded-xl border border-amber-200 bg-[color:var(--color-surface)]/90 p-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{labels.soldQuantity}</p>
                        <p className="mt-2 text-lg font-semibold text-[color:var(--color-text)]">{currentEditingProduct.soldQuantity}</p>
                        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{labels.orderCount}: {currentEditingProduct.orderCount}</p>
                      </article>
                      <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/90 p-3 shadow-sm">
                        <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.grossRevenue}</p>
                        <p className="mt-2 text-lg font-semibold text-[color:var(--color-text)]">
                          {formatPrice(currentEditingProduct.grossRevenue, currentEditingProduct.currency, locale)}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                          {labels.lastOrderedAt}: {currentEditingProduct.lastOrderedAt ? formatDate(currentEditingProduct.lastOrderedAt, locale) : labels.notSpecified}
                        </p>
                      </article>
                    </div>

                    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/90 p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">{labels.decisionAlerts}</p>
                      <div className="mt-3 grid gap-2">
                        {currentDecisionAlerts.map((alert) => (
                          <div
                            key={alert.text}
                            className={`rounded-lg border px-3 py-2 text-sm ${
                              alert.tone === "rose"
                                ? "border-rose-200 bg-rose-50 text-rose-800"
                                : alert.tone === "amber"
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <span>{alert.text}</span>
                              <Link
                                href={alert.href}
                                className="text-xs font-semibold underline decoration-current underline-offset-4"
                                onClick={closeDrawer}
                              >
                                {alert.cta}
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                <label className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-[color:var(--color-surface)]/80 p-3 text-sm text-[color:var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={activeForm.productType === "SERVICE" ? false : activeForm.stockTrackingEnabled}
                    onChange={(event) => patchActiveForm((prev) => ({ ...prev, stockTrackingEnabled: event.target.checked }))}
                    disabled={activeForm.productType === "SERVICE"}
                    className={checkboxClassName}
                  />
                  <span>{labels.stockTrackingEnabled}</span>
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80 p-3 text-sm text-[color:var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={activeForm.salesEnabled}
                      onChange={(event) => patchActiveForm((prev) => ({ ...prev, salesEnabled: event.target.checked }))}
                      className={checkboxClassName}
                    />
                    <span>{labels.salesEnabled}</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/80 p-3 text-sm text-[color:var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={activeForm.purchaseEnabled}
                      onChange={(event) => patchActiveForm((prev) => ({ ...prev, purchaseEnabled: event.target.checked }))}
                      className={checkboxClassName}
                    />
                    <span>{labels.purchaseEnabled}</span>
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.stock}</p>
                    <div className="mt-2 grid gap-2">
                      <Label>{labels.stock}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={activeForm.stock}
                        onChange={(event) => patchActiveField("stock", event.target.value)}
                        required={isStockManaged}
                        disabled={!isStockManaged}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.purchasePrice}</p>
                    <div className="mt-2 grid gap-2">
                      <Label>{labels.purchasePrice}</Label>
                      <Input type="number" min="0" step="0.01" value={activeForm.purchasePrice} onChange={(event) => patchActiveField("purchasePrice", event.target.value)} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.vatRate}</p>
                    <div className="mt-2 grid gap-2">
                      <Label>{labels.vatRate}</Label>
                      <Input type="number" min="0" max="100" step="1" value={activeForm.vatRate} onChange={(event) => patchActiveField("vatRate", event.target.value)} required />
                    </div>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.compareAtPrice}</p>
                    <div className="mt-2 grid gap-2">
                      <Label>{labels.compareAtPrice}</Label>
                      <Input type="number" min="0" step="0.01" value={activeForm.compareAtPrice} onChange={(event) => patchActiveField("compareAtPrice", event.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.supplier}</p>
                    <div className="mt-2 grid gap-2">
                      <Label>{labels.supplier}</Label>
                      <div className="grid gap-2">
                        <SearchableSelect
                          value={activeForm.primarySupplierId || NONE_VALUE}
                          onValueChange={(value) => patchActiveField("primarySupplierId", value === NONE_VALUE ? "" : value)}
                          options={[
                            { value: NONE_VALUE, label: labels.notSpecified },
                            ...supplierOptions
                              .filter((supplier) => supplier.isActive)
                              .map((supplier) => ({
                                value: supplier.id,
                                label: supplier.name,
                                description: supplier.taxNumber || supplier.email || supplier.phone || undefined,
                              })),
                          ]}
                          placeholder={labels.notSpecified}
                          searchPlaceholder={labels.searchSupplier}
                          emptyLabel={labels.noSupplierResults}
                        />
                        <Link href={`/${locale}/admin/suppliers`} className="text-xs font-medium text-[color:var(--color-text-muted)] underline underline-offset-4">
                          {labels.manageSuppliers}
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">Satın alma deposu</p>
                    <div className="mt-2 grid gap-2">
                      <Label>{labels.preferredPurchaseWarehouse}</Label>
                      <Select
                        value={activeForm.preferredPurchaseWarehouseId || NONE_VALUE}
                        onValueChange={(value) => patchActiveField("preferredPurchaseWarehouseId", value === NONE_VALUE ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={labels.notSpecified} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>{labels.notSpecified}</SelectItem>
                          {warehouses.filter((warehouse) => warehouse.isActive).map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">Satış deposu</p>
                    <div className="mt-2 grid gap-2">
                      <Label>{labels.preferredSalesWarehouse}</Label>
                      <Select
                        value={activeForm.preferredSalesWarehouseId || NONE_VALUE}
                        onValueChange={(value) => patchActiveField("preferredSalesWarehouseId", value === NONE_VALUE ? "" : value)}
                        disabled={!isStockManaged}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={labels.notSpecified} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>{labels.notSpecified}</SelectItem>
                          {warehouses.filter((warehouse) => warehouse.isActive).map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.internalNote}</p>
                    <div className="mt-2 grid gap-2">
                      <Label>{labels.internalNote}</Label>
                      <Textarea value={activeForm.internalNote} onChange={(event) => patchActiveField("internalNote", event.target.value)} />
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-2">
                <Label>{labels.features}</Label>
                <div className="grid gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-3">
                  {activeForm.features.length === 0 ? (
                    <p className="text-xs text-[color:var(--color-text-muted)]">{labels.featuresHint}</p>
                  ) : null}

                  {activeForm.features.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                      <table className="min-w-full divide-y divide-[color:var(--color-border)] text-sm">
                        <thead className="bg-[color:var(--color-bg-soft)] text-left text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
                          <tr>
                            <th className="px-3 py-2 font-medium">{labels.featureKey}</th>
                            <th className="px-3 py-2 font-medium">{labels.featureValue}</th>
                            <th className="px-3 py-2 font-medium">{labels.highlightFeature}</th>
                            <th className="px-3 py-2 text-right font-medium">
                              <span className="sr-only">{labels.removeFeature}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[color:var(--color-border)]">
                          {activeForm.features.map((feature, index) => (
                            <tr key={`feature-${index}`}>
                              <td className="px-3 py-2">
                                <Input
                                  value={feature.key}
                                  onChange={(event) => patchFeature(index, { key: event.target.value })}
                                  placeholder="Tip"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  value={feature.value}
                                  onChange={(event) => patchFeature(index, { value: event.target.value })}
                                  placeholder="Kule Tipi"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <label className="flex items-center gap-2 text-xs font-medium text-[color:var(--color-text)]">
                                  <input
                                    type="checkbox"
                                    checked={feature.highlighted}
                                    onChange={(event) => patchFeature(index, { highlighted: event.target.checked })}
                                    className={checkboxClassName}
                                  />
                                  <span>{labels.highlightFeature}</span>
                                </label>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button type="button" size="sm" variant="outline" onClick={() => removeFeatureRow(index)}>
                                  {labels.removeFeature}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <div>
                    <Button type="button" size="sm" variant="secondary" onClick={addFeatureRow}>
                      {labels.addFeature}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-[color:var(--color-text-muted)]">{labels.featuresHint}</p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{labels.price}</Label>
                  <Input type="number" min="0" step="0.01" value={activeForm.price} onChange={(event) => patchActiveField("price", event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>{labels.imageUrl}</Label>
                  <Input value={activeForm.imageUrl} onChange={(event) => patchActiveField("imageUrl", event.target.value)} required />
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-xs text-[color:var(--color-text-muted)]">{`Toplam görsel adedi: ${getGalleryImages(activeForm).length}/${MAX_PRODUCT_IMAGES}`}</p>
                <div className="grid gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="grid gap-1">
                    <Label>{labels.uploadImages}</Label>
                    <Input
                      ref={imageFileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                      onChange={(event) => handleImageFileChange(event.target.files)}
                    />
                    <p className="text-xs text-[color:var(--color-text-muted)]">{labels.imageUploadHint}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={imageFiles.length === 0 || imageUploading}
                    onClick={uploadImage}
                  >
                    {imageUploading ? labels.uploadingImages : labels.uploadImages}
                  </Button>
                </div>

                {getGalleryImages(activeForm).length > 0 ? (
                  <div className="grid gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-3">
                    <p className="text-xs text-[color:var(--color-text-muted)]">Bir görseli ana görsel olarak seçin.</p>
                    <p className="text-xs text-[color:var(--color-text-muted)]">Ana görsel, ürün listesi ve detay sayfasında öne çıkan görsel olarak kullanılır.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {getGalleryImages(activeForm).map((url) => {
                        const isMain = url === activeForm.imageUrl;

                        return (
                          <div key={url} className={`overflow-hidden rounded-lg border ${isMain ? "border-emerald-500" : "border-[color:var(--color-border)]"} bg-[color:var(--color-surface)]`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-32 w-full object-cover" />
                            <div className="flex items-center justify-between gap-2 p-2">
                              <Button type="button" size="sm" variant={isMain ? "default" : "outline"} onClick={() => setMainImage(url)}>
                                {isMain ? "Ana Görsel" : "Ana Yap"}
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => removeImage(url)}>
                                Sil
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-2 flex justify-end gap-2 border-t border-[color:var(--color-border)] pt-5">
                <Button type="button" variant="secondary" onClick={closeDrawer} disabled={loading}>
                  {labels.cancel}
                </Button>
                <Button type="submit" disabled={loading || imageUploading}>
                  {loading ? labels.loading : activeSubmit}
                </Button>
              </div>
            </form>
          </aside>
          ) : (
            <aside className={`absolute right-0 top-0 flex h-full w-full flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl ${drawerFullscreen ? "max-w-none" : "max-w-5xl"}`}>
              <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.variantsTitle}</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight">{variantDrawerProduct?.name ?? labels.variantsTitle}</h3>
                  <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.variantsHint}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setDrawerFullscreen((prev) => !prev)}
                    disabled={loading}
                    aria-label={drawerFullscreen ? "Daralt" : "Tam ekran"}
                    title={drawerFullscreen ? "Daralt" : "Tam ekran"}
                  >
                    {drawerFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={loading}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <form className="grid gap-5 p-5" onSubmit={submitVariants}>
                <section className="grid gap-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">Varyant Tanımı</p>
                      <h4 className="mt-1 text-base font-semibold text-[color:var(--color-text)]">{labels.attributesTitle}</h4>
                      <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.variantAxesHint}</p>
                      <Link href={`/${locale}/admin/product-attributes`} className="mt-2 inline-flex text-sm font-medium text-[color:var(--color-text)] underline underline-offset-4">
                        {labels.manageAttributeDefinitions}
                      </Link>
                    </div>
                    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-2 text-sm text-[color:var(--color-text-muted)]">
                      <p className="font-semibold text-[color:var(--color-text)]">{variantDrawerProduct?.sku ?? activeForm.sku}</p>
                      <p className="mt-1 text-xs">{activeForm.variants.length} varyant • {selectedVariantAxisDefinitions.length} eksen</p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>{labels.variantAxes}</Label>
                    <div ref={variantAxisPickerRef} className="grid gap-3">
                      <button
                        type="button"
                        onClick={() => setVariantAxisPickerOpen((current) => !current)}
                        className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-left text-sm"
                      >
                        <span className={selectedVariantAxisDefinitions.length > 0 ? "text-[color:var(--color-text)]" : "text-[color:var(--color-text-muted)]"}>
                          {selectedVariantAxisDefinitions.length > 0
                            ? `${selectedVariantAxisDefinitions.map((item) => item.name).join(", ")}`
                            : labels.variantAxesHint}
                        </span>
                        <span className="text-xs font-medium text-[color:var(--color-text-muted)]">
                          {selectedVariantAxisDefinitions.length > 0 ? `${selectedVariantAxisDefinitions.length}` : "Sec"}
                        </span>
                      </button>

                      {selectedVariantAxisDefinitions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedVariantAxisDefinitions.map((definition) => (
                            <button
                              key={`selected-axis-${definition.id}`}
                              type="button"
                              onClick={() => toggleAttributeAxis(definition.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
                            >
                              <span>{definition.name}</span>
                              <span aria-hidden="true">x</span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {variantAxisPickerOpen ? (
                        <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 shadow-xl">
                          <Input
                            value={variantAxisQuery}
                            onChange={(event) => setVariantAxisQuery(event.target.value)}
                            placeholder={labels.search}
                            className="h-10"
                          />
                          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                            {filteredVariantAxisOptions.length === 0 ? (
                              <p className="px-2 py-3 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
                            ) : filteredVariantAxisOptions.map((definition) => {
                              const active = activeForm.attributeLinks.some((item) => item.attributeDefinitionId === definition.id);
                              return (
                                <label
                                  key={definition.id}
                                  className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm ${active ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)]"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={() => toggleAttributeAxis(definition.id)}
                                    className={`${checkboxClassName} mt-0.5`}
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-medium">{definition.name}</span>
                                    <span className="block text-xs text-[color:var(--color-text-muted)]">{definition.slug}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>{labels.variantsTitle}</Label>
                        <p className="text-xs text-[color:var(--color-text-muted)]">{labels.variantsHint}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={openVariantGenerationModal}>
                          {labels.generateVariants}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={addVariantRow}>
                          {labels.addVariant}
                        </Button>
                      </div>
                    </div>

                    {activeForm.variants.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-4 text-sm text-[color:var(--color-text-muted)]">{labels.variantEmptyState}</p>
                    ) : null}

                    {activeForm.variants.length > 0 ? (
                      <div className={`rounded-2xl border border-[color:var(--color-border)] ${openVariantActionMenuIndex === null ? "overflow-x-auto" : "overflow-visible"}`}>
                        <table className="min-w-full divide-y divide-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm">
                          <thead className="bg-[color:var(--color-bg-soft)] text-left text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
                            <tr>
                              <th className="px-3 py-2 font-medium">{labels.variantTitle}</th>
                              <th className="px-3 py-2 font-medium">{labels.sku}</th>
                              <th className="px-3 py-2 font-medium">{labels.price}</th>
                              <th className="px-3 py-2 font-medium">{labels.statusLabel}</th>
                              <th className="px-3 py-2 text-right font-medium">
                                <span className="sr-only">{labels.variantDetails}</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[color:var(--color-border)]">
                            {activeForm.variants.map((variant, index) => (
                              <tr key={`variant-${index}`} className="align-top">
                                <td className="px-3 py-3">
                                  <div className="space-y-1">
                                    <p className="font-medium text-[color:var(--color-text)]">
                                      {variant.title || `${labels.variantTitle} ${index + 1}`}
                                    </p>
                                    <p className="text-xs text-[color:var(--color-text-muted)]">
                                      {variant.optionSummary || labels.variantsHint}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-[color:var(--color-text-muted)]">
                                  <div>{variant.sku || labels.sku}</div>
                                  <div className="text-xs text-[color:var(--color-text-muted)]">{variant.slug || labels.slug}</div>
                                </td>
                                <td className="px-3 py-3 text-[color:var(--color-text-muted)]">
                                  {variant.priceOverride.trim()
                                    ? formatPrice(Number(variant.priceOverride), activeCurrency, locale)
                                    : labels.notSpecified}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    {variant.isDefault ? (
                                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900">{labels.variantDefault}</span>
                                    ) : null}
                                    {variant.stockOverride.trim() ? (
                                      <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                                        {labels.stock}: {variant.stockOverride.trim()}
                                      </span>
                                    ) : null}
                                    {!variant.salesEnabled ? (
                                      <span className="rounded-full bg-neutral-200 px-2 py-1 text-xs font-medium text-neutral-900">{labels.outOfStock}</span>
                                    ) : null}
                                    {variant.salesEnabled && !variant.isDefault ? (
                                      <span className="rounded-full bg-[color:var(--color-bg-soft)] px-2 py-1 text-xs font-medium text-[color:var(--color-text)]">{labels.statusActive}</span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div ref={openVariantActionMenuIndex === index ? variantActionMenuRef : null} className="relative flex justify-end">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="secondary"
                                      onClick={() => setOpenVariantActionMenuIndex((current) => current === index ? null : index)}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    {openVariantActionMenuIndex === index ? (
                                      <div className="absolute right-0 top-11 z-50 min-w-40 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2 shadow-xl">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            openVariantEditor(index);
                                            setOpenVariantActionMenuIndex(null);
                                          }}
                                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                                        >
                                          {labels.variantDetails}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            removeVariantRow(index);
                                            setOpenVariantActionMenuIndex(null);
                                          }}
                                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                        >
                                          {labels.delete}
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                </section>

                <div className="mt-2 flex justify-end gap-2 border-t border-[color:var(--color-border)] pt-5">
                  <Button type="button" variant="secondary" onClick={closeDrawer} disabled={loading}>
                    {labels.cancel}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? labels.loading : labels.save}
                  </Button>
                </div>
              </form>
            </aside>
          )}

          {activeVariantEditor ? (
            <div className="absolute inset-0 z-10">
              <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={closeVariantEditor} />
              <aside className="absolute bottom-0 right-0 top-0 flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
                <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.variantsTitle}</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight">{activeVariantEditor.title || labels.variantTitle}</h3>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{activeVariantEditor.optionSummary || labels.variantsHint}</p>
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={closeVariantEditor} disabled={loading}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="grid gap-4 p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeForm.attributeLinks.map((link) => {
                      const definition = attributeDefinitionOptions.find((item) => item.id === link.attributeDefinitionId);
                      const value = activeVariantEditor.attributes.find((attribute) => attribute.attributeDefinitionId === link.attributeDefinitionId)?.value ?? "";
                      if (!definition) {
                        return null;
                      }

                      return (
                        <div key={`variant-attribute-${definition.id}`} className="grid gap-2">
                          <Label>{definition.name}</Label>
                          <Input
                            value={value}
                            onChange={(event) => patchVariantAttribute(variantEditorIndex as number, definition.id, event.target.value)}
                            placeholder={labels.variantAttributeValue}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="grid gap-2">
                      <Label>{labels.variantTitle}</Label>
                      <Input value={activeVariantEditor.title} onChange={(event) => patchVariant(variantEditorIndex as number, { title: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>{labels.slug}</Label>
                      <Input value={activeVariantEditor.slug} onChange={(event) => patchVariant(variantEditorIndex as number, { slug: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>{labels.sku}</Label>
                      <Input value={activeVariantEditor.sku} onChange={(event) => patchVariant(variantEditorIndex as number, { sku: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>{labels.barcode}</Label>
                      <Input value={activeVariantEditor.barcode ?? ""} onChange={(event) => patchVariant(variantEditorIndex as number, { barcode: event.target.value })} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="grid gap-2">
                      <Label>{labels.variantOptionSummary}</Label>
                      <Input value={activeVariantEditor.optionSummary} onChange={(event) => patchVariant(variantEditorIndex as number, { optionSummary: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>{labels.variantPriceOverride}</Label>
                      <Input value={activeVariantEditor.priceOverride} type="number" min="0" step="0.01" onChange={(event) => patchVariant(variantEditorIndex as number, { priceOverride: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>{labels.variantPurchasePriceOverride}</Label>
                      <Input value={activeVariantEditor.purchasePriceOverride} type="number" min="0" step="0.01" onChange={(event) => patchVariant(variantEditorIndex as number, { purchasePriceOverride: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>{labels.variantCompareAtPriceOverride}</Label>
                      <Input value={activeVariantEditor.compareAtPriceOverride} type="number" min="0" step="0.01" onChange={(event) => patchVariant(variantEditorIndex as number, { compareAtPriceOverride: event.target.value })} />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="grid gap-2">
                      <Label>{labels.variantImageUrl}</Label>
                      <Input value={activeVariantEditor.imageUrl} onChange={(event) => patchVariant(variantEditorIndex as number, { imageUrl: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>{labels.variantStockOverride}</Label>
                      <Input value={activeVariantEditor.stockOverride} type="number" min="0" step="1" onChange={(event) => patchVariant(variantEditorIndex as number, { stockOverride: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>{labels.page}</Label>
                      <Input value={activeVariantEditor.sortOrder} type="number" min="0" step="1" onChange={(event) => patchVariant(variantEditorIndex as number, { sortOrder: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>{labels.stockStatus}</Label>
                      <div className="flex flex-wrap gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={activeVariantEditor.isDefault} onChange={(event) => patchVariant(variantEditorIndex as number, { isDefault: event.target.checked })} className={checkboxClassName} />
                          <span>{labels.variantDefault}</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={activeVariantEditor.salesEnabled} onChange={(event) => patchVariant(variantEditorIndex as number, { salesEnabled: event.target.checked })} className={checkboxClassName} />
                          <span>{labels.variantSalesEnabled}</span>
                        </label>
                      </div>
                    </div>
                  </div>

                </div>
              </aside>
            </div>
          ) : null}

          {variantGenerationOpen ? (
            <div className="absolute inset-0 z-10">
              <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/20" onClick={closeVariantGenerationModal} />
              <aside className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
                <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.variantsTitle}</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight">{labels.generateVariantsTitle}</h3>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.generateVariantsHint}</p>
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={closeVariantGenerationModal} disabled={loading}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="grid gap-4 p-5">
                  {selectedVariantAxisDefinitions.some((definition) => (variantGenerationSuggestions[definition.id] ?? []).length > 0) ? (
                    <div className="flex justify-end">
                      <Button type="button" size="sm" variant="outline" onClick={applyAllVariantGenerationSuggestions}>
                        {labels.generateVariantsUseAllSuggestions}
                      </Button>
                    </div>
                  ) : null}
                  {selectedVariantAxisDefinitions.map((definition) => (
                    <div key={`generator-${definition.id}`} className="grid gap-2">
                      <Label>{definition.name}</Label>
                      <Input
                        value={variantGenerationValues[definition.id] ?? ""}
                        onChange={(event) => setVariantGenerationValues((prev) => ({ ...prev, [definition.id]: event.target.value }))}
                        placeholder={labels.generateVariantsValues}
                      />
                      {variantGenerationSuggestions[definition.id]?.length ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-[color:var(--color-text-muted)]">{labels.generateVariantsSuggestions}</span>
                          {variantGenerationSuggestions[definition.id].map((suggestion) => (
                            <button
                              key={`${definition.id}-${suggestion}`}
                              type="button"
                              className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-2 py-1 text-xs text-[color:var(--color-text)] transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
                              onClick={() => applyVariantGenerationSuggestion(definition.id, suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex justify-end gap-2 border-t border-[color:var(--color-border)] p-5">
                  <Button type="button" variant="secondary" disabled={loading} onClick={closeVariantGenerationModal}>{labels.cancel}</Button>
                  <Button type="button" disabled={loading} onClick={generateVariantRows}>{labels.generateVariantsApply}</Button>
                </div>
              </aside>
            </div>
          ) : null}

        </div>
      ) : null}
    </section>
  );
}
