import { createHash } from "node:crypto";

import { z } from "zod";

import type {
  AdminBusinessDocumentDetail,
  AdminQueueBusinessDocumentDispatchInput,
  AdminQueueBusinessDocumentStatusSyncInput,
} from "@/modules/documents/contracts/document.contract";
import { DocumentRepository } from "@/modules/documents/repositories/document.repository";
import { documentDispatchLifecycleService } from "@/modules/documents/services/document-dispatch-lifecycle.service";
import { documentLifecycleService } from "@/modules/documents/services/document-lifecycle.service";
import { DocumentAdminError } from "@/modules/documents/services/document.service";
import { EDocumentProviderRegistryError, eDocumentProviderRegistryService } from "@/modules/edocument/services/edocument-provider-registry.service";
import { eDocumentService } from "@/modules/edocument/services/edocument.service";
import { integrationService } from "@/modules/integration/services/integration.service";
import { buildDocumentDueFields } from "@/modules/finance/services/finance-due-date.util";

const queueDispatchSchema = z.object({
  id: z.string().trim().min(1),
  channel: z.enum(["EDOCS_MOCK"]).default("EDOCS_MOCK"),
  providerConfigId: z.string().trim().min(1).optional(),
  forceFail: z.boolean().optional(),
});

const queueStatusSyncSchema = z.object({
  id: z.string().trim().min(1),
  providerConfigId: z.string().trim().min(1).optional(),
  forceFail: z.boolean().optional(),
});

const IDEMPOTENCY_SUFFIX_PART_LIMIT = 28;

function toNumber(value: { toNumber: () => number } | null | undefined) {
  return value ? value.toNumber() : null;
}

export function assertEDocumentProviderAdapter(providerCode: string) {
  try {
    eDocumentProviderRegistryService.resolveRequired(providerCode);
  } catch (error) {
    if (error instanceof EDocumentProviderRegistryError) {
      throw new DocumentAdminError(error.message, 400);
    }

    throw error;
  }
}

export function buildDocumentDispatchIdempotencySuffix(args: {
  providerCode: string;
  documentId: string;
  xmlHash: string;
}) {
  return buildSafeDocumentIdempotencySuffix("dispatch", [args.providerCode, args.documentId, args.xmlHash]);
}

export function buildDocumentStatusSyncIdempotencySuffix(args: {
  providerCode: string;
  documentId: string;
  providerReference?: string | null;
}) {
  return buildSafeDocumentIdempotencySuffix("status", [args.providerCode, args.documentId, args.providerReference ?? "no-reference"]);
}

function buildSafeDocumentIdempotencySuffix(prefix: string, parts: string[]) {
  const normalizedParts = parts.map((part) => part.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, IDEMPOTENCY_SUFFIX_PART_LIMIT) || "none");
  const digest = createHash("sha256").update([prefix, ...parts].join("|")).digest("hex").slice(0, 16);
  return [prefix, ...normalizedParts, digest].join("-");
}

function mapDetail(item: Awaited<ReturnType<DocumentRepository["findBusinessDocumentById"]>> extends infer T ? NonNullable<T> : never): AdminBusinessDocumentDetail {
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
    orderId: item.order?.id ?? null,
    orderNumber: item.order?.orderNumber ?? null,
    inventoryTransactionId: item.inventoryTransaction?.id ?? null,
    inventoryTransactionNumber: item.inventoryTransaction?.transactionNumber ?? null,
    lineCount: item.lines.length,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    counterpartyTaxNumber: item.counterpartyTaxNumber,
    counterpartyTaxOffice: item.counterpartyTaxOffice,
    counterpartyEmail: item.counterpartyEmail,
    counterpartyAddress: item.counterpartyAddress,
    note: item.note,
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

export class DocumentDispatchService {
  constructor(private readonly repository: DocumentRepository) {}

  private async resolveProviderConfig(providerConfigId?: string) {
    const provider = providerConfigId
      ? await this.repository.findProviderConfigById(providerConfigId)
      : await this.repository.findDefaultProviderConfig();

    if (!provider || !provider.isActive) {
      throw new DocumentAdminError("Aktif bir belge sağlayıcısı bulunamadı. Önce belge sağlayıcısı tanımlayın.", 400);
    }

    return provider;
  }

  async queueOutboundDispatch(input: AdminQueueBusinessDocumentDispatchInput): Promise<AdminBusinessDocumentDetail> {
    const parsed = queueDispatchSchema.parse(input);
    const document = await this.repository.findDispatchableBusinessDocumentById(parsed.id);

    if (!document) {
      throw new DocumentAdminError("Belge bulunamadı.", 404);
    }

    if (!["E_INVOICE", "E_DISPATCH"].includes(document.documentType)) {
      throw new DocumentAdminError("Yalnızca e-fatura ve e-irsaliye belgeleri outbound entegrasyona gönderilebilir.", 400);
    }

    if (document.status === "CANCELLED") {
      throw new DocumentAdminError("İptal edilmiş belge gönderim kuyruğuna alınamaz.", 400);
    }

    const provider = await this.resolveProviderConfig(parsed.providerConfigId ?? document.providerConfigId ?? undefined);
    assertEDocumentProviderAdapter(provider.providerCode);
    const xmlArtifact = await eDocumentService.getCurrentValidXmlArtifact(document.id);

    if (!xmlArtifact) {
      throw new DocumentAdminError("Gönderim öncesi güncel ve geçerli UBL-TR XML üretimi zorunludur.", 400);
    }

    const payload = {
      documentId: document.id,
      documentNumber: document.documentNumber,
      documentType: document.documentType,
      providerConfigId: provider.id,
      providerCode: provider.providerCode,
      providerDisplayName: provider.displayName,
      endpointUrl: provider.endpointUrl,
      username: provider.username,
      hasSecretKey: Boolean(provider.secretKey),
      senderLabel: provider.senderLabel,
      senderVkn: provider.senderVkn,
      issueDate: document.issueDate.toISOString(),
      counterpartyName: document.counterpartyName,
      counterpartyTaxNumber: document.counterpartyTaxNumber,
      currency: document.currency,
      totalAmount: toNumber(document.totalAmount),
      xmlArtifactId: xmlArtifact.id,
      xmlHash: xmlArtifact.xmlHash,
      xmlSchemaVersion: xmlArtifact.schemaVersion,
      lines: document.lines.map((line: {
        id: string;
        productSku: string;
        productName: string;
        quantity: number;
        unitPrice: { toNumber: () => number } | null;
        lineTotal: { toNumber: () => number } | null;
        currency: string;
      }) => ({
        id: line.id,
        productSku: line.productSku,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: toNumber(line.unitPrice),
        lineTotal: toNumber(line.lineTotal),
        currency: line.currency,
      })),
      forceFail: parsed.forceFail ?? false,
    };

    const idempotencySuffix = buildDocumentDispatchIdempotencySuffix({
      providerCode: provider.providerCode,
      documentId: document.id,
      xmlHash: xmlArtifact.xmlHash,
    });

    const dispatchResult = await integrationService.dispatchJobs({
      channel: parsed.channel,
      jobType: "DOCUMENT_OUTBOUND",
      entityType: "BUSINESS_DOCUMENT",
      entityIds: [document.id],
      maxAttempts: 3,
      idempotencySuffix,
      payload,
    });

    const queuedJob = dispatchResult.jobs[0];
    if (!queuedJob) {
      throw new DocumentAdminError("Belge gönderim işi oluşturulamadı.", 500);
    }

    await this.repository.updateBusinessDocument({
      id: document.id,
      providerConfigId: provider.id,
    });

    await documentDispatchLifecycleService.markQueued({
      documentId: document.id,
      integrationJobId: queuedJob.id,
      channel: parsed.channel,
      providerKey: provider.providerCode,
      requestPayload: payload,
    });

    await documentLifecycleService.recordEvent({
      businessDocumentId: document.id,
      eventType: "OUTBOUND_QUEUED",
      status: document.status,
      externalStatus: "QUEUED",
      providerCode: provider.providerCode,
      integrationJobId: queuedJob.id,
      actorType: "USER",
      summary: `Belge gönderim kuyruğuna alındı: ${document.documentNumber}`,
      metadata: {
        documentNumber: document.documentNumber,
        documentType: document.documentType,
        jobType: "DOCUMENT_OUTBOUND",
        idempotencyKey: queuedJob.idempotencyKey,
        idempotencySuffix,
        deduplicated: dispatchResult.deduplicated > 0,
        xmlArtifactId: xmlArtifact.id,
        xmlHash: xmlArtifact.xmlHash,
      },
      message: {
        direction: "OUTBOUND",
        channel: parsed.channel,
        providerCode: provider.providerCode,
        endpoint: provider.endpointUrl,
        messageType: "DOCUMENT_OUTBOUND_REQUEST",
        payload,
      },
    });

    const updated = await this.repository.findBusinessDocumentById(document.id);
    if (!updated) {
      throw new DocumentAdminError("Belge bulunamadı.", 404);
    }

    return mapDetail(updated);
  }

  async queueStatusSync(input: AdminQueueBusinessDocumentStatusSyncInput): Promise<AdminBusinessDocumentDetail> {
    const parsed = queueStatusSyncSchema.parse(input);
    const document = await this.repository.findDispatchableBusinessDocumentById(parsed.id);

    if (!document) {
      throw new DocumentAdminError("Belge bulunamadı.", 404);
    }

    const provider = await this.resolveProviderConfig(parsed.providerConfigId ?? document.providerConfigId ?? undefined);
    assertEDocumentProviderAdapter(provider.providerCode);
    if (!provider.supportsStatusSync) {
      throw new DocumentAdminError("Seçilen sağlayıcı durum senkronunu desteklemiyor.", 400);
    }

    const payload = {
      documentId: document.id,
      documentNumber: document.documentNumber,
      documentType: document.documentType,
      externalReference: document.externalReference,
      providerConfigId: provider.id,
      providerCode: provider.providerCode,
      providerDisplayName: provider.displayName,
      endpointUrl: provider.endpointUrl,
      username: provider.username,
      hasSecretKey: Boolean(provider.secretKey),
      forceFail: parsed.forceFail ?? false,
    };

    const idempotencySuffix = buildDocumentStatusSyncIdempotencySuffix({
      providerCode: provider.providerCode,
      documentId: document.id,
      providerReference: document.externalReference,
    });

    const dispatchResult = await integrationService.dispatchJobs({
      channel: provider.channel,
      jobType: "DOCUMENT_STATUS_SYNC",
      entityType: "BUSINESS_DOCUMENT",
      entityIds: [document.id],
      maxAttempts: 3,
      idempotencySuffix,
      payload,
    });

    const queuedJob = dispatchResult.jobs[0];
    await documentLifecycleService.recordEvent({
      businessDocumentId: document.id,
      eventType: "STATUS_SYNC_QUEUED",
      status: document.status,
      externalStatus: document.externalSystemStatus,
      providerCode: provider.providerCode,
      integrationJobId: queuedJob?.id ?? null,
      actorType: "USER",
      summary: `Belge durum senkronu kuyruğa alındı: ${document.documentNumber}`,
      metadata: {
        documentNumber: document.documentNumber,
        documentType: document.documentType,
        jobType: "DOCUMENT_STATUS_SYNC",
        idempotencyKey: queuedJob?.idempotencyKey ?? null,
        idempotencySuffix,
        deduplicated: dispatchResult.deduplicated > 0,
        providerReference: document.externalReference,
      },
      message: {
        direction: "OUTBOUND",
        channel: provider.channel,
        providerCode: provider.providerCode,
        endpoint: provider.endpointUrl,
        messageType: "DOCUMENT_STATUS_SYNC_REQUEST",
        payload,
      },
    });

    const updated = await this.repository.findBusinessDocumentById(document.id);
    if (!updated) {
      throw new DocumentAdminError("Belge bulunamadı.", 404);
    }

    return mapDetail(updated);
  }
}

export const documentDispatchService = new DocumentDispatchService(new DocumentRepository());
