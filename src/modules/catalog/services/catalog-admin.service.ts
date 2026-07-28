import { z } from "zod";

import { redisCache } from "@/lib/redis";
import type {
  AdminAnswerProductQuestionInput,
  AdminCreateProductAttributeDefinitionInput,
  AdminUpdateProductAttributeDefinitionInput,
  AdminBrandItem,
  AdminBulkModerateProductQuestionsInput,
  AdminCategoryListItem,
  AdminCategoryListQuery,
  AdminCategoryListResult,
  AdminCreateBrandInput,
  AdminCreateCategoryInput,
  AdminCreateProductInput,
  AdminCreateSupplierInput,
  AdminProductAttributeDefinitionItem,
  AdminProductAttributeValueMarketplaceMappingItem,
  AdminProductAttributeLinkInput,
  AdminProductQuestionItem,
  AdminProductQuestionListQuery,
  AdminProductQuestionListResult,
  AdminProductQuestionModerationResult,
  AdminProductQuestionStats,
  AdminProductListItem,
  AdminProductListQuery,
  AdminProductListResult,
  AdminProductVariantInput,
  AdminSupplierItem,
  AdminTopInteractionItem,
  AdminUpdateBrandInput,
  AdminUpdateCategoryInput,
  AdminUpdateProductInput,
  AdminUpdateProductVariantsInput,
  AdminUpsertProductAttributeValueMarketplaceMappingInput,
  AdminUpdateSupplierInput,
} from "@/modules/catalog/contracts/catalog-admin.contract";
import { CatalogAdminRepository } from "@/modules/catalog/repositories/catalog-admin.repository";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import {
  decodeProductDescriptionWithFeatures,
  encodeProductDescriptionWithFeatures,
  sanitizeFeatures,
} from "@/modules/catalog/services/product-features.codec";

const productFeatureSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string().trim().min(1),
  highlighted: z.boolean().default(false),
});

const productAttributeLinkSchema = z.object({
  attributeDefinitionId: z.string().trim().min(1),
  isVariantAxis: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

const productVariantSchema = z.object({
  id: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(3),
  sku: z.string().trim().min(3).max(64),
  barcode: z.string().trim().min(3).max(64).optional().nullable(),
  title: z.string().trim().min(2).max(160),
  optionSummary: z.string().trim().min(2).max(240),
  priceOverride: z.coerce.number().positive().optional().nullable(),
  purchasePriceOverride: z.coerce.number().nonnegative().optional().nullable(),
  compareAtPriceOverride: z.coerce.number().positive().optional().nullable(),
  imageUrl: z.string().trim().url().optional().nullable(),
  imageUrls: z.array(z.string().trim().url()).max(12).optional().default([]),
  stockOverride: z.coerce.number().int().min(0).optional().nullable(),
  salesEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).optional(),
  attributes: z.array(z.object({
    attributeDefinitionId: z.string().trim().min(1),
    value: z.string().trim().min(1).max(120),
  })).min(1).max(12),
});

const adminListQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  status: z.enum(["all", "DRAFT", "ACTIVE", "ARCHIVED"]).default("all"),
  brandId: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const createProductSchema = z.object({
  slug: z.string().trim().min(3),
  sku: z.string().trim().min(3).max(64),
  barcode: z.string().trim().min(3).max(64).optional().nullable(),
  name: z.string().trim().min(2),
  description: z.string().trim().min(3),
  productType: z.enum(["PHYSICAL", "SERVICE", "RAW_MATERIAL", "SEMI_FINISHED"]).default("PHYSICAL"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  unitType: z.enum(["PIECE", "KILOGRAM", "GRAM", "LITER", "MILLILITER", "METER", "CENTIMETER", "BOX", "PACK"]).default("PIECE"),
  price: z.coerce.number().positive(),
  purchasePrice: z.coerce.number().nonnegative().optional().nullable(),
  compareAtPrice: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().min(0),
  currency: z.string().trim().min(3).max(3).optional(),
  vatRate: z.coerce.number().int().min(0).max(100).default(20),
  stockTrackingEnabled: z.boolean().default(true),
  salesEnabled: z.boolean().default(true),
  purchaseEnabled: z.boolean().default(true),
  internalNote: z.string().trim().max(1000).optional().nullable(),
  searchKeywords: z.array(z.string().trim().min(1).max(60)).max(40).optional().default([]),
  brandId: z.string().trim().min(1).optional().nullable(),
  primarySupplierId: z.string().trim().min(1).optional().nullable(),
  preferredSalesWarehouseId: z.string().trim().min(1).optional().nullable(),
  preferredPurchaseWarehouseId: z.string().trim().min(1).optional().nullable(),
  imageUrl: z.string().trim().url(),
  imageUrls: z.array(z.string().trim().url()).max(20).optional().default([]),
  features: z.array(productFeatureSchema).max(50).optional().default([]),
  categoryId: z.string().trim().optional().nullable(),
  attributeLinks: z.array(productAttributeLinkSchema).max(20).optional().default([]),
  variants: z.array(productVariantSchema).max(100).optional().default([]),
}).refine((value) => value.compareAtPrice == null || value.compareAtPrice > value.price, {
  message: "Compare-at price must be greater than price",
  path: ["compareAtPrice"],
});

const updateProductSchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().trim().min(3).optional(),
  sku: z.string().trim().min(3).max(64).optional(),
  barcode: z.string().trim().min(3).max(64).optional().nullable(),
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().min(3).optional(),
  productType: z.enum(["PHYSICAL", "SERVICE", "RAW_MATERIAL", "SEMI_FINISHED"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  unitType: z.enum(["PIECE", "KILOGRAM", "GRAM", "LITER", "MILLILITER", "METER", "CENTIMETER", "BOX", "PACK"]).optional(),
  price: z.coerce.number().positive().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional().nullable(),
  compareAtPrice: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().min(0).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  vatRate: z.coerce.number().int().min(0).max(100).optional(),
  stockTrackingEnabled: z.boolean().optional(),
  salesEnabled: z.boolean().optional(),
  purchaseEnabled: z.boolean().optional(),
  internalNote: z.string().trim().max(1000).optional().nullable(),
  searchKeywords: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
  brandId: z.string().trim().min(1).optional().nullable(),
  primarySupplierId: z.string().trim().min(1).optional().nullable(),
  preferredSalesWarehouseId: z.string().trim().min(1).optional().nullable(),
  preferredPurchaseWarehouseId: z.string().trim().min(1).optional().nullable(),
  imageUrl: z.string().trim().url().optional(),
  imageUrls: z.array(z.string().trim().url()).max(20).optional(),
  features: z.array(productFeatureSchema).max(50).optional(),
  categoryId: z.string().trim().optional().nullable(),
  attributeLinks: z.array(productAttributeLinkSchema).max(20).optional(),
  variants: z.array(productVariantSchema).max(100).optional(),
});

const updateProductVariantsSchema = z.object({
  productId: z.string().trim().min(1),
  attributeLinks: z.array(productAttributeLinkSchema).max(20).default([]),
  variants: z.array(productVariantSchema).max(100).default([]),
});

const createBrandSchema = z.object({
  slug: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  trendyolBrandId: z.coerce.number().int().positive().optional().nullable(),
  pazaramaBrandId: z.string().trim().min(1).max(120).optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateBrandSchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().trim().min(2).max(120).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  trendyolBrandId: z.coerce.number().int().positive().optional().nullable(),
  pazaramaBrandId: z.string().trim().min(1).max(120).optional().nullable(),
  isActive: z.boolean().optional(),
});

const createSupplierSchema = z.object({
  slug: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  taxNumber: z.string().trim().max(64).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  defaultPaymentTermDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  creditLimit: z.coerce.number().nonnegative().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateSupplierSchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().trim().min(2).max(120).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  taxNumber: z.string().trim().max(64).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  defaultPaymentTermDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  creditLimit: z.coerce.number().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createAttributeDefinitionSchema = z.object({
  slug: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  displayType: z.enum(["TEXT", "COLOR", "NUMBER"]).default("TEXT"),
  trendyolAttributeId: z.coerce.number().int().positive().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const updateAttributeDefinitionSchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().trim().min(2).max(120).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  displayType: z.enum(["TEXT", "COLOR", "NUMBER"]).optional(),
  trendyolAttributeId: z.coerce.number().int().positive().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const upsertAttributeValueMarketplaceMappingSchema = z.object({
  attributeDefinitionId: z.string().trim().min(1),
  channel: z.enum(["TRENDYOL", "N11", "PAZARAMA", "HEPSIBURADA", "EDOCS_MOCK"]).default("TRENDYOL"),
  localValue: z.string().trim().min(1).max(240),
  externalAttributeValueId: z.coerce.number().int().positive().optional().nullable(),
  externalAttributeValueName: z.string().trim().max(240).optional().nullable(),
  customAttributeValue: z.string().trim().max(240).optional().nullable(),
  isActive: z.boolean().default(true),
});

const categoryListQuerySchema = z.object({
  search: z.string().trim().optional(),
  parentId: z.string().trim().optional(),
  rootOnly: z.coerce.boolean().optional().default(false),
  hasProducts: z.enum(["all", "with_products", "without_products"]).default("all"),
  sort: z.enum(["updated_desc", "name_asc", "name_desc", "product_count_desc"]).default("updated_desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const questionListQuerySchema = z.object({
  status: z.enum(["all", "pending", "answered"]).default("all"),
  sort: z.enum(["priority", "latest", "oldest"]).default("priority"),
  search: z.string().trim().optional(),
  questionId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const answerQuestionSchema = z.object({
  id: z.string().trim().min(1),
  answer: z.string().trim().min(3).max(2000),
  answeredBy: z.string().trim().min(2).max(120),
});

const bulkModerateQuestionsSchema = z
  .object({
    ids: z.array(z.string().trim().min(1)).min(1).max(100),
    action: z.enum(["answer", "delete"]),
    answer: z.string().trim().min(3).max(2000).optional(),
    answeredBy: z.string().trim().min(2).max(120).optional(),
    deletedUserId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "answer" && (!value.answer || !value.answeredBy)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: "Answer moderation requires answer and answeredBy",
      });
    }

    if (value.action === "delete" && !value.deletedUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deletedUserId"],
        message: "Delete moderation requires deletedUserId",
      });
    }
  });

function resolveAggregateAvailableStock(
  inventoryLevels: Array<{
    onHand: number;
    reserved: number;
  }>,
  legacySummaryStock: number,
) {
  if (inventoryLevels.length === 0) {
    // Sprint 1 kuralı: admin listeleme bile aggregate yoksa ancak legacy summary fallback kullanır.
    return legacySummaryStock;
  }

  return inventoryLevels.reduce((sum, level) => sum + Math.max(0, level.onHand - level.reserved), 0);
}

function normalizeKeywordList(keywords: string[]) {
  return Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );
}

function mapBrand(item: {
  id: string;
  slug: string;
  name: string;
  trendyolBrandId: number | null;
  pazaramaBrandId?: string | null;
  isActive: boolean;
  _count?: { products: number };
}): AdminBrandItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    trendyolBrandId: item.trendyolBrandId,
    pazaramaBrandId: item.pazaramaBrandId ?? null,
    isActive: item.isActive,
    productCount: item._count?.products ?? 0,
  };
}

function mapSupplier(item: {
  id: string;
  slug: string;
  name: string;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  defaultPaymentTermDays?: number | null;
  creditLimit?: { toNumber: () => number } | null;
  isActive: boolean;
  _count: { primaryProducts: number };
}): AdminSupplierItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    taxNumber: item.taxNumber,
    email: item.email,
    phone: item.phone,
    defaultPaymentTermDays: item.defaultPaymentTermDays ?? null,
    creditLimit: item.creditLimit ? item.creditLimit.toNumber() : null,
    isActive: item.isActive,
    productCount: item._count.primaryProducts,
  };
}

function mapAttributeDefinition(item: {
  id: string;
  slug: string;
  name: string;
  displayType: "TEXT" | "COLOR" | "NUMBER";
  trendyolAttributeId: number | null;
  sortOrder: number;
  isActive: boolean;
  _count: { productLinks: number };
}): AdminProductAttributeDefinitionItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    displayType: item.displayType,
    trendyolAttributeId: item.trendyolAttributeId,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    productCount: item._count.productLinks,
  };
}

function mapAttributeValueMarketplaceMapping(item: {
  id: string;
  attributeDefinitionId: string;
  channel: import("@/modules/integration/contracts/integration.contract").IntegrationChannel;
  localValue: string;
  externalAttributeValueId: number | null;
  externalAttributeValueName: string | null;
  customAttributeValue: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  attributeDefinition: {
    id: string;
    name: string;
  };
}): AdminProductAttributeValueMarketplaceMappingItem {
  return {
    id: item.id,
    attributeDefinitionId: item.attributeDefinitionId,
    attributeName: item.attributeDefinition.name,
    channel: item.channel as AdminProductAttributeValueMarketplaceMappingItem["channel"],
    localValue: item.localValue,
    externalAttributeValueId: item.externalAttributeValueId,
    externalAttributeValueName: item.externalAttributeValueName,
    customAttributeValue: item.customAttributeValue,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

const createCategorySchema = z.object({
  slug: z.string().trim().min(2),
  name: z.string().trim().min(2),
  trendyolCategoryId: z.coerce.number().int().positive().optional().nullable(),
  pazaramaCategoryId: z.string().trim().min(1).max(120).optional().nullable(),
  parentId: z.string().trim().min(1).optional().nullable(),
});

const updateCategorySchema = z
  .object({
    id: z.string().trim().min(1),
    slug: z.string().trim().min(2).optional(),
    name: z.string().trim().min(2).optional(),
    trendyolCategoryId: z.coerce.number().int().positive().optional().nullable(),
    pazaramaCategoryId: z.string().trim().min(1).max(120).optional().nullable(),
    parentId: z.string().trim().min(1).optional().nullable(),
  })
  .refine((value) => value.slug !== undefined || value.name !== undefined || value.parentId !== undefined || value.trendyolCategoryId !== undefined || value.pazaramaCategoryId !== undefined, {
    message: "At least one category field must be provided",
  });

function mapProduct(product: {
  id: string;
  slug: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string;
  productType: "PHYSICAL" | "SERVICE" | "RAW_MATERIAL" | "SEMI_FINISHED";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  unitType: "PIECE" | "KILOGRAM" | "GRAM" | "LITER" | "MILLILITER" | "METER" | "CENTIMETER" | "BOX" | "PACK";
  price: { toNumber: () => number };
  purchasePrice: { toNumber: () => number } | null;
  compareAtPrice: { toNumber: () => number } | null;
  stock: number;
  currency: string;
  vatRate: number;
  stockTrackingEnabled: boolean;
  salesEnabled: boolean;
  purchaseEnabled: boolean;
  internalNote: string | null;
  searchKeywords: string[];
  brandId: string | null;
  brand: { name: string } | null;
  primarySupplierId: string | null;
  primarySupplier: { name: string } | null;
  preferredSalesWarehouseId: string | null;
  preferredPurchaseWarehouseId: string | null;
  imageUrl: string;
  imageUrls: string[];
  categoryId: string | null;
  category: { name: string } | null;
  attributeLinks: Array<{
    attributeDefinitionId: string;
    isVariantAxis: boolean;
    sortOrder: number;
  }>;
  variants: Array<{
    id: string;
    slug: string;
    sku: string;
    barcode: string | null;
    title: string;
    optionSummary: string;
    priceOverride: { toNumber: () => number } | null;
    purchasePriceOverride: { toNumber: () => number } | null;
    compareAtPriceOverride: { toNumber: () => number } | null;
    imageUrl: string | null;
    imageUrls: string[];
    stockOverride: number | null;
    salesEnabled: boolean;
    isDefault: boolean;
    sortOrder: number;
    attributeValues: Array<{
      attributeDefinitionId: string;
      value: string;
    }>;
  }>;
  inventoryItem?: {
    averageUnitCost?: { toNumber: () => number } | null;
    lastPurchaseUnitCost?: { toNumber: () => number } | null;
    inventoryLevels: Array<{
      onHand: number;
      reserved: number;
    }>;
  } | null;
}, salesSummary?: {
  orderCount: number;
  soldQuantity: number;
  grossRevenue: number;
  averageUnitCost: number | null;
  lastPurchaseUnitCost: number | null;
  stockValue: number;
  grossProfit: number;
  grossMarginRate: number | null;
  lastOrderedAt: string | null;
}): AdminProductListItem {
  const { cleanDescription, features } = decodeProductDescriptionWithFeatures(product.description);
  const price = product.price.toNumber();
  const compareAtPrice = product.compareAtPrice?.toNumber() ?? null;
  const discountRate = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : null;
  const inventoryLevels = product.inventoryItem?.inventoryLevels ?? [];
  const aggregateStock = resolveAggregateAvailableStock(inventoryLevels, product.stock);
  const averageUnitCost = product.inventoryItem?.averageUnitCost?.toNumber()
    ?? product.purchasePrice?.toNumber()
    ?? null;
  const lastPurchaseUnitCost = product.inventoryItem?.lastPurchaseUnitCost?.toNumber()
    ?? product.purchasePrice?.toNumber()
    ?? null;
  const stockValue = averageUnitCost != null ? Number((aggregateStock * averageUnitCost).toFixed(2)) : 0;
  const soldQuantity = salesSummary?.soldQuantity ?? 0;
  const grossProfit = salesSummary?.grossRevenue != null && averageUnitCost != null
    ? Number((salesSummary.grossRevenue - (soldQuantity * averageUnitCost)).toFixed(2))
    : 0;
  const grossMarginRate = salesSummary?.grossRevenue && salesSummary.grossRevenue > 0
    ? Math.round((grossProfit / salesSummary.grossRevenue) * 100)
    : null;

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    description: cleanDescription,
    productType: product.productType,
    status: product.status,
    unitType: product.unitType,
    price,
    purchasePrice: product.purchasePrice?.toNumber() ?? null,
    compareAtPrice,
    discountRate,
    stock: aggregateStock,
    inStock: aggregateStock > 0,
    currency: product.currency,
    vatRate: product.vatRate,
    stockTrackingEnabled: product.stockTrackingEnabled,
    salesEnabled: product.salesEnabled,
    purchaseEnabled: product.purchaseEnabled,
    internalNote: product.internalNote,
    searchKeywords: product.searchKeywords ?? [],
    brandId: product.brandId,
    brandName: product.brand?.name ?? null,
    primarySupplierId: product.primarySupplierId,
    primarySupplierName: product.primarySupplier?.name ?? null,
    preferredSalesWarehouseId: product.preferredSalesWarehouseId,
    preferredPurchaseWarehouseId: product.preferredPurchaseWarehouseId,
    imageUrl: product.imageUrl,
    imageUrls: product.imageUrls ?? [],
    features,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    variantCount: product.variants.length,
    variantAxisCount: product.attributeLinks.filter((item) => item.isVariantAxis).length,
    orderCount: salesSummary?.orderCount ?? 0,
    soldQuantity,
    grossRevenue: salesSummary?.grossRevenue ?? 0,
    averageUnitCost,
    lastPurchaseUnitCost,
    stockValue,
    grossProfit,
    grossMarginRate,
    lastOrderedAt: salesSummary?.lastOrderedAt ?? null,
    attributeLinks: product.attributeLinks.map((item) => ({
      attributeDefinitionId: item.attributeDefinitionId,
      isVariantAxis: item.isVariantAxis,
      sortOrder: item.sortOrder,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      slug: variant.slug,
      sku: variant.sku,
      barcode: variant.barcode,
      title: variant.title,
      optionSummary: variant.optionSummary,
      priceOverride: variant.priceOverride?.toNumber() ?? null,
      purchasePriceOverride: variant.purchasePriceOverride?.toNumber() ?? null,
      compareAtPriceOverride: variant.compareAtPriceOverride?.toNumber() ?? null,
      imageUrl: variant.imageUrl,
      imageUrls: variant.imageUrls ?? [],
      stockOverride: variant.stockOverride ?? null,
      salesEnabled: variant.salesEnabled,
      isDefault: variant.isDefault,
      sortOrder: variant.sortOrder,
      attributes: variant.attributeValues.map((attribute) => ({
        attributeDefinitionId: attribute.attributeDefinitionId,
        value: attribute.value,
      })),
    })),
  };
}

function mapCategory(category: {
  id: string;
  slug: string;
  name: string;
  trendyolCategoryId: number | null;
  pazaramaCategoryId?: string | null;
  parentId: string | null;
  _count?: {
    products: number;
  };
}, parentName: string | null): AdminCategoryListItem {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    trendyolCategoryId: category.trendyolCategoryId,
    pazaramaCategoryId: category.pazaramaCategoryId ?? null,
    parentId: category.parentId,
    parentName,
    productCount: category._count?.products ?? 0,
  };
}

function mapTopInteraction(item: {
  productId: string;
  viewCount: number;
  lastViewedAt: Date | null;
  product: {
    slug: string;
    name: string;
    imageUrl: string;
  };
}): AdminTopInteractionItem {
  return {
    productId: item.productId,
    slug: item.product.slug,
    name: item.product.name,
    imageUrl: item.product.imageUrl,
    viewCount: item.viewCount,
    lastViewedAt: item.lastViewedAt ? item.lastViewedAt.toISOString() : null,
  };
}

function mapProductQuestion(item: {
  id: string;
  question: string;
  askedBy: string;
  createdAt: Date;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: Date | null;
  product: {
    id: string;
    slug: string;
    name: string;
  };
}): AdminProductQuestionItem {
  return {
    id: item.id,
    productId: item.product.id,
    productSlug: item.product.slug,
    productName: item.product.name,
    question: item.question,
    askedBy: item.askedBy,
    askedAt: item.createdAt.toISOString(),
    answer: item.answer,
    answeredBy: item.answeredBy,
    answeredAt: item.answeredAt ? item.answeredAt.toISOString() : null,
    isAnswered: item.answer != null,
  };
}

export class CatalogCategoryDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogCategoryDeleteError";
  }
}

async function invalidateCatalogCache() {
  await Promise.all([
    redisCache.delByPrefix("catalog:list:"),
    redisCache.delByPrefix("catalog:detail:"),
    redisCache.del("catalog:categories"),
  ]);
}

async function invalidateProductDetailCache(slug: string) {
  await redisCache.del(`catalog:detail:${slug}`);
}

export class CatalogAdminService {
  constructor(private readonly repository: CatalogAdminRepository) {}

  private async assertProductRelations(args: {
    categoryId: string | null;
    brandId: string | null;
    primarySupplierId: string | null;
    attributeDefinitionIds?: string[];
    skipMissingValues?: boolean;
  }) {
    const [category, brand, supplier, attributeDefinitions] = await Promise.all([
      args.categoryId
        ? this.repository.findActiveCategoryById(args.categoryId)
        : Promise.resolve(args.skipMissingValues ? { id: "skip", parentId: null } : null),
      args.brandId
        ? this.repository.findActiveBrandById(args.brandId)
        : Promise.resolve(args.skipMissingValues ? { id: "skip" } : null),
      args.primarySupplierId
        ? this.repository.findActiveSupplierById(args.primarySupplierId)
        : Promise.resolve(args.skipMissingValues ? { id: "skip" } : null),
      args.attributeDefinitionIds?.length
        ? this.repository.findActiveAttributeDefinitionsByIds(args.attributeDefinitionIds)
        : Promise.resolve([]),
    ]);

    if (args.categoryId && !category) {
      throw new z.ZodError([{
        code: "custom",
        path: ["categoryId"],
        message: "Category not found",
      }]);
    }

    if (args.brandId && !brand) {
      throw new z.ZodError([{
        code: "custom",
        path: ["brandId"],
        message: "Brand not found",
      }]);
    }

    if (args.primarySupplierId && !supplier) {
      throw new z.ZodError([{
        code: "custom",
        path: ["primarySupplierId"],
        message: "Supplier not found",
      }]);
    }

    if (args.attributeDefinitionIds?.length) {
      const foundIds = new Set(attributeDefinitions.map((item) => item.id));
      const missingId = args.attributeDefinitionIds.find((id) => !foundIds.has(id));
      if (missingId) {
        throw new z.ZodError([{
          code: "custom",
          path: ["attributeLinks"],
          message: `Attribute definition not found: ${missingId}`,
        }]);
      }
    }
  }

  private validateVariants(args: {
    basePrice?: number;
    attributeLinks?: AdminProductAttributeLinkInput[];
    variants?: AdminProductVariantInput[];
  }) {
    const variants = args.variants ?? [];
    if (variants.length === 0) {
      return;
    }

    const variantAxisIds = new Set((args.attributeLinks ?? []).filter((item) => item.isVariantAxis).map((item) => item.attributeDefinitionId));
    const seenSku = new Set<string>();
    const seenSlug = new Set<string>();
    let defaultCount = 0;

    for (const variant of variants) {
      if (seenSku.has(variant.sku)) {
        throw new z.ZodError([{ code: "custom", path: ["variants"], message: `Duplicate variant SKU: ${variant.sku}` }]);
      }
      if (seenSlug.has(variant.slug)) {
        throw new z.ZodError([{ code: "custom", path: ["variants"], message: `Duplicate variant slug: ${variant.slug}` }]);
      }
      seenSku.add(variant.sku);
      seenSlug.add(variant.slug);

      if (variant.isDefault) {
        defaultCount += 1;
      }

      const attributeIds = variant.attributes.map((attribute) => attribute.attributeDefinitionId);
      for (const attributeId of attributeIds) {
        if (!variantAxisIds.has(attributeId)) {
          throw new z.ZodError([{ code: "custom", path: ["variants"], message: "Variant attributes must use selected variant axes" }]);
        }
      }

      if (variant.compareAtPriceOverride != null) {
        const effectivePrice = variant.priceOverride ?? args.basePrice ?? 0;
        if (variant.compareAtPriceOverride <= effectivePrice) {
          throw new z.ZodError([{ code: "custom", path: ["variants"], message: "Variant compare-at price must be greater than sale price" }]);
        }
      }
    }

    if (defaultCount > 1) {
      throw new z.ZodError([{ code: "custom", path: ["variants"], message: "Only one default variant is allowed" }]);
    }
  }

  private normalizeSku(sku: string) {
    return sku.trim().toLocaleUpperCase("tr-TR");
  }

  private normalizeSlug(slug: string) {
    return slug.trim().toLocaleLowerCase("tr-TR");
  }

  private async assertUniqueSkuPool(args: {
    productId?: string;
    productSku?: string;
    variants?: AdminProductVariantInput[];
    replaceProductVariants?: boolean;
  }) {
    const candidates = [
      ...(args.productSku ? [{ kind: "product" as const, sku: args.productSku }] : []),
      ...(args.variants ?? []).map((variant) => ({ kind: "variant" as const, id: variant.id, sku: variant.sku })),
    ];

    const seen = new Map<string, typeof candidates[number]>();
    for (const candidate of candidates) {
      const normalizedSku = this.normalizeSku(candidate.sku);
      const existing = seen.get(normalizedSku);
      if (existing) {
        throw new z.ZodError([{
          code: "custom",
          path: [candidate.kind === "product" ? "sku" : "variants"],
          message: `Mükerrer SKU kullanılamaz: ${candidate.sku}`,
        }]);
      }
      seen.set(normalizedSku, candidate);
    }

    const owners = await this.repository.findSkuOwners(candidates.map((candidate) => candidate.sku));
    const candidateSkus = new Set(candidates.map((candidate) => this.normalizeSku(candidate.sku)));

    for (const product of owners.products) {
      if (args.productId && product.id === args.productId && args.productSku) {
        continue;
      }

      const normalizedSku = this.normalizeSku(product.sku);
      if (candidateSkus.has(normalizedSku)) {
        throw new z.ZodError([{
          code: "custom",
          path: ["sku"],
          message: `Mükerrer SKU kullanılamaz: ${product.sku}`,
        }]);
      }
    }

    for (const variant of owners.variants) {
      if (args.replaceProductVariants && args.productId && variant.productId === args.productId) {
        continue;
      }

      const normalizedSku = this.normalizeSku(variant.sku);
      if (candidateSkus.has(normalizedSku)) {
        throw new z.ZodError([{
          code: "custom",
          path: ["variants"],
          message: `Mükerrer SKU kullanılamaz: ${variant.sku}`,
        }]);
      }
    }
  }

  async validateProductImportCandidates(products: AdminCreateProductInput[]) {
    const candidates = products.flatMap((product) => [
      { kind: "product" as const, slug: product.slug, sku: product.sku },
      ...(product.variants ?? []).map((variant) => ({ kind: "variant" as const, slug: variant.slug, sku: variant.sku })),
    ]);

    await this.assertUniqueSkuPool({
      productSku: undefined,
      variants: candidates.map((candidate) => ({
        slug: candidate.slug,
        sku: candidate.sku,
        title: candidate.slug,
        optionSummary: candidate.slug,
        attributes: [{ attributeDefinitionId: "import-precheck", value: "import-precheck" }],
      })),
    });

    const slugOwners = await this.repository.findSlugOwners(candidates.map((candidate) => candidate.slug));
    const candidateSlugs = new Set(candidates.map((candidate) => this.normalizeSlug(candidate.slug)));

    for (const product of slugOwners.products) {
      if (candidateSlugs.has(this.normalizeSlug(product.slug))) {
        throw new z.ZodError([{
          code: "custom",
          path: ["slug"],
          message: `Mükerrer slug kullanılamaz: ${product.slug}`,
        }]);
      }
    }

    for (const variant of slugOwners.variants) {
      if (candidateSlugs.has(this.normalizeSlug(variant.slug))) {
        throw new z.ZodError([{
          code: "custom",
          path: ["variants"],
          message: `Mükerrer varyant slug kullanılamaz: ${variant.slug}`,
        }]);
      }
    }
  }

  private async assertValidParentAssignment(categoryId: string | null, parentId: string | null | undefined) {
    if (parentId == null) {
      return;
    }

    if (categoryId != null && parentId === categoryId) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["parentId"],
          message: "Category cannot be parent of itself",
        },
      ]);
    }

    const visited = new Set<string>();
    let cursor: string | null = parentId;

    while (cursor != null) {
      if (visited.has(cursor)) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["parentId"],
            message: "Invalid category hierarchy",
          },
        ]);
      }

      visited.add(cursor);

      const category = await this.repository.findActiveCategoryById(cursor);
      if (!category) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["parentId"],
            message: "Parent category not found",
          },
        ]);
      }

      if (categoryId != null && category.id === categoryId) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["parentId"],
            message: "Category hierarchy would create a cycle",
          },
        ]);
      }

      cursor = category.parentId;
    }
  }

  async listProducts(query: AdminProductListQuery): Promise<AdminProductListResult> {
    const parsed = adminListQuerySchema.parse(query);

    const [products, total] = await Promise.all([
      this.repository.listProducts(parsed),
      this.repository.countProducts({
        search: parsed.search,
        categoryId: parsed.categoryId,
        status: parsed.status,
        brandId: parsed.brandId,
        supplierId: parsed.supplierId,
      }),
    ]);
    const salesSummary = await this.repository.summarizeProductSales(products.map((item) => item.id));

    return {
      items: products.map((product) => mapProduct(product, salesSummary.get(product.id))),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async getProductById(id: string): Promise<AdminProductListItem | null> {
    const product = await this.repository.findActiveProductForAdminById(id);
    if (!product) {
      return null;
    }

    const salesSummary = await this.repository.summarizeProductSales([product.id]);
    return mapProduct(product, salesSummary.get(product.id));
  }

  async createProduct(input: AdminCreateProductInput): Promise<AdminProductListItem> {
    const parsed = createProductSchema.parse(input);
    await this.assertProductRelations({
      brandId: parsed.brandId ?? null,
      categoryId: parsed.categoryId ?? null,
      primarySupplierId: parsed.primarySupplierId ?? null,
      attributeDefinitionIds: Array.from(new Set([
        ...(parsed.attributeLinks ?? []).map((item) => item.attributeDefinitionId),
        ...(parsed.variants ?? []).flatMap((item) => item.attributes.map((attribute) => attribute.attributeDefinitionId)),
      ])),
    });
    this.validateVariants({
      basePrice: parsed.price,
      attributeLinks: parsed.attributeLinks,
      variants: parsed.variants,
    });
    await this.assertUniqueSkuPool({
      productSku: parsed.sku,
      variants: parsed.variants,
    });
    const created = await this.repository.createProduct({
      description: encodeProductDescriptionWithFeatures(parsed.description, sanitizeFeatures(parsed.features ?? [])),
      slug: parsed.slug,
      sku: parsed.sku,
      barcode: parsed.barcode ?? null,
      name: parsed.name,
      productType: parsed.productType,
      status: parsed.status,
      unitType: parsed.unitType,
      price: parsed.price,
      purchasePrice: parsed.purchasePrice,
      compareAtPrice: parsed.compareAtPrice,
      currency: parsed.currency,
      vatRate: parsed.vatRate,
      stockTrackingEnabled: parsed.stockTrackingEnabled,
      salesEnabled: parsed.salesEnabled,
      purchaseEnabled: parsed.purchaseEnabled,
      internalNote: parsed.internalNote ?? null,
      searchKeywords: normalizeKeywordList(parsed.searchKeywords ?? []),
      brandId: parsed.brandId ?? null,
      primarySupplierId: parsed.primarySupplierId ?? null,
      preferredSalesWarehouseId: parsed.preferredSalesWarehouseId,
      preferredPurchaseWarehouseId: parsed.preferredPurchaseWarehouseId,
      imageUrl: parsed.imageUrl,
      imageUrls: parsed.imageUrls,
      categoryId: parsed.categoryId,
      attributeLinks: parsed.attributeLinks,
      variants: parsed.variants,
    });
    await inventoryService.syncProductInventoryState({
      productId: created.id,
      sku: created.sku,
      warehouseId: parsed.preferredPurchaseWarehouseId ?? parsed.preferredSalesWarehouseId ?? undefined,
      targetOnHandStock: parsed.stock,
      note: "Ürün yönetimi ilk stok kurulumu",
    });
    const hydrated = await this.repository.findActiveProductForAdminById(created.id);
    if (!hydrated) {
      throw new Error("Product not found");
    }
    await invalidateCatalogCache();
    return mapProduct(hydrated);
  }

  async updateProduct(input: AdminUpdateProductInput): Promise<AdminProductListItem> {
    const parsed = updateProductSchema.parse(input);
    const needsExisting = parsed.price !== undefined
      || parsed.compareAtPrice !== undefined
      || parsed.features !== undefined
      || parsed.description !== undefined;

    const existing = needsExisting
      ? await this.repository.findActiveProductById(parsed.id)
      : null;

    if (needsExisting && !existing) {
      throw new Error("Product not found");
    }

    const existingProduct = existing;

    await this.assertProductRelations({
      brandId: parsed.brandId ?? null,
      categoryId: parsed.categoryId ?? null,
      primarySupplierId: parsed.primarySupplierId ?? null,
      attributeDefinitionIds: Array.from(new Set([
        ...(parsed.attributeLinks ?? []).map((item) => item.attributeDefinitionId),
        ...(parsed.variants ?? []).flatMap((item) => item.attributes.map((attribute) => attribute.attributeDefinitionId)),
      ])),
      skipMissingValues: true,
    });
    this.validateVariants({
      basePrice: parsed.price ?? existingProduct?.price.toNumber(),
      attributeLinks: parsed.attributeLinks,
      variants: parsed.variants,
    });
    if (parsed.sku !== undefined || parsed.variants !== undefined) {
      await this.assertUniqueSkuPool({
        productId: parsed.id,
        productSku: parsed.sku,
        variants: parsed.variants,
        replaceProductVariants: parsed.variants !== undefined,
      });
    }

    if (parsed.price !== undefined || parsed.compareAtPrice !== undefined) {
      if (!existingProduct) {
        throw new Error("Product not found");
      }

      const nextPrice = parsed.price ?? existingProduct.price.toNumber();
      const nextCompareAtPrice = parsed.compareAtPrice !== undefined
        ? parsed.compareAtPrice
        : (existingProduct.compareAtPrice?.toNumber() ?? null);

      if (nextCompareAtPrice != null && nextCompareAtPrice <= nextPrice) {
        throw new z.ZodError([
          {
            code: "custom",
            path: ["compareAtPrice"],
            message: "Compare-at price must be greater than price",
          },
        ]);
      }
    }

    const payload = {
      id: parsed.id,
      slug: parsed.slug,
      sku: parsed.sku,
      barcode: parsed.barcode,
      name: parsed.name,
      productType: parsed.productType,
      status: parsed.status,
      unitType: parsed.unitType,
      price: parsed.price,
      purchasePrice: parsed.purchasePrice,
      compareAtPrice: parsed.compareAtPrice,
      currency: parsed.currency,
      vatRate: parsed.vatRate,
      stockTrackingEnabled: parsed.stockTrackingEnabled,
      salesEnabled: parsed.salesEnabled,
      purchaseEnabled: parsed.purchaseEnabled,
      internalNote: parsed.internalNote,
      searchKeywords: parsed.searchKeywords ? normalizeKeywordList(parsed.searchKeywords) : undefined,
      brandId: parsed.brandId,
      primarySupplierId: parsed.primarySupplierId,
      preferredSalesWarehouseId: parsed.preferredSalesWarehouseId,
      preferredPurchaseWarehouseId: parsed.preferredPurchaseWarehouseId,
      imageUrl: parsed.imageUrl,
      imageUrls: parsed.imageUrls,
      categoryId: parsed.categoryId,
      attributeLinks: parsed.attributeLinks,
      variants: parsed.variants,
      ...(parsed.features !== undefined || parsed.description !== undefined
        ? {
            description: encodeProductDescriptionWithFeatures(
              parsed.description ?? existing?.description ?? "",
              parsed.features ?? decodeProductDescriptionWithFeatures(existingProduct?.description ?? "").features,
            ),
          }
        : {}),
    };

    const normalizedProductType = parsed.productType ?? existingProduct?.productType;
    const normalizedStockTracking = normalizedProductType === "SERVICE"
      ? false
      : (parsed.stockTrackingEnabled ?? undefined);

    const updated = await this.repository.updateProduct({
      ...payload,
      stockTrackingEnabled: normalizedStockTracking,
    });

    if (parsed.stock !== undefined || parsed.sku !== undefined) {
      await inventoryService.syncProductInventoryState({
        productId: updated.id,
        sku: parsed.sku ?? updated.sku,
        warehouseId: parsed.preferredPurchaseWarehouseId
          ?? parsed.preferredSalesWarehouseId
          ?? updated.preferredPurchaseWarehouseId
          ?? updated.preferredSalesWarehouseId
          ?? undefined,
        ...(parsed.stock !== undefined ? { targetOnHandStock: parsed.stock } : {}),
        note: parsed.stock !== undefined ? "Catalog admin stock update" : undefined,
      });
    }

    const hydrated = parsed.stock !== undefined || parsed.sku !== undefined
      ? await this.repository.findActiveProductForAdminById(updated.id)
      : updated;

    if (!hydrated) {
      throw new Error("Product not found");
    }

    await invalidateCatalogCache();
    return mapProduct(hydrated);
  }

  async updateProductVariants(input: AdminUpdateProductVariantsInput): Promise<AdminProductListItem> {
    const parsed = updateProductVariantsSchema.parse(input);
    const existing = await this.repository.findActiveProductById(parsed.productId);

    if (!existing) {
      throw new Error("Product not found");
    }

    await this.assertProductRelations({
      brandId: null,
      categoryId: null,
      primarySupplierId: null,
      attributeDefinitionIds: Array.from(new Set([
        ...parsed.attributeLinks.map((item) => item.attributeDefinitionId),
        ...parsed.variants.flatMap((item) => item.attributes.map((attribute) => attribute.attributeDefinitionId)),
      ])),
      skipMissingValues: true,
    });
    this.validateVariants({
      basePrice: existing.price.toNumber(),
      attributeLinks: parsed.attributeLinks,
      variants: parsed.variants,
    });
    await this.assertUniqueSkuPool({
      productId: parsed.productId,
      variants: parsed.variants,
      replaceProductVariants: true,
    });

    const updated = await this.repository.updateProductVariantDefinitions({
      id: parsed.productId,
      attributeLinks: parsed.attributeLinks,
      variants: parsed.variants,
    });

    await invalidateCatalogCache();
    return mapProduct(updated);
  }

  async softDeleteProduct(productId: string, deletedUserId: string) {
    await this.repository.softDeleteProduct(productId, deletedUserId);
    await invalidateCatalogCache();
  }

  async listBrands(): Promise<AdminBrandItem[]> {
    const rows = await this.repository.listBrands();
    return rows.map(mapBrand);
  }

  async listSuppliers(): Promise<AdminSupplierItem[]> {
    const rows = await this.repository.listSuppliers();
    return rows.map(mapSupplier);
  }

  async getSupplierById(id: string): Promise<AdminSupplierItem | null> {
    const row = await this.repository.findActiveSupplierById(id);
    return row ? mapSupplier(row) : null;
  }

  async createBrand(input: AdminCreateBrandInput): Promise<AdminBrandItem> {
    const parsed = createBrandSchema.parse(input);
    const created = await this.repository.createBrand(parsed);
    await invalidateCatalogCache();
    return mapBrand(created);
  }

  async updateBrand(input: AdminUpdateBrandInput): Promise<AdminBrandItem> {
    const parsed = updateBrandSchema.parse(input);
    const existing = await this.repository.findActiveBrandById(parsed.id);

    if (!existing) {
      throw new Error("Brand not found");
    }

    const updated = await this.repository.updateBrand(parsed);
    await invalidateCatalogCache();
    return mapBrand(updated);
  }

  async softDeleteBrand(brandId: string, deletedUserId: string) {
    const existing = await this.repository.findActiveBrandById(brandId);

    if (!existing) {
      throw new Error("Brand not found");
    }

    if (existing._count.products > 0) {
      throw new Error("Bu marka aktif ürünlerde kullanıldığı için silinemez.");
    }

    await this.repository.softDeleteBrand(brandId, deletedUserId);
    await invalidateCatalogCache();
  }

  async createSupplier(input: AdminCreateSupplierInput): Promise<AdminSupplierItem> {
    const parsed = createSupplierSchema.parse(input);
    const created = await this.repository.createSupplier(parsed);
    await invalidateCatalogCache();
    return mapSupplier(created);
  }

  async updateSupplier(input: AdminUpdateSupplierInput): Promise<AdminSupplierItem> {
    const parsed = updateSupplierSchema.parse(input);
    const existing = await this.repository.findActiveSupplierById(parsed.id);

    if (!existing) {
      throw new Error("Supplier not found");
    }

    const updated = await this.repository.updateSupplier(parsed);
    await invalidateCatalogCache();
    return mapSupplier(updated);
  }

  async softDeleteSupplier(supplierId: string, deletedUserId: string) {
    const existing = await this.repository.findActiveSupplierById(supplierId);

    if (!existing) {
      throw new Error("Supplier not found");
    }

    if (existing._count.primaryProducts > 0) {
      throw new Error("Bu tedarikçi aktif ürünlerde kullanıldığı için silinemez.");
    }

    await this.repository.softDeleteSupplier(supplierId, deletedUserId);
    await invalidateCatalogCache();
  }

  async listAttributeDefinitions(): Promise<AdminProductAttributeDefinitionItem[]> {
    const rows = await this.repository.listAttributeDefinitions();
    return rows.map(mapAttributeDefinition);
  }

  async createAttributeDefinition(input: AdminCreateProductAttributeDefinitionInput): Promise<AdminProductAttributeDefinitionItem> {
    const parsed = createAttributeDefinitionSchema.parse(input);
    const created = await this.repository.createAttributeDefinition(parsed);
    return mapAttributeDefinition(created);
  }

  async updateAttributeDefinition(input: AdminUpdateProductAttributeDefinitionInput): Promise<AdminProductAttributeDefinitionItem> {
    const parsed = updateAttributeDefinitionSchema.parse(input);
    const existing = await this.repository.findAttributeDefinitionById(parsed.id);

    if (!existing) {
      throw new Error("Attribute definition not found");
    }

    const updated = await this.repository.updateAttributeDefinition(parsed);
    return mapAttributeDefinition(updated);
  }

  async listAttributeValueMarketplaceMappings(channel: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA" | "EDOCS_MOCK" = "TRENDYOL"): Promise<AdminProductAttributeValueMarketplaceMappingItem[]> {
    const [mappings, localValues] = await Promise.all([
      this.repository.listAttributeValueMarketplaceMappings(channel),
      this.repository.listDistinctVariantAttributeValues(),
    ]);
    const mappedByKey = new Map(mappings.map((item) => [`${item.attributeDefinitionId}:${item.localValue}`, item]));
    const inferred = localValues
      .filter((item) => item.value.trim().length > 0)
      .filter((item, index, array) => array.findIndex((candidate) => (
        candidate.attributeDefinitionId === item.attributeDefinitionId
        && candidate.value.trim().toLocaleLowerCase("tr-TR") === item.value.trim().toLocaleLowerCase("tr-TR")
      )) === index)
      .filter((item) => !mappedByKey.has(`${item.attributeDefinitionId}:${item.value}`))
      .map((item) => ({
        id: `inferred:${item.attributeDefinitionId}:${item.value}`,
        attributeDefinitionId: item.attributeDefinitionId,
        attributeName: item.attributeDefinition.name,
        channel,
        localValue: item.value,
        externalAttributeValueId: null,
        externalAttributeValueName: null,
        customAttributeValue: null,
        isActive: false,
        createdAt: "",
        updatedAt: "",
      }));

    return [
      ...mappings.map(mapAttributeValueMarketplaceMapping),
      ...inferred,
    ].sort((left, right) => (
      left.attributeName.localeCompare(right.attributeName, "tr")
      || left.localValue.localeCompare(right.localValue, "tr")
    ));
  }

  async upsertAttributeValueMarketplaceMapping(input: AdminUpsertProductAttributeValueMarketplaceMappingInput): Promise<AdminProductAttributeValueMarketplaceMappingItem> {
    const parsed = upsertAttributeValueMarketplaceMappingSchema.parse(input);
    const attributeDefinition = await this.repository.findAttributeDefinitionById(parsed.attributeDefinitionId);

    if (!attributeDefinition) {
      throw new Error("Attribute definition not found");
    }

    const saved = await this.repository.upsertAttributeValueMarketplaceMapping(parsed);
    return mapAttributeValueMarketplaceMapping(saved);
  }

  async deleteAttributeDefinition(id: string): Promise<AdminProductAttributeDefinitionItem> {
    const existing = await this.repository.findAttributeDefinitionById(id);

    if (!existing) {
      throw new Error("Attribute definition not found");
    }

    if (existing._count.productLinks > 0) {
      throw new Error("Bu varyant ekseni aktif ürünlerde kullanıldığı için silinemez.");
    }

    const deleted = await this.repository.deleteAttributeDefinition(id);
    return mapAttributeDefinition(deleted);
  }

  async listWarehousesForProductAdmin() {
    const warehouses = await inventoryService.listWarehouses();
    return warehouses.map((warehouse) => ({
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      isActive: warehouse.isActive,
    }));
  }

  async listCategories(query: AdminCategoryListQuery): Promise<AdminCategoryListResult> {
    const parsed = categoryListQuerySchema.parse(query);

    const [categories, total] = await Promise.all([
      this.repository.listCategories(parsed),
      this.repository.countCategories({
        search: parsed.search,
        parentId: parsed.parentId,
        rootOnly: parsed.rootOnly,
        hasProducts: parsed.hasProducts,
      }),
    ]);

    const parentIds = Array.from(
      new Set(categories.map((category) => category.parentId).filter((id): id is string => id != null)),
    );
    const parents = await this.repository.listActiveCategoriesByIds(parentIds);
    const parentNameById = new Map(parents.map((parent) => [parent.id, parent.name]));

    return {
      items: categories.map((category) => mapCategory(category, category.parentId ? (parentNameById.get(category.parentId) ?? null) : null)),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async createCategory(input: AdminCreateCategoryInput): Promise<AdminCategoryListItem> {
    const parsed = createCategorySchema.parse(input);
    await this.assertValidParentAssignment(null, parsed.parentId);
    const created = await this.repository.createCategory(parsed);
    await invalidateCatalogCache();
    const parent = created.parentId
      ? (await this.repository.listActiveCategoriesByIds([created.parentId]))[0] ?? null
      : null;
    return mapCategory(created, parent?.name ?? null);
  }

  async updateCategory(input: AdminUpdateCategoryInput): Promise<AdminCategoryListItem> {
    const parsed = updateCategorySchema.parse(input);

    await this.assertValidParentAssignment(parsed.id, parsed.parentId);

    const updated = await this.repository.updateCategory(parsed);
    await invalidateCatalogCache();
    const parent = updated.parentId
      ? (await this.repository.listActiveCategoriesByIds([updated.parentId]))[0] ?? null
      : null;
    return mapCategory(updated, parent?.name ?? null);
  }

  async softDeleteCategory(categoryId: string, deletedUserId: string) {
    const activeProducts = await this.repository.countActiveProductsByCategoryId(categoryId);
    if (activeProducts > 0) {
      throw new CatalogCategoryDeleteError("Category has active products");
    }

    await this.repository.softDeleteCategory(categoryId, deletedUserId);
    await invalidateCatalogCache();
  }

  async listTopProductInteractions(limit = 6): Promise<AdminTopInteractionItem[]> {
    const rows = await this.repository.listTopProductInteractions(limit);
    return rows.map(mapTopInteraction);
  }

  async listProductQuestions(query: AdminProductQuestionListQuery): Promise<AdminProductQuestionListResult> {
    const parsed = questionListQuerySchema.parse(query);

    const [rows, total] = await Promise.all([
      this.repository.listProductQuestions(parsed),
      this.repository.countProductQuestions(parsed),
    ]);

    return {
      items: rows.map(mapProductQuestion),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async answerProductQuestion(input: AdminAnswerProductQuestionInput): Promise<AdminProductQuestionItem> {
    const parsed = answerQuestionSchema.parse(input);
    const updated = await this.repository.answerProductQuestion(parsed);
    await invalidateProductDetailCache(updated.product.slug);
    return mapProductQuestion(updated);
  }

  async softDeleteProductQuestion(id: string, deletedUserId: string) {
    const deleted = await this.repository.softDeleteProductQuestion(id, deletedUserId);
    await invalidateProductDetailCache(deleted.product.slug);
  }

  async getProductQuestionStats(slaHours = 24): Promise<AdminProductQuestionStats> {
    const normalizedSlaHours = Number.isFinite(slaHours) && slaHours > 0 ? slaHours : 24;

    const [total, pending, answered, overdue] = await Promise.all([
      this.repository.countProductQuestions({ status: "all" }),
      this.repository.countProductQuestionsByStatus("pending"),
      this.repository.countProductQuestionsByStatus("answered"),
      this.repository.countOverdueProductQuestions(normalizedSlaHours),
    ]);

    return {
      total,
      pending,
      answered,
      overdue,
      slaHours: normalizedSlaHours,
    };
  }

  async bulkModerateProductQuestions(
    input: AdminBulkModerateProductQuestionsInput,
  ): Promise<AdminProductQuestionModerationResult> {
    const parsed = bulkModerateQuestionsSchema.parse(input);
    const uniqueIds = [...new Set(parsed.ids)];
    const productSlugs = await this.repository.listProductSlugsByQuestionIds(uniqueIds);

    if (parsed.action === "answer") {
      const result = await this.repository.bulkAnswerProductQuestions(
        uniqueIds,
        parsed.answer!,
        parsed.answeredBy!,
      );

      await Promise.all([...new Set(productSlugs)].map((slug) => invalidateProductDetailCache(slug)));
      return { affected: result.count };
    }

    const result = await this.repository.bulkSoftDeleteProductQuestions(uniqueIds, parsed.deletedUserId!);
    await Promise.all([...new Set(productSlugs)].map((slug) => invalidateProductDetailCache(slug)));
    return { affected: result.count };
  }
}

export const catalogAdminService = new CatalogAdminService(new CatalogAdminRepository());
