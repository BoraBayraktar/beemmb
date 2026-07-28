import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import type { AdminFinanceReportDateRangeQuery } from "@/modules/finance/contracts/finance-report-date-range.contract";
import type {
  AdminFinanceReportDetail,
  AdminFinanceReportDetailRow,
  AdminFinanceReportsOverview,
} from "@/modules/finance/contracts/reports.contract";
import type { FinanceReportsAgingBucketCopy } from "@/modules/finance/contracts/finance-reports-copy.contract";
import { resolveFinanceReportsCopy } from "@/modules/finance/services/finance-reports-copy.resolver";
import { accountsService } from "@/modules/finance/services/accounts.service";
import { cashTransactionsService } from "@/modules/finance/services/cash-transactions.service";
import { collectionsService } from "@/modules/finance/services/collections.service";
import { financeVatSummaryService } from "@/modules/finance/services/finance-vat-summary.service";
import { financeTrialBalanceService } from "@/modules/finance/services/finance-trial-balance.service";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { payablesService } from "@/modules/finance/services/payables.service";
import { paymentsService } from "@/modules/finance/services/payments.service";
import { receivablesService } from "@/modules/finance/services/receivables.service";
import { computeDaysPastDue } from "@/modules/finance/services/finance-due-date.util";
import {
  INCOME_EXPENSE_CATEGORY_ORDER,
  normalizeIncomeExpenseCategoryKey,
  resolveCashTransactionCategoryLabel,
} from "@/modules/finance/services/finance-income-expense-category.util";
import {
  appendFinanceReportDateRangeDescription,
  formatFinanceReportDateRangeLabel,
  isInstantInFinanceReportRange,
  parseFinanceReportDateRangeQuery,
} from "@/modules/finance/services/finance-report-date-range.util";

function diffInDays(value: string) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / msPerDay));
}

function resolveBucketLabel(days: number, agingBuckets: FinanceReportsAgingBucketCopy[]) {
  const bucket = agingBuckets.find((item) => days >= item.minDays && (item.maxDays == null || days <= item.maxDays));
  return bucket?.label ?? agingBuckets[agingBuckets.length - 1].label;
}

function resolveTone(value: number): "neutral" | "success" | "warning" {
  if (value > 0) {
    return "success";
  }

  if (value < 0) {
    return "warning";
  }

  return "neutral";
}

function formatMoney(value: number | null, currency: string, notSpecified: string) {
  if (value === null) {
    return notSpecified;
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null, notSpecified: string) {
  if (!value) {
    return notSpecified;
  }

  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

async function loadReportPeriodTransactions(query: AdminFinanceReportDateRangeQuery = {}) {
  const range = parseFinanceReportDateRangeQuery(query);
  const transactions = await cashTransactionsService.listTransactions({
    from: range.fromIso,
    to: range.toIso,
    accountId: query.financialAccountId,
  });

  return { range, transactions };
}

export class ReportsService {
  async getOverview(locale: string): Promise<AdminFinanceReportsOverview> {
    const copy = resolveFinanceReportsCopy(locale);
    const [, payables, receivables, financialAccounts, transactions] = await Promise.all([
      accountsService.listAccountEntries(locale),
      payablesService.listSupplierPayables().then((result) => result.items),
      receivablesService.getReceivablesSummary(),
      financialAccountsService.listAccounts(),
      cashTransactionsService.listTransactions(),
    ]);

    const totalPayables = payables.reduce((sum, item) => sum + item.totalAmount, 0);
    const netOperationalBalance = receivables.totalOpenAmount - totalPayables;
    const cashPositionGap = financialAccounts.summary.totalBalance - transactions.summary.netAmount;

    return {
      metrics: [
        {
          label: copy.overview.netBalanceLabel,
          value: netOperationalBalance,
          currency: "TRY",
          tone: netOperationalBalance >= 0 ? "success" : "warning",
          href: `/${locale}/admin/finance/accounts`,
          hint: copy.overview.netBalanceHint,
        },
        {
          label: copy.overview.bankBalanceLabel,
          value: financialAccounts.summary.totalBalance,
          currency: financialAccounts.summary.currency,
          tone: "success",
          href: `/${locale}/admin/finance/bank-cash`,
          hint: `${financialAccounts.summary.activeAccountCount} ${copy.overview.bankBalanceHintSuffix}`,
        },
        {
          label: copy.overview.recordedNetCashLabel,
          value: transactions.summary.netAmount,
          currency: transactions.summary.currency,
          tone: resolveTone(transactions.summary.netAmount),
          href: `/${locale}/admin/finance/transactions`,
          hint: `${transactions.summary.transactionCount} ${copy.overview.recordedNetCashHintSuffix}`,
        },
        {
          label: copy.overview.cashGapLabel,
          value: cashPositionGap,
          currency: financialAccounts.summary.currency,
          tone: resolveTone(cashPositionGap),
          href: `/${locale}/admin/finance/reports/cashflow`,
          hint: copy.overview.cashGapHint,
        },
      ],
      cards: [
        {
          title: copy.overview.cardAgingTitle,
          description: copy.overview.cardAgingDescription,
          href: `/${locale}/admin/finance/reports/aging`,
          ctaLabel: copy.openCta,
        },
        {
          title: copy.overview.cardCashflowTitle,
          description: copy.overview.cardCashflowDescription,
          href: `/${locale}/admin/finance/reports/cashflow`,
          ctaLabel: copy.openCta,
        },
        {
          title: copy.overview.cardBankCashTitle,
          description: copy.overview.cardBankCashDescription,
          href: `/${locale}/admin/finance/reports/bank-cash`,
          ctaLabel: copy.openCta,
        },
        {
          title: copy.overview.cardStockTitle,
          description: copy.overview.cardStockDescription,
          href: `/${locale}/admin/finance/reports/stock-value`,
          ctaLabel: copy.openCta,
        },
        {
          title: copy.overview.cardPerformanceTitle,
          description: copy.overview.cardPerformanceDescription,
          href: `/${locale}/admin/finance/reports/performance`,
          ctaLabel: copy.openCta,
        },
        {
          title: copy.overview.cardIncomeExpenseTitle,
          description: copy.overview.cardIncomeExpenseDescription,
          href: `/${locale}/admin/finance/reports/income-expense`,
          ctaLabel: copy.openCta,
        },
        {
          title: copy.overview.cardVatSummaryTitle,
          description: copy.overview.cardVatSummaryDescription,
          href: `/${locale}/admin/finance/reports/vat-summary`,
          ctaLabel: copy.openCta,
        },
        {
          title: copy.overview.cardTrialBalanceTitle,
          description: copy.overview.cardTrialBalanceDescription,
          href: `/${locale}/admin/finance/reports/trial-balance`,
          ctaLabel: copy.openCta,
        },
      ],
    };
  }

  async getIncomeExpenseReport(
    locale: string,
    query: AdminFinanceReportDateRangeQuery = {},
  ): Promise<AdminFinanceReportDetail> {
    const copy = resolveFinanceReportsCopy(locale);
    const range = parseFinanceReportDateRangeQuery(query);
    const transactions = await cashTransactionsService.listTransactionsForIncomeExpenseReport({
      from: range.fromIso,
      to: range.toIso,
      financialAccountId: query.financialAccountId,
    });

    type CategoryBucket = {
      categoryKey: string;
      income: number;
      expense: number;
      movementCount: number;
      currency: string;
    };

    const bucketMap = new Map<string, CategoryBucket>();

    for (const item of transactions) {
      const categoryKey = normalizeIncomeExpenseCategoryKey(item.category);
      const amount = typeof item.amount?.toNumber === "function" ? item.amount.toNumber() : Number(item.amount);
      const bucket = bucketMap.get(categoryKey) ?? {
        categoryKey,
        income: 0,
        expense: 0,
        movementCount: 0,
        currency: item.currency ?? "TRY",
      };

      if (item.direction === "IN" || item.direction === "TRANSFER") {
        bucket.income += amount;
      }

      if (item.direction === "OUT") {
        bucket.expense += amount;
      }

      bucket.movementCount += 1;
      bucketMap.set(categoryKey, bucket);
    }

    const buckets = INCOME_EXPENSE_CATEGORY_ORDER.map((categoryKey) => {
      const bucket = bucketMap.get(categoryKey) ?? {
        categoryKey,
        income: 0,
        expense: 0,
        movementCount: 0,
        currency: transactions[0]?.currency ?? "TRY",
      };

      return {
        ...bucket,
        income: Number(bucket.income.toFixed(2)),
        expense: Number(bucket.expense.toFixed(2)),
        net: Number((bucket.income - bucket.expense).toFixed(2)),
      };
    }).filter((bucket) => bucket.movementCount > 0 || bucket.income > 0 || bucket.expense > 0);

    const displayBuckets = buckets.length > 0
      ? buckets
      : INCOME_EXPENSE_CATEGORY_ORDER.map((categoryKey) => ({
          categoryKey,
          income: 0,
          expense: 0,
          movementCount: 0,
          currency: "TRY",
          net: 0,
        }));

    const totalIncome = Number(displayBuckets.reduce((sum, bucket) => sum + bucket.income, 0).toFixed(2));
    const totalExpense = Number(displayBuckets.reduce((sum, bucket) => sum + bucket.expense, 0).toFixed(2));
    const netAmount = Number((totalIncome - totalExpense).toFixed(2));
    const movementCount = transactions.length;
    const currency = transactions[0]?.currency ?? "TRY";
    const dateRangeLabel = formatFinanceReportDateRangeLabel(range.fromIso, range.toIso);

    const resolveCategoryLabel = (categoryKey: string) => {
      if (categoryKey === "UNSPECIFIED") {
        return copy.incomeExpense.categoryUnspecified;
      }

      return resolveCashTransactionCategoryLabel(
        categoryKey as "GENERAL_INCOME" | "GENERAL_EXPENSE" | "MARKETPLACE_COMMISSION" | "SHIPPING_EXPENSE" | "SERVICE_FEE" | "REFUND" | "TRANSFER",
        copy.incomeExpense,
      );
    };

    const rows: AdminFinanceReportDetailRow[] = displayBuckets
      .filter((bucket) => bucket.movementCount > 0)
      .sort((left, right) => Math.abs(right.net) - Math.abs(left.net))
      .slice(0, 8)
      .map((bucket) => ({
        id: bucket.categoryKey,
        label: resolveCategoryLabel(bucket.categoryKey),
        supportingText: `${bucket.movementCount} ${copy.incomeExpense.movementCountHintSuffix}`,
        primaryValue: bucket.net,
        primaryCurrency: bucket.currency,
        secondaryValue: bucket.income,
        secondaryCurrency: bucket.currency,
        tone: resolveTone(bucket.net),
        href: `/${locale}/admin/finance/transactions`,
      }));

    const money = (value: number, rowCurrency: string) =>
      new Intl.NumberFormat("tr-TR", { style: "currency", currency: rowCurrency, maximumFractionDigits: 2 }).format(value);

    return {
      title: copy.incomeExpense.title,
      description: appendFinanceReportDateRangeDescription(copy.incomeExpense.description, copy.incomeExpense.dateRangeHint, range),
      metrics: [
        {
          label: copy.incomeExpense.totalIncomeLabel,
          value: totalIncome,
          currency,
          tone: totalIncome > 0 ? "success" : "neutral",
          hint: dateRangeLabel,
        },
        {
          label: copy.incomeExpense.totalExpenseLabel,
          value: totalExpense,
          currency,
          tone: totalExpense > 0 ? "warning" : "neutral",
          hint: dateRangeLabel,
        },
        {
          label: copy.incomeExpense.netLabel,
          value: netAmount,
          currency,
          tone: resolveTone(netAmount),
          hint: copy.incomeExpense.netHint,
        },
        {
          label: copy.incomeExpense.movementCountLabel,
          value: movementCount,
          tone: movementCount > 0 ? "neutral" : "warning",
          hint: `${copy.incomeExpense.dateRangeHint}: ${dateRangeLabel}`,
        },
      ],
      rows,
      table: {
        title: copy.incomeExpense.tableTitle,
        description: copy.incomeExpense.tableDescription,
        columns: [
          { key: "category", label: copy.incomeExpense.colCategory },
          { key: "income", label: copy.incomeExpense.colIncome, align: "right" },
          { key: "expense", label: copy.incomeExpense.colExpense, align: "right" },
          { key: "net", label: copy.incomeExpense.colNet, align: "right" },
          { key: "movements", label: copy.incomeExpense.colMovements, align: "right" },
        ],
        rows: displayBuckets.map((bucket) => ({
          id: bucket.categoryKey,
          href: `/${locale}/admin/finance/transactions`,
          cells: {
            category: resolveCategoryLabel(bucket.categoryKey),
            income: money(bucket.income, bucket.currency),
            expense: money(bucket.expense, bucket.currency),
            net: money(bucket.net, bucket.currency),
            movements: bucket.movementCount.toLocaleString("tr-TR"),
          },
        })),
      },
    };
  }

  async getCollectionPaymentPerformanceReport(locale: string): Promise<AdminFinanceReportDetail> {
    const copy = resolveFinanceReportsCopy(locale);
    const [collections, payments] = await Promise.all([
      collectionsService.listCollectionReadiness(locale),
      paymentsService.listPaymentReadiness(locale),
    ]);

    const collectionCompletionRate = collections.summary.totalPendingAmount > 0
      ? Number(((collections.summary.totalRecordedAmount / (collections.summary.totalPendingAmount + collections.summary.totalRecordedAmount)) * 100).toFixed(1))
      : collections.summary.totalRecordedAmount > 0
        ? 100
        : 0;
    const paymentCompletionRate = payments.summary.totalPendingAmount > 0
      ? Number(((payments.summary.totalRecordedAmount / (payments.summary.totalPendingAmount + payments.summary.totalRecordedAmount)) * 100).toFixed(1))
      : payments.summary.totalRecordedAmount > 0
        ? 100
        : 0;

    const rows: AdminFinanceReportDetailRow[] = [
      ...collections.items.slice(0, 8).map((item) => ({
        id: `collection:${item.orderId}`,
        label: item.orderNumber,
        supportingText: `${item.counterpartyName} · ${item.recordedCollectionCount} ${copy.performance.collectionRowRecordSuffix}`,
        primaryValue: item.remainingAmount,
        primaryCurrency: item.currency,
        secondaryValue: item.totalAmount - item.remainingAmount,
        secondaryCurrency: item.currency,
        tone: item.remainingAmount <= 0 ? "success" as const : "warning" as const,
        href: item.detailHref,
      })),
      ...payments.items.slice(0, 8).map((item) => ({
        id: `payment:${item.supplierId}`,
        label: item.supplierName,
        supportingText: `${item.recordedPaymentCount} ${copy.performance.paymentRowRecordSuffix} · ${item.documentCount} ${copy.performance.paymentRowDocumentSuffix}`,
        primaryValue: item.remainingAmount,
        primaryCurrency: item.currency,
        secondaryValue: item.totalAmount - item.remainingAmount,
        secondaryCurrency: item.currency,
        tone: item.remainingAmount <= 0 ? "success" as const : "warning" as const,
        href: item.detailHref,
      })),
    ];

    return {
      title: copy.performance.title,
      description: copy.performance.description,
      metrics: [
        {
          label: copy.performance.collectionCompletionLabel,
          value: collectionCompletionRate,
          tone: collectionCompletionRate >= 70 ? "success" : "warning",
          hint: `${collections.summary.recordedCount} ${copy.performance.recordedCollectionHintSuffix}`,
        },
        {
          label: copy.performance.paymentCompletionLabel,
          value: paymentCompletionRate,
          tone: paymentCompletionRate >= 70 ? "success" : "warning",
          hint: `${payments.summary.recordedCount} ${copy.performance.recordedPaymentHintSuffix}`,
        },
        {
          label: copy.performance.openReceivableLabel,
          value: collections.summary.totalPendingAmount,
          currency: collections.summary.currency,
          tone: "warning",
          hint: `${collections.summary.pendingCount} ${copy.performance.pendingOrdersHintSuffix}`,
        },
        {
          label: copy.performance.openPayableLabel,
          value: payments.summary.totalPendingAmount,
          currency: payments.summary.currency,
          tone: "warning",
          hint: `${payments.summary.supplierCount} ${copy.performance.suppliersHintSuffix}`,
        },
      ],
      rows,
      table: null,
    };
  }

  async getAgingReport(
    locale: string,
    query: AdminFinanceReportDateRangeQuery = {},
  ): Promise<AdminFinanceReportDetail> {
    const copy = resolveFinanceReportsCopy(locale);
    const range = parseFinanceReportDateRangeQuery(query);
    const agingBuckets = copy.agingBuckets;
    const [payableSummaries, receivables] = await Promise.all([
      payablesService.listSupplierPayables().then((result) => result.items),
      receivablesService.listOperationalReceivables({ page: 1, pageSize: 5000, locale }),
    ]);
    const payables = (await Promise.all(
      payableSummaries.map((item) => payablesService.getSupplierPayableByKey(item.supplierKey)),
    )).filter((item): item is NonNullable<typeof item> => Boolean(item));

    const filteredReceivables = receivables.items.filter((item) =>
      isInstantInFinanceReportRange(item.latestDocument?.issueDate ?? item.createdAt, range),
    );

    const filteredPayables = payables.map((supplier) => ({
      ...supplier,
      documents: supplier.documents.filter((document) => isInstantInFinanceReportRange(document.issueDate, range)),
    })).filter((supplier) => supplier.documents.length > 0);

    const rows: AdminFinanceReportDetailRow[] = agingBuckets.map((bucket) => {
      const receivableAmount = filteredReceivables
        .filter((item) => {
          const days = computeDaysPastDue(item.effectiveDueDate);
          return days >= bucket.minDays && (bucket.maxDays == null || days <= bucket.maxDays);
        })
        .reduce((sum, item) => sum + item.totalAmount, 0);

      const payableAmount = filteredPayables
        .flatMap((item) => item.documents)
        .filter((item) => {
          const days = computeDaysPastDue(item.effectiveDueDate);
          return days >= bucket.minDays && (bucket.maxDays == null || days <= bucket.maxDays);
        })
        .reduce((sum, item) => sum + (item.totalAmount ?? 0), 0);

      return {
        id: bucket.id,
        label: bucket.label,
        supportingText: (() => {
          const bucketPayables = filteredPayables
            .flatMap((item) => item.documents.map((document) => ({ document, supplier: item })))
            .filter((entry) => {
              const days = computeDaysPastDue(entry.document.effectiveDueDate);
              return days >= bucket.minDays && (bucket.maxDays == null || days <= bucket.maxDays);
            });
          const variantSummary = bucketPayables
            .map((entry) => entry.supplier.topVariantSummary)
            .filter((value): value is string => Boolean(value))
            .slice(0, 2)
            .join(copy.variantJoiner);

          return variantSummary
            ? `${copy.aging.rowSupportingWithVariantsPrefix}${variantSummary}`
            : copy.aging.rowSupportingBase;
        })(),
        primaryValue: receivableAmount,
        primaryCurrency: "TRY",
        secondaryValue: payableAmount,
        secondaryCurrency: "TRY",
        tone: resolveTone(receivableAmount - payableAmount),
      };
    });

    const totalReceivable = rows.reduce((sum, item) => sum + item.primaryValue, 0);
    const totalPayable = rows.reduce((sum, item) => sum + (item.secondaryValue ?? 0), 0);
    const payableTableRows = filteredPayables
      .flatMap((supplier) => supplier.documents.map((document) => ({ supplier, document })))
      .flatMap(({ supplier, document }) => document.lines.map((line) => ({
        id: line.id,
        href: `/${locale}/admin/finance/payables/${encodeURIComponent(supplier.supplierKey)}`,
        cells: {
          agingBucket: resolveBucketLabel(computeDaysPastDue(document.effectiveDueDate), agingBuckets),
          supplier: supplier.supplierName,
          document: document.documentNumber,
          issueDate: formatDate(document.issueDate, copy.notSpecified),
          product: line.productName,
          variant: line.productVariantTitle ?? "-",
          sku: line.productVariantSku ?? line.productSku,
          quantity: line.quantity.toLocaleString("tr-TR"),
          unitPrice: formatMoney(line.unitPrice, line.currency, copy.notSpecified),
          lineTotal: formatMoney(line.lineTotal, line.currency, copy.notSpecified),
        },
      })))
      .sort((left, right) => right.cells.lineTotal.localeCompare(left.cells.lineTotal));

    return {
      title: copy.aging.title,
      description: appendFinanceReportDateRangeDescription(copy.aging.description, copy.incomeExpense.dateRangeHint, range),
      metrics: [
        {
          label: copy.aging.totalReceivableLabel,
          value: totalReceivable,
          currency: "TRY",
          tone: "success",
          hint: `${filteredReceivables.length} ${copy.aging.openOrdersHintSuffix}`,
        },
        {
          label: copy.aging.totalPayableLabel,
          value: totalPayable,
          currency: "TRY",
          tone: "warning",
          hint: `${filteredPayables.length} ${copy.aging.supplierSummaryHintSuffix}`,
        },
        {
          label: copy.aging.netPositionLabel,
          value: totalReceivable - totalPayable,
          currency: "TRY",
          tone: resolveTone(totalReceivable - totalPayable),
          hint: copy.aging.netPositionHint,
        },
      ],
      rows,
      table: {
        title: copy.aging.tableTitle,
        description: copy.aging.tableDescription,
        columns: [
          { key: "agingBucket", label: copy.columns.agingBucket },
          { key: "supplier", label: copy.columns.supplier },
          { key: "document", label: copy.columns.document },
          { key: "issueDate", label: copy.columns.issueDate },
          { key: "product", label: copy.columns.product },
          { key: "variant", label: copy.columns.variant },
          { key: "sku", label: copy.columns.sku },
          { key: "quantity", label: copy.columns.quantity, align: "right" },
          { key: "unitPrice", label: copy.columns.unitCost, align: "right" },
          { key: "lineTotal", label: copy.columns.lineTotal, align: "right" },
        ],
        rows: payableTableRows,
      },
    };
  }

  async getCashflowReport(
    locale: string,
    query: AdminFinanceReportDateRangeQuery = {},
  ): Promise<AdminFinanceReportDetail> {
    const copy = resolveFinanceReportsCopy(locale);
    const { range, transactions: periodTransactions } = await loadReportPeriodTransactions(query);
    const [collections, payments, financialAccounts, payableSummaries] = await Promise.all([
      collectionsService.listCollectionReadiness(locale),
      paymentsService.listPaymentReadiness(locale),
      financialAccountsService.listAccounts(),
      payablesService.listSupplierPayables().then((result) => result.items),
    ]);
    const payableDetails = (await Promise.all(
      payableSummaries.map((item) => payablesService.getSupplierPayableByKey(item.supplierKey)),
    )).filter((item): item is NonNullable<typeof item> => Boolean(item));

    const netExpected = collections.summary.totalPendingAmount - payments.summary.totalPendingAmount;
    const netRecordedInPeriod = periodTransactions.summary.netAmount;
    const actualCashBalance = financialAccounts.summary.totalBalance;
    const cashCoverageGap = actualCashBalance - netRecordedInPeriod;
    const dateRangeLabel = formatFinanceReportDateRangeLabel(range.fromIso, range.toIso);

    const accountRows: AdminFinanceReportDetailRow[] = financialAccounts.items.map((account) => {
      const accountTransactions = periodTransactions.items.filter((item) => item.accountId === account.id);
      const incoming = accountTransactions
        .filter((item) => item.direction === "IN" || item.direction === "TRANSFER")
        .reduce((sum, item) => sum + item.amount, 0);
      const outgoing = accountTransactions
        .filter((item) => item.direction === "OUT")
        .reduce((sum, item) => sum + item.amount, 0);

      return {
        id: account.id,
        label: account.name,
        supportingText: `${account.type === "CASH" ? copy.cashflow.cashAccountType : copy.cashflow.bankAccountType} · ${accountTransactions.length} ${copy.cashflow.movementsHintSuffix}`,
        primaryValue: account.currentBalance,
        primaryCurrency: account.currency,
        secondaryValue: Number((incoming - outgoing).toFixed(2)),
        secondaryCurrency: account.currency,
        tone: resolveTone(account.currentBalance),
        href: `/${locale}/admin/finance/bank-cash/${account.id}`,
      };
    });

    return {
      title: copy.cashflow.title,
      description: appendFinanceReportDateRangeDescription(copy.cashflow.description, copy.incomeExpense.dateRangeHint, range),
      metrics: [
        {
          label: copy.cashflow.expectedNetLabel,
          value: netExpected,
          currency: collections.summary.currency,
          tone: resolveTone(netExpected),
          hint: copy.cashflow.expectedNetHint,
        },
        {
          label: copy.cashflow.recordedNetLabel,
          value: netRecordedInPeriod,
          currency: periodTransactions.summary.currency,
          tone: resolveTone(netRecordedInPeriod),
          hint: `${copy.cashflow.periodRecordedNetHint}: ${dateRangeLabel}`,
        },
        {
          label: copy.cashflow.actualBalanceLabel,
          value: actualCashBalance,
          currency: financialAccounts.summary.currency,
          tone: resolveTone(actualCashBalance),
          hint: `${financialAccounts.summary.activeAccountCount} ${copy.cashflow.actualBalanceHintSuffix}`,
        },
        {
          label: copy.cashflow.coverageGapLabel,
          value: cashCoverageGap,
          currency: financialAccounts.summary.currency,
          tone: resolveTone(cashCoverageGap),
          hint: copy.cashflow.coverageGapHint,
        },
      ],
      rows: [
        {
          id: "collections-expected",
          label: copy.cashflow.expectedCollectionLabel,
          supportingText: copy.cashflow.expectedCollectionSupporting,
          primaryValue: collections.summary.totalPendingAmount,
          primaryCurrency: collections.summary.currency,
          href: `/${locale}/admin/finance/collections`,
          tone: "success",
        },
        {
          id: "payments-expected",
          label: copy.cashflow.expectedPaymentLabel,
          supportingText: (() => {
            const topSummaries = payments.items
              .map((item) => item.topVariantSummary)
              .filter((value): value is string => Boolean(value))
              .slice(0, 2)
              .join(copy.variantJoiner);
            return topSummaries
              ? `${copy.cashflow.expectedPaymentSupportingWithVariantsPrefix}${topSummaries}`
              : copy.cashflow.expectedPaymentSupportingBase;
          })(),
          primaryValue: payments.summary.totalPendingAmount,
          primaryCurrency: payments.summary.currency,
          href: `/${locale}/admin/finance/payments`,
          tone: "warning",
        },
        {
          id: "collections-recorded",
          label: copy.cashflow.recordedCollectionLabel,
          supportingText: `${collections.summary.recordedCount} ${copy.cashflow.recordedCollectionHintSuffix}`,
          primaryValue: collections.summary.totalRecordedAmount,
          primaryCurrency: collections.summary.currency,
          href: `/${locale}/admin/finance/collections`,
          tone: "success",
        },
        {
          id: "payments-recorded",
          label: copy.cashflow.recordedPaymentLabel,
          supportingText: `${payments.summary.recordedCount} ${copy.cashflow.recordedPaymentHintSuffix}`,
          primaryValue: payments.summary.totalRecordedAmount,
          primaryCurrency: payments.summary.currency,
          href: `/${locale}/admin/finance/payments`,
          tone: "warning",
        },
        ...accountRows,
      ],
      table: {
        title: copy.cashflow.tableTitle,
        description: copy.cashflow.tableDescription,
        columns: [
          { key: "supplier", label: copy.columns.supplier },
          { key: "document", label: copy.columns.document },
          { key: "issueDate", label: copy.columns.issueDate },
          { key: "product", label: copy.columns.product },
          { key: "variant", label: copy.columns.variant },
          { key: "sku", label: copy.columns.sku },
          { key: "quantity", label: copy.columns.quantity, align: "right" },
          { key: "unitPrice", label: copy.columns.unitCost, align: "right" },
          { key: "lineTotal", label: copy.cashflow.paymentAmountColumn, align: "right" },
        ],
        rows: payableDetails
          .flatMap((supplier) => supplier.documents.map((document) => ({ supplier, document })))
          .filter(({ document }) => isInstantInFinanceReportRange(document.issueDate, range))
          .flatMap(({ supplier, document }) => document.lines.map((line) => ({
            id: line.id,
            href: `/${locale}/admin/finance/payments/${encodeURIComponent(supplier.supplierKey)}`,
            cells: {
              supplier: supplier.supplierName,
              document: document.documentNumber,
              issueDate: formatDate(document.issueDate, copy.notSpecified),
              product: line.productName,
              variant: line.productVariantTitle ?? "-",
              sku: line.productVariantSku ?? line.productSku,
              quantity: line.quantity.toLocaleString("tr-TR"),
              unitPrice: formatMoney(line.unitPrice, line.currency, copy.notSpecified),
              lineTotal: formatMoney(line.lineTotal, line.currency, copy.notSpecified),
            },
          })))
          .sort((left, right) => right.cells.lineTotal.localeCompare(left.cells.lineTotal)),
      },
    };
  }

  async getBankCashMovementReport(
    locale: string,
    query: AdminFinanceReportDateRangeQuery = {},
  ): Promise<AdminFinanceReportDetail> {
    const copy = resolveFinanceReportsCopy(locale);
    const { range, transactions } = await loadReportPeriodTransactions(query);
    const financialAccounts = await financialAccountsService.listAccounts();
    const dateRangeLabel = formatFinanceReportDateRangeLabel(range.fromIso, range.toIso);

    const resolveDirectionLabel = (direction: "IN" | "OUT" | "TRANSFER") => {
      if (direction === "IN") {
        return copy.bankCash.directionIncoming;
      }

      if (direction === "OUT") {
        return copy.bankCash.directionOutgoing;
      }

      return copy.bankCash.directionTransfer;
    };

    const resolveCategoryLabel = (category: string | null) => {
      if (!category || category === "UNSPECIFIED") {
        return copy.incomeExpense.categoryUnspecified;
      }

      return resolveCashTransactionCategoryLabel(
        category as "GENERAL_INCOME" | "GENERAL_EXPENSE" | "MARKETPLACE_COMMISSION" | "SHIPPING_EXPENSE" | "SERVICE_FEE" | "REFUND" | "TRANSFER",
        copy.incomeExpense,
      );
    };

    const accountRows: AdminFinanceReportDetailRow[] = financialAccounts.items
      .map((account) => {
        const accountTransactions = transactions.items.filter((item) => item.accountId === account.id);
        const incoming = accountTransactions
          .filter((item) => item.direction === "IN" || item.direction === "TRANSFER")
          .reduce((sum, item) => sum + item.amount, 0);
        const outgoing = accountTransactions
          .filter((item) => item.direction === "OUT")
          .reduce((sum, item) => sum + item.amount, 0);

        return {
          id: account.id,
          label: account.name,
          supportingText: `${accountTransactions.length} ${copy.bankCash.movementCountHintSuffix}`,
          primaryValue: Number((incoming - outgoing).toFixed(2)),
          primaryCurrency: account.currency,
          secondaryValue: account.currentBalance,
          secondaryCurrency: account.currency,
          tone: resolveTone(incoming - outgoing),
          href: `/${locale}/admin/finance/bank-cash/${account.id}`,
        };
      })
      .sort((left, right) => Math.abs(right.primaryValue) - Math.abs(left.primaryValue))
      .slice(0, 12);

    const money = (value: number, currency: string) =>
      new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);

    return {
      title: copy.bankCash.title,
      description: appendFinanceReportDateRangeDescription(copy.bankCash.description, copy.incomeExpense.dateRangeHint, range),
      metrics: [
        {
          label: copy.bankCash.totalIncomingLabel,
          value: transactions.summary.totalIncoming,
          currency: transactions.summary.currency,
          tone: "success",
          hint: dateRangeLabel,
        },
        {
          label: copy.bankCash.totalOutgoingLabel,
          value: transactions.summary.totalOutgoing,
          currency: transactions.summary.currency,
          tone: "warning",
          hint: dateRangeLabel,
        },
        {
          label: copy.bankCash.netLabel,
          value: transactions.summary.netAmount,
          currency: transactions.summary.currency,
          tone: resolveTone(transactions.summary.netAmount),
          hint: copy.bankCash.netHint,
        },
        {
          label: copy.bankCash.movementCountLabel,
          value: transactions.summary.transactionCount,
          tone: transactions.summary.transactionCount > 0 ? "neutral" : "warning",
          hint: dateRangeLabel,
        },
      ],
      rows: accountRows,
      table: {
        title: copy.bankCash.tableTitle,
        description: copy.bankCash.tableDescription,
        columns: [
          { key: "account", label: copy.bankCash.colAccount },
          { key: "date", label: copy.bankCash.colDate },
          { key: "title", label: copy.bankCash.colTitle },
          { key: "direction", label: copy.bankCash.colDirection },
          { key: "amount", label: copy.bankCash.colAmount, align: "right" },
          { key: "category", label: copy.bankCash.colCategory },
        ],
        rows: transactions.items.map((item) => ({
          id: item.id,
          href: `/${locale}/admin/finance/transactions/${item.id}`,
          cells: {
            account: item.accountName,
            date: formatDate(item.transactionAt, copy.notSpecified),
            title: item.title,
            direction: resolveDirectionLabel(item.direction),
            amount: money(item.amount, item.currency),
            category: resolveCategoryLabel(item.category),
          },
        })),
      },
    };
  }

  async getVatSummaryReport(
    locale: string,
    query: AdminFinanceReportDateRangeQuery = {},
  ): Promise<AdminFinanceReportDetail> {
    const copy = resolveFinanceReportsCopy(locale);
    const range = parseFinanceReportDateRangeQuery(query);
    const summary = await financeVatSummaryService.getSummary({
      from: range.fromIso,
      to: range.toIso,
      financialAccountId: query.financialAccountId,
    });
    const dateRangeLabel = formatFinanceReportDateRangeLabel(range.fromIso, range.toIso);

    const money = (value: number, currency: string) =>
      new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);

    const resolveDocumentTypeLabel = (documentType: "E_INVOICE" | "PURCHASE_DOCUMENT") =>
      documentType === "E_INVOICE" ? copy.vatSummary.documentTypeSales : copy.vatSummary.documentTypePurchase;

    const resolveDirectionLabel = (direction: "OUTPUT" | "INPUT") =>
      direction === "OUTPUT" ? copy.vatSummary.directionOutput : copy.vatSummary.directionInput;

    const resolveVatRateLabel = (vatRate: number | null) =>
      vatRate === null ? copy.vatSummary.rateUnspecified : `%${vatRate.toLocaleString("tr-TR")}`;

    return {
      title: copy.vatSummary.title,
      description: appendFinanceReportDateRangeDescription(copy.vatSummary.description, copy.incomeExpense.dateRangeHint, range),
      metrics: [
        {
          label: copy.vatSummary.outputTaxLabel,
          value: summary.outputTaxAmount,
          currency: "TRY",
          tone: summary.outputTaxAmount > 0 ? "success" : "neutral",
          hint: dateRangeLabel,
        },
        {
          label: copy.vatSummary.inputTaxLabel,
          value: summary.inputTaxAmount,
          currency: "TRY",
          tone: summary.inputTaxAmount > 0 ? "warning" : "neutral",
          hint: dateRangeLabel,
        },
        {
          label: copy.vatSummary.netTaxLabel,
          value: summary.netTaxAmount,
          currency: "TRY",
          tone: resolveTone(summary.netTaxAmount),
          hint: copy.vatSummary.netTaxHint,
        },
        {
          label: copy.vatSummary.documentCountLabel,
          value: summary.documentCount,
          tone: summary.documentCount > 0 ? "neutral" : "warning",
          hint: `${summary.documentCount} ${copy.vatSummary.documentCountHintSuffix}`,
        },
      ],
      rows: summary.rateBuckets.slice(0, 8).map((bucket) => ({
        id: bucket.vatRateLabel,
        label: resolveVatRateLabel(bucket.vatRate),
        supportingText: `${bucket.documentCount} ${copy.vatSummary.rateBucketRowSuffix}`,
        primaryValue: bucket.netTaxAmount,
        primaryCurrency: "TRY",
        secondaryValue: bucket.outputTaxAmount,
        secondaryCurrency: "TRY",
        tone: resolveTone(bucket.netTaxAmount),
        href: `/${locale}/admin/documents`,
      })),
      table: {
        title: copy.vatSummary.tableTitle,
        description: copy.vatSummary.tableDescription,
        columns: [
          { key: "document", label: copy.vatSummary.colDocument },
          { key: "documentType", label: copy.vatSummary.colDocumentType },
          { key: "counterparty", label: copy.vatSummary.colCounterparty },
          { key: "issueDate", label: copy.vatSummary.colIssueDate },
          { key: "direction", label: copy.vatSummary.colDirection },
          { key: "vatRate", label: copy.vatSummary.colVatRate },
          { key: "taxBase", label: copy.vatSummary.colTaxBase, align: "right" },
          { key: "taxAmount", label: copy.vatSummary.colTaxAmount, align: "right" },
          { key: "total", label: copy.vatSummary.colTotal, align: "right" },
        ],
        rows: summary.items.map((item) => ({
          id: item.documentId,
          href: `/${locale}/admin/documents`,
          cells: {
            document: item.documentNumber,
            documentType: resolveDocumentTypeLabel(item.documentType),
            counterparty: item.counterpartyName,
            issueDate: formatDate(item.issueDate, copy.notSpecified),
            direction: resolveDirectionLabel(item.direction),
            vatRate: resolveVatRateLabel(item.vatRate),
            taxBase: money(item.taxExclusiveAmount, item.currency),
            taxAmount: money(item.taxAmount, item.currency),
            total: money(item.taxInclusiveAmount, item.currency),
          },
        })),
      },
    };
  }

  async getTrialBalanceReport(
    locale: string,
    query: AdminFinanceReportDateRangeQuery = {},
  ): Promise<AdminFinanceReportDetail> {
    const copy = resolveFinanceReportsCopy(locale);
    const range = parseFinanceReportDateRangeQuery(query);
    const summary = await financeTrialBalanceService.getSummary({
      fromDate: range.fromDate,
      toDate: range.toDate,
    });
    const dateRangeLabel = formatFinanceReportDateRangeLabel(range.fromIso, range.toIso);

    const money = (value: number, currency: string) =>
      new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);

    return {
      title: copy.trialBalance.title,
      description: appendFinanceReportDateRangeDescription(copy.trialBalance.description, copy.incomeExpense.dateRangeHint, range),
      metrics: [
        {
          label: copy.trialBalance.totalDebitLabel,
          value: summary.totalDebit,
          currency: summary.currency,
          tone: summary.totalDebit > 0 ? "neutral" : "warning",
          hint: dateRangeLabel,
        },
        {
          label: copy.trialBalance.totalCreditLabel,
          value: summary.totalCredit,
          currency: summary.currency,
          tone: summary.totalCredit > 0 ? "neutral" : "warning",
          hint: dateRangeLabel,
        },
        {
          label: copy.trialBalance.balanceCheckLabel,
          value: summary.isBalanced ? 0 : Math.abs(summary.totalDebit - summary.totalCredit),
          currency: summary.currency,
          tone: summary.isBalanced ? "success" : "warning",
          hint: summary.isBalanced ? copy.trialBalance.balanceOkHint : copy.trialBalance.balanceGapHint,
        },
        {
          label: copy.trialBalance.accountCountLabel,
          value: summary.rows.length,
          tone: summary.rows.length > 0 ? "neutral" : "warning",
          hint: copy.trialBalance.accountCountHint,
        },
      ],
      rows: summary.rows.slice(0, 12).map((row) => ({
        id: row.ledgerAccountCode,
        label: `${row.ledgerAccountCode} · ${row.ledgerAccountName}`,
        supportingText: row.category,
        primaryValue: row.debitTotal,
        primaryCurrency: summary.currency,
        secondaryValue: row.creditTotal,
        secondaryCurrency: summary.currency,
        tone: resolveTone(row.balance),
        href: `/${locale}/admin/finance/ledger-entries`,
      })),
      table: {
        title: copy.trialBalance.tableTitle,
        description: copy.trialBalance.tableDescription,
        columns: [
          { key: "accountCode", label: copy.trialBalance.colAccountCode },
          { key: "accountName", label: copy.trialBalance.colAccountName },
          { key: "category", label: copy.trialBalance.colCategory },
          { key: "debit", label: copy.trialBalance.colDebit, align: "right" },
          { key: "credit", label: copy.trialBalance.colCredit, align: "right" },
          { key: "balance", label: copy.trialBalance.colBalance, align: "right" },
        ],
        rows: summary.rows.map((row) => ({
          id: row.ledgerAccountCode,
          href: `/${locale}/admin/finance/ledger-entries`,
          cells: {
            accountCode: row.ledgerAccountCode,
            accountName: row.ledgerAccountName,
            category: row.category,
            debit: money(row.debitTotal, summary.currency),
            credit: money(row.creditTotal, summary.currency),
            balance: money(row.balance, summary.currency),
          },
        })),
      },
    };
  }

  async getStockValueReport(locale: string): Promise<AdminFinanceReportDetail> {
    const copy = resolveFinanceReportsCopy(locale);
    const agingBuckets = copy.agingBuckets;
    const products = await catalogAdminService.listProducts({
      page: 1,
      pageSize: 50,
    });

    const totalStockValue = products.items.reduce((sum, item) => sum + item.stockValue, 0);
    const totalStockUnits = products.items.reduce((sum, item) => sum + item.stock, 0);
    const inStockCount = products.items.filter((item) => item.stock > 0).length;

    return {
      title: copy.stockValue.title,
      description: copy.stockValue.description,
      metrics: [
        {
          label: copy.stockValue.totalValueLabel,
          value: totalStockValue,
          currency: "TRY",
          tone: "neutral",
          hint: `${products.items.length} ${copy.stockValue.totalValueHintSuffix}`,
        },
        {
          label: copy.stockValue.totalUnitsLabel,
          value: totalStockUnits,
          tone: "neutral",
          hint: copy.stockValue.totalUnitsHint,
        },
        {
          label: copy.stockValue.inStockCountLabel,
          value: inStockCount,
          tone: "success",
          hint: copy.stockValue.inStockCountHint,
        },
      ],
      rows: products.items
        .sort((left, right) => right.stockValue - left.stockValue)
        .slice(0, 12)
        .map((item) => ({
          id: item.id,
          label: item.name,
          supportingText: `${item.sku} · ${resolveBucketLabel(diffInDays(item.lastOrderedAt ?? new Date().toISOString()), agingBuckets)} ${copy.stockValue.rowMovementInBucketSuffix}`,
          primaryValue: item.stockValue,
          primaryCurrency: item.currency,
          secondaryValue: item.stock,
          tone: item.stockValue > 0 ? "neutral" : "warning",
          href: `/${locale}/admin/products`,
        })),
      table: {
        title: copy.stockValue.tableTitle,
        description: copy.stockValue.tableDescription,
        columns: [
          { key: "name", label: copy.columns.name },
          { key: "sku", label: copy.columns.sku },
          { key: "supplier", label: copy.columns.supplier },
          { key: "stock", label: copy.columns.stock, align: "right" },
          { key: "purchasePrice", label: copy.stockValue.colPurchasePrice, align: "right" },
          { key: "averageUnitCost", label: copy.stockValue.colAverageCost, align: "right" },
          { key: "stockValue", label: copy.stockValue.colStockValue, align: "right" },
          { key: "lastOrderedAt", label: copy.stockValue.colLastOrder },
        ],
        rows: products.items
          .sort((left, right) => right.stockValue - left.stockValue)
          .map((item) => ({
            id: item.id,
            href: `/${locale}/admin/products`,
            cells: {
              name: item.name,
              sku: item.sku,
              supplier: item.primarySupplierName ?? copy.notSpecified,
              stock: item.stock.toLocaleString("tr-TR"),
              purchasePrice: item.purchasePrice === null
                ? copy.notSpecified
                : new Intl.NumberFormat("tr-TR", { style: "currency", currency: item.currency, maximumFractionDigits: 2 }).format(item.purchasePrice),
              averageUnitCost: item.averageUnitCost === null
                ? copy.notSpecified
                : new Intl.NumberFormat("tr-TR", { style: "currency", currency: item.currency, maximumFractionDigits: 2 }).format(item.averageUnitCost),
              stockValue: new Intl.NumberFormat("tr-TR", { style: "currency", currency: item.currency, maximumFractionDigits: 2 }).format(item.stockValue),
              lastOrderedAt: item.lastOrderedAt
                ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(item.lastOrderedAt))
                : copy.notSpecified,
            },
          })),
      },
    };
  }
}

export const reportsService = new ReportsService();
