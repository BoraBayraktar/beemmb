import { z } from "zod";

import type {
  AdminFinanceAllocationLineOption,
  AdminFinanceAllocationSummary,
  AdminFinanceRecordAllocationContext,
  AdminReplaceCollectionAllocationsInput,
  AdminReplacePaymentAllocationsInput,
} from "@/modules/finance/contracts/allocation.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import {
  resolveFinanceServiceMessages,
  type FinanceAllocationLabels,
} from "@/modules/finance/services/finance-service-messages.resolver";

type AllocationLinkInput = {
  collectionRecordId: string | null;
  paymentRecordId: string | null;
  targetType: "ORDER" | "BUSINESS_DOCUMENT" | "BUSINESS_DOCUMENT_LINE";
  orderId: string | null;
  businessDocumentId: string | null;
  businessDocumentLineId?: string | null;
  amount: number;
  currency: string;
};

const manualAllocationItemSchema = z.object({
  businessDocumentLineId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
});

const replaceCollectionSchema = z.object({
  collectionRecordId: z.string().trim().min(1),
  items: z.array(manualAllocationItemSchema).min(1),
});

const replacePaymentSchema = z.object({
  paymentRecordId: z.string().trim().min(1),
  items: z.array(manualAllocationItemSchema).min(1),
});

function mapAllocation(
  item: Awaited<ReturnType<typeof financeRepository.listAllocationLinksForCollection>>[number],
  labels: FinanceAllocationLabels,
) {
  let targetLabel = labels.fallbackRecord;

  if (item.targetType === "ORDER") {
    targetLabel = item.order?.orderNumber ?? item.orderId ?? labels.fallbackOrder;
  } else if (item.targetType === "BUSINESS_DOCUMENT_LINE") {
    const lineTitle = item.businessDocumentLine?.productVariantTitle
      ? `${item.businessDocumentLine.productName} / ${item.businessDocumentLine.productVariantTitle}`
      : item.businessDocumentLine?.productName ?? labels.fallbackLine;
    targetLabel = `${item.businessDocument?.documentNumber ?? labels.fallbackDocument} • ${lineTitle}`;
  } else {
    targetLabel = item.businessDocument?.documentNumber ?? item.businessDocumentId ?? labels.fallbackDocument;
  }

  return {
    id: item.id,
    targetType: item.targetType,
    orderId: item.orderId,
    businessDocumentId: item.businessDocumentId,
    businessDocumentLineId: item.businessDocumentLineId,
    targetLabel,
    amount: item.amount.toNumber(),
    currency: item.currency,
    createdAt: item.createdAt.toISOString(),
  };
}

type AllocationLineRow = {
  id: string;
  lineTotal?: { toNumber(): number } | null;
  unitPrice?: { toNumber(): number } | null;
};

function lineGrossAmount(line: AllocationLineRow) {
  return line.lineTotal?.toNumber() ?? line.unitPrice?.toNumber() ?? 0;
}

function lineOpenAmount(line: AllocationLineRow, allocatedByLineId: Map<string, number>) {
  const gross = lineGrossAmount(line);
  const allocated = allocatedByLineId.get(line.id) ?? 0;

  return Math.max(0, Number((gross - allocated).toFixed(2)));
}

function buildLineOptions(
  lines: Awaited<ReturnType<typeof financeRepository.listBusinessDocumentLinesForOrder>>,
  allocatedByLineId: Map<string, number>,
): AdminFinanceAllocationLineOption[] {
  return lines.map((line) => ({
    lineId: line.id,
    documentId: line.businessDocument.id,
    documentNumber: line.businessDocument.documentNumber,
    label: line.productVariantTitle ? `${line.productName} / ${line.productVariantTitle}` : line.productName,
    openAmount: lineOpenAmount(line, allocatedByLineId),
    currency: line.currency || line.businessDocument.currency,
  })).filter((item) => item.openAmount > 0);
}

function distributeAmountToLines(args: {
  lines: Awaited<ReturnType<typeof financeRepository.listBusinessDocumentLinesForOrder>>;
  allocatedByLineId: Map<string, number>;
  amount: number;
  currency: string;
  orderId?: string | null;
}): AllocationLinkInput[] {
  let remaining = Number(args.amount.toFixed(2));
  const links: AllocationLinkInput[] = [];

  for (const line of args.lines) {
    if (remaining <= 0) {
      break;
    }

    const openAmount = lineOpenAmount(line, args.allocatedByLineId);
    if (openAmount <= 0) {
      continue;
    }

    const slice = Math.min(remaining, openAmount);
    links.push({
      collectionRecordId: null,
      paymentRecordId: null,
      targetType: "BUSINESS_DOCUMENT_LINE",
      orderId: args.orderId ?? line.businessDocument.orderId ?? null,
      businessDocumentId: line.businessDocument.id,
      businessDocumentLineId: line.id,
      amount: slice,
      currency: args.currency,
    });
    remaining = Number((remaining - slice).toFixed(2));
  }

  if (remaining > 0 && args.orderId) {
    links.push({
      collectionRecordId: null,
      paymentRecordId: null,
      targetType: "ORDER",
      orderId: args.orderId,
      businessDocumentId: null,
      amount: remaining,
      currency: args.currency,
    });
  }

  return links;
}

function distributeAmountToDocuments(args: {
  documents: Array<{ id: string; totalAmount: number | null; orderId?: string | null }>;
  amount: number;
  currency: string;
}): AllocationLinkInput[] {
  let remaining = Number(args.amount.toFixed(2));
  const links: AllocationLinkInput[] = [];

  for (const document of args.documents) {
    if (remaining <= 0) {
      break;
    }

    const documentAmount = Number((document.totalAmount ?? 0).toFixed(2));
    if (documentAmount <= 0) {
      continue;
    }

    const slice = Math.min(remaining, documentAmount);
    links.push({
      collectionRecordId: null,
      paymentRecordId: null,
      targetType: "BUSINESS_DOCUMENT",
      orderId: document.orderId ?? null,
      businessDocumentId: document.id,
      amount: slice,
      currency: args.currency,
    });
    remaining = Number((remaining - slice).toFixed(2));
  }

  return links;
}

function sumAllocationAmount(links: AllocationLinkInput[]) {
  return Number(links.reduce((sum, link) => sum + link.amount, 0).toFixed(2));
}

function mapAllocations<T extends Awaited<ReturnType<typeof financeRepository.listAllocationLinksForCollection>>[number]>(
  items: T[],
  locale?: string,
) {
  const labels = resolveFinanceServiceMessages(locale).allocation;
  return items.map((item) => mapAllocation(item, labels));
}

export class FinanceAllocationService {
  private buildSummary(items: ReturnType<typeof mapAllocation>[], expectedAmount: number): AdminFinanceAllocationSummary {
    const allocatedAmount = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));

    return {
      allocatedAmount,
      expectedAmount,
      currency: items[0]?.currency ?? "TRY",
      items,
    };
  }

  async createCollectionAllocations(args: {
    collectionRecordId: string;
    orderId: string;
    amount: number;
    currency: string;
  }) {
    const lines = await financeRepository.listBusinessDocumentLinesForOrder(args.orderId);
    const allocatedByLineId = await financeRepository.sumAllocatedAmountsByBusinessDocumentLineIds(
      lines.map((line) => line.id),
    );
    const distributed = distributeAmountToLines({
      lines,
      allocatedByLineId,
      amount: args.amount,
      currency: args.currency,
      orderId: args.orderId,
    });

    const payload = distributed.length > 0
      ? distributed
      : [{
          collectionRecordId: null,
          paymentRecordId: null,
          targetType: "ORDER" as const,
          orderId: args.orderId,
          businessDocumentId: null,
          amount: args.amount,
          currency: args.currency,
        }];

    await financeRepository.createAllocationLinks(
      payload.map((link) => ({
        ...link,
        collectionRecordId: args.collectionRecordId,
      })),
    );
  }

  async createPaymentAllocations(args: {
    paymentRecordId: string;
    supplierId: string;
    amount: number;
    currency: string;
  }) {
    const lines = await financeRepository.listBusinessDocumentLinesForSupplier(args.supplierId);
    const allocatedByLineId = await financeRepository.sumAllocatedAmountsByBusinessDocumentLineIds(
      lines.map((line) => line.id),
    );
    const lineLinks = distributeAmountToLines({
      lines,
      allocatedByLineId,
      amount: args.amount,
      currency: args.currency,
      orderId: null,
    });

    let links = [...lineLinks];
    const allocated = sumAllocationAmount(links);
    let remaining = Number((args.amount - allocated).toFixed(2));

    if (remaining > 0) {
      const documents = await financeRepository.listBusinessDocumentsForSupplier(args.supplierId);
      const fifoDocuments = [...documents]
        .sort((left, right) => left.issueDate.getTime() - right.issueDate.getTime())
        .map((document) => ({
          id: document.id,
          totalAmount: document.totalAmount?.toNumber() ?? null,
          orderId: null as string | null,
        }));

      links = [...links, ...distributeAmountToDocuments({
        documents: fifoDocuments,
        amount: remaining,
        currency: args.currency,
      })];
    }

    if (links.length === 0) {
      return;
    }

    await financeRepository.createAllocationLinks(
      links.map((link) => ({
        ...link,
        paymentRecordId: args.paymentRecordId,
      })),
    );
  }

  async replaceCollectionAllocations(input: AdminReplaceCollectionAllocationsInput & { locale?: string }) {
    const parsed = replaceCollectionSchema.parse(input);
    const errors = resolveFinanceServiceMessages(input.locale).errors;
    const record = await financeRepository.findCollectionRecordById(parsed.collectionRecordId);

    if (!record) {
      throw new Error(errors.collectionRecordNotFound);
    }

    const expectedAmount = record.amount.toNumber();
    const total = Number(parsed.items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));

    if (total !== expectedAmount) {
      throw new Error(errors.collectionAllocationAmountMismatch);
    }

    const lineIds = parsed.items.map((item) => item.businessDocumentLineId);
    const allocatedByLineId = await financeRepository.sumAllocatedAmountsByBusinessDocumentLineIds(lineIds, {
      collectionRecordId: parsed.collectionRecordId,
    });

    const links: AllocationLinkInput[] = [];

    for (const item of parsed.items) {
      const line = await financeRepository.findBusinessDocumentLineById(item.businessDocumentLineId);

      if (!line?.businessDocument || line.businessDocument.orderId !== record.orderId) {
        throw new Error(errors.collectionLineOrderMismatch);
      }

      const openAmount = lineOpenAmount(line, allocatedByLineId);

      if (item.amount > openAmount) {
        throw new Error(errors.collectionLineOpenAmountInsufficient);
      }

      links.push({
        collectionRecordId: parsed.collectionRecordId,
        paymentRecordId: null,
        targetType: "BUSINESS_DOCUMENT_LINE",
        orderId: record.orderId,
        businessDocumentId: line.businessDocument.id,
        businessDocumentLineId: line.id,
        amount: item.amount,
        currency: record.currency,
      });
    }

    await financeRepository.softDeleteAllocationLinksForCollection(parsed.collectionRecordId);
    await financeRepository.createAllocationLinks(links);
    return this.getCollectionAllocationSummary(parsed.collectionRecordId, expectedAmount, input.locale);
  }

  async replacePaymentAllocations(input: AdminReplacePaymentAllocationsInput & { locale?: string }) {
    const parsed = replacePaymentSchema.parse(input);
    const errors = resolveFinanceServiceMessages(input.locale).errors;
    const record = await financeRepository.findPaymentRecordById(parsed.paymentRecordId);

    if (!record) {
      throw new Error(errors.paymentRecordNotFound);
    }

    const expectedAmount = record.amount.toNumber();
    const total = Number(parsed.items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));

    if (total !== expectedAmount) {
      throw new Error(errors.paymentAllocationAmountMismatch);
    }

    const lineIds = parsed.items.map((item) => item.businessDocumentLineId);
    const allocatedByLineId = await financeRepository.sumAllocatedAmountsByBusinessDocumentLineIds(lineIds, {
      paymentRecordId: parsed.paymentRecordId,
    });

    const links: AllocationLinkInput[] = [];

    for (const item of parsed.items) {
      const line = await financeRepository.findBusinessDocumentLineById(item.businessDocumentLineId);

      if (!line?.businessDocument || line.businessDocument.supplierId !== record.supplierId) {
        throw new Error(errors.paymentLineSupplierMismatch);
      }

      const openAmount = lineOpenAmount(line, allocatedByLineId);

      if (item.amount > openAmount) {
        throw new Error(errors.paymentLineOpenAmountInsufficient);
      }

      links.push({
        collectionRecordId: null,
        paymentRecordId: parsed.paymentRecordId,
        targetType: "BUSINESS_DOCUMENT_LINE",
        orderId: line.businessDocument.orderId,
        businessDocumentId: line.businessDocument.id,
        businessDocumentLineId: line.id,
        amount: item.amount,
        currency: record.currency,
      });
    }

    await financeRepository.softDeleteAllocationLinksForPayment(parsed.paymentRecordId);
    await financeRepository.createAllocationLinks(links);
    return this.getPaymentAllocationSummary(parsed.paymentRecordId, expectedAmount, input.locale);
  }

  async getCollectionAllocationSummary(collectionRecordId: string, expectedAmount?: number, locale?: string): Promise<AdminFinanceAllocationSummary> {
    const items = await financeRepository.listAllocationLinksForCollection(collectionRecordId);
    const mapped = mapAllocations(items, locale);
    const record = expectedAmount == null ? await financeRepository.findCollectionRecordById(collectionRecordId) : null;

    return this.buildSummary(mapped, expectedAmount ?? record?.amount.toNumber() ?? mapped.reduce((sum, item) => sum + item.amount, 0));
  }

  async getPaymentAllocationSummary(paymentRecordId: string, expectedAmount?: number, locale?: string): Promise<AdminFinanceAllocationSummary> {
    const items = await financeRepository.listAllocationLinksForPayment(paymentRecordId);
    const mapped = mapAllocations(items, locale);
    const record = expectedAmount == null ? await financeRepository.findPaymentRecordById(paymentRecordId) : null;

    return this.buildSummary(mapped, expectedAmount ?? record?.amount.toNumber() ?? mapped.reduce((sum, item) => sum + item.amount, 0));
  }

  async getOrderAllocationContexts(orderId: string, locale?: string): Promise<AdminFinanceRecordAllocationContext[]> {
    const lines = await financeRepository.listBusinessDocumentLinesForOrder(orderId);
    const allocatedByLineId = await financeRepository.sumAllocatedAmountsByBusinessDocumentLineIds(
      lines.map((line) => line.id),
    );
    const lineOptions = buildLineOptions(lines, allocatedByLineId);
    const records = await financeRepository.listCollectionRecords([orderId]);

    return Promise.all(records.map(async (record) => {
      const summary = await this.getCollectionAllocationSummary(record.id, record.amount.toNumber(), locale);
      return {
        recordId: record.id,
        recordLabel: new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(record.collectedAt),
        amount: record.amount.toNumber(),
        currency: record.currency,
        summary,
        lineOptions,
      };
    }));
  }

  async getSupplierAllocationContexts(supplierId: string, locale?: string): Promise<AdminFinanceRecordAllocationContext[]> {
    const [records, lines] = await Promise.all([
      financeRepository.listPaymentRecords([supplierId]),
      financeRepository.listBusinessDocumentLinesForSupplier(supplierId),
    ]);
    const allocatedByLineId = await financeRepository.sumAllocatedAmountsByBusinessDocumentLineIds(
      lines.map((line) => line.id),
    );
    const lineOptions = buildLineOptions(lines, allocatedByLineId);

    return Promise.all(records.map(async (record) => {
      const summary = await this.getPaymentAllocationSummary(record.id, record.amount.toNumber(), locale);
      return {
        recordId: record.id,
        recordLabel: new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(record.paidAt),
        amount: record.amount.toNumber(),
        currency: record.currency,
        summary,
        lineOptions,
      };
    }));
  }

  async listAllocationsForOrder(orderId: string, locale?: string) {
    const items = await financeRepository.listAllocationLinksForOrder(orderId);
    return mapAllocations(items, locale);
  }

  async listAllocationsForSupplierDocuments(supplierId: string, locale?: string) {
    const items = await financeRepository.listAllocationLinksForSupplier(supplierId);
    return mapAllocations(items, locale);
  }
}

export const financeAllocationService = new FinanceAllocationService();
