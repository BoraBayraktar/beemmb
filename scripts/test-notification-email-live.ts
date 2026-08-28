import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import { identityAdminService } from "@/modules/identity/services/identity-admin.service";
import { notificationService } from "@/modules/system/services/notification.service";

async function main() {
  const backofficeUsers = await identityAdminService.listBackofficeUsers(PLATFORM_TENANT_ID);
  if (backofficeUsers.length === 0) {
    throw new Error("NO_BACKOFFICE_USER_FOUND");
  }

  const target = backofficeUsers[0];
  const stamp = new Date().toISOString();

  await notificationService.createForRecipients({
    recipients: [{ id: target.id }],
    channels: ["EMAIL"],
    type: "PRODUCT_QUESTION_CREATED",
    title: `[LIVE TEST] Notification email ${stamp}`,
    message: `Live transport test for ${target.email} at ${stamp}`,
  });

  const processed = await notificationService.processEmailQueue({
    limit: 1,
    requireLiveTransport: true,
  });

  if (processed.sent < 1 || processed.failed > 0) {
    throw new Error(`LIVE_EMAIL_TEST_FAILED: ${JSON.stringify(processed)}`);
  }

  console.log(JSON.stringify({
    target: target.email,
    processed,
  }, null, 2));
}

runWithTenantContext({ tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false }, main).catch((error) => {
  console.error(error);
  process.exit(1);
});
