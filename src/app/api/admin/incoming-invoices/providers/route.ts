import { ZodError } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import {
  IncomingInvoiceProviderConfigError,
  incomingInvoiceProviderConfigService,
} from "@/modules/incoming-invoices/services/incoming-invoice-provider-config.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    return await requirePermission("incomingInvoices.read", async () => {
      const items = await incomingInvoiceProviderConfigService.listProviderConfigs();
      return noStoreJson({ items });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await requirePermission("incomingInvoices.manage", async (user) => {
      const payload = await request.json();
      const item = await incomingInvoiceProviderConfigService.upsertProviderConfig(payload);

      await auditLogService.recordFromRequest(request, {
        entityType: "INCOMING_INVOICE",
        entityId: item.id,
        action: payload.id ? "UPDATE" : "CREATE",
        actorUserId: user.id,
        summary: `Gelen fatura entegratör yapılandırması kaydedildi: ${item.providerCode}`,
        metadata: { providerConfigId: item.id, providerCode: item.providerCode, isActive: item.isActive },
      });

      return noStoreJson({ item }, { status: payload.id ? 200 : 201 });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof IncomingInvoiceProviderConfigError) {
      return noStoreJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return noStoreJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("IncomingInvoiceProviderConfig_tenantId_providerCode_key")) {
      return noStoreJson({ message: "Bu sağlayıcı kodu zaten kullanılıyor." }, { status: 409 });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
