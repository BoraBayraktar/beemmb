import type { AdminInventoryPayableSummary } from "@/modules/finance/contracts/inventory-payable-summary.contract";
import { inventoryService } from "@/modules/inventory/services/inventory.service";

type PayableDocumentInput = {
  id: string;
  documentNumber: string;
  inventoryTransactionId: string | null;
  inventoryTransactionNumber: string | null;
  lines: Array<{ quantity: number }>;
};

export class InventoryPayableSummaryService {
  async buildSummary(locale: string, documents: PayableDocumentInput[]): Promise<AdminInventoryPayableSummary> {
    const transactionIds = documents
      .map((document) => document.inventoryTransactionId)
      .filter((value): value is string => Boolean(value));

    const transactionSummaries = await inventoryService.listTransactionSummariesForFinance(transactionIds);
    const transactionMap = new Map(transactionSummaries.map((item) => [item.id, item]));

    const mappedDocuments = documents.map((document) => {
      const transaction = document.inventoryTransactionId
        ? transactionMap.get(document.inventoryTransactionId) ?? null
        : null;
      const lineQuantityTotal = document.lines.reduce((sum, line) => sum + line.quantity, 0);
      const searchToken = transaction?.transactionNumber ?? document.inventoryTransactionNumber;

      return {
        documentId: document.id,
        documentNumber: document.documentNumber,
        inventoryTransactionId: document.inventoryTransactionId,
        inventoryTransactionNumber: transaction?.transactionNumber ?? document.inventoryTransactionNumber,
        inventoryTransactionType: transaction?.type ?? null,
        inventoryTransactionStatus: null,
        inventoryHref: searchToken
          ? `/${locale}/admin/inventory/transactions?search=${encodeURIComponent(searchToken)}`
          : null,
        lineQuantityTotal,
      };
    });

    return {
      linkedDocumentCount: mappedDocuments.filter((document) => document.inventoryTransactionId || document.inventoryTransactionNumber).length,
      totalLineQuantity: mappedDocuments.reduce((sum, document) => sum + document.lineQuantityTotal, 0),
      documents: mappedDocuments,
    };
  }
}

export const inventoryPayableSummaryService = new InventoryPayableSummaryService();
