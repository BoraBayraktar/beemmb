import { ZodError, z } from "zod";

import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";
import { onlineCollectionWebhookPayloadService } from "@/modules/finance/services/online-collection-webhook-payload.service";
import { OnlineCollectionWebhookError } from "@/modules/finance/services/online-collection-webhook.service";

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

export { ZodError };
