import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(content, expected, message) {
  if (!content.includes(expected)) {
    throw new Error(message);
  }
}

function assertNotIncludes(content, unexpected, message) {
  if (content.includes(unexpected)) {
    throw new Error(message);
  }
}

// 1) Ortak stok-aggregate yardımcısı tek dosyada tanımlı, kopyaları silinmiş.
const aggregate = read("src/modules/inventory/services/inventory-stock-aggregate.ts");
assertIncludes(aggregate, "export function resolveAggregateAvailableStock", "resolveAggregateAvailableStock merkezi dosyada tanımlı değil.");
assertIncludes(aggregate, "export function resolveAggregateAvailabilityFromLevels", "resolveAggregateAvailabilityFromLevels merkezi dosyada tanımlı değil.");

for (const file of [
  "src/modules/catalog/services/catalog-admin.service.ts",
  "src/modules/catalog/services/catalog.service.ts",
  "src/modules/inventory/services/inventory.service.ts",
]) {
  const content = read(file);
  assertNotIncludes(content, "function resolveAggregateAvailableStock(", `${file} hâlâ kendi resolveAggregateAvailableStock kopyasını tanımlıyor.`);
  assertIncludes(content, "inventory-stock-aggregate", `${file} merkezi stok-aggregate yardımcısını import etmiyor.`);
}

// 2) Pazaryeri ürün senkronu artık depo agregatını okuyor, ham Product.stock'u değil.
const marketplaceRepo = read("src/modules/integration/repositories/marketplace-integration.repository.ts");
assertIncludes(marketplaceRepo, "async findProductSyncPreflightTarget", "findProductSyncPreflightTarget bulunamadı.");
const preflightSection = marketplaceRepo.slice(marketplaceRepo.indexOf("async findProductSyncPreflightTarget"));
assertIncludes(preflightSection.slice(0, 2000), "inventoryItem", "findProductSyncPreflightTarget artık inventoryItem.inventoryLevels seçmiyor.");

for (const file of [
  "src/modules/integration/services/trendyol-product-sync.service.ts",
  "src/modules/integration/services/pazarama-product-sync.service.ts",
]) {
  const content = read(file);
  assertIncludes(content, "aggregateAvailableStock", `${file} artık depo agregatını kullanmıyor.`);
  assertNotIncludes(content, "?? target.stock", `${file} hâlâ ham target.stock'a fallback yapıyor (aggregateAvailableStock yerine).`);
}

// 3) Cache invalidation tek yerden, PLATFORM_TENANT_ID ile scoped.
const catalogCache = read("src/modules/catalog/services/catalog-cache.ts");
assertIncludes(catalogCache, "buildTenantCacheKey", "catalog-cache.ts buildTenantCacheKey kullanmıyor.");
assertIncludes(catalogCache, "PLATFORM_TENANT_ID", "catalog-cache.ts PLATFORM_TENANT_ID ile scoped değil.");

for (const file of [
  "src/modules/catalog/services/catalog-admin.service.ts",
  "src/modules/commerce/services/commerce.service.ts",
  "src/modules/commerce/services/marketplace-order.service.ts",
  "src/modules/inventory/services/inventory.service.ts",
]) {
  const content = read(file);
  assertNotIncludes(content, "async function invalidateCatalogCache", `${file} hâlâ kendi invalidateCatalogCache kopyasını tanımlıyor.`);
  assertIncludes(content, "catalog-cache", `${file} merkezi catalog-cache modülünü import etmiyor.`);
}

// 4) commerce.repository.ts / inventory.repository.ts artık paylaşılan aritmetiği kullanıyor.
// (Faz C'de Product.stock kolonu kaldırıldığı için mirror-yazan
// recalculateProductStock*/sumAvailableStock fonksiyonları da kaldırıldı;
// geriye kalan tek paylaşılan çağrı toAvailableStock.)
for (const file of [
  "src/modules/commerce/repositories/commerce.repository.ts",
  "src/modules/inventory/repositories/inventory.repository.ts",
]) {
  const content = read(file);
  assertIncludes(content, "inventory-stock-aggregate", `${file} merkezi stok-aggregate yardımcısını import etmiyor.`);
  assertIncludes(content, "toAvailableStock(", `${file} artık ortak toAvailableStock'u çağırmıyor.`);
  assertNotIncludes(content, "stock: availableStock", `${file} hâlâ kaldırılmış Product.stock mirror alanına yazıyor.`);
}

// 5) Yeni tenant provisioning'de varsayılan depo otomatik açılıyor.
const platformService = read("src/modules/platform/services/platform.service.ts");
assertIncludes(platformService, "seedDefaultWarehouse", "provisionTenant artık seedDefaultWarehouse çağırmıyor.");

const inventoryService = read("src/modules/inventory/services/inventory.service.ts");
assertIncludes(inventoryService, "async seedDefaultWarehouse", "inventoryService.seedDefaultWarehouse tanımlı değil.");

// 6) Mağaza kartı varyant stoğu artık depo-farkında.
const catalogService = read("src/modules/catalog/services/catalog.service.ts");
assertIncludes(catalogService, "variantInventoryLevels", "mapVariant artık varyantın kendi InventoryLevel'larını kullanmıyor.");

const catalogRepository = read("src/modules/catalog/repositories/catalog.repository.ts");
const variantsSection = catalogRepository.slice(catalogRepository.indexOf("variants: {"), catalogRepository.indexOf("variants: {") + 1200);
assertIncludes(variantsSection, "inventoryItem", "findBySlug varyant include'unda inventoryItem eksik.");

// 7) Faz C: Product.stock/ProductVariant.stockOverride kolonları şemadan kaldırıldı.
const schema = read("prisma/schema.prisma");
const productModelSection = schema.slice(schema.indexOf("model Product {"), schema.indexOf("model ProductAttributeLink {"));
assertNotIncludes(productModelSection, "\n  stock ", "prisma/schema.prisma Product modelinde hâlâ stock kolonu var.");
const variantModelSection = schema.slice(schema.indexOf("model ProductVariant {"), schema.indexOf("model ProductVariantAttributeValue {"));
assertNotIncludes(variantModelSection, "stockOverride", "prisma/schema.prisma ProductVariant modelinde hâlâ stockOverride kolonu var.");

const catalogAdminRepo = read("src/modules/catalog/repositories/catalog-admin.repository.ts");
assertNotIncludes(catalogAdminRepo, "stock: 0,", "catalog-admin.repository.ts hâlâ kaldırılmış stock kolonuna yazıyor.");
assertNotIncludes(catalogAdminRepo, "stockOverride: variant.stockOverride ?? null,", "catalog-admin.repository.ts hâlâ kaldırılmış stockOverride kolonuna yazıyor.");

console.log("Stok Kartı birleştirme (Faz A-C) doğrulamaları başarıyla geçti.");
