export type ExpenseOcrStatus = "COMPLETED" | "FAILED" | "SKIPPED";

export type ExpenseOcrExtractedData = {
  date: string | null;
  receiptNo: string | null;
  amount: number | null;
  currency: string | null;
  vendorName: string | null;
};

export type ExpenseOcrExtractionResult = {
  status: ExpenseOcrStatus;
  data: ExpenseOcrExtractedData | null;
  confidence: number | null;
  raw: unknown;
};
