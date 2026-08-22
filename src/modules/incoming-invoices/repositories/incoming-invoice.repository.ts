import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { AdminIncomingInvoiceListQuery } from "@/modules/incoming-invoices/contracts/incoming-invoice.contract";

const detailInclude = {
  cari: { select: { id: true, name: true } },
  providerConfig: { select: { id: true, displayName: true } },
  lines: { orderBy: { createdAt: "asc" as const } },
  xmlArtifact: true,
  lifecycleEvents: { orderBy: { occurredAt: "desc" as const } },
};

export class IncomingInvoiceRepository {
  async listIncomingInvoices(args: Required<Pick<AdminIncomingInvoiceListQuery, "page" | "pageSize">> & Pick<AdminIncomingInvoiceListQuery, "search" | "source" | "status">) {
    return prisma.incomingInvoice.findMany({
      where: {
        deleted: false,
        ...(args.source && args.source !== "all" ? { source: args.source } : {}),
        ...(args.status && args.status !== "all" ? { status: args.status } : {}),
        ...(args.search
          ? {
              OR: [
                { documentNumber: { contains: args.search, mode: "insensitive" as const } },
                { counterpartyName: { contains: args.search, mode: "insensitive" as const } },
                { counterpartyTaxNumber: { contains: args.search, mode: "insensitive" as const } },
                { externalReference: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
      include: {
        cari: { select: { id: true, name: true } },
        xmlArtifact: { select: { id: true } },
        _count: { select: { lines: true } },
      },
    });
  }

  async countIncomingInvoices(args: Pick<AdminIncomingInvoiceListQuery, "search" | "source" | "status">) {
    return prisma.incomingInvoice.count({
      where: {
        deleted: false,
        ...(args.source && args.source !== "all" ? { source: args.source } : {}),
        ...(args.status && args.status !== "all" ? { status: args.status } : {}),
        ...(args.search
          ? {
              OR: [
                { documentNumber: { contains: args.search, mode: "insensitive" as const } },
                { counterpartyName: { contains: args.search, mode: "insensitive" as const } },
                { counterpartyTaxNumber: { contains: args.search, mode: "insensitive" as const } },
                { externalReference: { contains: args.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
    });
  }

  async findIncomingInvoiceById(id: string) {
    return prisma.incomingInvoice.findFirst({
      where: { id, deleted: false },
      include: detailInclude,
    });
  }

  async findSupplierByTaxNumber(taxNumber: string) {
    return prisma.cari.findFirst({
      where: { taxNumber, isSupplier: true, deleted: false },
      select: { id: true, name: true },
    });
  }

  async findXmlArtifactByHash(xmlHash: string) {
    return prisma.incomingInvoiceXmlArtifact.findUnique({
      where: { xmlHash },
      select: { id: true, incomingInvoiceId: true },
    });
  }

  async findByProviderExternalReference(args: { providerConfigId: string; externalReference: string }) {
    return prisma.incomingInvoice.findUnique({
      where: {
        providerConfigId_externalReference: {
          providerConfigId: args.providerConfigId,
          externalReference: args.externalReference,
        },
      },
      select: { id: true },
    });
  }

  async createManualIncomingInvoice(args: {
    documentNumber: string;
    source: "MANUAL" | "XML_IMPORT" | "INTEGRATOR";
    issueDate: Date;
    dueDate?: Date | null;
    currency: string;
    totalAmount: number;
    supplierId?: string | null;
    counterpartyName: string;
    counterpartyTaxNumber?: string | null;
    counterpartyTaxOffice?: string | null;
    counterpartyEmail?: string | null;
    counterpartyAddress?: string | null;
    note?: string | null;
    createdByUserId?: string | null;
    lines: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      vatRate?: number | null;
      note?: string | null;
    }>;
    lifecycleEventType: string;
    lifecycleSummary: string;
  }) {
    return prisma.incomingInvoice.create({
      data: {
        documentNumber: args.documentNumber,
        source: args.source,
        status: "DRAFT",
        issueDate: args.issueDate,
        dueDate: args.dueDate ?? null,
        currency: args.currency,
        totalAmount: new Prisma.Decimal(args.totalAmount),
        cariId: args.supplierId ?? null,
        counterpartyName: args.counterpartyName,
        counterpartyTaxNumber: args.counterpartyTaxNumber ?? null,
        counterpartyTaxOffice: args.counterpartyTaxOffice ?? null,
        counterpartyEmail: args.counterpartyEmail ?? null,
        counterpartyAddress: args.counterpartyAddress ?? null,
        note: args.note ?? null,
        createdByUserId: args.createdByUserId ?? null,
        lines: {
          create: args.lines.map((line) => ({
            productName: line.productName,
            quantity: new Prisma.Decimal(line.quantity),
            unitPrice: new Prisma.Decimal(line.unitPrice),
            lineTotal: new Prisma.Decimal(line.lineTotal),
            vatRate: line.vatRate !== undefined && line.vatRate !== null ? new Prisma.Decimal(line.vatRate) : null,
            note: line.note ?? null,
          })),
        },
        lifecycleEvents: {
          create: {
            eventType: args.lifecycleEventType,
            summary: args.lifecycleSummary,
            actorUserId: args.createdByUserId ?? null,
          },
        },
      },
      include: detailInclude,
    });
  }

  async createIncomingInvoiceFromXml(args: {
    documentNumber: string;
    issueDate: Date;
    currency: string;
    totalAmount: number;
    supplierId?: string | null;
    counterpartyName: string;
    counterpartyTaxNumber?: string | null;
    counterpartyTaxOffice?: string | null;
    counterpartyEmail?: string | null;
    counterpartyAddress?: string | null;
    note?: string | null;
    createdByUserId?: string | null;
    lines: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      vatRate?: number | null;
    }>;
    xmlContent: string;
    xmlHash: string;
    source: "XML_IMPORT" | "INTEGRATOR";
    providerConfigId?: string | null;
    externalReference?: string | null;
    lifecycleEventType: string;
    lifecycleSummary: string;
  }) {
    return prisma.incomingInvoice.create({
      data: {
        documentNumber: args.documentNumber,
        source: args.source,
        status: "DRAFT",
        issueDate: args.issueDate,
        currency: args.currency,
        totalAmount: new Prisma.Decimal(args.totalAmount),
        cariId: args.supplierId ?? null,
        providerConfigId: args.providerConfigId ?? null,
        externalReference: args.externalReference ?? null,
        counterpartyName: args.counterpartyName,
        counterpartyTaxNumber: args.counterpartyTaxNumber ?? null,
        counterpartyTaxOffice: args.counterpartyTaxOffice ?? null,
        counterpartyEmail: args.counterpartyEmail ?? null,
        counterpartyAddress: args.counterpartyAddress ?? null,
        note: args.note ?? null,
        createdByUserId: args.createdByUserId ?? null,
        lines: {
          create: args.lines.map((line) => ({
            productName: line.productName,
            quantity: new Prisma.Decimal(line.quantity),
            unitPrice: new Prisma.Decimal(line.unitPrice),
            lineTotal: new Prisma.Decimal(line.lineTotal),
            vatRate: line.vatRate !== undefined && line.vatRate !== null ? new Prisma.Decimal(line.vatRate) : null,
          })),
        },
        xmlArtifact: {
          create: {
            xmlContent: args.xmlContent,
            xmlHash: args.xmlHash,
            validationStatus: "NOT_VALIDATED",
          },
        },
        lifecycleEvents: {
          create: {
            eventType: args.lifecycleEventType,
            summary: args.lifecycleSummary,
            actorUserId: args.createdByUserId ?? null,
          },
        },
      },
      include: detailInclude,
    });
  }

  async updateNote(args: { id: string; note: string | null }) {
    return prisma.incomingInvoice.update({
      where: { id: args.id },
      data: { note: args.note },
      include: detailInclude,
    });
  }

  async markCancelled(args: { id: string; actorUserId?: string | null }) {
    return prisma.incomingInvoice.update({
      where: { id: args.id },
      data: {
        status: "CANCELLED",
        lifecycleEvents: {
          create: {
            eventType: "CANCELLED",
            summary: "Gelen fatura iptal edildi.",
            actorUserId: args.actorUserId ?? null,
          },
        },
      },
      include: detailInclude,
    });
  }

  async markReviewed(args: { id: string; actorUserId?: string | null }) {
    return prisma.incomingInvoice.update({
      where: { id: args.id },
      data: {
        status: "REVIEWED",
        lifecycleEvents: {
          create: {
            eventType: "REVIEWED",
            summary: "Gelen fatura onaylandı.",
            actorUserId: args.actorUserId ?? null,
          },
        },
      },
      include: detailInclude,
    });
  }

  async markPostedToFinance(args: { id: string }) {
    return prisma.incomingInvoice.update({
      where: { id: args.id },
      data: {
        status: "POSTED",
        postedFinanceEntryAt: new Date(),
        lifecycleEvents: {
          create: {
            eventType: "POSTED_TO_FINANCE",
            summary: "Gelen fatura muhasebe defterine işlendi.",
          },
        },
      },
      include: detailInclude,
    });
  }

  async listProviderConfigs() {
    return prisma.incomingInvoiceProviderConfig.findMany({
      where: { deleted: false },
      orderBy: [{ isDefault: "desc" }, { isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  async findProviderConfigById(id: string) {
    return prisma.incomingInvoiceProviderConfig.findFirst({ where: { id, deleted: false } });
  }

  async findActiveProviderConfigByCode(providerCode: string) {
    return prisma.incomingInvoiceProviderConfig.findFirst({
      where: { providerCode, deleted: false, isActive: true },
    });
  }

  async upsertProviderConfig(args: {
    id?: string;
    providerCode: string;
    displayName: string;
    endpointUrl?: string | null;
    username?: string | null;
    secretKey?: string | null;
    webhookSecret?: string | null;
    isActive: boolean;
    isDefault: boolean;
    note?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      if (args.isDefault) {
        await tx.incomingInvoiceProviderConfig.updateMany({
          where: { deleted: false, ...(args.id ? { id: { not: args.id } } : {}) },
          data: { isDefault: false },
        });
      }

      if (args.id) {
        return tx.incomingInvoiceProviderConfig.update({
          where: { id: args.id },
          data: {
            providerCode: args.providerCode,
            displayName: args.displayName,
            endpointUrl: args.endpointUrl ?? null,
            username: args.username ?? null,
            ...(args.secretKey !== undefined ? { secretKey: args.secretKey } : {}),
            ...(args.webhookSecret !== undefined ? { webhookSecret: args.webhookSecret } : {}),
            isActive: args.isActive,
            isDefault: args.isDefault,
            note: args.note ?? null,
          },
        });
      }

      return tx.incomingInvoiceProviderConfig.create({
        data: {
          providerCode: args.providerCode,
          displayName: args.displayName,
          endpointUrl: args.endpointUrl ?? null,
          username: args.username ?? null,
          secretKey: args.secretKey ?? null,
          webhookSecret: args.webhookSecret ?? null,
          isActive: args.isActive,
          isDefault: args.isDefault,
          note: args.note ?? null,
        },
      });
    });
  }

  async findIncomingInvoiceForLedgerSync(id: string) {
    return prisma.incomingInvoice.findFirst({
      where: { id, deleted: false },
      select: {
        id: true,
        documentNumber: true,
        issueDate: true,
        currency: true,
        status: true,
        cariId: true,
        note: true,
        lines: {
          select: { id: true, productName: true, lineTotal: true, unitPrice: true, quantity: true },
        },
      },
    });
  }
}

export const incomingInvoiceRepository = new IncomingInvoiceRepository();
