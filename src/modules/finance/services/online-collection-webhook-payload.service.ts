import { z } from "zod";

import type { OnlineCollectionWebhookPayload } from "@/modules/finance/contracts/online-collection.contract";

const payloadSchema = z.object({
  orderId: z.string().trim().min(1),
  financialAccountId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  collectedAt: z.string().datetime(),
  externalPaymentId: z.string().trim().min(1).max(160),
  note: z.string().trim().max(500).optional().nullable(),
  currency: z.string().trim().length(3).optional().nullable(),
});

export class OnlineCollectionWebhookPayloadService {
  normalize(decoded: unknown): OnlineCollectionWebhookPayload {
    if (!decoded || typeof decoded !== "object") {
      throw new Error("Webhook gövdesi geçersiz.");
    }

    const raw = decoded as Record<string, unknown>;
    const parsed = payloadSchema.parse({
      orderId: raw.orderId ?? raw.order_id,
      financialAccountId: raw.financialAccountId ?? raw.financial_account_id,
      amount: raw.amount,
      collectedAt: raw.collectedAt ?? raw.collected_at,
      externalPaymentId: raw.externalPaymentId ?? raw.external_payment_id ?? raw.paymentId ?? raw.payment_id,
      note: raw.note,
      currency: raw.currency,
    });

    return {
      orderId: parsed.orderId,
      financialAccountId: parsed.financialAccountId,
      amount: parsed.amount,
      collectedAt: parsed.collectedAt,
      externalPaymentId: parsed.externalPaymentId,
      note: parsed.note ?? null,
      currency: parsed.currency ?? null,
    };
  }
}

export const onlineCollectionWebhookPayloadService = new OnlineCollectionWebhookPayloadService();
