import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { documentService } from "@/modules/documents/services/document.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { DocumentWebhookManager } from "@/ui/admin/document-webhook-manager";

export default async function AdminDocumentWebhooksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const effective = await rbacService.getEffectivePermissions(user);
  if (!effective.permissionKeys.includes("documentsWebhooks.manage")) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const items = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => documentService.listProviderConfigs(),
  );

  return (
    <DocumentWebhookManager
      locale={locale}
      items={items}
      labels={{
        title: dictionary.admin.documentsWebhookTitle,
        description: dictionary.admin.documentsWebhooksDescription,
        endpoint: dictionary.admin.documentsWebhookEndpoint,
        providerCode: dictionary.admin.documentsProviderCode,
        webhookHint: dictionary.admin.documentsWebhookHint,
        providerNone: dictionary.admin.documentsProviderNone,
        notSpecified: dictionary.common.notSpecified,
      }}
    />
  );
}
