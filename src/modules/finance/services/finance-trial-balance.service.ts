import { financeAccountEntryRepository } from "@/modules/finance/repositories/finance-account-entry.repository";

export type FinanceTrialBalanceRow = {
  ledgerAccountCode: string;
  ledgerAccountName: string;
  category: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
};

export type FinanceTrialBalanceSummary = {
  rows: FinanceTrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  currency: string;
};

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

export class FinanceTrialBalanceService {
  async getSummary(args: { fromDate?: Date; toDate?: Date }): Promise<FinanceTrialBalanceSummary> {
    const entries = await financeAccountEntryRepository.listEntriesForPeriod({
      fromDate: args.fromDate,
      toDate: args.toDate,
    });

    const map = new Map<string, FinanceTrialBalanceRow>();

    for (const entry of entries) {
      const code = entry.ledgerAccount.code;
      const existing = map.get(code) ?? {
        ledgerAccountCode: code,
        ledgerAccountName: entry.ledgerAccount.name,
        category: entry.ledgerAccount.category,
        debitTotal: 0,
        creditTotal: 0,
        balance: 0,
      };

      const amount = toNumber(entry.amount);
      if (entry.side === "DEBIT") {
        existing.debitTotal += amount;
      } else {
        existing.creditTotal += amount;
      }

      map.set(code, existing);
    }

    const rows = [...map.values()]
      .map((row) => ({
        ...row,
        debitTotal: Number(row.debitTotal.toFixed(2)),
        creditTotal: Number(row.creditTotal.toFixed(2)),
        balance: Number((row.debitTotal - row.creditTotal).toFixed(2)),
      }))
      .sort((left, right) => left.ledgerAccountCode.localeCompare(right.ledgerAccountCode, "tr"));

    const totalDebit = Number(rows.reduce((sum, row) => sum + row.debitTotal, 0).toFixed(2));
    const totalCredit = Number(rows.reduce((sum, row) => sum + row.creditTotal, 0).toFixed(2));

    return {
      rows,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) <= 0.01,
      currency: entries[0]?.currency ?? "TRY",
    };
  }
}

export const financeTrialBalanceService = new FinanceTrialBalanceService();
