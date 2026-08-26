import { ZodError } from "zod";

import { buildDocumentProviderConfigAuditMetadata } from "@/lib/document-provider-config-audit";
import { documentProviderConfigJson } from "@/lib/edocument-admin-route-response";
import { documentService, DocumentAdminError } from "@/modules/documents/services/document.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    return await requirePermission("documents.read", async () => {
      const items = await documentService.listProviderConfigs();
      return documentProviderConfigJson({ items });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return documentProviderConfigJson({ message: error.message }, { status: error.status });
    }

    return documentProviderConfigJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await requirePermission("documentsProviders.manage", async (user) => {
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
    });
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

    if (error instanceof Error && error.message.includes("DocumentProviderConfig_tenantId_providerCode_key")) {
      return documentProviderConfigJson({ message: "Bu sağlayıcı kodu zaten kullanılıyor." }, { status: 409 });
    }

    return documentProviderConfigJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
