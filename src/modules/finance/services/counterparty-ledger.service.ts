import type { AdminCounterpartyLedgerResult } from "@/modules/finance/contracts/counterparty-ledger.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import {
  attachCounterpartyRunningBalances,
  resolveCounterpartySignedAmount,
  type CounterpartyLedgerPerspective,
} from "@/modules/finance/services/counterparty-ledger-running-balance.util";
import { resolveCounterpartyLedgerCopy } from "@/modules/finance/services/counterparty-ledger-copy.resolver";
import { financeCounterpartyFinanceTermsService } from "@/modules/finance/services/finance-counterparty-finance-terms.service";
import { payablesService } from "@/modules/finance/services/payables.service";
import { receivablesService } from "@/modules/finance/services/receivables.service";

function normalizeMoney(value: number) {
  return Number(value.toFixed(2));
}

type CounterpartyLedgerDraftItem = Omit<AdminCounterpartyLedgerResult["items"][number], "signedAmount" | "runningBalance">;

function finalizeCounterpartyMovements(items: CounterpartyLedgerDraftItem[], perspective: CounterpartyLedgerPerspective) {
  const withSigned = items.map((item) => ({
    ...item,
    signedAmount: resolveCounterpartySignedAmount(item.kind, item.amount, perspective),
  }));

  withSigned.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return attachCounterpartyRunningBalances(withSigned);
}

export class CounterpartyLedgerService {
  async getCustomerLedger(locale: string, slug: string): Promise<AdminCounterpartyLedgerResult | null> {
    const copy = resolveCounterpartyLedgerCopy(locale);
    const customer = await financeRepository.findCustomerAccountBySlug(slug);

    if (!customer) {
      return null;
    }

    const [orders, cashTransactions, documents, receivables] = await Promise.all([
      financeRepository.listOrdersForCustomerAccount(customer.id),
      financeRepository.listCashTransactionsForCustomerAccount(customer.id),
      financeRepository.listBusinessDocumentsForCustomerAccount(customer.id),
      receivablesService.listOperationalReceivables({ page: 1, pageSize: 200, locale }),
    ]);

    const orderIds = orders.map((order) => order.id);
    const collectionRecords = await financeRepository.listCollectionRecordsForOrders(orderIds);
    const receivableItems = receivables.items.filter((item) => orderIds.includes(item.orderId));
    const openReceivableAmount = receivableItems.reduce((sum, item) => sum + item.totalAmount, 0);

    const items: CounterpartyLedgerDraftItem[] = [];

    for (const order of orders) {
      items.push({
        id: `receivable:${order.id}`,
        kind: "RECEIVABLE",
        title: `${copy.receivableTitlePrefix}${order.orderNumber}`,
        occurredAt: order.createdAt.toISOString(),
        amount: order.total.toNumber(),
        currency: order.currency,
        statusLabel: order.paymentStatus,
        sourceHref: `/${locale}/admin/orders/${order.id}`,
        financeHref: `/${locale}/admin/finance/receivables/${order.id}`,
      });
    }

    for (const record of collectionRecords) {
      const order = orders.find((item) => item.id === record.orderId);
      items.push({
        id: `collection:${record.id}`,
        kind: "COLLECTION",
        title: `${copy.collectionTitlePrefix}${order?.orderNumber ?? record.orderId}`,
        occurredAt: record.collectedAt.toISOString(),
        amount: record.amount.toNumber(),
        currency: record.currency,
        statusLabel: record.status,
        sourceHref: order ? `/${locale}/admin/orders/${order.id}` : null,
        financeHref: order ? `/${locale}/admin/finance/collections/${order.id}` : null,
      });
    }

    for (const transaction of cashTransactions) {
      items.push({
        id: `cash:${transaction.id}`,
        kind: transaction.direction === "OUT" ? "CASH_OUT" : "CASH_IN",
        title: transaction.title,
        occurredAt: transaction.transactionAt.toISOString(),
        amount: transaction.amount.toNumber(),
        currency: transaction.currency,
        statusLabel: transaction.sourceType,
        sourceHref: null,
        financeHref: `/${locale}/admin/finance/transactions/${transaction.id}`,
      });
    }

    for (const document of documents) {
      items.push({
        id: `document:${document.id}`,
        kind: "DOCUMENT",
        title: `${copy.documentTitlePrefix}${document.documentNumber}`,
        occurredAt: document.issueDate.toISOString(),
        amount: document.totalAmount?.toNumber() ?? 0,
        currency: document.currency,
        statusLabel: document.status,
        sourceHref: `/${locale}/admin/documents`,
        financeHref: null,
      });
    }

    const enrichedItems = finalizeCounterpartyMovements(items, "customer");

    return {
      summary: {
        counterpartyName: customer.name,
        slug: customer.slug,
        openBalanceLabel: copy.openReceivableBalanceLabel,
        openBalanceAmount: normalizeMoney(openReceivableAmount),
        currency: orders[0]?.currency ?? documents[0]?.currency ?? "TRY",
        movementCount: enrichedItems.length,
        collectionOrPaymentCount: collectionRecords.length,
        documentCount: documents.length,
        lastMovementAt: enrichedItems[0]?.occurredAt ?? null,
        financeTerms: financeCounterpartyFinanceTermsService.buildTermsFromProfile({
          locale,
          defaultPaymentTermDays: customer.defaultPaymentTermDays,
          creditLimit: customer.creditLimit ? customer.creditLimit.toNumber() : null,
          currency: orders[0]?.currency ?? "TRY",
          kind: "customer",
        }),
      },
      items: enrichedItems,
    };
  }

  async getSupplierLedger(locale: string, slug: string): Promise<AdminCounterpartyLedgerResult | null> {
    const copy = resolveCounterpartyLedgerCopy(locale);
    const supplier = await financeRepository.findSupplierBySlug(slug);

    if (!supplier) {
      return null;
    }

    const [cashTransactions, documents, paymentRecords, payables] = await Promise.all([
      financeRepository.listCashTransactionsForSupplier(supplier.id),
      financeRepository.listBusinessDocumentsForSupplier(supplier.id),
      financeRepository.listPaymentRecords([supplier.id]),
      payablesService.listSupplierPayables().then((result) => result.items),
    ]);

    const payable = payables.find((item) => item.supplierId === supplier.id);
    const openPayableAmount = payable?.totalAmount ?? 0;

    const items: CounterpartyLedgerDraftItem[] = [];

    if (payable) {
      for (const document of payable.documents) {
        items.push({
          id: `payable:${document.id}`,
          kind: "PAYABLE",
          title: `${copy.payableTitlePrefix}${document.documentNumber}`,
          occurredAt: document.issueDate,
          amount: document.totalAmount ?? 0,
          currency: document.currency,
          statusLabel: document.status,
          sourceHref: `/${locale}/admin/documents`,
          financeHref: `/${locale}/admin/finance/payables/${encodeURIComponent(payable.supplierKey)}`,
        });
      }
    }

    for (const record of paymentRecords) {
      items.push({
        id: `payment:${record.id}`,
        kind: "PAYMENT",
        title: `${copy.paymentTitlePrefix}${supplier.name}`,
        occurredAt: record.paidAt.toISOString(),
        amount: record.amount.toNumber(),
        currency: record.currency,
        statusLabel: record.status,
        sourceHref: `/${locale}/admin/documents`,
        financeHref: payable ? `/${locale}/admin/finance/payments/${encodeURIComponent(payable.supplierKey)}` : null,
      });
    }

    for (const transaction of cashTransactions) {
      items.push({
        id: `cash:${transaction.id}`,
        kind: transaction.direction === "OUT" ? "CASH_OUT" : "CASH_IN",
        title: transaction.title,
        occurredAt: transaction.transactionAt.toISOString(),
        amount: transaction.amount.toNumber(),
        currency: transaction.currency,
        statusLabel: transaction.sourceType,
        sourceHref: null,
        financeHref: `/${locale}/admin/finance/transactions/${transaction.id}`,
      });
    }

    for (const document of documents) {
      if (payable?.documents.some((item) => item.id === document.id)) {
        continue;
      }

      items.push({
        id: `document:${document.id}`,
        kind: "DOCUMENT",
        title: `${copy.documentTitlePrefix}${document.documentNumber}`,
        occurredAt: document.issueDate.toISOString(),
        amount: document.totalAmount?.toNumber() ?? 0,
        currency: document.currency,
        statusLabel: document.status,
        sourceHref: `/${locale}/admin/documents`,
        financeHref: null,
      });
    }

    const enrichedItems = finalizeCounterpartyMovements(items, "supplier");

    return {
      summary: {
        counterpartyName: supplier.name,
        slug: supplier.slug,
        openBalanceLabel: copy.openPayableBalanceLabel,
        openBalanceAmount: normalizeMoney(openPayableAmount),
        currency: payable?.currency ?? documents[0]?.currency ?? "TRY",
        movementCount: enrichedItems.length,
        collectionOrPaymentCount: paymentRecords.length,
        documentCount: documents.length,
        lastMovementAt: enrichedItems[0]?.occurredAt ?? null,
        financeTerms: financeCounterpartyFinanceTermsService.buildTermsFromProfile({
          locale,
          defaultPaymentTermDays: supplier.defaultPaymentTermDays,
          creditLimit: supplier.creditLimit ? supplier.creditLimit.toNumber() : null,
          currency: payable?.currency ?? documents[0]?.currency ?? "TRY",
          kind: "supplier",
        }),
      },
      items: enrichedItems,
    };
  }
}

export const counterpartyLedgerService = new CounterpartyLedgerService();
