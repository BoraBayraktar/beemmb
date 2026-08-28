import { createHash, createHmac } from "node:crypto";

import { runWithTenantContext } from "@/lib/tenant-context";
import type { AdminBusinessDocumentDetail, DocumentWebhookPayload } from "@/modules/documents/contracts/document.contract";
import { DocumentRepository } from "@/modules/documents/repositories/document.repository";
import { DocumentAdminError } from "@/modules/documents/services/document.service";
import { documentLifecycleService } from "@/modules/documents/services/document-lifecycle.service";
import { documentProviderCryptoService } from "@/modules/documents/services/document-provider-crypto.service";
import { documentService } from "@/modules/documents/services/document.service";
import { buildDocumentDueFields } from "@/modules/finance/services/finance-due-date.util";
import { platformService } from "@/modules/platform/services/platform.service";

function toNumber(value: { toNumber: () => number } | null | undefined) {
  return value ? value.toNumber() : null;
}

export function buildWebhookEvidencePayload(args: {
  rawBody: string;
  signature: string | null;
  parsed: DocumentWebhookPayload;
}) {
  return {
    rawBodyHash: createHash("sha256").update(args.rawBody).digest("hex"),
    parsed: args.parsed,
    signaturePresent: Boolean(args.signature),
  };
}

function mapDocument(item: Awaited<ReturnType<DocumentRepository["findBusinessDocumentById"]>> extends infer T ? NonNullable<T> : never): AdminBusinessDocumentDetail {
  const dueFields = buildDocumentDueFields(
    item.issueDate.toISOString(),
    item.dueDate ? item.dueDate.toISOString() : null,
    new Date(),
    item.cari?.defaultPaymentTermDays ?? null,
  );

  return {
    id: item.id,
    documentNumber: item.documentNumber,
    documentType: item.documentType,
    status: item.status,
    issueDate: item.issueDate.toISOString(),
    dueDate: dueFields.dueDate,
    effectiveDueDate: dueFields.effectiveDueDate,
    daysUntilDue: dueFields.daysUntilDue,
    isOverdue: dueFields.isOverdue,
    currency: item.currency,
    totalAmount: toNumber(item.totalAmount),
    externalReference: item.externalReference,
    externalSystemStatus: item.externalSystemStatus,
    providerConfigId: item.providerConfig?.id ?? null,
    providerDisplayName: item.providerConfig?.displayName ?? null,
    supplierId: (item.documentType === "PURCHASE_DOCUMENT" || item.documentType === "DELIVERY_NOTE") ? item.cari?.id ?? null : null,
    customerAccountId: (item.documentType === "E_INVOICE" || item.documentType === "E_DISPATCH") ? item.cari?.id ?? null : null,
    counterpartyName: item.counterpartyName,
    counterpartyTaxNumber: item.counterpartyTaxNumber,
    counterpartyTaxOffice: item.counterpartyTaxOffice,
    counterpartyEmail: item.counterpartyEmail,
    counterpartyAddress: item.counterpartyAddress,
    note: item.note,
    orderId: item.order?.id ?? null,
    orderNumber: item.order?.orderNumber ?? null,
    inventoryTransactionId: item.inventoryTransaction?.id ?? null,
    inventoryTransactionNumber: item.inventoryTransaction?.transactionNumber ?? null,
    lineCount: item.lines.length,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lines: item.lines.map((line: {
      id: string;
      productId: string | null;
      productSku: string;
      productName: string;
      quantity: number;
      unitPrice: { toNumber: () => number } | null;
      lineTotal: { toNumber: () => number } | null;
      currency: string;
      note: string | null;
    }) => ({
      id: line.id,
      productId: line.productId,
      productSku: line.productSku,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: toNumber(line.unitPrice),
      lineTotal: toNumber(line.lineTotal),
      currency: line.currency,
      note: line.note,
    })),
    dispatches: item.dispatches.map((dispatch: {
      id: string;
      integrationJobId: string | null;
      channel: "TRENDYOL" | "N11" | "EDOCS_MOCK";
      providerKey: string;
      status: "NOT_SENT" | "QUEUED" | "SENT" | "FAILED";
      externalReference: string | null;
      errorMessage: string | null;
      queuedAt: Date;
      dispatchedAt: Date | null;
      createdAt: Date;
    }) => ({
      id: dispatch.id,
      integrationJobId: dispatch.integrationJobId ?? null,
      channel: dispatch.channel,
      providerKey: dispatch.providerKey,
      status: dispatch.status,
      externalReference: dispatch.externalReference ?? null,
      errorMessage: dispatch.errorMessage ?? null,
      queuedAt: dispatch.queuedAt.toISOString(),
      dispatchedAt: dispatch.dispatchedAt ? dispatch.dispatchedAt.toISOString() : null,
      createdAt: dispatch.createdAt.toISOString(),
    })),
    lifecycleEvents: (item.lifecycleEvents ?? []).map((event: {
      id: string;
      eventType: string;
      status: string | null;
      externalStatus: string | null;
      providerCode: string | null;
      integrationJobId: string | null;
      actorType: string;
      requestId: string | null;
      correlationId: string | null;
      summary: string;
      metadata: unknown;
      occurredAt: Date;
      integrationMessages: Array<{
        id: string;
        direction: string;
        channel: string | null;
        providerCode: string | null;
        messageType: string;
        payloadHash: string;
        statusCode: number | null;
        errorMessage: string | null;
        occurredAt: Date;
      }>;
    }) => ({
      id: event.id,
      eventType: event.eventType,
      status: event.status,
      externalStatus: event.externalStatus,
      providerCode: event.providerCode,
      integrationJobId: event.integrationJobId,
      actorType: event.actorType,
      requestId: event.requestId,
      correlationId: event.correlationId,
      summary: event.summary,
      metadata: (event.metadata as Record<string, unknown> | null) ?? null,
      occurredAt: event.occurredAt.toISOString(),
      messages: event.integrationMessages.map((message) => ({
        id: message.id,
        direction: message.direction,
        channel: message.channel,
        providerCode: message.providerCode,
        messageType: message.messageType,
        payloadHash: message.payloadHash,
        statusCode: message.statusCode,
        errorMessage: message.errorMessage,
        occurredAt: message.occurredAt.toISOString(),
      })),
    })),
  };
}

export class DocumentWebhookService {
  constructor(private readonly repository: DocumentRepository) {}

  verifySignature(rawBody: string, signature: string | null, webhookSecret: string | null) {
    if (!webhookSecret) {
      return false;
    }

    if (!signature) {
      return false;
    }

    const digest = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    return documentProviderCryptoService.compareSecret(digest, signature);
  }

  /**
   * DocumentProviderConfig tenant-scoped (Faz 1 / Dalga 13); ayni providerCode'u
   * birden fazla tenant kendi hesabiyla baglayabilir. Webhook'ta oturum
   * olmadigindan (HMAC imza ile korunuyor) hangi tenant'a ait oldugu URL'den
   * degil, imzanin HANGI tenant'in webhookSecret'iyla eslestiginden
   * cikarilir -- her aktif tenant sirayla denenir, ilk eslesen kazanir.
   * Kucuk/orta tenant sayisinda (elle provizyon modeli) bu O(n) tarama
   * kabul edilebilir bir maliyettir.
   */
  private async resolveTenantAndProvider(providerCode: string, rawBody: string, signature: string | null) {
    const tenants = await platformService.listTenants();

    for (const tenant of tenants) {
      if (tenant.status === "SUSPENDED" || tenant.status === "ARCHIVED") {
        continue;
      }

      const match = await runWithTenantContext({ tenantId: tenant.id, isPlatformOperator: false }, async () => {
        try {
          const provider = await documentService.getResolvedProviderConfigByCode(providerCode);
          if (provider.isActive && this.verifySignature(rawBody, signature, provider.webhookSecret)) {
            return provider;
          }
        } catch {
          // Bu tenant'ta bu providerCode'a ait config yok -- sirada bir sonraki tenant denenir.
        }

        return null;
      });

      if (match) {
        return { tenantId: tenant.id, provider: match };
      }
    }

    return null;
  }

  async processProviderWebhook(args: {
    providerCode: string;
    rawBody: string;
    signature: string | null;
    payload: DocumentWebhookPayload;
  }): Promise<{ item: AdminBusinessDocumentDetail; tenantId: string }> {
    const resolved = await this.resolveTenantAndProvider(args.providerCode, args.rawBody, args.signature);
    if (!resolved) {
      throw new DocumentAdminError("Webhook imzası doğrulanamadı.", 401);
    }

    const { tenantId, provider } = resolved;

    return runWithTenantContext({ tenantId, isPlatformOperator: false }, async () => {
      if (!args.payload.documentNumber && !args.payload.externalReference) {
        throw new DocumentAdminError("Webhook içinde belge numarası veya harici referans bulunmalı.", 400);
      }

      const document = await this.repository.findBusinessDocumentForWebhook({
        documentNumber: args.payload.documentNumber ?? null,
        externalReference: args.payload.externalReference ?? null,
        providerConfigId: provider.id,
      });

      if (!document) {
        throw new DocumentAdminError("Webhook ile eşleşen belge bulunamadı.", 404);
      }

      const updated = await this.repository.markBusinessDocumentStatusSynced({
        id: document.id,
        externalSystemStatus: args.payload.status ?? "SENT",
        externalReference: args.payload.externalReference ?? document.externalReference,
      });

      await documentLifecycleService.recordEvent({
        businessDocumentId: document.id,
        eventType: "WEBHOOK_RECEIVED",
        status: updated.status,
        externalStatus: updated.externalSystemStatus,
        providerCode: args.providerCode,
        actorType: "INTEGRATION",
        summary: `Belge webhook durumu işlendi: ${updated.documentNumber}`,
        metadata: {
          documentNumber: updated.documentNumber,
          externalReference: updated.externalReference,
          providerStatus: args.payload.providerStatus ?? null,
          providerOutcome: args.payload.providerOutcome ?? null,
          providerErrorCode: args.payload.providerErrorCode ?? null,
          providerErrorMessage: args.payload.providerErrorMessage ?? null,
        },
        message: {
          direction: "INBOUND",
          channel: provider.channel,
          providerCode: args.providerCode,
          messageType: "DOCUMENT_STATUS_WEBHOOK",
          payload: buildWebhookEvidencePayload({
            rawBody: args.rawBody,
            signature: args.signature,
            parsed: args.payload,
          }),
          headers: {
            "x-arventa-signature-present": Boolean(args.signature),
          },
        },
      });

      return { item: mapDocument(updated), tenantId };
    });
  }
}

export const documentWebhookService = new DocumentWebhookService(new DocumentRepository());
