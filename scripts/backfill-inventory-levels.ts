import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import { inventoryService } from "@/modules/inventory/services/inventory.service";

/**
 * Product.stock/ProductVariant.stockOverride kolonları kaldırıldı; InventoryLevel
 * artık tek gerçek kaynak. Normal create/update akışı (catalog-admin.service.ts)
 * her ürün/varyant için otomatik InventoryItem/InventoryLevel oluşturur, bu yüzden
 * bu script'in bulacağı satır sayısı normalde 0 olmalıdır. Yine de doğrudan Prisma
 * ile yazan bir seed/import script'i servis katmanını atlarsa (bkz. prisma/seed.ts)
 * ortaya çıkabilecek "InventoryItem'sız ürün/varyant" durumunu tespit edip 0 stokla
 * düzeltmek için bir sağlık kontrolü olarak bırakıldı.
 *
 * Kullanım: tsx --tsconfig tsconfig.json scripts/backfill-inventory-levels.ts [--fix]
 * --fix verilmezse dry-run yapar (sadece hangi ürün/varyantların etkileneceğini listeler).
 */
async function main() {
  const shouldFix = process.argv.includes("--fix");

  const tenants = await prisma.tenant.findMany({
    where: { deleted: false },
    select: { id: true, slug: true, name: true },
  });

  let totalProducts = 0;
  let totalVariants = 0;

  for (const tenant of tenants) {
    await runWithTenantContext({ tenantId: tenant.id, isPlatformOperator: true }, async () => {
      const products = await prisma.product.findMany({
        where: { deleted: false, inventoryItem: null },
        select: {
          id: true,
          sku: true,
          name: true,
          preferredPurchaseWarehouseId: true,
          preferredSalesWarehouseId: true,
        },
      });

      const variants = await prisma.productVariant.findMany({
        where: { deleted: false, inventoryItem: null },
        select: {
          id: true,
          productId: true,
          sku: true,
          title: true,
          product: {
            select: {
              preferredPurchaseWarehouseId: true,
              preferredSalesWarehouseId: true,
            },
          },
        },
      });

      if (products.length === 0 && variants.length === 0) {
        return;
      }

      console.log(`\n[${tenant.slug}] ${products.length} ürün, ${variants.length} varyant InventoryItem'sız:`);
      for (const product of products) {
        console.log(`  - ÜRÜN ${product.sku} (${product.name})`);
      }
      for (const variant of variants) {
        console.log(`  - VARYANT ${variant.sku} (${variant.title})`);
      }

      totalProducts += products.length;
      totalVariants += variants.length;

      if (!shouldFix) {
        return;
      }

      for (const product of products) {
        await inventoryService.syncProductInventoryState({
          productId: product.id,
          sku: product.sku,
          warehouseId: product.preferredPurchaseWarehouseId ?? product.preferredSalesWarehouseId ?? undefined,
          targetOnHandStock: 0,
          note: "Sağlık kontrolü: InventoryItem'sız ürün için 0 stokla envanter oluşturuldu",
        });
      }

      for (const variant of variants) {
        await inventoryService.syncProductInventoryState({
          productId: variant.productId,
          variantId: variant.id,
          sku: variant.sku,
          warehouseId: variant.product.preferredPurchaseWarehouseId ?? variant.product.preferredSalesWarehouseId ?? undefined,
          targetOnHandStock: 0,
          note: "Sağlık kontrolü: InventoryItem'sız varyant için 0 stokla envanter oluşturuldu",
        });
      }
    });
  }

  if (totalProducts === 0 && totalVariants === 0) {
    console.log("Tüm ürün/varyantların zaten InventoryItem'ı var. Yapılacak bir şey yok.");
    return;
  }

  if (!shouldFix) {
    console.log(`\nDry-run tamamlandı (${totalProducts} ürün, ${totalVariants} varyant etkilenecek). Uygulamak için: --fix`);
  } else {
    console.log(`\n${totalProducts} ürün ve ${totalVariants} varyant için InventoryLevel oluşturuldu.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
