import type {
  AdminFinanceAccountsQuery,
  AdminFinanceAccountsResult,
} from "@/modules/finance/contracts/accounts.contract";
import { accountsService } from "@/modules/finance/services/accounts.service";

/**
 * PF8: Birleştirici cari liste (`accounts`) sanal projeksiyon olarak kalır.
 * Kalici cift tarafli defter satirlari icin `financeAccountEntryService` kullanilir.
 */
export class FinanceAccountEntryProjectionService {
  async listAccountEntries(locale: string, query: AdminFinanceAccountsQuery = {}): Promise<AdminFinanceAccountsResult> {
    return accountsService.listAccountEntries(locale, query);
  }
}

export const financeAccountEntryProjectionService = new FinanceAccountEntryProjectionService();
