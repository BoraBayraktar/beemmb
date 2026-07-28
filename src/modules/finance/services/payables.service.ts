import { documentService } from "@/modules/documents/services/document.service";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import type {
  AdminSupplierPayableDetail,
  AdminSupplierPayableSummary,
  AdminSupplierPayablesListResult,
  AdminSupplierPayablesQuery,
} from "@/modules/finance/contracts/payables.contract";
import { buildFinanceDueKpi } from "@/modules/finance/services/finance-due-date.util";

function normalizeSupplierKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function buildTopVariantSummary(documents: Array<{
  lines?: Array<{
    productName: string;
    productVariantTitle?: string | null;
    lineTotal?: number | null;
  }>;
}>) {
  const totals = new Map<string, number>();

  for (const document of documents) {
    for (const line of document.lines ?? []) {
      const label = line.productVariantTitle
        ? `${line.productName} / ${line.productVariantTitle}`
        : line.productName;
      const current = totals.get(label) ?? 0;
      totals.set(label, current + (line.lineTotal ?? 0));
    }
  }

  const topEntries = Array.from(totals.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([label]) => label);

  return topEntries.length > 0 ? topEntries.join(" + ") : null;
}

function buildSupplierSummaryFromDocuments(
  documents: Awaited<ReturnType<typeof documentService.listOperationalPayableDocuments>>,
): AdminSupplierPayableSummary[] {
  const grouped = new Map<string, AdminSupplierPayableSummary>();

  for (const document of documents) {
    const supplierName = document.counterpartyName.trim() || "Belirtilmedi";
    const supplierId = document.supplierId ?? null;
    const currency = document.currency || "TRY";
    const supplierKey = `${normalizeSupplierKey(supplierName)}:${currency}`;
    const current = grouped.get(supplierKey);
    const amount = document.totalAmount ?? 0;

    if (!current) {
      grouped.set(supplierKey, {
        supplierId,
        supplierSlug: null,
        supplierKey,
        supplierName,
        currency,
        totalAmount: amount,
        documentCount: 1,
        draftCount: document.status === "DRAFT" ? 1 : 0,
        lastIssueDate: document.issueDate,
        nearestDueDate: document.effectiveDueDate,
        overdueAmount: document.isOverdue ? amount : 0,
        topVariantSummary: null,
        documents: [document],
      });
      continue;
    }

    current.supplierId = current.supplierId ?? supplierId;
    current.totalAmount += amount;
    current.documentCount += 1;
    current.draftCount += document.status === "DRAFT" ? 1 : 0;
    current.overdueAmount += document.isOverdue ? amount : 0;
    current.lastIssueDate = !current.lastIssueDate || new Date(document.issueDate) > new Date(current.lastIssueDate)
      ? document.issueDate
      : current.lastIssueDate;
    if (!current.nearestDueDate || new Date(document.effectiveDueDate) < new Date(current.nearestDueDate)) {
      current.nearestDueDate = document.effectiveDueDate;
    }
    current.documents.push(document);
  }

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      totalAmount: Number(item.totalAmount.toFixed(2)),
      overdueAmount: Number(item.overdueAmount.toFixed(2)),
      topVariantSummary: null,
      documents: item.documents.sort((left, right) => right.issueDate.localeCompare(left.issueDate)),
    }))
    .sort((left, right) => right.totalAmount - left.totalAmount);
}

export class PayablesService {
  async listSupplierPayables(query: AdminSupplierPayablesQuery = {}): Promise<AdminSupplierPayablesListResult> {
    const documents = await documentService.listOperationalPayableDocuments(query.search);
    const dueKpi = buildFinanceDueKpi(
      documents.map((document) => ({
        amount: document.totalAmount ?? 0,
        effectiveDueDate: document.effectiveDueDate,
        currency: document.currency || "TRY",
      })),
    );

    const filteredDocuments = query.overdueOnly
      ? documents.filter((document) => document.isOverdue)
      : documents;

    const summaries = buildSupplierSummaryFromDocuments(filteredDocuments);

    const items = await Promise.all(summaries.map(async (item) => {
      if (!item.supplierId) {
        return item;
      }

      const supplier = await financeRepository.findSupplierById(item.supplierId);
      return {
        ...item,
        supplierSlug: supplier?.slug ?? null,
      };
    }));

    return { items, dueKpi };
  }

  async getSupplierPayableByKey(supplierKey: string): Promise<AdminSupplierPayableDetail | null> {
    const { items } = await this.listSupplierPayables();
    const summary = items.find((item) => item.supplierKey === supplierKey) ?? null;
    if (!summary) {
      return null;
    }

    const documents = await Promise.all(
      summary.documents.map((document) => documentService.getBusinessDocumentById(document.id)),
    );

    return {
      ...summary,
      topVariantSummary: buildTopVariantSummary(documents),
      documents,
    };
  }
}

export const payablesService = new PayablesService();
