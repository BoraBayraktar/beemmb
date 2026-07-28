import { z } from "zod";

import type {
  AdminBankReconciliationConfirmInput,
  AdminBankReconciliationHubResult,
  AdminBankReconciliationImportInput,
  AdminBankReconciliationImportResult,
  AdminBankReconciliationLine,
  AdminBankReconciliationMatchInput,
  AdminBankReconciliationStructuredImportInput,
  AdminBankReconciliationSuggestion,
  AdminBankReconciliationWorkspace,
} from "@/modules/finance/contracts/bank-reconciliation.contract";
import { bankReconciliationRepository } from "@/modules/finance/repositories/bank-reconciliation.repository";
import { parseBankStatementCsv } from "@/modules/finance/services/bank-statement-csv.parser";
import { cashTransactionsService } from "@/modules/finance/services/cash-transactions.service";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";

const importSchema = z.object({
  financialAccountId: z.string().trim().min(1),
  fileName: z.string().trim().max(200).optional(),
  csvContent: z.string().trim().min(1),
  autoConfirmHighConfidence: z.boolean().optional(),
});

const matchSchema = z.object({
  statementLineId: z.string().trim().min(1),
  cashTransactionId: z.string().trim().min(1),
});

const confirmSchema = z.object({
  statementLineId: z.string().trim().min(1),
  cashTransactionId: z.string().trim().optional(),
  createCashTransactionIfMissing: z.boolean().optional(),
});

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const AUTO_CONFIRM_MIN_SCORE = 98;

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function scoreMatch(args: {
  lineAmount: number;
  lineDate: Date;
  transactionAmount: number;
  transactionDate: Date;
}) {
  const amountDelta = Math.abs(args.lineAmount - args.transactionAmount);
  const dayDelta = Math.abs(args.lineDate.getTime() - args.transactionDate.getTime()) / MS_PER_DAY;
  if (amountDelta > 0.01) {
    return null;
  }

  return Number((100 - dayDelta).toFixed(2));
}

function mapImportSummary(importRecord: Awaited<ReturnType<typeof bankReconciliationRepository.findImportById>>) {
  if (!importRecord) {
    return null;
  }

  const lines = importRecord.lines ?? [];
  return {
    id: importRecord.id,
    financialAccountId: importRecord.financialAccountId,
    fileName: importRecord.fileName,
    status: importRecord.status,
    periodStart: importRecord.periodStart ? importRecord.periodStart.toISOString() : null,
    periodEnd: importRecord.periodEnd ? importRecord.periodEnd.toISOString() : null,
    lineCount: lines.length,
    unmatchedCount: lines.filter((line: { matchStatus: string }) => line.matchStatus === "UNMATCHED").length,
    suggestedCount: lines.filter((line: { matchStatus: string }) => line.matchStatus === "SUGGESTED").length,
    confirmedCount: lines.filter((line: { matchStatus: string }) => line.matchStatus === "CONFIRMED").length,
    createdAt: importRecord.createdAt.toISOString(),
  };
}

function mapLine(
  line: Awaited<ReturnType<typeof bankReconciliationRepository.findImportById>>["lines"][number],
  suggestion: AdminBankReconciliationSuggestion | null,
): AdminBankReconciliationLine {
  return {
    id: line.id,
    lineIndex: line.lineIndex,
    transactionAt: line.transactionAt.toISOString(),
    description: line.description,
    amount: toNumber(line.amount),
    signedAmount: toNumber(line.signedAmount),
    balanceAfter: line.balanceAfter === null ? null : toNumber(line.balanceAfter),
    matchStatus: line.matchStatus,
    suggestedMatch: suggestion,
    matchedCashTransactionId: line.match?.cashTransaction?.id ?? line.match?.cashTransactionId ?? null,
    matchedCashTransactionTitle: line.match?.cashTransaction?.title ?? null,
  };
}

export class BankReconciliationService {
  async getReconciliationHub(locale: string): Promise<AdminBankReconciliationHubResult> {
    const accounts = await financialAccountsService.listAccounts({ type: "BANK" });
    return {
      items: accounts.items.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        currentBalance: account.currentBalance,
        reconciliationHref: `/${locale}/admin/finance/bank-cash/${account.id}/reconciliation`,
      })),
    };
  }

  async getWorkspace(financialAccountId: string, importId?: string): Promise<AdminBankReconciliationWorkspace | null> {
    const account = await bankReconciliationRepository.findFinancialAccountById(financialAccountId);
    if (!account) {
      return null;
    }

    const importRecord = importId
      ? await bankReconciliationRepository.findImportById(importId)
      : await bankReconciliationRepository.findLatestImportForAccount(financialAccountId);

    if (importRecord && importRecord.financialAccountId !== financialAccountId) {
      return null;
    }

    const suggestions = importRecord ? await this.buildSuggestions(importRecord) : new Map<string, AdminBankReconciliationSuggestion | null>();
    const candidateTransactions = importRecord
      ? (await bankReconciliationRepository.listCandidateCashTransactions(
          importRecord.financialAccountId,
          new Date((importRecord.periodStart ?? importRecord.lines[0].transactionAt).getTime() - MS_PER_DAY),
          new Date((importRecord.periodEnd ?? importRecord.lines[importRecord.lines.length - 1].transactionAt).getTime() + MS_PER_DAY),
        )).map((item: { id: string; title: string; amount: { toNumber(): number }; currency: string; transactionAt: Date }) => ({
          id: item.id,
          title: item.title,
          amount: toNumber(item.amount),
          currency: item.currency,
          transactionAt: item.transactionAt.toISOString(),
        }))
      : [];

    return {
      financialAccountId: account.id,
      financialAccountName: account.name,
      currency: account.currency,
      importSummary: mapImportSummary(importRecord),
      lines: importRecord
        ? importRecord.lines.map((line: Awaited<ReturnType<typeof bankReconciliationRepository.findImportById>>["lines"][number]) =>
            mapLine(line, suggestions.get(line.id) ?? null),
          )
        : [],
      candidateTransactions,
    };
  }

  async importStatement(
    input: AdminBankReconciliationImportInput & { importedByUserId?: string | null },
  ): Promise<AdminBankReconciliationImportResult> {
    const parsed = importSchema.parse(input);
    const account = await bankReconciliationRepository.findFinancialAccountById(parsed.financialAccountId);

    if (!account) {
      throw new Error("Geçerli bir finans hesabı seçin.");
    }

    if (account.type !== "BANK") {
      throw new Error("Banka mutabakatı yalnızca banka hesapları için kullanılabilir.");
    }

    const csv = parseBankStatementCsv(parsed.csvContent);
    return this.importStructuredStatement({
      financialAccountId: parsed.financialAccountId,
      fileName: parsed.fileName ?? null,
      sourceReference: null,
      lines: csv.lines.map((line) => ({
        lineIndex: line.lineIndex,
        transactionAt: line.transactionAt,
        description: line.description,
        amount: line.amount,
        signedAmount: line.signedAmount,
        balanceAfter: line.balanceAfter,
      })),
      importedByUserId: input.importedByUserId ?? null,
      autoConfirmHighConfidence: parsed.autoConfirmHighConfidence ?? false,
    });
  }

  async importStructuredStatement(
    input: AdminBankReconciliationStructuredImportInput,
  ): Promise<AdminBankReconciliationImportResult> {
    const account = await bankReconciliationRepository.findFinancialAccountById(input.financialAccountId);

    if (!account) {
      throw new Error("Geçerli bir finans hesabı seçin.");
    }

    if (account.type !== "BANK") {
      throw new Error("Banka mutabakatı yalnızca banka hesapları için kullanılabilir.");
    }

    if (input.lines.length === 0) {
      throw new Error("Ekstre en az bir satır içermelidir.");
    }

    const periodStart = input.lines.reduce(
      (earliest, line) => (line.transactionAt < earliest ? line.transactionAt : earliest),
      input.lines[0].transactionAt,
    );
    const periodEnd = input.lines.reduce(
      (latest, line) => (line.transactionAt > latest ? line.transactionAt : latest),
      input.lines[0].transactionAt,
    );

    const created = await bankReconciliationRepository.createImport({
      financialAccountId: input.financialAccountId,
      fileName: input.fileName ?? input.sourceReference ?? null,
      periodStart,
      periodEnd,
      importedByUserId: input.importedByUserId ?? null,
      lines: input.lines.map((line) => ({
        lineIndex: line.lineIndex,
        transactionAt: line.transactionAt,
        description: line.description,
        amount: line.amount,
        signedAmount: line.signedAmount,
        balanceAfter: line.balanceAfter,
      })),
    });

    await this.applySuggestions(created.id);

    if (input.autoConfirmHighConfidence && input.importedByUserId) {
      await this.autoConfirmHighConfidenceMatches(created.id, input.importedByUserId);
    }

    const workspace = await this.getWorkspace(input.financialAccountId, created.id);
    if (!workspace?.importSummary) {
      throw new Error("Mutabakat oturumu oluşturulamadı.");
    }

    return {
      import: workspace.importSummary,
      workspace,
    };
  }

  async assignMatch(input: AdminBankReconciliationMatchInput) {
    const parsed = matchSchema.parse(input);
    const line = await bankReconciliationRepository.findStatementLineById(parsed.statementLineId);

    if (!line) {
      throw new Error("Ekstre satırı bulunamadı.");
    }

    if (line.matchStatus === "CONFIRMED") {
      throw new Error("Onaylanmış satır yeniden eşleştirilemez.");
    }

    const cashTransaction = await bankReconciliationRepository.findCashTransactionById(parsed.cashTransactionId);
    if (!cashTransaction) {
      throw new Error("Finans hareketi bulunamadı.");
    }

    if (cashTransaction.accountId !== line.import.financialAccountId) {
      throw new Error("Finans hareketi seçili banka hesabına ait değil.");
    }

    if (cashTransaction.reconciliationMatch && cashTransaction.reconciliationMatch.statementLineId !== line.id) {
      throw new Error("Finans hareketi başka bir ekstre satırı ile eşleştirilmiş.");
    }

    const lineAmount = Math.abs(toNumber(line.amount));
    const transactionAmount = toNumber(cashTransaction.amount);
    if (Math.abs(lineAmount - transactionAmount) > 0.01) {
      throw new Error("Ekstre tutarı ile finans hareketi tutarı uyuşmuyor.");
    }

    await bankReconciliationRepository.upsertSuggestedMatch({
      statementLineId: line.id,
      cashTransactionId: cashTransaction.id,
    });
    await bankReconciliationRepository.markLineSuggested(line.id);

    return this.getWorkspace(line.import.financialAccountId, line.importId);
  }

  async confirmMatch(input: AdminBankReconciliationConfirmInput & { confirmedByUserId: string }) {
    const parsed = confirmSchema.parse(input);
    const line = await bankReconciliationRepository.findStatementLineById(parsed.statementLineId);

    if (!line) {
      throw new Error("Ekstre satırı bulunamadı.");
    }

    if (line.matchStatus === "CONFIRMED") {
      throw new Error("Satır zaten onaylanmış.");
    }

    let cashTransactionId = parsed.cashTransactionId ?? line.match?.cashTransactionId ?? null;

    if (cashTransactionId && line.match?.cashTransactionId !== cashTransactionId) {
      await bankReconciliationRepository.upsertSuggestedMatch({
        statementLineId: line.id,
        cashTransactionId,
      });
      await bankReconciliationRepository.markLineSuggested(line.id);
    }

    if (!cashTransactionId && parsed.createCashTransactionIfMissing) {
      const signedAmount = toNumber(line.signedAmount);
      const created = await cashTransactionsService.createTransaction({
        accountId: line.import.financialAccountId,
        direction: signedAmount >= 0 ? "IN" : "OUT",
        sourceType: "MANUAL",
        amount: Math.abs(signedAmount),
        transactionAt: line.transactionAt.toISOString(),
        title: line.description.slice(0, 160),
        note: "Banka ekstresi mutabakatı",
        recordedByUserId: input.confirmedByUserId,
      });
      cashTransactionId = created.id;
      await bankReconciliationRepository.upsertSuggestedMatch({
        statementLineId: line.id,
        cashTransactionId: created.id,
      });
    }

    if (!cashTransactionId) {
      throw new Error("Onay için eşleşmiş bir finans hareketi seçin veya kayıt oluşturmayı işaretleyin.");
    }

    const cashTransaction = await bankReconciliationRepository.findCashTransactionById(cashTransactionId);
    if (!cashTransaction) {
      throw new Error("Finans hareketi bulunamadı.");
    }

    if (cashTransaction.reconciliationMatch && cashTransaction.reconciliationMatch.statementLineId !== line.id) {
      throw new Error("Finans hareketi başka bir ekstre satırı ile eşleştirilmiş.");
    }

    await bankReconciliationRepository.confirmMatch({
      statementLineId: line.id,
      cashTransactionId,
      confirmedByUserId: input.confirmedByUserId,
    });
    await bankReconciliationRepository.setImportCompleted(line.importId);

    return this.getWorkspace(line.import.financialAccountId, line.importId);
  }

  private async buildSuggestions(importRecord: NonNullable<Awaited<ReturnType<typeof bankReconciliationRepository.findImportById>>>) {
    const fromDate = importRecord.periodStart ?? importRecord.lines[0]?.transactionAt;
    const toDate = importRecord.periodEnd ?? importRecord.lines[importRecord.lines.length - 1]?.transactionAt;
    if (!fromDate || !toDate) {
      return new Map<string, AdminBankReconciliationSuggestion | null>();
    }

    const paddedFrom = new Date(fromDate.getTime() - MS_PER_DAY);
    const paddedTo = new Date(toDate.getTime() + MS_PER_DAY);
    const candidates = await bankReconciliationRepository.listCandidateCashTransactions(
      importRecord.financialAccountId,
      paddedFrom,
      paddedTo,
    );

    const suggestions = new Map<string, AdminBankReconciliationSuggestion | null>();
    for (const line of importRecord.lines) {
      if (line.matchStatus === "CONFIRMED") {
        suggestions.set(line.id, null);
        continue;
      }

      const lineAmount = Math.abs(toNumber(line.amount));
      let best: AdminBankReconciliationSuggestion | null = null;

      for (const candidate of candidates) {
        const score = scoreMatch({
          lineAmount,
          lineDate: line.transactionAt,
          transactionAmount: toNumber(candidate.amount),
          transactionDate: candidate.transactionAt,
        });

        if (score === null) {
          continue;
        }

        if (!best || score > best.score) {
          best = {
            cashTransactionId: candidate.id,
            title: candidate.title,
            amount: toNumber(candidate.amount),
            currency: candidate.currency,
            transactionAt: candidate.transactionAt.toISOString(),
            score,
          };
        }
      }

      suggestions.set(line.id, best);
    }

    return suggestions;
  }

  private async autoConfirmHighConfidenceMatches(importId: string, confirmedByUserId: string) {
    const importRecord = await bankReconciliationRepository.findImportById(importId);
    if (!importRecord) {
      return;
    }

    const fromDate = importRecord.periodStart ?? importRecord.lines[0]?.transactionAt;
    const toDate = importRecord.periodEnd ?? importRecord.lines[importRecord.lines.length - 1]?.transactionAt;
    if (!fromDate || !toDate) {
      return;
    }

    const paddedFrom = new Date(fromDate.getTime() - MS_PER_DAY);
    const paddedTo = new Date(toDate.getTime() + MS_PER_DAY);
    const candidates = await bankReconciliationRepository.listCandidateCashTransactions(
      importRecord.financialAccountId,
      paddedFrom,
      paddedTo,
    );

    const suggestions = await this.buildSuggestions(importRecord);

    for (const line of importRecord.lines) {
      if (line.matchStatus === "CONFIRMED") {
        continue;
      }

      const suggestion = suggestions.get(line.id);
      if (!suggestion || suggestion.score < AUTO_CONFIRM_MIN_SCORE) {
        continue;
      }

      const lineAmount = Math.abs(toNumber(line.amount));
      let highConfidenceCount = 0;
      for (const candidate of candidates) {
        const score = scoreMatch({
          lineAmount,
          lineDate: line.transactionAt,
          transactionAmount: toNumber(candidate.amount),
          transactionDate: candidate.transactionAt,
        });
        if (score !== null && score >= AUTO_CONFIRM_MIN_SCORE) {
          highConfidenceCount += 1;
        }
      }

      if (highConfidenceCount !== 1) {
        continue;
      }

      try {
        await this.confirmMatch({
          statementLineId: line.id,
          cashTransactionId: suggestion.cashTransactionId,
          createCashTransactionIfMissing: true,
          confirmedByUserId,
        });
      } catch {
        // Tek satır çakışması diğer otomatik onayları durdurmamalı.
      }
    }
  }

  private async applySuggestions(importId: string) {
    const importRecord = await bankReconciliationRepository.findImportById(importId);
    if (!importRecord) {
      return;
    }

    const suggestions = await this.buildSuggestions(importRecord);
    for (const line of importRecord.lines) {
      if (line.matchStatus === "CONFIRMED") {
        continue;
      }

      const suggestion = suggestions.get(line.id);
      if (!suggestion) {
        continue;
      }

      await bankReconciliationRepository.upsertSuggestedMatch({
        statementLineId: line.id,
        cashTransactionId: suggestion.cashTransactionId,
      });
      await bankReconciliationRepository.markLineSuggested(line.id);
    }
  }
}

export const bankReconciliationService = new BankReconciliationService();
