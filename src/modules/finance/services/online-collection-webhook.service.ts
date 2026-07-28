import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { OnlineCollectionWebhookPayload, OnlineCollectionWebhookProcessResult } from "@/modules/finance/contracts/online-collection.contract";
import { collectionsService } from "@/modules/finance/services/collections.service";

export class OnlineCollectionWebhookError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function resolveWebhookSecret(providerCode: string) {
  const normalized = providerCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const specific = process.env[`FINANCE_ONLINE_COLLECTION_${normalized}_WEBHOOK_SECRET`]?.trim();
  if (specific) {
    return specific;
  }

  return process.env.FINANCE_ONLINE_COLLECTION_WEBHOOK_SECRET?.trim() ?? null;
}

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) {
    throw new OnlineCollectionWebhookError("Webhook imzası eksik.", 401);
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;

  try {
    const expectedBuffer = Buffer.from(expected, "utf8");
    const providedBuffer = Buffer.from(provided, "utf8");
    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
      throw new OnlineCollectionWebhookError("Webhook imzası geçersiz.", 401);
    }
  } catch {
    throw new OnlineCollectionWebhookError("Webhook imzası geçersiz.", 401);
  }
}

export function buildOnlineCollectionWebhookEvidence(args: {
  rawBody: string;
  signature: string | null;
  parsed: OnlineCollectionWebhookPayload;
}) {
  return {
    rawBodyHash: createHash("sha256").update(args.rawBody).digest("hex"),
    externalPaymentId: args.parsed.externalPaymentId,
    signaturePresent: Boolean(args.signature),
  };
}

export class OnlineCollectionWebhookService {
  async processProviderWebhook(args: {
    providerCode: string;
    rawBody: string;
    signature: string | null;
    payload: OnlineCollectionWebhookPayload;
  }): Promise<OnlineCollectionWebhookProcessResult> {
    const providerCode = args.providerCode.trim().toLowerCase();
    if (!providerCode) {
      throw new OnlineCollectionWebhookError("Sağlayıcı kodu gerekli.", 400);
    }

    const secret = resolveWebhookSecret(providerCode);
    if (!secret) {
      throw new OnlineCollectionWebhookError("Online tahsilat webhook gizli anahtarı yapılandırılmamış.", 503);
    }

    verifySignature(args.rawBody, args.signature, secret);

    return collectionsService.createOnlineCollectionFromWebhook({
      providerCode,
      payload: args.payload,
    });
  }
}

export const onlineCollectionWebhookService = new OnlineCollectionWebhookService();
