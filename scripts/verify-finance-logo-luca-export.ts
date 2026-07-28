import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildLogoLucaJournalCsv } from "@/modules/finance/services/finance-logo-luca-export.util";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const service = readRepo("src/modules/finance/services/finance-advisor-export.service.ts");
const contract = readRepo("src/modules/finance/contracts/finance-advisor-export.contract.ts");

assert(service.includes("buildLogoLucaJournalCsv"), "Advisor export Logo/Luca CSV üretmelidir.");
assert(service.includes("logo-luca-journal"), "Advisor export paketine logo-luca-journal dosyası eklenmelidir.");
assert(contract.includes("logo-luca-journal"), "Advisor export contract logo-luca-journal anahtarını içermelidir.");

const csv = buildLogoLucaJournalCsv({
  rows: [
    {
      entryAt: "2026-07-15T10:00:00.000Z",
      voucherNo: "collection:c1",
      ledgerAccountCode: "102",
      debit: 100,
      credit: 0,
      description: "Test",
      documentReference: "collection:c1",
    },
  ],
  headerDate: "Tarih",
  headerVoucherNo: "Fiş No",
  headerAccountCode: "Hesap Kodu",
  headerDebit: "Borç",
  headerCredit: "Alacak",
  headerDescription: "Açıklama",
  headerDocumentNo: "Belge No",
});

assert(csv.includes("15.07.2026"), "Logo/Luca CSV tarih formatı gg.aa.yyyy olmalıdır.");
assert(csv.includes(";"), "Logo/Luca CSV noktalı virgül ayırıcı kullanmalıdır.");

console.log("verify-finance-logo-luca-export: ok");
