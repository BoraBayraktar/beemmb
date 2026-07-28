import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { documentService } from "@/modules/documents/services/document.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { DocumentProviderManager } from "@/ui/admin/document-provider-manager";

export default async function AdminDocumentProvidersPage({
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

  const dictionary = getDictionary(locale as Locale);
  const items = await documentService.listProviderConfigs();

  return (
    <DocumentProviderManager
      items={items}
      labels={{
        title: dictionary.admin.documentsProviderConfigsTitle,
        description: dictionary.admin.documentsProvidersDescription,
        providerCode: dictionary.admin.documentsProviderCode,
        providerDisplayName: dictionary.admin.documentsProviderDisplayName,
        providerEndpointUrl: dictionary.admin.documentsProviderEndpointUrl,
        providerSenderLabel: dictionary.admin.documentsProviderSenderLabel,
        providerSenderVkn: dictionary.admin.documentsProviderSenderVkn,
        providerUsername: dictionary.admin.documentsProviderUsername,
        providerSecret: dictionary.admin.documentsProviderSecret,
        providerWebhookSecret: dictionary.admin.documentsProviderWebhookSecret,
        providerCompanyName: dictionary.admin.documentsProviderCompanyName,
        providerSupportsStatusSync: dictionary.admin.documentsProviderSupportsStatusSync,
        providerIsActive: dictionary.admin.documentsProviderIsActive,
        providerIsDefault: dictionary.admin.documentsProviderIsDefault,
        providerSave: dictionary.admin.documentsProviderSave,
        saving: dictionary.common.loading,
        providerNone: dictionary.admin.documentsProviderNone,
        notSpecified: dictionary.common.notSpecified,
        operationFailed: dictionary.admin.operationFailed,
        adapterRegistered: dictionary.admin.documentsProviderAdapterRegistered,
        adapterConfigured: dictionary.admin.documentsProviderAdapterConfigured,
        adapterOperational: dictionary.admin.documentsProviderAdapterOperational,
        adapterReady: dictionary.admin.documentsProviderAdapterReady,
        adapterNotReady: dictionary.admin.documentsProviderAdapterNotReady,
      }}
    />
  );
}
