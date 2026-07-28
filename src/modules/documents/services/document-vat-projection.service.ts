import type {
  DocumentVatDirection,
  DocumentVatProjectionQuery,
  DocumentVatProjectionResult,
  DocumentVatProjectionRow,
} from "@/modules/documents/contracts/document-vat-projection.contract";
import { DocumentRepository } from "@/modules/documents/repositories/document.repository";
import { eDocumentTaxConfigService } from "@/modules/edocument/services/edocument-tax-config.service";
import { calculateInvoiceTotals } from "@/modules/edocument/services/ubl-tax.util";

function toNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" ? value : value.toNumber();
}

function resolveDirection(documentType: "E_INVOICE" | "PURCHASE_DOCUMENT"): DocumentVatDirection {
  return documentType === "E_INVOICE" ? "OUTPUT" : "INPUT";
}

function projectDocument(
  item: Awaited<ReturnType<DocumentRepository["listBusinessDocumentsForVatProjection"]>>[number],
  vatRate: number | null,
): DocumentVatProjectionRow {
  const documentInput = {
    lines: item.lines.map((line: {
      id: string;
      productSku: string;
      productName: string;
      quantity: number;
      unitPrice: { toNumber(): number } | null;
      lineTotal: { toNumber(): number } | null;
      currency: string;
      note: string | null;
    }) => ({
      id: line.id,
      productSku: line.productSku,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: toNumber(line.unitPrice),
      lineTotal: toNumber(line.lineTotal),
      currency: line.currency,
      note: line.note,
    })),
    tax: { vatRate },
    totalAmount: toNumber(item.totalAmount),
  };

  const totals = calculateInvoiceTotals(documentInput as Parameters<typeof calculateInvoiceTotals>[0]);

  return {
    documentId: item.id,
    documentNumber: item.documentNumber,
    documentType: item.documentType,
    issueDate: item.issueDate.toISOString(),
    counterpartyName: item.counterpartyName,
    currency: item.currency,
    vatRate,
    taxExclusiveAmount: totals.taxExclusiveAmount,
    taxAmount: totals.taxAmount,
    taxInclusiveAmount: totals.taxInclusiveAmount,
    direction: resolveDirection(item.documentType),
  };
}

export class DocumentVatProjectionService {
  constructor(private readonly repository = new DocumentRepository()) {}

  async listVatProjectionsForPeriod(query: DocumentVatProjectionQuery): Promise<DocumentVatProjectionResult> {
    const items = await this.repository.listBusinessDocumentsForVatProjection({
      fromDate: query.fromDate,
      toDate: query.toDate,
    });
    const vatRate = eDocumentTaxConfigService.resolveTaxConfig().vatRate;

    return {
      items: items.map((item: Awaited<ReturnType<DocumentRepository["listBusinessDocumentsForVatProjection"]>>[number]) =>
        projectDocument(item, vatRate),
      ),
    };
  }
}

export const documentVatProjectionService = new DocumentVatProjectionService();
