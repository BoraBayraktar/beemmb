import { z } from "zod";

import { buildDocumentDueFields } from "@/modules/finance/services/finance-due-date.util";

import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { customerAccountService } from "@/modules/customers/services/customer-account.service";
import type {
  AdminBusinessDocumentDetail,
  AdminBusinessDocumentListItem,
  AdminBusinessDocumentListQuery,
  AdminBusinessDocumentListResult,
  AdminCreateBusinessDocumentInput,
  AdminDocumentProviderConfigItem,
  AdminOperationalPayableDocument,
  AdminPendingInvoiceDeliveryNoteListItem,
  AdminPendingInvoiceDeliveryNoteListResult,
  AdminUpsertDocumentProviderConfigInput,
  AdminUpdateBusinessDocumentInput,
  DocumentProviderResolvedConfig,
} from "@/modules/documents/contracts/document.contract";
import { DocumentRepository } from "@/modules/documents/repositories/document.repository";
import { documentLifecycleService } from "@/modules/documents/services/document-lifecycle.service";
import { documentProviderCryptoService } from "@/modules/documents/services/document-provider-crypto.service";
import { financeAccountEntryService } from "@/modules/finance/services/finance-account-entry.service";
import { EDocumentProviderRegistryError, eDocumentProviderRegistryService } from "@/modules/edocument/services/edocument-provider-registry.service";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  documentType: z.enum(["all", "PURCHASE_DOCUMENT", "DELIVERY_NOTE", "E_INVOICE", "E_DISPATCH"]).default("all"),
  status: z.enum(["all", "DRAFT", "LINKED", "ISSUED", "CANCELLED"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const reportListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createSchema = z.object({
  documentNumber: z.string().trim().min(1).max(120),
  documentType: z.enum(["PURCHASE_DOCUMENT", "DELIVERY_NOTE", "E_INVOICE", "E_DISPATCH"]),
  status: z.enum(["DRAFT", "LINKED", "ISSUED", "CANCELLED"]).optional(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().nullable(),
  currency: z.string().trim().min(3).max(8).optional(),
  totalAmount: z.coerce.number().nonnegative().optional().nullable(),
  externalReference: z.string().trim().max(160).optional().nullable(),
  externalSystemStatus: z.enum(["NOT_SENT", "QUEUED", "SENT", "FAILED"]).optional(),
  providerConfigId: z.string().trim().min(1).optional().nullable(),
  supplierId: z.string().trim().min(1).optional().nullable(),
  customerAccountId: z.string().trim().min(1).optional().nullable(),
  counterpartyTaxNumber: z.string().trim().max(64).optional().nullable(),
  counterpartyTaxOffice: z.string().trim().max(120).optional().nullable(),
  counterpartyEmail: z.string().trim().email().max(160).optional().nullable(),
  counterpartyAddress: z.string().trim().max(500).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  orderNumber: z.string().trim().max(120).optional().nullable(),
  inventoryTransactionNumber: z.string().trim().max(120).optional().nullable(),
}).superRefine((value, ctx) => {
  if (!value.orderNumber && !value.inventoryTransactionNumber) {
    ctx.addIssue({
      code: "custom",
      path: ["orderNumber"],
      message: "Belgeyi bir siparişe veya stok işlemine bağlamalısınız.",
    });
  }

  const requiresSupplier = value.documentType === "PURCHASE_DOCUMENT" || value.documentType === "DELIVERY_NOTE";
  if (requiresSupplier && !value.supplierId) {
    ctx.addIssue({
      code: "custom",
      path: ["supplierId"],
      message: "Bu belge tipi için merkezi tedarikçi seçmelisiniz.",
    });
  }

  const requiresCustomerAccount = value.documentType === "E_INVOICE" || value.documentType === "E_DISPATCH";
  if (requiresCustomerAccount && !value.customerAccountId) {
    ctx.addIssue({
      code: "custom",
      path: ["customerAccountId"],
      message: "Bu belge tipi için merkezi müşteri kartı seçmelisiniz.",
    });
  }
});

const updateSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["DRAFT", "LINKED", "ISSUED", "CANCELLED"]).optional(),
  externalSystemStatus: z.enum(["NOT_SENT", "QUEUED", "SENT", "FAILED"]).optional(),
  externalReference: z.string().trim().max(160).optional().nullable(),
  providerConfigId: z.string().trim().min(1).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
}).refine((value) => (
  value.status !== undefined
  || value.externalSystemStatus !== undefined
  || value.externalReference !== undefined
  || value.providerConfigId !== undefined
  || value.note !== undefined
), {
  message: "En az bir güncelleme alanı göndermelisiniz.",
});

const providerConfigSchema = z.object({
  id: z.string().trim().min(1).optional(),
  providerCode: z.string().trim().min(2).max(64),
  channel: z.enum(["EDOCS_MOCK"]).default("EDOCS_MOCK"),
  displayName: z.string().trim().min(2).max(120),
  endpointUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")).transform((value) => value || null),
  senderLabel: z.string().trim().max(120).optional().nullable().or(z.literal("")).transform((value) => value || null),
  senderVkn: z.string().trim().max(32).optional().nullable().or(z.literal("")).transform((value) => value || null),
  username: z.string().trim().max(120).optional().nullable().or(z.literal("")).transform((value) => value || null),
  secretKey: z.string().trim().max(200).optional().nullable().or(z.literal("")).transform((value) => value || null),
  companyName: z.string().trim().max(160).optional().nullable().or(z.literal("")).transform((value) => value || null),
  webhookSecret: z.string().trim().max(200).optional().nullable().or(z.literal("")).transform((value) => value || null),
  supportsStatusSync: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  note: z.string().trim().max(500).optional().nullable().or(z.literal("")).transform((value) => value || null),
});

export class DocumentAdminError extends Error {
  constructor(message: string, public readonly status = 404) {
    super(message);
    this.name = "DocumentAdminError";
  }
}

export function assertActiveDocumentProviderAdapter(args: { providerCode: string; isActive: boolean }) {
  if (!args.isActive) {
    return;
  }

  try {
    eDocumentProviderRegistryService.resolveRequired(args.providerCode);
  } catch (error) {
    if (error instanceof EDocumentProviderRegistryError) {
      throw new DocumentAdminError(error.message, 400);
    }

    throw error;
  }
}

export function getDocumentProviderAdapterStatus(providerCode: string) {
  const status = eDocumentProviderRegistryService
    .listProviderStatuses()
    .find((item) => item.providerKey === providerCode);

  return {
    registered: Boolean(status),
    configured: status?.configured ?? false,
    operational: status?.operational ?? false,
  };
}

function toNumber(value: { toNumber: () => number } | null | undefined) {
  return value ? value.toNumber() : null;
}

function resolveDocumentPaymentTermDays(item: {
  supplier?: { defaultPaymentTermDays?: number | null } | null;
  customerAccount?: { defaultPaymentTermDays?: number | null } | null;
}) {
  return item.supplier?.defaultPaymentTermDays ?? item.customerAccount?.defaultPaymentTermDays ?? null;
}

function mapDocument(item: Awaited<ReturnType<DocumentRepository["findBusinessDocumentById"]>> extends infer T ? NonNullable<T> : never): AdminBusinessDocumentDetail {
  const dueFields = buildDocumentDueFields(
    item.issueDate.toISOString(),
    item.dueDate ? item.dueDate.toISOString() : null,
    new Date(),
    resolveDocumentPaymentTermDays(item),
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
    supplierId: item.supplier?.id ?? null,
    customerAccountId: item.customerAccount?.id ?? null,
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
      productVariantId: string | null;
      productSku: string;
      productVariantSku: string | null;
      productName: string;
      productVariantTitle: string | null;
      quantity: number;
      unitPrice: { toNumber: () => number } | null;
      lineTotal: { toNumber: () => number } | null;
      currency: string;
      note: string | null;
    }) => ({
      id: line.id,
      productId: line.productId,
      productVariantId: line.productVariantId,
      productSku: line.productSku,
      productVariantSku: line.productVariantSku,
      productName: line.productName,
      productVariantTitle: line.productVariantTitle,
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

function maskSecret(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.length <= 4) {
    return "****";
  }

  return `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

function mapProviderConfig(item: Awaited<ReturnType<DocumentRepository["listProviderConfigs"]>>[number]): AdminDocumentProviderConfigItem {
  const adapterStatus = getDocumentProviderAdapterStatus(item.providerCode);

  return {
    id: item.id,
    providerCode: item.providerCode,
    channel: "EDOCS_MOCK",
    displayName: item.displayName,
    endpointUrl: item.endpointUrl,
    senderLabel: item.senderLabel,
    senderVkn: item.senderVkn,
    username: item.username,
    secretKeyMasked: maskSecret(item.secretKey),
    companyName: item.companyName,
    webhookSecretMasked: maskSecret(item.webhookSecret),
    supportsStatusSync: item.supportsStatusSync,
    isActive: item.isActive,
    isDefault: item.isDefault,
    adapterRegistered: adapterStatus.registered,
    adapterConfigured: adapterStatus.configured,
    adapterOperational: adapterStatus.operational,
    note: item.note,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function mapResolvedProviderConfig(item: NonNullable<Awaited<ReturnType<DocumentRepository["findProviderConfigById"]>>>) : DocumentProviderResolvedConfig {
  return {
    id: item.id,
    providerCode: item.providerCode,
    channel: "EDOCS_MOCK",
    displayName: item.displayName,
    endpointUrl: item.endpointUrl,
    senderLabel: item.senderLabel,
    senderVkn: item.senderVkn,
    username: item.username,
    secretKey: documentProviderCryptoService.decrypt(item.secretKey),
    companyName: item.companyName,
    webhookSecret: documentProviderCryptoService.decrypt(item.webhookSecret),
    supportsStatusSync: item.supportsStatusSync,
    isActive: item.isActive,
    isDefault: item.isDefault,
    note: item.note,
  };
}

function mapDocumentListItem(item: Awaited<ReturnType<DocumentRepository["listBusinessDocuments"]>>[number]): AdminBusinessDocumentListItem {
  const dueFields = buildDocumentDueFields(
    item.issueDate.toISOString(),
    item.dueDate ? item.dueDate.toISOString() : null,
    new Date(),
    resolveDocumentPaymentTermDays(item),
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
    supplierId: item.supplier?.id ?? null,
    customerAccountId: item.customerAccount?.id ?? null,
    counterpartyName: item.counterpartyName,
    orderId: item.order?.id ?? null,
    orderNumber: item.order?.orderNumber ?? null,
    inventoryTransactionId: item.inventoryTransaction?.id ?? null,
    inventoryTransactionNumber: item.inventoryTransaction?.transactionNumber ?? null,
    lineCount: item._count.lines,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const start = (normalizedPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: normalizedPage,
    pageSize,
    total,
    totalPages,
  };
}

export class DocumentService {
  constructor(private readonly repository: DocumentRepository) {}

  async listBusinessDocuments(query: AdminBusinessDocumentListQuery = {}): Promise<AdminBusinessDocumentListResult> {
    const parsed = listQuerySchema.parse(query);
    const [items, total] = await Promise.all([
      this.repository.listBusinessDocuments(parsed),
      this.repository.countBusinessDocuments(parsed),
    ]);

    return {
      items: items.map(mapDocumentListItem),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async getBusinessDocumentById(id: string): Promise<AdminBusinessDocumentDetail> {
    const parsedId = z.string().trim().min(1).parse(id);
    const item = await this.repository.findBusinessDocumentById(parsedId);
    if (!item) {
      throw new DocumentAdminError("Belge bulunamadı.", 404);
    }

    return mapDocument(item);
  }

  async listPendingInvoiceDeliveryNotes(query: Pick<AdminBusinessDocumentListQuery, "search" | "page" | "pageSize"> = {}): Promise<AdminPendingInvoiceDeliveryNoteListResult> {
    const parsed = reportListQuerySchema.parse(query);
    const [candidateNotes, issuedInvoices] = await Promise.all([
      this.repository.listPendingInvoiceCandidateDeliveryNotes(parsed.search),
      this.repository.listIssuedInvoiceDocuments(),
    ]);

    const invoicedOrderIds = new Set(
      issuedInvoices
        .map((item: { orderId: string | null }) => item.orderId)
        .filter((item: string | null): item is string => Boolean(item)),
    );
    const invoicedTransactionIds = new Set(
      issuedInvoices
        .map((item: { inventoryTransactionId: string | null }) => item.inventoryTransactionId)
        .filter((item: string | null): item is string => Boolean(item)),
    );

    const pendingItems: AdminPendingInvoiceDeliveryNoteListItem[] = candidateNotes
      .filter((item: {
        orderId: string | null;
        inventoryTransactionId: string | null;
      }) => {
        if (item.orderId && invoicedOrderIds.has(item.orderId)) {
          return false;
        }

        if (item.inventoryTransactionId && invoicedTransactionIds.has(item.inventoryTransactionId)) {
          return false;
        }

        return true;
      })
      .map((item: {
        documentNumber: string;
        order: { orderNumber: string } | null;
        inventoryTransaction: { transactionNumber: string } | null;
      }) => ({
        ...mapDocumentListItem(item),
        sourceLabel: item.order?.orderNumber ?? item.inventoryTransaction?.transactionNumber ?? item.documentNumber,
      }));

    return paginateItems(pendingItems, parsed.page, parsed.pageSize);
  }

  async listOperationalPayableDocuments(search?: string): Promise<AdminOperationalPayableDocument[]> {
    const items = await this.repository.listOperationalPayableDocuments(search?.trim() || undefined);
    return items.map(mapDocumentListItem);
  }

  async createInvoiceFromDeliveryNote(id: string): Promise<AdminBusinessDocumentDetail> {
    const parsedId = z.string().trim().min(1).parse(id);
    const sourceDocument = await this.repository.findBusinessDocumentById(parsedId);
    if (!sourceDocument) {
      throw new DocumentAdminError("İrsaliye bulunamadı.", 404);
    }

    if (sourceDocument.documentType !== "DELIVERY_NOTE") {
      throw new DocumentAdminError("Yalnızca irsaliyeden e-fatura oluşturabilirsiniz.", 400);
    }

    if (sourceDocument.status === "CANCELLED") {
      throw new DocumentAdminError("İptal edilmiş irsaliyeden e-fatura oluşturulamaz.", 400);
    }

    const existingInvoice = await this.repository.findInvoiceForSourceDocument({
      orderId: sourceDocument.orderId,
      inventoryTransactionId: sourceDocument.inventoryTransactionId,
    });

    if (existingInvoice) {
      throw new DocumentAdminError(`Bu kayıt için zaten bir e-fatura mevcut: ${existingInvoice.documentNumber}`, 409);
    }

    const documentNumber = await this.repository.reserveEDocumentNumber({
      documentType: "E_INVOICE",
      prefix: process.env.EDOCUMENT_INVOICE_NUMBER_PREFIX ?? "BEF",
    });

    const created = await this.repository.createBusinessDocumentFromSource({
      sourceDocumentId: sourceDocument.id,
      documentNumber,
      documentType: "E_INVOICE",
      status: "LINKED",
      note: sourceDocument.note
        ? `${sourceDocument.note}\nKaynak irsaliye: ${sourceDocument.documentNumber}`
        : `Kaynak irsaliye: ${sourceDocument.documentNumber}`,
    });

    if (!created) {
      throw new DocumentAdminError("Kaynak irsaliye bulunamadı.", 404);
    }

    await documentLifecycleService.recordEvent({
      businessDocumentId: created.id,
      eventType: "INVOICE_CREATED_FROM_DELIVERY_NOTE",
      status: created.status,
      externalStatus: created.externalSystemStatus,
      providerCode: created.providerConfig?.displayName ?? null,
      actorType: "SYSTEM",
      summary: `İrsaliyeden e-fatura oluşturuldu: ${created.documentNumber}`,
      metadata: {
        sourceDocumentId: sourceDocument.id,
        sourceDocumentNumber: sourceDocument.documentNumber,
        orderId: created.order?.id ?? null,
        inventoryTransactionId: created.inventoryTransaction?.id ?? null,
      },
    });

    return mapDocument(created);
  }

  async createBusinessDocument(input: AdminCreateBusinessDocumentInput): Promise<AdminBusinessDocumentDetail> {
    const parsed = createSchema.parse(input);
    const requiresSupplier = parsed.documentType === "PURCHASE_DOCUMENT" || parsed.documentType === "DELIVERY_NOTE";
    const orderSource = parsed.orderNumber ? await this.repository.findOrderDocumentSource(parsed.orderNumber) : null;
    const transactionSource = parsed.inventoryTransactionNumber ? await this.repository.findInventoryTransactionDocumentSource(parsed.inventoryTransactionNumber) : null;
    const selectedSupplier = requiresSupplier && parsed.supplierId
      ? (await catalogAdminService.listSuppliers()).find((item) => item.id === parsed.supplierId) ?? null
      : null;
    const selectedCustomerAccount = !requiresSupplier && parsed.customerAccountId
      ? await customerAccountService.getCustomerAccountById(parsed.customerAccountId)
      : null;

    if (parsed.orderNumber && !orderSource) {
      throw new DocumentAdminError("Bağlanacak sipariş bulunamadı.", 404);
    }

    if (parsed.inventoryTransactionNumber && !transactionSource) {
      throw new DocumentAdminError("Bağlanacak stok işlemi bulunamadı.", 404);
    }

    if (parsed.providerConfigId) {
      const provider = await this.repository.findProviderConfigById(parsed.providerConfigId);
      if (!provider || !provider.isActive) {
        throw new DocumentAdminError("Seçilen belge sağlayıcısı bulunamadı veya aktif değil.", 404);
      }

      assertActiveDocumentProviderAdapter({
        providerCode: provider.providerCode,
        isActive: provider.isActive,
      });
    }

    if (requiresSupplier && !selectedSupplier) {
      throw new DocumentAdminError("Seçilen tedarikçi bulunamadı.", 404);
    }

    if (!requiresSupplier && !selectedCustomerAccount) {
      throw new DocumentAdminError("Seçilen müşteri kartı bulunamadı.", 404);
    }

    const resolvedLines = orderSource
      ? orderSource.items.map((item) => ({
          productId: item.productId,
          productSku: item.productSku,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
          lineTotal: item.lineTotal.toNumber(),
          currency: item.currency,
        }))
      : (transactionSource?.lines ?? []).flatMap((line) => {
          const product = line.inventoryItem.product;
          if (!product) {
            return [];
          }

          const variant = line.inventoryItem.productVariant ?? null;
          const matchingReceiptLine = variant?.id
            ? transactionSource?.purchaseReceipt?.lines.find((receiptLine) => receiptLine.productVariantId === variant.id) ?? null
            : transactionSource?.purchaseReceipt?.lines.find((receiptLine) => (
              receiptLine.productVariantId === null
              && receiptLine.productId === product.id
            )) ?? null;
          const resolvedUnitPrice = matchingReceiptLine?.unitCost?.toNumber()
            ?? variant?.purchasePriceOverride?.toNumber()
            ?? product.purchasePrice?.toNumber()
            ?? null;
          const resolvedLineTotal = matchingReceiptLine?.lineTotal?.toNumber()
            ?? (resolvedUnitPrice !== null ? Number((resolvedUnitPrice * line.quantity).toFixed(2)) : null);

          return [{
            productId: product.id,
            productVariantId: variant?.id ?? null,
            productSku: variant?.sku ?? product.sku,
            productVariantSku: variant?.sku ?? null,
            productName: product.name,
            productVariantTitle: variant?.title ?? null,
            quantity: line.quantity,
            unitPrice: resolvedUnitPrice,
            lineTotal: resolvedLineTotal,
            currency: product.currency,
            note: line.note,
          }];
        });

    const created = await this.repository.createBusinessDocument({
      input: parsed,
      resolvedOrderId: orderSource?.id ?? null,
      resolvedInventoryTransactionId: transactionSource?.id ?? null,
      resolvedProviderConfigId: parsed.providerConfigId ?? null,
      resolvedSupplierId: selectedSupplier?.id ?? null,
      resolvedCustomerAccountId: selectedCustomerAccount?.id ?? null,
      resolvedCounterpartyName: (selectedSupplier?.name ?? selectedCustomerAccount?.name ?? transactionSource?.counterpartyName) || "Belirtilmedi",
      resolvedCounterpartyTaxNumber: selectedSupplier?.taxNumber ?? selectedCustomerAccount?.taxNumber ?? parsed.counterpartyTaxNumber ?? null,
      resolvedCounterpartyEmail: selectedSupplier?.email ?? selectedCustomerAccount?.email ?? parsed.counterpartyEmail ?? null,
      resolvedCounterpartyAddress: selectedCustomerAccount?.address ?? parsed.counterpartyAddress ?? null,
      resolvedCurrency: parsed.currency ?? orderSource?.currency ?? "TRY",
      resolvedTotalAmount: parsed.totalAmount ?? orderSource?.total.toNumber() ?? null,
      resolvedLines,
    });

    await documentLifecycleService.recordEvent({
      businessDocumentId: created.id,
      eventType: "DOCUMENT_CREATED",
      status: created.status,
      externalStatus: created.externalSystemStatus,
      providerCode: created.providerConfig?.displayName ?? null,
      actorType: "USER",
      summary: `Belge oluşturuldu: ${created.documentNumber}`,
      metadata: {
        documentType: created.documentType,
        orderId: created.order?.id ?? null,
        inventoryTransactionId: created.inventoryTransaction?.id ?? null,
        lineCount: created.lines.length,
      },
    });

    return mapDocument(created);
  }

  async updateBusinessDocument(input: AdminUpdateBusinessDocumentInput): Promise<AdminBusinessDocumentDetail> {
    const parsed = updateSchema.parse(input);
    const existing = await this.repository.findBusinessDocumentById(parsed.id);
    if (!existing) {
      throw new DocumentAdminError("Belge bulunamadı.", 404);
    }

    if (parsed.providerConfigId) {
      const provider = await this.repository.findProviderConfigById(parsed.providerConfigId);
      if (!provider || !provider.isActive) {
        throw new DocumentAdminError("Seçilen belge sağlayıcısı bulunamadı veya aktif değil.", 404);
      }

      assertActiveDocumentProviderAdapter({
        providerCode: provider.providerCode,
        isActive: provider.isActive,
      });
    }

    const updated = await this.repository.updateBusinessDocument(parsed);
    await documentLifecycleService.recordEvent({
      businessDocumentId: updated.id,
      eventType: "DOCUMENT_UPDATED",
      status: updated.status,
      externalStatus: updated.externalSystemStatus,
      providerCode: updated.providerConfig?.displayName ?? null,
      actorType: "USER",
      summary: `Belge güncellendi: ${updated.documentNumber}`,
      metadata: {
        changedFields: Object.keys(parsed).filter((key) => key !== "id"),
        previousStatus: existing.status,
        previousExternalSystemStatus: existing.externalSystemStatus,
      },
    });
    if (updated.status === "ISSUED") {
      try {
        await financeAccountEntryService.syncFromBusinessDocument(updated.id);
      } catch (error) {
        console.error("PF8 defter projeksiyonu", error);
      }
    }
    return mapDocument(updated);
  }

  async listProviderConfigs(): Promise<AdminDocumentProviderConfigItem[]> {
    const items = await this.repository.listProviderConfigs();
    return items.map(mapProviderConfig);
  }

  async upsertProviderConfig(input: AdminUpsertDocumentProviderConfigInput): Promise<AdminDocumentProviderConfigItem> {
    const parsed = providerConfigSchema.parse(input);
    assertActiveDocumentProviderAdapter({
      providerCode: parsed.providerCode,
      isActive: parsed.isActive,
    });
    const item = await this.repository.upsertProviderConfig({
      ...parsed,
      secretKey: parsed.secretKey ? documentProviderCryptoService.encrypt(parsed.secretKey) : parsed.secretKey,
      webhookSecret: parsed.webhookSecret ? documentProviderCryptoService.encrypt(parsed.webhookSecret) : parsed.webhookSecret,
    });
    return mapProviderConfig(item);
  }

  async getResolvedProviderConfigById(id: string): Promise<DocumentProviderResolvedConfig> {
    const item = await this.repository.findProviderConfigById(z.string().trim().min(1).parse(id));
    if (!item) {
      throw new DocumentAdminError("Belge sağlayıcısı bulunamadı.", 404);
    }

    return mapResolvedProviderConfig(item);
  }

  async getResolvedProviderConfigByCode(providerCode: string): Promise<DocumentProviderResolvedConfig> {
    const item = await this.repository.findProviderConfigByCode(z.string().trim().min(1).parse(providerCode));
    if (!item) {
      throw new DocumentAdminError("Belge sağlayıcısı bulunamadı.", 404);
    }

    return mapResolvedProviderConfig(item);
  }
}

export const documentService = new DocumentService(new DocumentRepository());
