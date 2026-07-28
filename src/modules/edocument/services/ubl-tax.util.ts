import type { UblBusinessDocumentInput } from "@/modules/edocument/contracts/edocument.contract";

export function getLineTaxBase(line: UblBusinessDocumentInput["lines"][number]) {
  return line.lineTotal ?? (line.unitPrice !== null ? line.unitPrice * line.quantity : 0);
}

export function calculateVatAmount(baseAmount: number, vatRate: number | null) {
  if (vatRate === null) {
    return 0;
  }

  return Number((baseAmount * (vatRate / 100)).toFixed(2));
}

export function calculateInvoiceTotals(document: UblBusinessDocumentInput) {
  const taxExclusiveAmount = Number(document.lines.reduce((sum, line) => sum + getLineTaxBase(line), 0).toFixed(2));
  const taxAmount = calculateVatAmount(taxExclusiveAmount, document.tax.vatRate);
  const taxInclusiveAmount = Number((taxExclusiveAmount + taxAmount).toFixed(2));

  return {
    taxExclusiveAmount,
    taxAmount,
    taxInclusiveAmount,
    payableAmount: document.totalAmount ?? taxInclusiveAmount,
  };
}
