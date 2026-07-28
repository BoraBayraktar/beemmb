import { ZodError, z } from "zod";

import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";
import { onlineCollectionWebhookPayloadService } from "@/modules/finance/services/online-collection-webhook-payload.service";
import {
  OnlineCollectionWebhookError,
  onlineCollectionWebhookService,
} from "@/modules/finance/services/online-collection-webhook.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const webhookSchema = z.object({
  orderId: z.string().trim().min(1),
  financialAccountId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  collectedAt: z.string().datetime(),
  externalPaymentId: z.string().trim().min(1),
  note: z.string().trim().max(500).optional().nullable(),
  currency: z.string().trim().length(3).optional().nullable(),
});

export function parseOnlineCollectionWebhookPayload(rawBody: string) {
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    throw new OnlineCollectionWebhookError("Webhook JSON gövdesi geçerli değil.", 400);
  }

  return webhookSchema.parse(onlineCollectionWebhookPayloadService.normalize(decoded));
}

export function buildOnlineCollectionWebhookHeaders() {
  return buildNoStoreHeaders();
}

export function onlineCollectionWebhookJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

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
