import type { AdminFinanceReportDateRangeQuery } from "@/modules/finance/contracts/finance-report-date-range.contract";
import type { DocumentVatProjectionRow } from "@/modules/documents/contracts/document-vat-projection.contract";
import { documentVatProjectionService } from "@/modules/documents/services/document-vat-projection.service";
import { parseFinanceReportDateRangeQuery } from "@/modules/finance/services/finance-report-date-range.util";

export type AdminFinanceVatRateBucket = {
  vatRateLabel: string;
  vatRate: number | null;
  outputTaxExclusive: number;
  outputTaxAmount: number;
  inputTaxExclusive: number;
  inputTaxAmount: number;
  netTaxAmount: number;
  documentCount: number;
};

export type AdminFinanceVatSummary = {
  outputTaxExclusive: number;
  outputTaxAmount: number;
  inputTaxExclusive: number;
  inputTaxAmount: number;
  netTaxAmount: number;
  documentCount: number;
  items: DocumentVatProjectionRow[];
  rateBuckets: AdminFinanceVatRateBucket[];
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function formatVatRateLabel(vatRate: number | null) {
  if (vatRate === null) {
    return "UNSPECIFIED";
  }

  return String(vatRate);
}

function buildRateBuckets(items: DocumentVatProjectionRow[]): AdminFinanceVatRateBucket[] {
  const bucketMap = new Map<string, AdminFinanceVatRateBucket>();

  for (const item of items) {
    const key = formatVatRateLabel(item.vatRate);
    const bucket = bucketMap.get(key) ?? {
      vatRateLabel: key,
      vatRate: item.vatRate,
      outputTaxExclusive: 0,
      outputTaxAmount: 0,
      inputTaxExclusive: 0,
      inputTaxAmount: 0,
      netTaxAmount: 0,
      documentCount: 0,
    };

    if (item.direction === "OUTPUT") {
      bucket.outputTaxExclusive = roundMoney(bucket.outputTaxExclusive + item.taxExclusiveAmount);
      bucket.outputTaxAmount = roundMoney(bucket.outputTaxAmount + item.taxAmount);
    } else {
      bucket.inputTaxExclusive = roundMoney(bucket.inputTaxExclusive + item.taxExclusiveAmount);
      bucket.inputTaxAmount = roundMoney(bucket.inputTaxAmount + item.taxAmount);
    }

    bucket.documentCount += 1;
    bucket.netTaxAmount = roundMoney(bucket.outputTaxAmount - bucket.inputTaxAmount);
    bucketMap.set(key, bucket);
  }

  return [...bucketMap.values()].sort((left, right) => (right.vatRate ?? -1) - (left.vatRate ?? -1));
}

export class FinanceVatSummaryService {
  async getSummary(query: AdminFinanceReportDateRangeQuery = {}): Promise<AdminFinanceVatSummary> {
    const range = parseFinanceReportDateRangeQuery(query);
    const projection = await documentVatProjectionService.listVatProjectionsForPeriod({
      fromDate: range.fromDate,
      toDate: range.toDate,
    });

    const outputItems = projection.items.filter((item) => item.direction === "OUTPUT");
    const inputItems = projection.items.filter((item) => item.direction === "INPUT");

    const outputTaxExclusive = roundMoney(outputItems.reduce((sum, item) => sum + item.taxExclusiveAmount, 0));
    const outputTaxAmount = roundMoney(outputItems.reduce((sum, item) => sum + item.taxAmount, 0));
    const inputTaxExclusive = roundMoney(inputItems.reduce((sum, item) => sum + item.taxExclusiveAmount, 0));
    const inputTaxAmount = roundMoney(inputItems.reduce((sum, item) => sum + item.taxAmount, 0));

    return {
      outputTaxExclusive,
      outputTaxAmount,
      inputTaxExclusive,
      inputTaxAmount,
      netTaxAmount: roundMoney(outputTaxAmount - inputTaxAmount),
      documentCount: projection.items.length,
      items: projection.items,
      rateBuckets: buildRateBuckets(projection.items),
    };
  }
}

export const financeVatSummaryService = new FinanceVatSummaryService();
