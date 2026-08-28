import { ZodError, z } from "zod";

import { noStoreJson } from "@/lib/no-store-json-response";
import { runWithTenantContext } from "@/lib/tenant-context";
import { incomingInvoiceProviderConfigService } from "@/modules/incoming-invoices/services/incoming-invoice-provider-config.service";
import { incomingInvoiceService } from "@/modules/incoming-invoices/services/incoming-invoice.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

// NOT: Bu route bugün hiçbir IncomingInvoiceProviderConfig aktif (isActive=true)
// olmadığı için fiilen tetiklenmez — ileride gerçek bir e-fatura entegratörü
// bağlandığında (push/webhook modeliyle çalışıyorsa) devreye girecek altyapıdır.
const webhookPayloadSchema = z.object({
  externalReference: z.string().trim().min(1),
  documentNumber: z.string().trim().min(1),
  issueDate: z.string().trim().min(1),
  currency: z.string().trim().min(3).max(8),
  counterpartyName: z.string().trim().min(1),
  counterpartyTaxNumber: z.string().trim().max(64).optional().nullable(),
  counterpartyTaxOffice: z.string().trim().max(120).optional().nullable(),
  counterpartyEmail: z.string().trim().max(160).optional().nullable(),
  counterpartyAddress: z.string().trim().max(500).optional().nullable(),
  xmlContent: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        productName: z.string().trim().min(1),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().nonnegative(),
        lineTotal: z.coerce.number().nonnegative().optional().nullable(),
        vatRate: z.coerce.number().min(0).max(100).optional().nullable(),
      }),
    )
    .min(1),
});

export async function POST(request: Request, context: { params: Promise<{ providerCode: string }> }) {
  try {
    const { providerCode } = await context.params;
    const rawBody = await request.text();
    const signature = request.headers.get("x-incoming-invoice-signature");

    // Oturumsuz webhook (HMAC imza ile korunuyor). Hangi tenant'a ait oldugu
    // URL'den degil, imzanin hangi tenant'in webhookSecret'iyla eslestiginden
    // cikarilir (bkz. resolveTenantAndProviderForWebhook).
    const resolved = await incomingInvoiceProviderConfigService.resolveTenantAndProviderForWebhook(providerCode, rawBody, signature);
    if (!resolved) {
      return noStoreJson({ message: "Sağlayıcı bulunamadı, aktif değil veya webhook imzası doğrulanamadı." }, { status: 404 });
    }

    const { tenantId, config } = resolved;

    return await runWithTenantContext({ tenantId, isPlatformOperator: false }, async () => {
      const payload = webhookPayloadSchema.parse(JSON.parse(rawBody));
      const item = await incomingInvoiceService.ingestIntegratorInvoice({
        providerConfigId: config.id,
        invoice: payload,
      });

      if (!item) {
        return noStoreJson({ message: "Fatura zaten alınmış.", duplicate: true });
      }

      await auditLogService.recordFromRequest(request, {
        entityType: "INCOMING_INVOICE",
        entityId: item.id,
        action: "IMPORT",
        actorType: "INTEGRATION",
        tenantId,
        summary: `Gelen fatura entegratör webhook'u ile alındı: ${item.documentNumber}`,
        metadata: { incomingInvoiceId: item.id, providerCode },
      });

      return noStoreJson({ item }, { status: 201 });
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return noStoreJson({ message: error.issues[0]?.message ?? "Webhook doğrulama hatası oluştu." }, { status: 400 });
    }

    return noStoreJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
