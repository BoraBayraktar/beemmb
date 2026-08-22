import type { AdminDocumentFinancePreview } from "@/modules/finance/contracts/document-finance-preview.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import {
  resolveDocumentFinancePreviewCopy,
  type DocumentFinancePreviewCopy,
} from "@/modules/finance/services/document-finance-preview-copy.resolver";
import { buildFinanceMovementReference } from "@/modules/finance/services/finance-movement-reference.service";

function mapAllocationTargetLabel(
  link: Awaited<ReturnType<typeof financeRepository.listAllocationLinksForBusinessDocument>>[number],
  copy: DocumentFinancePreviewCopy,
) {
  if (link.targetType === "ORDER") {
    return link.order?.orderNumber ?? copy.fallbackOrder;
  }

  if (link.targetType === "BUSINESS_DOCUMENT_LINE") {
    const lineTitle = link.businessDocumentLine?.productVariantTitle
      ? `${link.businessDocumentLine.productName} / ${link.businessDocumentLine.productVariantTitle}`
      : link.businessDocumentLine?.productName ?? copy.fallbackLine;

    return `${link.businessDocument?.documentNumber ?? copy.fallbackDocument} • ${lineTitle}`;
  }

  return link.businessDocument?.documentNumber ?? copy.fallbackDocument;
}

export class DocumentFinancePreviewService {
  async getPreview(locale: string, documentId: string): Promise<AdminDocumentFinancePreview | null> {
    const copy = resolveDocumentFinancePreviewCopy(locale);
    const document = await financeRepository.findBusinessDocumentSummaryById(documentId);

    if (!document) {
      return null;
    }

    const allocations = await financeRepository.listAllocationLinksForBusinessDocument(documentId);
    const items: AdminDocumentFinancePreview["items"] = [];
    const seenCashIds = new Set<string>();
    const collectionIds = new Set<string>();
    const paymentIds = new Set<string>();

    for (const link of allocations) {
      items.push({
        id: link.id,
        kind: "ALLOCATION",
        title: `${copy.allocationTitlePrefix}${mapAllocationTargetLabel(link, copy)}`,
        amount: link.amount.toNumber(),
        currency: link.currency,
        occurredAt: link.createdAt.toISOString(),
        financeHref: document.orderId
          ? `/${locale}/admin/finance/collections/${document.orderId}`
          : document.cariId
            ? `/${locale}/admin/finance/payments/${encodeURIComponent(document.cariId)}`
            : null,
      });

      if (link.collectionRecordId) {
        collectionIds.add(link.collectionRecordId);
      }

      if (link.paymentRecordId) {
        paymentIds.add(link.paymentRecordId);
      }
    }

    if (document.orderId) {
      items.push({
        id: `route:receivable:${document.orderId}`,
        kind: "FINANCE_ROUTE",
        title: copy.receivableTitle,
        amount: document.totalAmount?.toNumber() ?? 0,
        currency: document.currency,
        occurredAt: document.issueDate.toISOString(),
        financeHref: `/${locale}/admin/finance/receivables/${document.orderId}`,
      });
    }

    for (const collectionRecordId of collectionIds) {
      const record = allocations.find((item) => item.collectionRecordId === collectionRecordId)?.collectionRecord;

      if (!record) {
        continue;
      }

      items.push({
        id: `collection:${record.id}`,
        kind: "COLLECTION",
        title: copy.collectionTitle,
        amount: record.amount.toNumber(),
        currency: record.currency,
        occurredAt: record.collectedAt.toISOString(),
        financeHref: document.orderId
          ? `/${locale}/admin/finance/collections/${document.orderId}`
          : null,
      });

      const cashTransactions = await financeRepository.listCashTransactionsBySourceReferenceId(
        buildFinanceMovementReference("collection", record.id),
      );

      for (const transaction of cashTransactions) {
        if (seenCashIds.has(transaction.id)) {
          continue;
        }

        seenCashIds.add(transaction.id);
        items.push({
          id: transaction.id,
          kind: "CASH_MOVEMENT",
          title: transaction.title,
          amount: transaction.amount.toNumber(),
          currency: transaction.currency,
          occurredAt: transaction.transactionAt.toISOString(),
          financeHref: `/${locale}/admin/finance/transactions/${transaction.id}`,
        });
      }
    }

    for (const paymentRecordId of paymentIds) {
      const record = allocations.find((item) => item.paymentRecordId === paymentRecordId)?.paymentRecord;

      if (!record) {
        continue;
      }

      items.push({
        id: `payment:${record.id}`,
        kind: "PAYMENT",
        title: copy.paymentTitle,
        amount: record.amount.toNumber(),
        currency: record.currency,
        occurredAt: record.paidAt.toISOString(),
        financeHref: document.cariId
          ? `/${locale}/admin/finance/payments/${encodeURIComponent(document.cariId)}`
          : null,
      });

      const cashTransactions = await financeRepository.listCashTransactionsBySourceReferenceId(
        buildFinanceMovementReference("payment", record.id),
      );

      for (const transaction of cashTransactions) {
        if (seenCashIds.has(transaction.id)) {
          continue;
        }

        seenCashIds.add(transaction.id);
        items.push({
          id: transaction.id,
          kind: "CASH_MOVEMENT",
          title: transaction.title,
          amount: transaction.amount.toNumber(),
          currency: transaction.currency,
          occurredAt: transaction.transactionAt.toISOString(),
          financeHref: `/${locale}/admin/finance/transactions/${transaction.id}`,
        });
      }
    }

    items.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    const allocatedAmount = Number(
      allocations.reduce((sum, item) => sum + item.amount.toNumber(), 0).toFixed(2),
    );

    return {
      documentId: document.id,
      documentNumber: document.documentNumber,
      documentAmount: document.totalAmount?.toNumber() ?? 0,
      currency: document.currency,
      allocatedAmount,
      items,
    };
  }
}

export const documentFinancePreviewService = new DocumentFinancePreviewService();
