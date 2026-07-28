import {
  onlineCollectionWebhookJson,
  parseOnlineCollectionWebhookPayload,
  ZodError,
} from "@/lib/online-collection-webhook-route.util";
import {
  OnlineCollectionWebhookError,
  onlineCollectionWebhookService,
} from "@/modules/finance/services/online-collection-webhook.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request, context: { params: Promise<{ providerCode: string }> }) {
  try {
    const { providerCode } = await context.params;
    const rawBody = await request.text();
    const parsedBody = parseOnlineCollectionWebhookPayload(rawBody);
    const signature = request.headers.get("x-beemmb-signature");

    const result = await onlineCollectionWebhookService.processProviderWebhook({
      providerCode,
      rawBody,
      signature,
      payload: parsedBody,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "FINANCE_COLLECTION",
      entityId: result.collectionRecordId,
      action: result.duplicate ? "STATUS_UPDATE" : "CREATE",
      summary: result.duplicate
        ? "Online tahsilat webhook yinelenen bildirim (idempotent)"
        : "Online tahsilat webhook ile tahsilat kaydı oluşturuldu",
      metadata: {
        providerCode,
        orderId: result.orderId,
        externalPaymentId: parsedBody.externalPaymentId,
        duplicate: result.duplicate,
      },
    });

    return onlineCollectionWebhookJson({ result });
  } catch (error) {
    if (error instanceof OnlineCollectionWebhookError) {
      return onlineCollectionWebhookJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return onlineCollectionWebhookJson({ message: error.issues[0]?.message ?? "Webhook doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof Error) {
      return onlineCollectionWebhookJson({ message: error.message }, { status: 400 });
    }

    return onlineCollectionWebhookJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
