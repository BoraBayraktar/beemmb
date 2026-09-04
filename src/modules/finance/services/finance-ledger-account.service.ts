import type { FinanceLedgerAccountCategory } from "@prisma/client";

import type { AdminFinanceLedgerAccountItem } from "@/modules/finance/contracts/finance-ledger-account.contract";
import { financeLedgerAccountRepository } from "@/modules/finance/repositories/finance-ledger-account.repository";

/**
 * finance-account-entry-mapping.util.ts icindeki tum tahakkuk/kayit fonksiyonlarinin
 * calisabilmesi icin gereken minimum hesap plani. Bu liste ile mapping util'deki
 * ledgerAccountCode degerleri senkron tutulmalidir; yeni bir kaynak tipi eklenirken
 * (yeni bir ledgerAccountCode kullanilirken) buraya da eklenmezse, o hesap koduna
 * sahip olmayan tenant'larda ilgili muhasebe kaydi sessizce basarisiz olur (bkz.
 * FinanceAccountEntryService.resolveLedgerAccountMap).
 */
const DEFAULT_CHART_OF_ACCOUNTS: Array<{ code: string; name: string; category: FinanceLedgerAccountCategory }> = [
  { code: "100", name: "Kasa", category: "ASSET" },
  { code: "102", name: "Bankalar", category: "ASSET" },
  { code: "120", name: "Alıcılar", category: "ASSET" },
  { code: "191", name: "İndirilecek KDV", category: "ASSET" },
  { code: "320", name: "Satıcılar", category: "LIABILITY" },
  { code: "335", name: "Personele Borçlar", category: "LIABILITY" },
  { code: "600", name: "Yurtiçi Satışlar", category: "INCOME" },
  { code: "770", name: "Genel Yönetim Giderleri", category: "EXPENSE" },
];

export class FinanceLedgerAccountService {
  async seedDefaultChartOfAccounts() {
    return financeLedgerAccountRepository.createMany(DEFAULT_CHART_OF_ACCOUNTS);
  }

  async listChartOfAccounts(): Promise<AdminFinanceLedgerAccountItem[]> {
    const rows = await financeLedgerAccountRepository.listAll();
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      isActive: row.isActive,
    }));
  }
}

export const financeLedgerAccountService = new FinanceLedgerAccountService();
