import type { AdminGeneralLedgerAccount, AdminGeneralLedgerReport } from "@/modules/finance/contracts/finance-general-ledger.contract";
import { financeAccountEntryRepository } from "@/modules/finance/repositories/finance-account-entry.repository";
import { financeLedgerAccountRepository } from "@/modules/finance/repositories/finance-ledger-account.repository";

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

export class FinanceGeneralLedgerService {
  /**
   * Defter-i Kebir: her hesap kodu icin, donem basi devir bakiyesi (fromDate
   * oncesindeki tum hareketlerin toplami) + donem ici hareketler + donem
   * toplamlari. Ayni FinanceAccountEntry verisini financeTrialBalanceService
   * (ozet/mizan) ile paylasir; burada hesap bazinda detaya (hareket listesine)
   * iner.
   */
  async getGeneralLedger(args: { fromDate: Date; toDate: Date }): Promise<AdminGeneralLedgerReport> {
    const [accounts, entries] = await Promise.all([
      financeLedgerAccountRepository.listActive(),
      financeAccountEntryRepository.listEntriesForPeriod({ toDate: args.toDate }),
    ]);

    const blocks = new Map<string, AdminGeneralLedgerAccount>();
    for (const account of accounts) {
      blocks.set(account.id, {
        ledgerAccountId: account.id,
        code: account.code,
        name: account.name,
        category: account.category,
        openingDebit: 0,
        openingCredit: 0,
        lines: [],
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
      });
    }

    let currency = "TRY";
    for (const entry of entries) {
      const block = blocks.get(entry.ledgerAccountId);
      if (!block) {
        continue;
      }

      currency = entry.currency;
      const amount = toNumber(entry.amount);

      if (entry.entryAt.getTime() < args.fromDate.getTime()) {
        if (entry.side === "DEBIT") {
          block.openingDebit += amount;
        } else {
          block.openingCredit += amount;
        }
        continue;
      }

      if (entry.side === "DEBIT") {
        block.totalDebit += amount;
      } else {
        block.totalCredit += amount;
      }

      block.lines.push({
        id: entry.id,
        entryAt: entry.entryAt.toISOString(),
        sourceType: entry.sourceType,
        sourceReference: entry.sourceReference,
        title: entry.title,
        debit: entry.side === "DEBIT" ? amount : 0,
        credit: entry.side === "CREDIT" ? amount : 0,
      });
    }

    const roundedAccounts = [...blocks.values()]
      .filter((block) => block.lines.length > 0 || block.openingDebit > 0 || block.openingCredit > 0)
      .map((block) => ({
        ...block,
        openingDebit: Number(block.openingDebit.toFixed(2)),
        openingCredit: Number(block.openingCredit.toFixed(2)),
        totalDebit: Number(block.totalDebit.toFixed(2)),
        totalCredit: Number(block.totalCredit.toFixed(2)),
        closingBalance: Number(
          (block.openingDebit + block.totalDebit - block.openingCredit - block.totalCredit).toFixed(2),
        ),
      }))
      .sort((a, b) => a.code.localeCompare(b.code, "tr"));

    return { accounts: roundedAccounts, currency };
  }
}

export const financeGeneralLedgerService = new FinanceGeneralLedgerService();
