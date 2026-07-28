import type { ProductFeature } from "@/modules/catalog/contracts/catalog.contract";

export type AdminProductListItem = {
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
  imageUrls: string[];
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
  attributeLinks: AdminProductAttributeLinkItem[];
  variants: AdminProductVariantItem[];
};

export type AdminProductListQuery = {
  search?: string;
  categoryId?: string;
  status?: "all" | "DRAFT" | "ACTIVE" | "ARCHIVED";
  brandId?: string;
  supplierId?: string;
  page?: number;
  pageSize?: number;
};

export type AdminProductListResult = {
  items: AdminProductListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminCreateProductInput = {
  slug: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description: string;
  productType?: "PHYSICAL" | "SERVICE" | "RAW_MATERIAL" | "SEMI_FINISHED";
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  unitType?: "PIECE" | "KILOGRAM" | "GRAM" | "LITER" | "MILLILITER" | "METER" | "CENTIMETER" | "BOX" | "PACK";
  price: number;
  purchasePrice?: number | null;
  compareAtPrice?: number | null;
  stock: number;
  currency?: string;
  vatRate?: number;
  stockTrackingEnabled?: boolean;
  salesEnabled?: boolean;
  purchaseEnabled?: boolean;
  internalNote?: string | null;
  searchKeywords?: string[];
  brandId?: string | null;
  primarySupplierId?: string | null;
  preferredSalesWarehouseId?: string | null;
  preferredPurchaseWarehouseId?: string | null;
  imageUrl: string;
  imageUrls?: string[];
  features?: ProductFeature[];
  categoryId?: string | null;
  attributeLinks?: AdminProductAttributeLinkInput[];
  variants?: AdminProductVariantInput[];
};

export type AdminUpdateProductInput = {
  id: string;
  slug?: string;
  sku?: string;
  barcode?: string | null;
  name?: string;
  description?: string;
  productType?: "PHYSICAL" | "SERVICE" | "RAW_MATERIAL" | "SEMI_FINISHED";
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  unitType?: "PIECE" | "KILOGRAM" | "GRAM" | "LITER" | "MILLILITER" | "METER" | "CENTIMETER" | "BOX" | "PACK";
  price?: number;
  purchasePrice?: number | null;
  compareAtPrice?: number | null;
  stock?: number;
  currency?: string;
  vatRate?: number;
  stockTrackingEnabled?: boolean;
  salesEnabled?: boolean;
  purchaseEnabled?: boolean;
  internalNote?: string | null;
  searchKeywords?: string[];
  brandId?: string | null;
  primarySupplierId?: string | null;
  preferredSalesWarehouseId?: string | null;
  preferredPurchaseWarehouseId?: string | null;
  imageUrl?: string;
  imageUrls?: string[];
  features?: ProductFeature[];
  categoryId?: string | null;
  attributeLinks?: AdminProductAttributeLinkInput[];
  variants?: AdminProductVariantInput[];
};

export type AdminUpdateProductVariantsInput = {
  productId: string;
  attributeLinks: AdminProductAttributeLinkInput[];
  variants: AdminProductVariantInput[];
};

export type AdminProductAttributeDefinitionItem = {
  id: string;
  slug: string;
  name: string;
  displayType: "TEXT" | "COLOR" | "NUMBER";
  trendyolAttributeId: number | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

export type AdminCreateProductAttributeDefinitionInput = {
  slug: string;
  name: string;
  displayType?: "TEXT" | "COLOR" | "NUMBER";
  trendyolAttributeId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type AdminUpdateProductAttributeDefinitionInput = {
  id: string;
  slug?: string;
  name?: string;
  displayType?: "TEXT" | "COLOR" | "NUMBER";
  trendyolAttributeId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type AdminProductAttributeLinkInput = {
  attributeDefinitionId: string;
  isVariantAxis: boolean;
  sortOrder?: number;
};

export type AdminProductVariantAttributeValueInput = {
  attributeDefinitionId: string;
  value: string;
};

export type AdminProductVariantInput = {
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
  attributes: AdminProductVariantAttributeValueInput[];
};

export type AdminProductAttributeLinkItem = AdminProductAttributeLinkInput;

export type AdminProductVariantItem = AdminProductVariantInput & {
  id: string;
};

export type AdminProductAttributeValueMarketplaceMappingItem = {
  id: string;
  attributeDefinitionId: string;
  attributeName: string;
  channel: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA" | "EDOCS_MOCK";
  localValue: string;
  externalAttributeValueId: number | null;
  externalAttributeValueName: string | null;
  customAttributeValue: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminUpsertProductAttributeValueMarketplaceMappingInput = {
  attributeDefinitionId: string;
  channel?: "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA" | "EDOCS_MOCK";
  localValue: string;
  externalAttributeValueId?: number | null;
  externalAttributeValueName?: string | null;
  customAttributeValue?: string | null;
  isActive?: boolean;
};

export type AdminBrandItem = {
  id: string;
  slug: string;
  name: string;
  trendyolBrandId: number | null;
  pazaramaBrandId: string | null;
  isActive: boolean;
  productCount: number;
};

export type AdminSupplierItem = {
  id: string;
  slug: string;
  name: string;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  defaultPaymentTermDays: number | null;
  creditLimit: number | null;
  isActive: boolean;
  productCount: number;
};

export type AdminCreateBrandInput = {
  slug: string;
  name: string;
  trendyolBrandId?: number | null;
  pazaramaBrandId?: string | null;
  isActive?: boolean;
};

export type AdminUpdateBrandInput = {
  id: string;
  slug?: string;
  name?: string;
  trendyolBrandId?: number | null;
  pazaramaBrandId?: string | null;
  isActive?: boolean;
};

export type AdminCreateSupplierInput = {
  slug: string;
  name: string;
  taxNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  defaultPaymentTermDays?: number | null;
  creditLimit?: number | null;
  isActive?: boolean;
};

export type AdminUpdateSupplierInput = {
  id: string;
  slug?: string;
  name?: string;
  taxNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  defaultPaymentTermDays?: number | null;
  creditLimit?: number | null;
  isActive?: boolean;
};

export type AdminProductImportRow = {
  slug: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description: string;
  productType?: "PHYSICAL" | "SERVICE" | "RAW_MATERIAL" | "SEMI_FINISHED";
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  unitType?: "PIECE" | "KILOGRAM" | "GRAM" | "LITER" | "MILLILITER" | "METER" | "CENTIMETER" | "BOX" | "PACK";
  price: number;
  purchasePrice?: number | null;
  compareAtPrice?: number | null;
  stock?: number;
  currency?: string;
  vatRate?: number;
  stockTrackingEnabled?: boolean;
  salesEnabled?: boolean;
  purchaseEnabled?: boolean;
  internalNote?: string | null;
  searchKeywords?: string[];
  brandSlug?: string | null;
  brandName?: string | null;
  supplierSlug?: string | null;
  supplierName?: string | null;
  preferredSalesWarehouseCode?: string | null;
  preferredPurchaseWarehouseCode?: string | null;
  imageUrl: string;
  imageUrls?: string[];
  categorySlug?: string | null;
  featurePairs?: ProductFeature[];
};

export type AdminProductImportResult = {
  createdCount: number;
  failedCount: number;
  validatedCount?: number;
  errors: Array<{
    rowNumber: number;
    sheetName?: string;
    message: string;
  }>;
};

export type AdminCategoryListItem = {
  id: string;
  slug: string;
  name: string;
  trendyolCategoryId: number | null;
  pazaramaCategoryId: string | null;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
};

export type AdminCategoryListQuery = {
  search?: string;
  parentId?: string;
  rootOnly?: boolean;
  hasProducts?: "all" | "with_products" | "without_products";
  sort?: "updated_desc" | "name_asc" | "name_desc" | "product_count_desc";
  page?: number;
  pageSize?: number;
};

export type AdminCategoryListResult = {
  items: AdminCategoryListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminCreateCategoryInput = {
  slug: string;
  name: string;
  trendyolCategoryId?: number | null;
  pazaramaCategoryId?: string | null;
  parentId?: string | null;
};

export type AdminUpdateCategoryInput = {
  id: string;
  slug?: string;
  name?: string;
  trendyolCategoryId?: number | null;
  pazaramaCategoryId?: string | null;
  parentId?: string | null;
};

export type AdminTopInteractionItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  viewCount: number;
  lastViewedAt: string | null;
};

export type AdminProductQuestionStatus = "all" | "pending" | "answered";
export type AdminProductQuestionSort = "priority" | "latest" | "oldest";

export type AdminProductQuestionItem = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  isAnswered: boolean;
};

export type AdminProductQuestionListQuery = {
  status?: AdminProductQuestionStatus;
  sort?: AdminProductQuestionSort;
  search?: string;
  questionId?: string;
  page?: number;
  pageSize?: number;
};

export type AdminProductQuestionListResult = {
  items: AdminProductQuestionItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminAnswerProductQuestionInput = {
  id: string;
  answer: string;
  answeredBy: string;
};

export type AdminBulkProductQuestionAction = "answer" | "delete";

export type AdminBulkModerateProductQuestionsInput = {
  ids: string[];
  action: AdminBulkProductQuestionAction;
  answer?: string;
  answeredBy?: string;
  deletedUserId?: string;
};

export type AdminProductQuestionModerationResult = {
  affected: number;
};

export type AdminProductQuestionStats = {
  total: number;
  pending: number;
  answered: number;
  overdue: number;
  slaHours: number;
};
