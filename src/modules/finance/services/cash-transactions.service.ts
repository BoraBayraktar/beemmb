import { z } from "zod";

import { redisCache } from "@/lib/redis";
import type {
  AdminCashTransactionCategory,
  AdminCashTransactionDetail,
  AdminCashTransactionItem,
  AdminCashTransactionsQuery,
  AdminCashTransactionsResult,
  AdminCreateCashTransactionInput,
} from "@/modules/finance/contracts/cash-transactions.contract";
import type { AdminFinanceReportDateRangeQuery } from "@/modules/finance/contracts/finance-report-date-range.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import { cariService } from "@/modules/cari/services/cari.service";
import { financeAllocationService } from "@/modules/finance/services/allocation.service";
import { parseFinanceMovementReference } from "@/modules/finance/services/finance-movement-reference.service";
import { parseFinanceReportDateRangeQuery } from "@/modules/finance/services/finance-report-date-range.util";
import { financeAccountEntryService } from "@/modules/finance/services/finance-account-entry.service";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  direction: z.enum(["all", "IN", "OUT", "TRANSFER"]).default("all"),
  accountId: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

const incomeExpenseReportQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  financialAccountId: z.string().trim().optional(),
});

const createCashTransactionSchema = z.object({
  accountId: z.string().trim().min(1),
  direction: z.enum(["IN", "OUT", "TRANSFER"]),
  sourceType: z.enum(["MANUAL", "COLLECTION", "PAYMENT", "TRANSFER", "ORDER", "DOCUMENT", "REFUND"]).default("MANUAL"),
  category: z.enum(["GENERAL_INCOME", "GENERAL_EXPENSE", "MARKETPLACE_COMMISSION", "SHIPPING_EXPENSE", "SERVICE_FEE", "REFUND", "TRANSFER"]).optional(),
  targetAccountId: z.string().trim().optional(),
  sourceReferenceId: z.string().trim().optional(),
  amount: z.coerce.number().positive(),
  transactionAt: z.string().datetime().optional(),
  title: z.string().trim().min(2).max(160),
  note: z.string().trim().max(500).optional().nullable(),
  cariId: z.string().trim().optional().nullable(),
  counterpartyName: z.string().trim().max(160).optional().nullable(),
  recordedByUserId: z.string().trim().min(1).optional().nullable(),
});

export async function invalidateFinanceCache() {
  await Promise.all([
    redisCache.delByPrefix("finance:overview:"),
    redisCache.delByPrefix("finance:reports:"),
    redisCache.delByPrefix("finance:receivables:"),
    redisCache.delByPrefix("finance:payables:"),
  ]);
}

function mapTransaction(
  item: Awaited<ReturnType<typeof financeRepository.listCashTransactions>>[number]
    | NonNullable<Awaited<ReturnType<typeof financeRepository.findCashTransactionById>>>,
): AdminCashTransactionItem {
  return {
    id: item.id,
    accountId: item.accountId,
    accountName: item.account.name,
    direction: item.direction,
    sourceType: item.sourceType,
    category: item.category,
    status: item.status,
    amount: item.amount.toNumber(),
    currency: item.currency,
    transactionAt: item.transactionAt.toISOString(),
    title: item.title,
    note: item.note,
    counterpartyKind: item.counterpartyKind,
    counterpartyName: item.counterpartyName,
    customerAccountId: item.counterpartyKind === "CUSTOMER" ? item.cariId : null,
    supplierId: item.counterpartyKind === "SUPPLIER" ? item.cariId : null,
    customerAccountSlug: item.counterpartyKind === "CUSTOMER" ? item.cari?.slug ?? null : null,
    supplierSlug: item.counterpartyKind === "SUPPLIER" ? item.cari?.slug ?? null : null,
    sourceReferenceId: item.sourceReferenceId,
  };
}

export class CashTransactionsService {
  private resolveDefaultCategory(input: {
    direction: "IN" | "OUT" | "TRANSFER";
    sourceType: "MANUAL" | "COLLECTION" | "PAYMENT" | "TRANSFER" | "ORDER" | "DOCUMENT" | "REFUND";
    category?: AdminCashTransactionCategory;
  }) {
    if (input.category) {
      return input.category;
    }

    if (input.sourceType === "REFUND") {
      return "REFUND";
    }

    if (input.sourceType === "TRANSFER" || input.direction === "TRANSFER") {
      return "TRANSFER";
    }

    return input.direction === "IN" ? "GENERAL_INCOME" : "GENERAL_EXPENSE";
  }

  async listTransactions(query: AdminCashTransactionsQuery = {}): Promise<AdminCashTransactionsResult> {
    const parsed = listQuerySchema.parse(query);
    const range = parseFinanceReportDateRangeQuery({
      from: parsed.from,
      to: parsed.to,
    });
    const applyRange = parsed.from !== undefined || parsed.to !== undefined;

    const items = await financeRepository.listCashTransactions({
      search: parsed.search,
      direction: parsed.direction === "all" ? undefined : parsed.direction,
      accountId: parsed.accountId,
      ...(applyRange
        ? {
            fromDate: range.fromDate,
            toDate: range.toDate,
          }
        : {}),
    });
    const mapped = items.map(mapTransaction);
    const incoming = mapped
      .filter((item: AdminCashTransactionItem) => item.direction === "IN" || item.direction === "TRANSFER")
      .reduce((sum: number, item: AdminCashTransactionItem) => sum + item.amount, 0);
    const outgoing = mapped
      .filter((item: AdminCashTransactionItem) => item.direction === "OUT")
      .reduce((sum: number, item: AdminCashTransactionItem) => sum + item.amount, 0);

    return {
      items: mapped,
      summary: {
        totalIncoming: Number(incoming.toFixed(2)),
        totalOutgoing: Number(outgoing.toFixed(2)),
        netAmount: Number((incoming - outgoing).toFixed(2)),
        transactionCount: mapped.length,
        currency: mapped[0]?.currency ?? "TRY",
      },
    };
  }

  async listTransactionsForIncomeExpenseReport(query: AdminFinanceReportDateRangeQuery = {}) {
    const parsed = incomeExpenseReportQuerySchema.parse(query);
    const range = parseFinanceReportDateRangeQuery(parsed);

    return financeRepository.listCashTransactionsForIncomeExpenseReport({
      fromDate: range.fromDate,
      toDate: range.toDate,
      accountId: parsed.financialAccountId,
    });
  }

  async listTransactionsBySourceReferenceId(sourceReferenceId: string) {
    return financeRepository.listCashTransactionsBySourceReferenceId(sourceReferenceId);
  }

  async getTransactionDetail(id: string): Promise<AdminCashTransactionDetail | null> {
    const item = await financeRepository.findCashTransactionById(id);

    if (!item) {
      return null;
    }

    const mapped = mapTransaction(item);
    const movementReference = parseFinanceMovementReference(item.sourceReferenceId);
    let allocationSummary = null;

    if (movementReference?.kind === "collection" && movementReference.id) {
      allocationSummary = await financeAllocationService.getCollectionAllocationSummary(
        movementReference.id,
        mapped.amount,
      );
    } else if (movementReference?.kind === "payment" && movementReference.id) {
      allocationSummary = await financeAllocationService.getPaymentAllocationSummary(
        movementReference.id,
        mapped.amount,
      );
    }

    return {
      ...mapped,
      allocationSummary,
    };
  }

  async createTransaction(input: AdminCreateCashTransactionInput & { recordedByUserId?: string | null }) {
    const parsed = createCashTransactionSchema.parse(input);
    const account = await financeRepository.findFinancialAccountById(parsed.accountId);

    if (!account || !account.isActive) {
      throw new Error("Geçerli bir finans hesabı seçin.");
    }

    const transactionAt = parsed.transactionAt ? new Date(parsed.transactionAt) : new Date();
    const category = this.resolveDefaultCategory({
      direction: parsed.direction,
      sourceType: parsed.sourceType,
      category: parsed.category,
    });

    if (parsed.direction === "TRANSFER") {
      if (!parsed.targetAccountId) {
        throw new Error("Transfer için hedef finans hesabı seçin.");
      }

      if (parsed.targetAccountId === parsed.accountId) {
        throw new Error("Kaynak ve hedef hesap aynı olamaz.");
      }

      const targetAccount = await financeRepository.findFinancialAccountById(parsed.targetAccountId);

      if (!targetAccount || !targetAccount.isActive) {
        throw new Error("Transfer için geçerli bir hedef finans hesabı seçin.");
      }

      if (targetAccount.currency !== account.currency) {
        throw new Error("Transfer hesaplarının para birimi aynı olmalıdır.");
      }

      const transferReferenceId = `transfer:${parsed.accountId}:${parsed.targetAccountId}:${transactionAt.toISOString()}`;
      const transferTitle = parsed.title.trim();

      const createdOut = await financeRepository.createCashTransaction({
        accountId: parsed.accountId,
        direction: "OUT",
        sourceType: "TRANSFER",
        category,
        amount: parsed.amount,
        currency: account.currency,
        transactionAt,
        title: transferTitle,
        note: parsed.note ?? null,
        counterpartyName: targetAccount.name,
        sourceReferenceId: parsed.sourceReferenceId ?? transferReferenceId,
        createdByUserId: parsed.recordedByUserId ?? null,
      });

      const createdTarget = await financeRepository.createCashTransaction({
        accountId: parsed.targetAccountId,
        direction: "IN",
        sourceType: "TRANSFER",
        category,
        amount: parsed.amount,
        currency: targetAccount.currency,
        transactionAt,
        title: transferTitle,
        note: parsed.note ?? null,
        counterpartyName: account.name,
        sourceReferenceId: parsed.sourceReferenceId ?? transferReferenceId,
        createdByUserId: parsed.recordedByUserId ?? null,
      });

      try {
        await financeAccountEntryService.syncFromCashTransaction(createdOut.id);
        await financeAccountEntryService.syncFromCashTransaction(createdTarget.id);
      } catch (error) {
        console.error("PF8 defter projeksiyonu (transfer) başarısız oldu.", error);
      }

      await invalidateFinanceCache();
      return mapTransaction(createdTarget);
    }

    let counterpartyKind: "CUSTOMER" | "SUPPLIER" | "UNREGISTERED" = "UNREGISTERED";
    if (parsed.cariId) {
      const cari = await cariService.getCariById(parsed.cariId);
      if (!cari) {
        throw new Error("Geçerli bir cari kart seçin.");
      }

      counterpartyKind = cari.isSupplier ? "SUPPLIER" : "CUSTOMER";
    }

    const created = await financeRepository.createCashTransaction({
      accountId: parsed.accountId,
      direction: parsed.direction,
      sourceType: parsed.sourceType,
      category,
      amount: parsed.amount,
      currency: account.currency,
      transactionAt,
      title: parsed.title,
      note: parsed.note ?? null,
      counterpartyKind,
      cariId: parsed.cariId ?? null,
      counterpartyName: parsed.counterpartyName ?? null,
      sourceReferenceId: parsed.sourceReferenceId ?? null,
      createdByUserId: parsed.recordedByUserId ?? null,
    });

    try {
      await financeAccountEntryService.syncFromCashTransaction(created.id);
    } catch (error) {
      console.error("PF8 defter projeksiyonu (nakit hareket) başarısız oldu.", error);
    }

    await invalidateFinanceCache();
    return mapTransaction(created);
  }
}

export const cashTransactionsService = new CashTransactionsService();
