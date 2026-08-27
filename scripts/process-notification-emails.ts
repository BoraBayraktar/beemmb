import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import { notificationService } from "@/modules/system/services/notification.service";

async function main() {
  const limitRaw = process.argv[2];
  const limit = limitRaw ? Number(limitRaw) : 20;

  // Bu script sistem cron'u olarak calisir (oturumsuz). Bugun tek gercek
  // tenant oldugu icin platform tenant'ina sabitlenir; coklu tenant
  // provizyonu sonrasi her tenant icin ayrica calistirilmasi veya tenant
  // listesi uzerinde donmesi gerekir (bkz. Dalga 15'teki ayni desen).
  const result = await runWithTenantContext(
    { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
    () => notificationService.processEmailQueue({
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    }),
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
