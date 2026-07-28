import { ZodError } from "zod";

import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";
import { documentService, DocumentAdminError } from "@/modules/documents/services/document.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export function buildDocumentProviderConfigHeaders() {
  return buildNoStoreHeaders();
}

export function documentProviderConfigJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

type DocumentProviderConfigAuditItem = Awaited<ReturnType<typeof documentService.upsertProviderConfig>>;

export function buildDocumentProviderConfigAuditMetadata(item: DocumentProviderConfigAuditItem) {
  return {
    providerCode: item.providerCode,
    isDefault: item.isDefault,
    isActive: item.isActive,
    supportsStatusSync: item.supportsStatusSync,
    hasSecretKey: Boolean(item.secretKeyMasked),
    hasWebhookSecret: Boolean(item.webhookSecretMasked),
    adapterRegistered: item.adapterRegistered,
    adapterConfigured: item.adapterConfigured,
    adapterOperational: item.adapterOperational,
  };
}

export async function GET() {
  try {
    await requirePermission("documents.read");
    const items = await documentService.listProviderConfigs();
    return documentProviderConfigJson({ items });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return documentProviderConfigJson({ message: error.message }, { status: error.status });
    }

    return documentProviderConfigJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("documents.manage");
    const payload = await request.json();
    const item = await documentService.upsertProviderConfig(payload);

    await auditLogService.recordFromRequest(request, {
      entityType: "INTEGRATION",
      entityId: item.id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: `Belge sağlayıcısı kaydedildi: ${item.displayName}`,
      metadata: buildDocumentProviderConfigAuditMetadata(item),
    });

    return documentProviderConfigJson({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return documentProviderConfigJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof DocumentAdminError) {
      return documentProviderConfigJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return documentProviderConfigJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("DocumentProviderConfig_providerCode_key")) {
      return documentProviderConfigJson({ message: "Bu sağlayıcı kodu zaten kullanılıyor." }, { status: 409 });
    }

    return documentProviderConfigJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
