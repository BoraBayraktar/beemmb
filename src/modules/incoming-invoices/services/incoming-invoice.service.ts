import { z } from "zod";

import { financeAccountEntryService } from "@/modules/finance/services/finance-account-entry.service";
import type {
  AdminCreateManualIncomingInvoiceInput,
  AdminImportIncomingInvoiceXmlInput,
  AdminIncomingInvoiceDetail,
  AdminIncomingInvoiceListItem,
  AdminIncomingInvoiceListQuery,
  AdminIncomingInvoiceListResult,
  AdminUpdateIncomingInvoiceInput,
} from "@/modules/incoming-invoices/contracts/incoming-invoice.contract";
import type { IncomingEDocumentProviderInvoice } from "@/modules/incoming-invoices/contracts/incoming-invoice-provider.contract";
import { IncomingInvoiceRepository, incomingInvoiceRepository } from "@/modules/incoming-invoices/repositories/incoming-invoice.repository";
import { incomingEDocumentProviderRegistryService } from "@/modules/incoming-invoices/services/incoming-invoice-provider-registry.service";
import {
  IncomingInvoiceXmlParseError,
  incomingInvoiceXmlParserService,
} from "@/modules/incoming-invoices/services/incoming-invoice-xml-parser.service";

const lineInputSchema = z.object({
  productName: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  lineTotal: z.coerce.number().nonnegative().optional().nullable(),
  vatRate: z.coerce.number().min(0).max(100).optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
});

const createManualSchema = z.object({
  documentNumber: z.string().trim().min(1).max(120),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime().optional().nullable(),
  currency: z.string().trim().min(3).max(8).optional(),
  supplierId: z.string().trim().min(1).optional().nullable(),
  counterpartyName: z.string().trim().min(1).max(200),
  counterpartyTaxNumber: z.string().trim().max(64).optional().nullable(),
  counterpartyTaxOffice: z.string().trim().max(120).optional().nullable(),
  counterpartyEmail: z.string().trim().email().max(160).optional().nullable().or(z.literal("")).transform((value) => value || null),
  counterpartyAddress: z.string().trim().max(500).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  lines: z.array(lineInputSchema).min(1, "En az bir kalem girmelisiniz."),
});

const importXmlSchema = z.object({
  xmlContent: z.string().trim().min(1, "XML içeriği boş olamaz."),
  supplierId: z.string().trim().min(1).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  source: z.enum(["all", "MANUAL", "XML_IMPORT", "INTEGRATOR"]).default("all"),
  status: z.enum(["all", "DRAFT", "REVIEWED", "POSTED", "CANCELLED"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const updateSchema = z.object({
  id: z.string().trim().min(1),
  note: z.string().trim().max(500).optional().nullable(),
});

export class IncomingInvoiceAdminError extends Error {
  constructor(message: string, public readonly status = 404) {
    super(message);
    this.name = "IncomingInvoiceAdminError";
  }
}

function toNumber(value: { toNumber: () => number } | null | undefined) {
  return value ? value.toNumber() : null;
}

function roundAmount(value: number) {
  return Number(value.toFixed(2));
}

function resolveLineTotal(line: { quantity: number; unitPrice: number; lineTotal?: number | null }) {
  if (line.lineTotal !== undefined && line.lineTotal !== null) {
    return roundAmount(line.lineTotal);
  }

  return roundAmount(line.quantity * line.unitPrice);
}

type IncomingInvoiceDetailRow = NonNullable<Awaited<ReturnType<IncomingInvoiceRepository["findIncomingInvoiceById"]>>>;

function mapDetail(item: IncomingInvoiceDetailRow): AdminIncomingInvoiceDetail {
  return {
    id: item.id,
    documentNumber: item.documentNumber,
    source: item.source,
    status: item.status,
    issueDate: item.issueDate.toISOString(),
    dueDate: item.dueDate ? item.dueDate.toISOString() : null,
    currency: item.currency,
    totalAmount: toNumber(item.totalAmount),
    counterpartyName: item.counterpartyName,
    counterpartyTaxNumber: item.counterpartyTaxNumber,
    counterpartyTaxOffice: item.counterpartyTaxOffice,
    counterpartyEmail: item.counterpartyEmail,
    counterpartyAddress: item.counterpartyAddress,
    note: item.note,
    supplierId: item.cari?.id ?? null,
    supplierName: item.cari?.name ?? null,
    externalReference: item.externalReference,
    providerConfigId: item.providerConfig?.id ?? null,
    providerDisplayName: item.providerConfig?.displayName ?? null,
    hasXmlArtifact: Boolean(item.xmlArtifact),
    lineCount: item.lines.length,
    postedFinanceEntryAt: item.postedFinanceEntryAt ? item.postedFinanceEntryAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lines: item.lines.map((line) => ({
      id: line.id,
      productName: line.productName,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
      lineTotal: line.lineTotal.toNumber(),
      vatRate: toNumber(line.vatRate),
      note: line.note,
    })),
    lifecycleEvents: item.lifecycleEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      actorType: event.actorType,
      summary: event.summary,
      metadata: (event.metadata as Record<string, unknown> | null) ?? null,
      occurredAt: event.occurredAt.toISOString(),
    })),
    xmlArtifact: item.xmlArtifact
      ? {
          id: item.xmlArtifact.id,
          validationStatus: item.xmlArtifact.validationStatus,
          validationErrors: item.xmlArtifact.validationErrors,
          createdAt: item.xmlArtifact.createdAt.toISOString(),
        }
      : null,
  };
}

type IncomingInvoiceListRow = Awaited<ReturnType<IncomingInvoiceRepository["listIncomingInvoices"]>>[number];

function mapListItem(item: IncomingInvoiceListRow): AdminIncomingInvoiceListItem {
  return {
    id: item.id,
    documentNumber: item.documentNumber,
    source: item.source,
    status: item.status,
    issueDate: item.issueDate.toISOString(),
    dueDate: item.dueDate ? item.dueDate.toISOString() : null,
    currency: item.currency,
    totalAmount: toNumber(item.totalAmount),
    counterpartyName: item.counterpartyName,
    counterpartyTaxNumber: item.counterpartyTaxNumber,
    supplierId: item.cari?.id ?? null,
    supplierName: item.cari?.name ?? null,
    hasXmlArtifact: Boolean(item.xmlArtifact),
    lineCount: item._count.lines,
    postedFinanceEntryAt: item.postedFinanceEntryAt ? item.postedFinanceEntryAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export class IncomingInvoiceService {
  constructor(private readonly repository: IncomingInvoiceRepository) {}

  async listIncomingInvoices(query: AdminIncomingInvoiceListQuery): Promise<AdminIncomingInvoiceListResult> {
    const parsed = listQuerySchema.parse(query);
    const [rows, total] = await Promise.all([
      this.repository.listIncomingInvoices(parsed),
      this.repository.countIncomingInvoices(parsed),
    ]);

    return {
      items: rows.map(mapListItem),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async getIncomingInvoiceDetail(id: string): Promise<AdminIncomingInvoiceDetail> {
    const item = await this.repository.findIncomingInvoiceById(id);
    if (!item) {
      throw new IncomingInvoiceAdminError("Gelen fatura bulunamadı.", 404);
    }

    return mapDetail(item);
  }

  private async resolveSupplierId(args: { supplierId?: string | null; counterpartyTaxNumber?: string | null }) {
    if (args.supplierId) {
      return args.supplierId;
    }

    if (args.counterpartyTaxNumber) {
      const match = await this.repository.findSupplierByTaxNumber(args.counterpartyTaxNumber);
      return match?.id ?? null;
    }

    return null;
  }

  private async postToFinance(id: string) {
    await financeAccountEntryService.syncFromIncomingInvoice(id);
    return this.repository.markPostedToFinance({ id });
  }

  async getXmlArtifactContent(id: string) {
    const item = await this.repository.findIncomingInvoiceById(id);
    if (!item || !item.xmlArtifact) {
      throw new IncomingInvoiceAdminError("Bu gelen fatura için kayıtlı XML bulunamadı.", 404);
    }

    return {
      documentNumber: item.documentNumber,
      xmlContent: item.xmlArtifact.xmlContent,
      xmlHash: item.xmlArtifact.xmlHash,
      validationStatus: item.xmlArtifact.validationStatus,
    };
  }

  async createManualIncomingInvoice(input: AdminCreateManualIncomingInvoiceInput, actorUserId?: string | null): Promise<AdminIncomingInvoiceDetail> {
    const parsed = createManualSchema.parse(input);

    const resolvedLines = parsed.lines.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: resolveLineTotal(line),
      vatRate: line.vatRate ?? null,
      note: line.note ?? null,
    }));
    const totalAmount = roundAmount(resolvedLines.reduce((sum, line) => sum + line.lineTotal, 0));

    const supplierId = await this.resolveSupplierId({
      supplierId: parsed.supplierId,
      counterpartyTaxNumber: parsed.counterpartyTaxNumber,
    });

    const created = await this.repository.createManualIncomingInvoice({
      documentNumber: parsed.documentNumber,
      source: "MANUAL",
      issueDate: new Date(parsed.issueDate),
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      currency: parsed.currency ?? "TRY",
      totalAmount,
      supplierId,
      counterpartyName: parsed.counterpartyName,
      counterpartyTaxNumber: parsed.counterpartyTaxNumber ?? null,
      counterpartyTaxOffice: parsed.counterpartyTaxOffice ?? null,
      counterpartyEmail: parsed.counterpartyEmail ?? null,
      counterpartyAddress: parsed.counterpartyAddress ?? null,
      note: parsed.note ?? null,
      createdByUserId: actorUserId ?? null,
      lines: resolvedLines,
      lifecycleEventType: "CREATED_MANUAL",
      lifecycleSummary: `Gelen fatura manuel olarak kaydedildi: ${parsed.documentNumber}`,
    });

    const posted = await this.postToFinance(created.id);
    return mapDetail(posted);
  }

  async importIncomingInvoiceFromXml(input: AdminImportIncomingInvoiceXmlInput, actorUserId?: string | null): Promise<AdminIncomingInvoiceDetail> {
    const parsed = importXmlSchema.parse(input);

    let parsedInvoice;
    try {
      parsedInvoice = incomingInvoiceXmlParserService.parse(parsed.xmlContent);
    } catch (error) {
      if (error instanceof IncomingInvoiceXmlParseError) {
        throw new IncomingInvoiceAdminError(error.message, 400);
      }

      throw error;
    }

    const xmlHash = incomingInvoiceXmlParserService.computeXmlHash(parsed.xmlContent);
    const duplicate = await this.repository.findXmlArtifactByHash(xmlHash);
    if (duplicate) {
      throw new IncomingInvoiceAdminError("Bu XML dosyası daha önce içe aktarılmış.", 409);
    }

    const resolvedLines = parsedInvoice.lines.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: resolveLineTotal(line),
      vatRate: line.vatRate,
    }));
    const totalAmount = parsedInvoice.totalAmount ?? roundAmount(resolvedLines.reduce((sum, line) => sum + line.lineTotal, 0));

    const supplierId = await this.resolveSupplierId({
      supplierId: parsed.supplierId,
      counterpartyTaxNumber: parsedInvoice.counterpartyTaxNumber,
    });

    const created = await this.repository.createIncomingInvoiceFromXml({
      documentNumber: parsedInvoice.documentNumber,
      issueDate: new Date(parsedInvoice.issueDate),
      currency: parsedInvoice.currency,
      totalAmount,
      supplierId,
      counterpartyName: parsedInvoice.counterpartyName,
      counterpartyTaxNumber: parsedInvoice.counterpartyTaxNumber,
      counterpartyTaxOffice: parsedInvoice.counterpartyTaxOffice,
      counterpartyEmail: parsedInvoice.counterpartyEmail,
      counterpartyAddress: parsedInvoice.counterpartyAddress,
      note: parsed.note ?? null,
      createdByUserId: actorUserId ?? null,
      lines: resolvedLines,
      xmlContent: parsed.xmlContent,
      xmlHash,
      source: "XML_IMPORT",
      lifecycleEventType: "CREATED_FROM_XML",
      lifecycleSummary: `Gelen fatura XML'den içe aktarıldı: ${parsedInvoice.documentNumber}`,
    });

    return mapDetail(created);
  }

  async reviewIncomingInvoice(id: string, actorUserId?: string | null): Promise<AdminIncomingInvoiceDetail> {
    const existing = await this.repository.findIncomingInvoiceById(id);
    if (!existing) {
      throw new IncomingInvoiceAdminError("Gelen fatura bulunamadı.", 404);
    }

    if (existing.status !== "DRAFT") {
      throw new IncomingInvoiceAdminError("Yalnızca taslak durumundaki faturalar onaylanabilir.", 400);
    }

    await this.repository.markReviewed({ id, actorUserId });
    const posted = await this.postToFinance(id);
    return mapDetail(posted);
  }

  async cancelIncomingInvoice(id: string, actorUserId?: string | null): Promise<AdminIncomingInvoiceDetail> {
    const existing = await this.repository.findIncomingInvoiceById(id);
    if (!existing) {
      throw new IncomingInvoiceAdminError("Gelen fatura bulunamadı.", 404);
    }

    if (existing.status === "POSTED") {
      throw new IncomingInvoiceAdminError("Muhasebeleştirilmiş bir fatura iptal edilemez.", 400);
    }

    if (existing.status === "CANCELLED") {
      return mapDetail(existing);
    }

    const cancelled = await this.repository.markCancelled({ id, actorUserId });
    return mapDetail(cancelled);
  }

  async updateIncomingInvoice(input: AdminUpdateIncomingInvoiceInput): Promise<AdminIncomingInvoiceDetail> {
    const parsed = updateSchema.parse(input);
    const existing = await this.repository.findIncomingInvoiceById(parsed.id);
    if (!existing) {
      throw new IncomingInvoiceAdminError("Gelen fatura bulunamadı.", 404);
    }

    const updated = await this.repository.updateNote({ id: parsed.id, note: parsed.note ?? null });
    return mapDetail(updated);
  }

  // Entegratör altyapısı: bugün hiçbir IncomingInvoiceProviderConfig satırı
  // isActive=true olmadığı için bu iki metod fiilen tetiklenmez. Gerçek bir
  // sağlayıcı bağlanınca webhook route'u veya bir zamanlanmış görev bunları
  // çağırabilir; servis/route katmanında ek değişiklik gerekmez.
  async ingestIntegratorInvoice(args: { providerConfigId: string; invoice: IncomingEDocumentProviderInvoice }): Promise<AdminIncomingInvoiceDetail | null> {
    const existing = await this.repository.findByProviderExternalReference({
      providerConfigId: args.providerConfigId,
      externalReference: args.invoice.externalReference,
    });
    if (existing) {
      return null;
    }

    const resolvedLines = args.invoice.lines.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: resolveLineTotal(line),
      vatRate: line.vatRate ?? null,
    }));
    const totalAmount = roundAmount(resolvedLines.reduce((sum, line) => sum + line.lineTotal, 0));

    const supplierId = await this.resolveSupplierId({
      counterpartyTaxNumber: args.invoice.counterpartyTaxNumber,
    });

    const xmlContent = args.invoice.xmlContent ?? "";
    const xmlHash = xmlContent ? incomingInvoiceXmlParserService.computeXmlHash(xmlContent) : `no-xml:${args.providerConfigId}:${args.invoice.externalReference}`;

    const created = await this.repository.createIncomingInvoiceFromXml({
      documentNumber: args.invoice.documentNumber,
      issueDate: new Date(args.invoice.issueDate),
      currency: args.invoice.currency,
      totalAmount,
      supplierId,
      counterpartyName: args.invoice.counterpartyName,
      counterpartyTaxNumber: args.invoice.counterpartyTaxNumber ?? null,
      counterpartyTaxOffice: args.invoice.counterpartyTaxOffice ?? null,
      counterpartyEmail: args.invoice.counterpartyEmail ?? null,
      counterpartyAddress: args.invoice.counterpartyAddress ?? null,
      createdByUserId: null,
      lines: resolvedLines,
      xmlContent,
      xmlHash,
      source: "INTEGRATOR",
      providerConfigId: args.providerConfigId,
      externalReference: args.invoice.externalReference,
      lifecycleEventType: "CREATED_FROM_INTEGRATOR",
      lifecycleSummary: `Gelen fatura entegratörden alındı: ${args.invoice.documentNumber}`,
    });

    return mapDetail(created);
  }

  async syncFromIntegrator(providerConfigId: string, providerCode: string) {
    const adapter = incomingEDocumentProviderRegistryService.resolve(providerCode);
    const result = await adapter.fetchIncomingInvoices({ since: null, cursor: null });

    let created = 0;
    for (const invoice of result.invoices) {
      const item = await this.ingestIntegratorInvoice({ providerConfigId, invoice });
      if (item) {
        created += 1;
      }
    }

    return { created, fetched: result.invoices.length };
  }
}

export const incomingInvoiceService = new IncomingInvoiceService(incomingInvoiceRepository);
