import ExcelJS from "exceljs";

import type { AdminProductListItem, AdminProductListQuery } from "@/modules/catalog/contracts/catalog-admin.contract";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";

const PRODUCT_SHEET_NAME = "Stok Kartları";
const VARIANT_SHEET_NAME = "Varyantlar";
const VARIANT_ATTRIBUTE_SHEET_NAME = "Varyant Özellikleri";
const PRODUCT_FEATURE_SHEET_NAME = "Ürün Özellikleri";

const PRODUCT_COLUMNS: Array<{ key: string; label: string; width: number }> = [
  { key: "name", label: "Ürün adı", width: 32 },
  { key: "sku", label: "Stok Kodu", width: 18 },
  { key: "recordType", label: "Kayıt tipi", width: 12 },
  { key: "slug", label: "Slug", width: 22 },
  { key: "barcode", label: "Barkod", width: 18 },
  { key: "description", label: "Açıklama", width: 42 },
  { key: "productType", label: "Ürün tipi", width: 16 },
  { key: "status", label: "Durum", width: 12 },
  { key: "unitType", label: "Birim tipi", width: 14 },
  { key: "price", label: "Satış fiyatı", width: 14 },
  { key: "purchasePrice", label: "Alış fiyatı", width: 14 },
  { key: "compareAtPrice", label: "İndirimsiz fiyat", width: 16 },
  { key: "discountRate", label: "İndirim oranı", width: 14 },
  { key: "stock", label: "Stok", width: 10 },
  { key: "inStock", label: "Stokta var mı", width: 14 },
  { key: "currency", label: "Para birimi", width: 12 },
  { key: "vatRate", label: "KDV oranı", width: 12 },
  { key: "stockTrackingEnabled", label: "Stok takibi açık", width: 16 },
  { key: "salesEnabled", label: "Satışa açık", width: 14 },
  { key: "purchaseEnabled", label: "Satın almaya açık", width: 16 },
  { key: "brandName", label: "Marka adı", width: 22 },
  { key: "supplierName", label: "Tedarikçi adı", width: 22 },
  { key: "categoryName", label: "Kategori adı", width: 22 },
  { key: "preferredSalesWarehouseCode", label: "Varsayılan satış deposu", width: 20 },
  { key: "preferredPurchaseWarehouseCode", label: "Varsayılan alış deposu", width: 20 },
  { key: "searchKeywords", label: "Arama kelimeleri", width: 28 },
  { key: "internalNote", label: "İç not", width: 28 },
  { key: "imageUrl", label: "Görsel URL", width: 36 },
  { key: "imageUrls", label: "Ek görseller", width: 42 },
  { key: "variantCount", label: "Varyant sayısı", width: 14 },
  { key: "orderCount", label: "Sipariş sayısı", width: 14 },
  { key: "soldQuantity", label: "Satılan adet", width: 14 },
  { key: "grossRevenue", label: "Brüt ciro", width: 16 },
  { key: "averageUnitCost", label: "Ortalama birim maliyet", width: 18 },
  { key: "lastPurchaseUnitCost", label: "Son alış birim maliyeti", width: 18 },
  { key: "stockValue", label: "Stok değeri", width: 16 },
  { key: "grossProfit", label: "Brüt kâr", width: 16 },
  { key: "grossMarginRate", label: "Brüt kâr marjı", width: 16 },
  { key: "lastOrderedAt", label: "Son sipariş tarihi", width: 18 },
];

const VARIANT_COLUMNS: Array<{ key: string; label: string; width: number }> = [
  { key: "productSku", label: "Ürün SKU", width: 18 },
  { key: "productName", label: "Ürün adı", width: 32 },
  { key: "variantSlug", label: "Varyant slug", width: 24 },
  { key: "variantSku", label: "Varyant SKU", width: 20 },
  { key: "variantBarcode", label: "Varyant barkod", width: 18 },
  { key: "variantTitle", label: "Varyant adı", width: 32 },
  { key: "optionSummary", label: "Seçenek özeti", width: 32 },
  { key: "priceOverride", label: "Satış fiyatı override", width: 18 },
  { key: "purchasePriceOverride", label: "Alış fiyatı override", width: 18 },
  { key: "compareAtPriceOverride", label: "İndirimsiz fiyat override", width: 20 },
  { key: "stockOverride", label: "Stok", width: 12 },
  { key: "salesEnabled", label: "Satışa açık", width: 14 },
  { key: "isDefault", label: "Varsayılan varyant", width: 16 },
  { key: "sortOrder", label: "Sıralama", width: 12 },
  { key: "imageUrl", label: "Varyant görsel URL", width: 36 },
  { key: "imageUrls", label: "Varyant ek görseller", width: 42 },
];

const VARIANT_ATTRIBUTE_COLUMNS: Array<{ key: string; label: string; width: number }> = [
  { key: "productSku", label: "Ürün SKU", width: 18 },
  { key: "variantSku", label: "Varyant SKU", width: 20 },
  { key: "variantTitle", label: "Varyant adı", width: 32 },
  { key: "attributeName", label: "Özellik adı", width: 24 },
  { key: "attributeValue", label: "Özellik değeri", width: 28 },
];

const PRODUCT_FEATURE_COLUMNS: Array<{ key: string; label: string; width: number }> = [
  { key: "productSku", label: "Ürün SKU", width: 18 },
  { key: "productName", label: "Ürün adı", width: 32 },
  { key: "featureKey", label: "Özellik adı", width: 24 },
  { key: "featureValue", label: "Özellik değeri", width: 28 },
  { key: "highlighted", label: "Öne çıkarılmış", width: 14 },
];

function addHeaderStyle(worksheet: ExcelJS.Worksheet) {
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD1D5DB" } } };
  });
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };
}

function boolLabel(value: boolean) {
  return value ? "Evet" : "Hayır";
}

function resolveDiscountRate(price: number, compareAtPrice: number | null) {
  return compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : null;
}

function buildProductRow(
  item: AdminProductListItem,
  categoryNameById: Map<string, string>,
  warehouseCodeById: Map<string, string>,
) {
  return {
    recordType: "Ürün",
    slug: item.slug,
    sku: item.sku,
    barcode: item.barcode ?? "",
    name: item.name,
    description: item.description,
    productType: item.productType,
    status: item.status,
    unitType: item.unitType,
    price: item.price,
    purchasePrice: item.purchasePrice ?? "",
    compareAtPrice: item.compareAtPrice ?? "",
    discountRate: item.discountRate ?? "",
    stock: item.stock,
    inStock: boolLabel(item.inStock),
    currency: item.currency,
    vatRate: item.vatRate,
    stockTrackingEnabled: boolLabel(item.stockTrackingEnabled),
    salesEnabled: boolLabel(item.salesEnabled),
    purchaseEnabled: boolLabel(item.purchaseEnabled),
    brandName: item.brandName ?? "",
    supplierName: item.primarySupplierName ?? "",
    categoryName: item.categoryId ? (categoryNameById.get(item.categoryId) ?? "") : "",
    preferredSalesWarehouseCode: item.preferredSalesWarehouseId ? (warehouseCodeById.get(item.preferredSalesWarehouseId) ?? "") : "",
    preferredPurchaseWarehouseCode: item.preferredPurchaseWarehouseId ? (warehouseCodeById.get(item.preferredPurchaseWarehouseId) ?? "") : "",
    searchKeywords: item.searchKeywords.join(", "),
    internalNote: item.internalNote ?? "",
    imageUrl: item.imageUrl,
    imageUrls: item.imageUrls.join(", "),
    variantCount: item.variantCount,
    orderCount: item.orderCount,
    soldQuantity: item.soldQuantity,
    grossRevenue: item.grossRevenue,
    averageUnitCost: item.averageUnitCost ?? "",
    lastPurchaseUnitCost: item.lastPurchaseUnitCost ?? "",
    stockValue: item.stockValue,
    grossProfit: item.grossProfit,
    grossMarginRate: item.grossMarginRate ?? "",
    lastOrderedAt: item.lastOrderedAt ? new Date(item.lastOrderedAt).toLocaleString("tr-TR") : "",
  };
}

// Varyantlı bir üründe stok, varyant bazlı InventoryItem'larda tutulur ve ürünün
// kendi "stock"u bu varyantların toplamıdır (bkz. catalog-admin.service.ts
// mapProduct). Ana Stok Kartları sekmesinde hem ürün satırını hem varyant
// satırlarını birlikte tutmak "Stok" gibi kolonlarda toplama alındığında
// çifte sayıma yol açar; bu yüzden varyantlı ürünlerde ürün satırı yerine
// -- her biri kendi gerçek stok kodu/barkod/stoğuna sahip -- birer varyant
// satırı yazılır. Sipariş/ciro/kâr gibi metrikler bu üründe varyant bazında
// hesaplanmadığından (satış özeti ürün seviyesinde) varyant satırlarında
// boş bırakılır; ürün toplamını tekrar yazmak, toplandığında yanıltıcı olurdu.
function buildVariantAsProductRow(
  item: AdminProductListItem,
  variant: AdminProductListItem["variants"][number],
  categoryNameById: Map<string, string>,
  warehouseCodeById: Map<string, string>,
) {
  const price = variant.priceOverride ?? item.price;
  const compareAtPrice = variant.compareAtPriceOverride ?? item.compareAtPrice;
  const stock = variant.stockOverride ?? 0;
  const name = variant.optionSummary ? `${item.name} — ${variant.optionSummary}` : `${item.name} — ${variant.title}`;

  return {
    recordType: "Varyant",
    slug: variant.slug,
    sku: variant.sku,
    barcode: variant.barcode ?? "",
    name,
    description: item.description,
    productType: item.productType,
    status: item.status,
    unitType: item.unitType,
    price,
    purchasePrice: variant.purchasePriceOverride ?? item.purchasePrice ?? "",
    compareAtPrice: compareAtPrice ?? "",
    discountRate: resolveDiscountRate(price, compareAtPrice) ?? "",
    stock,
    inStock: boolLabel(stock > 0),
    currency: item.currency,
    vatRate: item.vatRate,
    stockTrackingEnabled: boolLabel(item.stockTrackingEnabled),
    salesEnabled: boolLabel(variant.salesEnabled ?? true),
    purchaseEnabled: boolLabel(item.purchaseEnabled),
    brandName: item.brandName ?? "",
    supplierName: item.primarySupplierName ?? "",
    categoryName: item.categoryId ? (categoryNameById.get(item.categoryId) ?? "") : "",
    preferredSalesWarehouseCode: item.preferredSalesWarehouseId ? (warehouseCodeById.get(item.preferredSalesWarehouseId) ?? "") : "",
    preferredPurchaseWarehouseCode: item.preferredPurchaseWarehouseId ? (warehouseCodeById.get(item.preferredPurchaseWarehouseId) ?? "") : "",
    searchKeywords: item.searchKeywords.join(", "),
    internalNote: item.internalNote ?? "",
    imageUrl: variant.imageUrl || item.imageUrl,
    imageUrls: (variant.imageUrls?.length ? variant.imageUrls : item.imageUrls).join(", "),
    variantCount: "",
    orderCount: "",
    soldQuantity: "",
    grossRevenue: "",
    averageUnitCost: "",
    lastPurchaseUnitCost: "",
    stockValue: "",
    grossProfit: "",
    grossMarginRate: "",
    lastOrderedAt: "",
  };
}

async function fetchAllProducts(query: AdminProductListQuery): Promise<AdminProductListItem[]> {
  const pageSize = 50;
  const items: AdminProductListItem[] = [];

  const firstPage = await catalogAdminService.listProducts({ ...query, page: 1, pageSize });
  items.push(...firstPage.items);

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const result = await catalogAdminService.listProducts({ ...query, page, pageSize });
    items.push(...result.items);
  }

  return items;
}

export class CatalogExportService {
  async exportProducts(query: AdminProductListQuery) {
    const [products, categories, warehouses, attributeDefinitions] = await Promise.all([
      fetchAllProducts(query),
      catalogAdminService.listCategories({ page: 1, pageSize: 50 }).then(async (firstPage) => {
        const items = [...firstPage.items];
        for (let page = 2; page <= firstPage.totalPages; page += 1) {
          const result = await catalogAdminService.listCategories({ page, pageSize: 50 });
          items.push(...result.items);
        }
        return items;
      }),
      catalogAdminService.listWarehousesForProductAdmin(),
      catalogAdminService.listAttributeDefinitions(),
    ]);

    const categoryNameById = new Map(categories.map((item) => [item.id, item.name]));
    const warehouseCodeById = new Map(warehouses.map((item) => [item.id, item.code]));
    const attributeNameById = new Map(attributeDefinitions.map((item) => [item.id, item.name]));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BEEMMB";
    workbook.created = new Date();

    const productSheet = workbook.addWorksheet(PRODUCT_SHEET_NAME);
    productSheet.columns = PRODUCT_COLUMNS.map((column) => ({ header: column.label, key: column.key, width: column.width }));

    for (const item of products) {
      if (item.variants.length === 0) {
        productSheet.addRow(buildProductRow(item, categoryNameById, warehouseCodeById));
        continue;
      }

      for (const variant of item.variants) {
        productSheet.addRow(buildVariantAsProductRow(item, variant, categoryNameById, warehouseCodeById));
      }
    }
    addHeaderStyle(productSheet);

    const variantSheet = workbook.addWorksheet(VARIANT_SHEET_NAME);
    variantSheet.columns = VARIANT_COLUMNS.map((column) => ({ header: column.label, key: column.key, width: column.width }));

    const variantAttributeSheet = workbook.addWorksheet(VARIANT_ATTRIBUTE_SHEET_NAME);
    variantAttributeSheet.columns = VARIANT_ATTRIBUTE_COLUMNS.map((column) => ({ header: column.label, key: column.key, width: column.width }));

    for (const product of products) {
      for (const variant of product.variants) {
        variantSheet.addRow({
          productSku: product.sku,
          productName: product.name,
          variantSlug: variant.slug,
          variantSku: variant.sku,
          variantBarcode: variant.barcode ?? "",
          variantTitle: variant.title,
          optionSummary: variant.optionSummary,
          priceOverride: variant.priceOverride ?? "",
          purchasePriceOverride: variant.purchasePriceOverride ?? "",
          compareAtPriceOverride: variant.compareAtPriceOverride ?? "",
          stockOverride: variant.stockOverride ?? "",
          salesEnabled: boolLabel(variant.salesEnabled ?? true),
          isDefault: boolLabel(variant.isDefault ?? false),
          sortOrder: variant.sortOrder ?? "",
          imageUrl: variant.imageUrl ?? "",
          imageUrls: (variant.imageUrls ?? []).join(", "),
        });

        for (const attribute of variant.attributes) {
          variantAttributeSheet.addRow({
            productSku: product.sku,
            variantSku: variant.sku,
            variantTitle: variant.title,
            attributeName: attributeNameById.get(attribute.attributeDefinitionId) ?? attribute.attributeDefinitionId,
            attributeValue: attribute.value,
          });
        }
      }
    }
    addHeaderStyle(variantSheet);
    addHeaderStyle(variantAttributeSheet);

    const featureSheet = workbook.addWorksheet(PRODUCT_FEATURE_SHEET_NAME);
    featureSheet.columns = PRODUCT_FEATURE_COLUMNS.map((column) => ({ header: column.label, key: column.key, width: column.width }));

    for (const product of products) {
      for (const feature of product.features) {
        featureSheet.addRow({
          productSku: product.sku,
          productName: product.name,
          featureKey: feature.key,
          featureValue: feature.value,
          highlighted: boolLabel(feature.highlighted),
        });
      }
    }
    addHeaderStyle(featureSheet);

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      filename: `stok-kartlari-${new Date().toISOString().slice(0, 10)}.xlsx`,
      buffer: Buffer.from(buffer),
      total: products.length,
    };
  }
}

export const catalogExportService = new CatalogExportService();
