import { z } from "zod";

import type {
  AdminFinanceAccountEntry,
  AdminFinanceAccountsQuery,
  AdminFinanceAccountsResult,
} from "@/modules/finance/contracts/accounts.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import { payablesService } from "@/modules/finance/services/payables.service";
import { receivablesService } from "@/modules/finance/services/receivables.service";

const querySchema = z.object({
  search: z.string().trim().optional(),
  type: z.enum(["all", "RECEIVABLE", "PAYABLE", "CASH"]).default("all"),
});

export class AccountsService {
  async listAccountEntries(locale: string, query: AdminFinanceAccountsQuery = {}): Promise<AdminFinanceAccountsResult> {
    const parsed = querySchema.parse(query);

    const [payablesResult, receivables, cashTransactions] = await Promise.all([
      payablesService.listSupplierPayables({ search: parsed.search }),
      receivablesService.listOperationalReceivables({ search: parsed.search, page: 1, pageSize: 100, locale }),
      financeRepository.listCashTransactionsWithCari(),
    ]);
    const payables = payablesResult.items;

    const payableEntries: AdminFinanceAccountEntry[] = payables.flatMap((group) =>
      group.documents.map((document) => ({
        id: `payable:${document.id}`,
        type: "PAYABLE",
        counterpartyName: group.supplierName,
        counterpartyLedgerHref: group.supplierId
          ? `/${locale}/admin/finance/accounts/${encodeURIComponent(group.supplierId)}`
          : group.supplierSlug
            ? `/${locale}/admin/finance/cari/${encodeURIComponent(group.supplierSlug)}`
            : null,
        sourceNumber: document.documentNumber,
        sourceDate: document.issueDate,
        statusLabel: document.status,
        totalAmount: document.totalAmount ?? 0,
        currency: document.currency,
        detailHref: `/${locale}/admin/finance/payables/${encodeURIComponent(group.supplierKey)}`,
        sourceHref: `/${locale}/admin/documents`,
        financeMovementPreviewHref: `/${locale}/admin/finance/business-documents/${document.id}/movements`,
      })),
    );

    const receivableEntries: AdminFinanceAccountEntry[] = receivables.items.map((item) => ({
      id: `receivable:${item.orderId}`,
      type: "RECEIVABLE",
      counterpartyName: item.counterpartyName,
      counterpartyLedgerHref: item.customerAccountId
        ? `/${locale}/admin/finance/accounts/${encodeURIComponent(item.customerAccountId)}`
        : null,
      sourceNumber: item.orderNumber,
      sourceDate: item.createdAt,
      statusLabel: item.paymentStatus,
      totalAmount: item.totalAmount,
      currency: item.currency,
      detailHref: `/${locale}/admin/finance/receivables/${item.orderId}`,
      sourceHref: `/${locale}/admin/orders/${item.orderId}`,
      financeMovementPreviewHref: item.latestDocument?.id
        ? `/${locale}/admin/finance/business-documents/${item.latestDocument.id}/movements`
        : `/${locale}/admin/finance/collections/${item.orderId}`,
    }));

    const search = parsed.search?.toLowerCase();
    const cashEntries: AdminFinanceAccountEntry[] = cashTransactions
      .filter((transaction) =>
        !search
        || transaction.title.toLowerCase().includes(search)
        || (transaction.cari?.name ?? "").toLowerCase().includes(search),
      )
      .map((transaction) => ({
        id: `cash:${transaction.id}`,
        type: transaction.direction === "OUT" ? "CASH_OUT" : "CASH_IN",
        counterpartyName: transaction.cari?.name ?? transaction.counterpartyName ?? "-",
        counterpartyLedgerHref: transaction.cari?.slug
          ? `/${locale}/admin/finance/cari/${encodeURIComponent(transaction.cari.slug)}`
          : null,
        sourceNumber: transaction.title,
        sourceDate: transaction.transactionAt.toISOString(),
        statusLabel: transaction.status,
        totalAmount: transaction.amount.toNumber(),
        currency: transaction.currency,
        detailHref: `/${locale}/admin/finance/transactions/${transaction.id}`,
        sourceHref: `/${locale}/admin/finance/transactions/${transaction.id}`,
        financeMovementPreviewHref: null,
      }));

    const combined = [...receivableEntries, ...payableEntries, ...cashEntries]
      .filter((entry) => {
        if (parsed.type === "all") {
          return true;
        }
        if (parsed.type === "CASH") {
          return entry.type === "CASH_IN" || entry.type === "CASH_OUT";
        }
        return entry.type === parsed.type;
      })
      .sort((left, right) => right.sourceDate.localeCompare(left.sourceDate));

    return {
      items: combined,
      summary: {
        receivableCount: receivableEntries.length,
        payableCount: payableEntries.length,
        cashMovementCount: cashEntries.length,
        totalReceivableAmount: receivableEntries.reduce((sum, item) => sum + item.totalAmount, 0),
        totalPayableAmount: payableEntries.reduce((sum, item) => sum + item.totalAmount, 0),
        totalCashInAmount: cashEntries.filter((item) => item.type === "CASH_IN").reduce((sum, item) => sum + item.totalAmount, 0),
        totalCashOutAmount: cashEntries.filter((item) => item.type === "CASH_OUT").reduce((sum, item) => sum + item.totalAmount, 0),
        currency: "TRY",
      },
    };
  }
}

export const accountsService = new AccountsService();
