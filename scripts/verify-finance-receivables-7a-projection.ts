import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const receivableDetail = readFileSync(
  join(process.cwd(), "src/ui/admin/receivable-detail-manager.tsx"),
  "utf8",
);
const projectionService = readFileSync(
  join(process.cwd(), "src/modules/finance/services/finance-account-entry-projection.service.ts"),
  "utf8",
);
const accountsPage = readFileSync(
  join(process.cwd(), "src/app/[locale]/admin/(panel)/finance/accounts/page.tsx"),
  "utf8",
);
const collectionsPage = readFileSync(
  join(process.cwd(), "src/app/[locale]/admin/(panel)/finance/collections/[orderId]/page.tsx"),
  "utf8",
);

assert(receivableDetail.includes("/finance/business-documents/"), "Alacak detayi belge finans hareket linki tasimalidir.");
assert(receivableDetail.includes("/finance/collections/"), "Alacak detayi tahsilat linki tasimalidir.");
assert(projectionService.includes("accountsService.listAccountEntries"), "Faz 8 projeksiyon servisi accounts omurgasini kullanmalidir.");
assert(accountsPage.includes("financeAccountEntryProjectionService"), "Cari hareketler sayfasi projeksiyon servisini kullanmalidir.");
assert(collectionsPage.includes("financeReceivableDocumentsTitle"), "Tahsilat detayi alacak belge listesi etiketlerini tasimalidir.");
assert(collectionsPage.includes("ReceivableDetailManager"), "Tahsilat detayi alacak belge listesi icin ReceivableDetailManager kullanmalidir.");

console.log("verify-finance-receivables-7a-projection: ok");
