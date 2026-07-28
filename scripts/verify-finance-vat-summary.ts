import { readFileSync } from "node:fs";
import { join } from "node:path";

import { calculateInvoiceTotals } from "@/modules/edocument/services/ubl-tax.util";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const financeVatSummaryService = readRepo("src/modules/finance/services/finance-vat-summary.service.ts");
const documentVatProjectionService = readRepo("src/modules/documents/services/document-vat-projection.service.ts");
const documentRepository = readRepo("src/modules/documents/repositories/document.repository.ts");
const reportsService = readRepo("src/modules/finance/services/reports.service.ts");
const vatSummaryPage = readRepo("src/app/[locale]/admin/(panel)/finance/reports/vat-summary/page.tsx");

assert(financeVatSummaryService.includes("documentVatProjectionService.listVatProjectionsForPeriod"), "Finans KDV özeti belge projeksiyon servisini kullanmalıdır.");
assert(!financeVatSummaryService.includes("prisma."), "Finans KDV özeti doğrudan Prisma kullanmamalıdır.");
assert(!financeVatSummaryService.includes("dispatch"), "Finans KDV özeti e-belge dispatch yapmamalıdır.");

assert(documentVatProjectionService.includes("calculateInvoiceTotals"), "Belge KDV projeksiyonu UBL vergi util kullanmalıdır.");
assert(documentVatProjectionService.includes("listBusinessDocumentsForVatProjection"), "Belge KDV projeksiyonu repository omurgasını kullanmalıdır.");
assert(!documentVatProjectionService.includes("LiveEDocument"), "Belge KDV projeksiyonu canlı provider'a gitmemelidir.");

assert(documentRepository.includes("listBusinessDocumentsForVatProjection"), "Belge repository KDV dönem listelemesi içermelidir.");
assert(documentRepository.includes('"E_INVOICE"'), "KDV listelemesi e-fatura içermelidir.");
assert(documentRepository.includes('"PURCHASE_DOCUMENT"'), "KDV listelemesi alış belgesi içermelidir.");

assert(reportsService.includes("async getVatSummaryReport"), "getVatSummaryReport tanımlı olmalıdır.");
assert(reportsService.includes("financeVatSummaryService.getSummary"), "KDV raporu finans KDV özet servisini kullanmalıdır.");
assert(reportsService.includes("/admin/finance/reports/vat-summary"), "Hub KDV rapor kartını içermelidir.");

assert(vatSummaryPage.includes("reportsService.getVatSummaryReport"), "KDV rapor sayfası reports servisini kullanmalıdır.");
assert(vatSummaryPage.includes("FinanceReportPageShell"), "KDV rapor sayfası tarih aralığı kabuğunu kullanmalıdır.");

const totals = calculateInvoiceTotals({
  id: "mock",
  uuid: "mock",
  documentNumber: "MOCK-1",
  documentType: "E_INVOICE",
  issueDate: new Date("2026-07-01T00:00:00.000Z"),
  currency: "TRY",
  totalAmount: null,
  counterpartyName: "Mock",
  counterpartyTaxNumber: null,
  counterpartyTaxOffice: null,
  counterpartyEmail: null,
  counterpartyAddress: null,
  note: null,
  sender: { name: null, taxNumber: null, taxOffice: null, email: null, address: null },
  tax: { vatRate: 20 },
  shipment: { carrierName: null, carrierTaxNumber: null, vehiclePlate: null, driverName: null, driverTckn: null },
  lines: [
    {
      id: "line-1",
      productSku: "SKU-1",
      productName: "Ürün",
      quantity: 2,
      unitPrice: 100,
      lineTotal: 200,
      currency: "TRY",
      note: null,
    },
  ],
});

assert(totals.taxExclusiveAmount === 200, "Mock matrah 200 olmalıdır.");
assert(totals.taxAmount === 40, "Mock KDV %20 ile 40 olmalıdır.");
assert(totals.taxInclusiveAmount === 240, "Mock toplam 240 olmalıdır.");

console.log("verify-finance-vat-summary: ok");
