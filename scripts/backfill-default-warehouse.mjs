import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

for (const path of [".env.local", ".env"]) {
  require("dotenv").config({ path, override: false });
}

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const shouldFix = process.argv.includes("--fix");

/**
 * Stok Kartı (InventoryItem/InventoryLevel) her `products` entitlement'lı
 * tenant'ta -- `inventory` modülünü hiç satın almamış olsa bile -- çalışabilmesi
 * için en az bir depo gerekir. seedDefaultWarehouse() (bkz. inventory.service.ts)
 * bunu artık her yeni tenant provisioning'inde otomatik yapıyor; bu script,
 * o değişiklikten ÖNCE provision edilmiş ve hiç deposu olmayan mevcut
 * tenant'lar için tek seferlik backfill'dir.
 */
async function main() {
  const tenants = await prisma.tenant.findMany({
    where: {
      deleted: false,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  const tenantsWithoutWarehouse = [];

  for (const tenant of tenants) {
    const warehouseCount = await prisma.warehouse.count({
      where: {
        tenantId: tenant.id,
        deleted: false,
      },
    });

    if (warehouseCount === 0) {
      tenantsWithoutWarehouse.push(tenant);
    }
  }

  if (tenantsWithoutWarehouse.length === 0) {
    console.log("Deposu olmayan tenant bulunmadı.");
    return;
  }

  console.log(`${tenantsWithoutWarehouse.length} tenant'ta hiç depo yok:`);
  for (const tenant of tenantsWithoutWarehouse) {
    console.log(`- ${tenant.slug} (${tenant.name})`);
  }

  if (!shouldFix) {
    console.log("\nDry-run tamamlandı. Değişiklik yapmak için: node scripts/backfill-default-warehouse.mjs --fix");
    return;
  }

  for (const tenant of tenantsWithoutWarehouse) {
    await prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        code: "GENEL",
        name: "Genel Depo",
        isActive: true,
        isDefault: true,
      },
    });
    console.log(`- ${tenant.slug}: Genel Depo oluşturuldu.`);
  }

  console.log(`\n${tenantsWithoutWarehouse.length} tenant için varsayılan depo oluşturuldu.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
