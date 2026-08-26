import { Prisma } from "@prisma/client";

import { buildGibDocumentNumberFromSequence, normalizeGibDocumentNumberPrefix } from "@/lib/gib-document-number";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type { AdminBusinessDocumentListQuery, AdminCreateBusinessDocumentInput } from "@/modules/documents/contracts/document.contract";

export class DocumentRepository {
  async listProviderConfigs() {
    return prisma.documentProviderConfig.findMany({
      where: { deleted: false },
      orderBy: [
        { isDefault: "desc" },
        { isActive: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  async findProviderConfigById(id: string) {
    return prisma.documentProviderConfig.findFirst({
      where: { id, deleted: false },
    });
  }

  async findProviderConfigByCode(providerCode: string) {
    return prisma.documentProviderConfig.findFirst({
      where: {
        providerCode,
        deleted: false,
      },
    });
  }

  async findDefaultProviderConfig() {
    return prisma.documentProviderConfig.findFirst({
      where: {
        deleted: false,
        isActive: true,
        channel: "EDOCS_MOCK",
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "asc" },
      ],
    });
  }

  async findBusinessDocumentForWebhook(args: {
    documentNumber?: string | null;
    externalReference?: string | null;
    providerConfigId: string;
  }) {
    return (prisma.businessDocument as any).findFirst({
      where: {
        deleted: false,
        providerConfigId: args.providerConfigId,
        OR: [
          ...(args.documentNumber ? [{ documentNumber: args.documentNumber }] : []),
          ...(args.externalReference ? [{ externalReference: args.externalReference }] : []),
        ],
      },
      include: {
        cari: { select: { id: true } },
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
        lifecycleEvents: {
          orderBy: { occurredAt: "desc" },
          include: { integrationMessages: { orderBy: { occurredAt: "desc" } } },
        },
      },
    });
  }

  async upsertProviderConfig(args: {
    id?: string;
    providerCode: string;
    channel: "EDOCS_MOCK";
    displayName: string;
    endpointUrl?: string | null;
    senderLabel?: string | null;
    senderVkn?: string | null;
    username?: string | null;
    secretKey?: string | null;
    companyName?: string | null;
    webhookSecret?: string | null;
    supportsStatusSync: boolean;
    isActive: boolean;
    isDefault: boolean;
    note?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      if (args.isDefault) {
        await tx.documentProviderConfig.updateMany({
          where: {
            deleted: false,
            channel: args.channel,
            ...(args.id ? { id: { not: args.id } } : {}),
          },
          data: {
            isDefault: false,
          },
        });
      }

      if (args.id) {
        return tx.documentProviderConfig.update({
          where: { id: args.id },
          data: {
            providerCode: args.providerCode,
            channel: args.channel,
            displayName: args.displayName,
            endpointUrl: args.endpointUrl ?? null,
            senderLabel: args.senderLabel ?? null,
            senderVkn: args.senderVkn ?? null,
            username: args.username ?? null,
            ...(args.secretKey !== undefined ? { secretKey: args.secretKey } : {}),
            companyName: args.companyName ?? null,
            ...(args.webhookSecret !== undefined ? { webhookSecret: args.webhookSecret } : {}),
            supportsStatusSync: args.supportsStatusSync,
            isActive: args.isActive,
            isDefault: args.isDefault,
            note: args.note ?? null,
          },
        });
      }

      return tx.documentProviderConfig.create({
        data: {
          tenantId: requireTenantId(),
          providerCode: args.providerCode,
          channel: args.channel,
          displayName: args.displayName,
          endpointUrl: args.endpointUrl ?? null,
          senderLabel: args.senderLabel ?? null,
          senderVkn: args.senderVkn ?? null,
          username: args.username ?? null,
          secretKey: args.secretKey ?? null,
          companyName: args.companyName ?? null,
          webhookSecret: args.webhookSecret ?? null,
          supportsStatusSync: args.supportsStatusSync,
          isActive: args.isActive,
          isDefault: args.isDefault,
          note: args.note ?? null,
        },
      });
    });
  }

  async listBusinessDocuments(args: Required<Pick<AdminBusinessDocumentListQuery, "page" | "pageSize">> & Pick<AdminBusinessDocumentListQuery, "search" | "documentType" | "status">) {
    return (prisma.businessDocument as any).findMany({
      where: {
        deleted: false,
        ...(args.documentType && args.documentType !== "all" ? { documentType: args.documentType } : {}),
        ...(args.status && args.status !== "all" ? { status: args.status } : {}),
        ...(args.search
          ? {
              OR: [
                { documentNumber: { contains: args.search, mode: "insensitive" as const } },
                { counterpartyName: { contains: args.search, mode: "insensitive" as const } },
                { externalReference: { contains: args.search, mode: "insensitive" as const } },
                { order: { orderNumber: { contains: args.search, mode: "insensitive" as const } } },
                { inventoryTransaction: { transactionNumber: { contains: args.search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
      include: {
        cari: { select: { id: true } },
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        _count: { select: { lines: true } },
      },
    });
  }

  async countBusinessDocuments(args: Pick<AdminBusinessDocumentListQuery, "search" | "documentType" | "status">) {
    return (prisma.businessDocument as any).count({
      where: {
        deleted: false,
        ...(args.documentType && args.documentType !== "all" ? { documentType: args.documentType } : {}),
        ...(args.status && args.status !== "all" ? { status: args.status } : {}),
        ...(args.search
          ? {
              OR: [
                { documentNumber: { contains: args.search, mode: "insensitive" as const } },
                { counterpartyName: { contains: args.search, mode: "insensitive" as const } },
                { externalReference: { contains: args.search, mode: "insensitive" as const } },
                { order: { orderNumber: { contains: args.search, mode: "insensitive" as const } } },
                { inventoryTransaction: { transactionNumber: { contains: args.search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
    });
  }

  async listBusinessDocumentsForVatProjection(args: { fromDate: Date; toDate: Date }) {
    return (prisma.businessDocument as any).findMany({
      where: {
        deleted: false,
        status: { in: ["ISSUED", "LINKED"] },
        documentType: { in: ["E_INVOICE", "PURCHASE_DOCUMENT"] },
        issueDate: {
          gte: args.fromDate,
          lte: args.toDate,
        },
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      include: {
        lines: {
          select: {
            id: true,
            productSku: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            currency: true,
            note: true,
          },
        },
      },
    });
  }

  async listPendingInvoiceCandidateDeliveryNotes(search?: string) {
    return (prisma.businessDocument as any).findMany({
      where: {
        deleted: false,
        documentType: "DELIVERY_NOTE",
        status: { not: "CANCELLED" },
        ...(search
          ? {
              OR: [
                { documentNumber: { contains: search, mode: "insensitive" as const } },
                { counterpartyName: { contains: search, mode: "insensitive" as const } },
                { externalReference: { contains: search, mode: "insensitive" as const } },
                { order: { orderNumber: { contains: search, mode: "insensitive" as const } } },
                { inventoryTransaction: { transactionNumber: { contains: search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      include: {
        cari: { select: { id: true } },
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        _count: { select: { lines: true } },
      },
    });
  }

  async listIssuedInvoiceDocuments() {
    return (prisma.businessDocument as any).findMany({
      where: {
        deleted: false,
        documentType: "E_INVOICE",
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        orderId: true,
        inventoryTransactionId: true,
      },
    });
  }

  async listOperationalPayableDocuments(search?: string) {
    return prisma.businessDocument.findMany({
      where: {
        deleted: false,
        documentType: {
          in: ["PURCHASE_DOCUMENT", "DELIVERY_NOTE", "E_INVOICE"],
        },
        status: { not: "CANCELLED" },
        ...(search
          ? {
              OR: [
                { documentNumber: { contains: search, mode: "insensitive" as const } },
                { counterpartyName: { contains: search, mode: "insensitive" as const } },
                { externalReference: { contains: search, mode: "insensitive" as const } },
                { order: { orderNumber: { contains: search, mode: "insensitive" as const } } },
                { inventoryTransaction: { transactionNumber: { contains: search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      orderBy: [{ counterpartyName: "asc" }, { issueDate: "desc" }],
      include: {
        cari: { select: { id: true } },
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        _count: { select: { lines: true } },
      },
    });
  }

  async findBusinessDocumentById(id: string) {
    return (prisma.businessDocument as any).findFirst({
      where: { id, deleted: false },
      include: {
        cari: { select: { id: true, defaultPaymentTermDays: true } },
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
        lifecycleEvents: {
          orderBy: { occurredAt: "desc" },
          include: { integrationMessages: { orderBy: { occurredAt: "desc" } } },
        },
      },
    });
  }

  async findInvoiceForSourceDocument(args: {
    orderId?: string | null;
    inventoryTransactionId?: string | null;
  }) {
    if (!args.orderId && !args.inventoryTransactionId) {
      return null;
    }

    return (prisma.businessDocument as any).findFirst({
      where: {
        deleted: false,
        documentType: "E_INVOICE",
        status: { not: "CANCELLED" },
        OR: [
          ...(args.orderId ? [{ orderId: args.orderId }] : []),
          ...(args.inventoryTransactionId ? [{ inventoryTransactionId: args.inventoryTransactionId }] : []),
        ],
      },
      include: {
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
        lifecycleEvents: {
          orderBy: { occurredAt: "desc" },
          include: { integrationMessages: { orderBy: { occurredAt: "desc" } } },
        },
      },
    });
  }

  async findDispatchableBusinessDocumentById(id: string) {
    return (prisma.businessDocument as any).findFirst({
      where: { id, deleted: false },
      select: {
        id: true,
        documentNumber: true,
        documentType: true,
        status: true,
        issueDate: true,
        externalReference: true,
        externalSystemStatus: true,
        providerConfigId: true,
        providerConfig: {
          select: {
            id: true,
            providerCode: true,
            displayName: true,
            isActive: true,
            supportsStatusSync: true,
          },
        },
        counterpartyName: true,
        counterpartyTaxNumber: true,
        counterpartyTaxOffice: true,
        counterpartyEmail: true,
        totalAmount: true,
        currency: true,
        lines: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            productId: true,
            productSku: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            currency: true,
          },
        },
      },
    });
  }

  async findOrderDocumentSource(orderNumber: string) {
    return prisma.order.findFirst({
      where: { orderNumber, deleted: false },
      select: {
        id: true,
        orderNumber: true,
        currency: true,
        total: true,
        items: {
          where: { deleted: false },
          orderBy: { createdAt: "asc" },
          select: {
            productId: true,
            productSku: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            currency: true,
          },
        },
      },
    });
  }

  async findInventoryTransactionDocumentSource(transactionNumber: string) {
    return prisma.inventoryTransaction.findFirst({
      where: { transactionNumber },
      select: {
        id: true,
        transactionNumber: true,
        sourceDocumentDate: true,
        externalReference: true,
        externalSystemStatus: true,
        counterpartyName: true,
        purchaseReceipt: {
          select: {
            lines: {
              select: {
                productId: true,
                productVariantId: true,
                unitCost: true,
                lineTotal: true,
              },
            },
          },
        },
        lines: {
          orderBy: { createdAt: "asc" },
          select: {
            quantity: true,
            note: true,
            inventoryItem: {
              select: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    currency: true,
                    purchasePrice: true,
                  },
                },
                productVariant: {
                  select: {
                    id: true,
                    sku: true,
                    title: true,
                    purchasePriceOverride: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createBusinessDocument(args: {
    input: AdminCreateBusinessDocumentInput;
    resolvedOrderId?: string | null;
    resolvedInventoryTransactionId?: string | null;
    resolvedProviderConfigId?: string | null;
    resolvedSupplierId?: string | null;
    resolvedCustomerAccountId?: string | null;
    resolvedCounterpartyName: string;
    resolvedCounterpartyTaxNumber?: string | null;
    resolvedCounterpartyEmail?: string | null;
    resolvedCounterpartyAddress?: string | null;
    resolvedCurrency: string;
    resolvedTotalAmount?: number | null;
    resolvedLines: Array<{
      productId?: string | null;
      productVariantId?: string | null;
      productSku: string;
      productVariantSku?: string | null;
      productName: string;
      productVariantTitle?: string | null;
      quantity: number;
      unitPrice?: number | null;
      lineTotal?: number | null;
      currency: string;
      note?: string | null;
    }>;
  }) {
    const tenantId = requireTenantId();

    return (prisma.businessDocument as any).create({
      data: {
        tenantId,
        documentNumber: args.input.documentNumber,
        documentType: args.input.documentType,
        status: args.input.status ?? "LINKED",
        issueDate: new Date(args.input.issueDate),
        currency: args.resolvedCurrency,
        totalAmount: args.resolvedTotalAmount !== undefined && args.resolvedTotalAmount !== null ? new Prisma.Decimal(args.resolvedTotalAmount) : null,
        externalReference: args.input.externalReference ?? null,
        externalSystemStatus: args.input.externalSystemStatus ?? "NOT_SENT",
        providerConfigId: args.resolvedProviderConfigId ?? null,
        cariId: args.resolvedSupplierId ?? args.resolvedCustomerAccountId ?? null,
        counterpartyName: args.resolvedCounterpartyName,
        counterpartyTaxNumber: args.resolvedCounterpartyTaxNumber ?? null,
        counterpartyTaxOffice: args.input.counterpartyTaxOffice ?? null,
        counterpartyEmail: args.resolvedCounterpartyEmail ?? null,
        counterpartyAddress: args.resolvedCounterpartyAddress ?? null,
        note: args.input.note ?? null,
        orderId: args.resolvedOrderId ?? null,
        inventoryTransactionId: args.resolvedInventoryTransactionId ?? null,
        lines: {
          create: args.resolvedLines.map((line) => ({
            tenantId,
            productId: line.productId ?? null,
            productVariantId: line.productVariantId ?? null,
            productSku: line.productSku,
            productVariantSku: line.productVariantSku ?? null,
            productName: line.productName,
            productVariantTitle: line.productVariantTitle ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice !== undefined && line.unitPrice !== null ? new Prisma.Decimal(line.unitPrice) : null,
            lineTotal: line.lineTotal !== undefined && line.lineTotal !== null ? new Prisma.Decimal(line.lineTotal) : null,
            currency: line.currency,
            note: line.note ?? null,
          })),
        },
      },
      include: {
        cari: { select: { id: true } },
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
        lifecycleEvents: {
          orderBy: { occurredAt: "desc" },
          include: { integrationMessages: { orderBy: { occurredAt: "desc" } } },
        },
      },
    });
  }

  async reserveEDocumentNumber(args: { documentType: "E_INVOICE" | "E_DISPATCH"; prefix: string }) {
    const year = new Date().getFullYear();
    const prefix = normalizeGibDocumentNumberPrefix(args.prefix);
    const tenantId = requireTenantId();

    return prisma.$transaction(async (tx) => {
      const existing = await tx.eDocumentNumberSequence.findFirst({
        where: {
          documentType: args.documentType,
          prefix,
          year,
        },
      });

      const nextSequence = (existing?.lastNumber ?? 0) + 1;

      await tx.eDocumentNumberSequence.upsert({
        where: {
          tenantId_documentType_prefix_year: {
            tenantId,
            documentType: args.documentType,
            prefix,
            year,
          },
        },
        create: {
          tenantId,
          documentType: args.documentType,
          prefix,
          year,
          lastNumber: nextSequence,
        },
        update: {
          lastNumber: nextSequence,
        },
      });

      return buildGibDocumentNumberFromSequence({
        prefix,
        year,
        sequence: nextSequence,
      });
    });
  }

  async createBusinessDocumentFromSource(args: {
    sourceDocumentId: string;
    documentNumber: string;
    documentType: "E_INVOICE";
    status: "LINKED" | "ISSUED" | "DRAFT";
    note?: string | null;
  }) {
    const sourceDocument = await this.findBusinessDocumentById(args.sourceDocumentId);
    if (!sourceDocument) {
      return null;
    }

    const tenantId = requireTenantId();

    return (prisma.businessDocument as any).create({
      data: {
        tenantId,
        documentNumber: args.documentNumber,
        documentType: args.documentType,
        status: args.status,
        issueDate: new Date(),
        currency: sourceDocument.currency,
        totalAmount: sourceDocument.totalAmount,
        externalReference: sourceDocument.externalReference,
        externalSystemStatus: "NOT_SENT",
        providerConfigId: sourceDocument.providerConfigId,
        cariId: sourceDocument.cariId,
        counterpartyName: sourceDocument.counterpartyName,
        counterpartyTaxNumber: sourceDocument.counterpartyTaxNumber,
        counterpartyTaxOffice: sourceDocument.counterpartyTaxOffice,
        counterpartyEmail: sourceDocument.counterpartyEmail,
        counterpartyAddress: sourceDocument.counterpartyAddress,
        note: args.note ?? sourceDocument.note,
        orderId: sourceDocument.orderId,
        inventoryTransactionId: sourceDocument.inventoryTransactionId,
        lines: {
          create: sourceDocument.lines.map((line: {
            productId: string | null;
            productVariantId: string | null;
            productSku: string;
            productVariantSku: string | null;
            productName: string;
            productVariantTitle: string | null;
            quantity: number;
            unitPrice: Prisma.Decimal | null;
            lineTotal: Prisma.Decimal | null;
            currency: string;
            note: string | null;
          }) => ({
            tenantId,
            productId: line.productId,
            productVariantId: line.productVariantId,
            productSku: line.productSku,
            productVariantSku: line.productVariantSku,
            productName: line.productName,
            productVariantTitle: line.productVariantTitle,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            currency: line.currency,
            note: line.note,
          })),
        },
      },
      include: {
        cari: { select: { id: true } },
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
        lifecycleEvents: {
          orderBy: { occurredAt: "desc" },
          include: { integrationMessages: { orderBy: { occurredAt: "desc" } } },
        },
      },
    });
  }

  async updateBusinessDocument(args: {
    id: string;
    status?: "DRAFT" | "LINKED" | "ISSUED" | "CANCELLED";
    externalSystemStatus?: "NOT_SENT" | "QUEUED" | "SENT" | "FAILED";
    externalReference?: string | null;
    providerConfigId?: string | null;
    note?: string | null;
  }) {
    return (prisma.businessDocument as any).update({
      where: { id: args.id },
      data: {
        ...(args.status !== undefined ? { status: args.status } : {}),
        ...(args.externalSystemStatus !== undefined ? { externalSystemStatus: args.externalSystemStatus } : {}),
        ...(args.externalReference !== undefined ? { externalReference: args.externalReference } : {}),
        ...(args.providerConfigId !== undefined ? { providerConfigId: args.providerConfigId } : {}),
        ...(args.note !== undefined ? { note: args.note } : {}),
      },
      include: {
        cari: { select: { id: true } },
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
        lifecycleEvents: {
          orderBy: { occurredAt: "desc" },
          include: { integrationMessages: { orderBy: { occurredAt: "desc" } } },
        },
      },
    });
  }

  async markBusinessDocumentQueued(args: {
    id: string;
    integrationJobId: string;
    channel: "EDOCS_MOCK";
    providerKey: string;
    requestPayload?: Prisma.InputJsonValue | null;
  }) {
    return (prisma.businessDocument as any).update({
      where: { id: args.id },
      data: {
        externalSystemStatus: "QUEUED",
        dispatches: {
          create: {
            tenantId: requireTenantId(),
            integrationJobId: args.integrationJobId,
            channel: args.channel,
            providerKey: args.providerKey,
            status: "QUEUED",
            requestPayload: args.requestPayload ?? Prisma.JsonNull,
          },
        },
      },
      include: {
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
        lifecycleEvents: {
          orderBy: { occurredAt: "desc" },
          include: { integrationMessages: { orderBy: { occurredAt: "desc" } } },
        },
      },
    });
  }

  async markBusinessDocumentDispatchSuccess(args: {
    id: string;
    integrationJobId: string;
    providerKey: string;
    externalReference?: string | null;
    responsePayload?: Prisma.InputJsonValue | null;
  }) {
    await prisma.businessDocumentDispatch.updateMany({
      where: {
        businessDocumentId: args.id,
        integrationJobId: args.integrationJobId,
      },
      data: {
        providerKey: args.providerKey,
        status: "SENT",
        externalReference: args.externalReference ?? null,
        responsePayload: args.responsePayload ?? Prisma.JsonNull,
        errorMessage: null,
        dispatchedAt: new Date(),
      },
    });

    return (prisma.businessDocument as any).update({
      where: { id: args.id },
      data: {
        externalSystemStatus: "SENT",
        externalReference: args.externalReference ?? undefined,
      },
      include: {
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async markBusinessDocumentDispatchFailure(args: {
    id: string;
    integrationJobId: string;
    providerKey: string;
    errorMessage: string;
    responsePayload?: Prisma.InputJsonValue | null;
  }) {
    const updatedCount = await prisma.businessDocumentDispatch.updateMany({
      where: {
        businessDocumentId: args.id,
        integrationJobId: args.integrationJobId,
      },
      data: {
        providerKey: args.providerKey,
        status: "FAILED",
        errorMessage: args.errorMessage,
        responsePayload: args.responsePayload ?? Prisma.JsonNull,
      },
    });

    if (updatedCount.count === 0) {
      await prisma.businessDocumentDispatch.create({
        data: {
          tenantId: requireTenantId(),
          businessDocumentId: args.id,
          integrationJobId: args.integrationJobId,
          channel: "EDOCS_MOCK",
          providerKey: args.providerKey,
          status: "FAILED",
          errorMessage: args.errorMessage,
          responsePayload: args.responsePayload ?? Prisma.JsonNull,
        },
      });
    }

    return (prisma.businessDocument as any).update({
      where: { id: args.id },
      data: {
        externalSystemStatus: "FAILED",
      },
      include: {
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async markBusinessDocumentStatusSynced(args: {
    id: string;
    externalSystemStatus: "NOT_SENT" | "QUEUED" | "SENT" | "FAILED";
    externalReference?: string | null;
  }) {
    return prisma.businessDocument.update({
      where: { id: args.id },
      data: {
        externalSystemStatus: args.externalSystemStatus,
        ...(args.externalReference !== undefined ? { externalReference: args.externalReference } : {}),
      },
      include: {
        order: { select: { id: true, orderNumber: true } },
        inventoryTransaction: { select: { id: true, transactionNumber: true } },
        providerConfig: { select: { id: true, displayName: true } },
        lines: { orderBy: { createdAt: "asc" } },
        dispatches: { orderBy: { createdAt: "desc" } },
      },
    });
  }
}
