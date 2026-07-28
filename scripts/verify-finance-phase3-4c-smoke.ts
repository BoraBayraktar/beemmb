import { readFileSync } from "node:fs";
import { join } from "node:path";

import { financeCounterpartyRouteService } from "@/modules/finance/services/finance-counterparty-route.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepoFile(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function assertSourceOrder(source: string, earlier: string, later: string, message: string) {
  const earlierIndex = source.indexOf(earlier);
  const laterIndex = source.indexOf(later);

  assert(earlierIndex >= 0, `${earlier} kaynakta bulunmalıdır.`);
  assert(laterIndex >= 0, `${later} kaynakta bulunmalıdır.`);
  assert(earlierIndex < laterIndex, message);
}

const collectionsSource = readRepoFile("src/modules/finance/services/collections.service.ts");

assertSourceOrder(
  collectionsSource,
  "financeOrderCustomerLinkService.linkOrderCustomerAccountFromDocuments",
  "financeRepository.createCollectionRecord",
  "Müşteri kartı bağlama tahsilat kaydı oluşturulmadan önce çalışmalıdır.",
);

assertSourceOrder(
  collectionsSource,
  "financeAllocationService.createCollectionAllocations",
  "cashTransactionsService.createTransaction",
  "Satır eşleştirmesi nakit hareketinden önce yazılmalıdır.",
);

assert(
  collectionsSource.includes('buildFinanceMovementReference("collection", created.id)'),
  "Tahsilat nakit hareketi collection: referansı kullanmalıdır.",
);

const paymentsSource = readRepoFile("src/modules/finance/services/payments.service.ts");

assert(
  paymentsSource.includes('buildFinanceMovementReference("payment"'),
  "Ödeme nakit hareketi payment: referansı kullanmalıdır.",
);

assertSourceOrder(
  paymentsSource,
  "financeAllocationService.createPaymentAllocations",
  "cashTransactionsService.createTransaction",
  "Ödeme satır eşleştirmesi nakit hareketinden önce yazılmalıdır.",
);

const allocationRouteSource = readRepoFile("src/app/api/admin/finance/allocations/replace/route.ts");

assert(
  allocationRouteSource.includes("financeAllocationService.replaceCollectionAllocations"),
  "Manuel eşleştirme route tahsilat servis metodunu kullanmalıdır.",
);
assert(
  allocationRouteSource.includes("financeAllocationService.replacePaymentAllocations"),
  "Manuel eşleştirme route ödeme servis metodunu kullanmalıdır.",
);
assert(
  allocationRouteSource.includes('requirePermission("finance.manage")'),
  "Manuel eşleştirme route finance.manage izni istemelidir.",
);
assert(
  !allocationRouteSource.includes("prisma."),
  "Manuel eşleştirme route doğrudan Prisma kullanmamalıdır.",
);

const accountsPageSource = readRepoFile("src/app/[locale]/admin/(panel)/finance/accounts/[id]/page.tsx");

assert(
  accountsPageSource.includes("financeCounterpartyRouteService.resolveCounterpartyLedgerPath"),
  "Cari hesap route çözümleyici servis kullanmalıdır.",
);
assert(
  accountsPageSource.includes("redirect(`/${locale}${path}`)"),
  "Cari hesap route slug ekstrelerine yönlendirmelidir.",
);

const collectionDetailSource = readRepoFile("src/app/[locale]/admin/(panel)/finance/collections/[orderId]/page.tsx");
const paymentDetailSource = readRepoFile("src/app/[locale]/admin/(panel)/finance/payments/[supplierKey]/page.tsx");

assert(
  collectionDetailSource.includes("FinanceManualAllocationPanel"),
  "Tahsilat detayı manuel eşleştirme paneli içermelidir.",
);
assert(
  paymentDetailSource.includes("FinanceManualAllocationPanel"),
  "Ödeme detayı manuel eşleştirme paneli içermelidir.",
);

async function main() {
  const unknownPath = await financeCounterpartyRouteService.resolveCounterpartyLedgerPath("00000000-0000-0000-0000-000000000000");

  assert(unknownPath === null, "Bilinmeyen cari kimliği yönlendirme üretmemelidir.");

  console.log("verify-finance-phase3-4c-smoke: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
