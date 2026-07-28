import type { AdminFinanceOverview } from "@/modules/finance/contracts/finance-overview.contract";
import { resolveFinanceOverviewCopy } from "@/modules/finance/services/finance-overview-copy.resolver";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { payablesService } from "@/modules/finance/services/payables.service";
import { receivablesService } from "@/modules/finance/services/receivables.service";

export class FinanceOverviewService {
  async getOverview(locale: string): Promise<AdminFinanceOverview> {
    const copy = resolveFinanceOverviewCopy(locale);
    const [payables, receivablesSummary, accountSummary] = await Promise.all([
      payablesService.listSupplierPayables().then((result) => result.items),
      receivablesService.getReceivablesSummary(),
      financialAccountsService.listAccounts(),
    ]);

    const totalPayables = payables.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalDraftPayables = payables.reduce((sum, item) => sum + item.draftCount, 0);
    const openOrderCount =
      receivablesSummary.pendingCount + receivablesSummary.authorizedCount + receivablesSummary.failedCount;

    return {
      metrics: [
        {
          label: copy.metricOpenReceivableLabel,
          value: receivablesSummary.totalOpenAmount,
          currency: receivablesSummary.currency,
          tone: "success",
          href: `/${locale}/admin/finance/receivables`,
          hint: `${openOrderCount} ${copy.metricOpenReceivableHintSuffix}`,
        },
        {
          label: copy.metricSupplierPayableLabel,
          value: totalPayables,
          currency: payables[0]?.currency ?? "TRY",
          tone: "warning",
          href: `/${locale}/admin/finance/payables`,
          hint: `${payables.length} ${copy.metricSupplierPayableHintSuffix}`,
        },
        {
          label: copy.metricPendingCollectionLabel,
          value: receivablesSummary.pendingCount,
          tone: "neutral",
          href: `/${locale}/admin/finance/receivables?paymentStatus=PENDING`,
          hint: copy.metricPendingCollectionHint,
        },
        {
          label: copy.metricDraftPayableDocLabel,
          value: totalDraftPayables,
          tone: "neutral",
          href: `/${locale}/admin/finance/payables`,
          hint: copy.metricDraftPayableDocHint,
        },
        {
          label: copy.metricBankBalanceLabel,
          value: accountSummary.summary.totalBalance,
          currency: accountSummary.summary.currency,
          tone: "success",
          href: `/${locale}/admin/finance/bank-cash`,
          hint: `${accountSummary.summary.activeAccountCount} ${copy.metricBankBalanceHintSuffix}`,
        },
      ],
      sections: [
        {
          title: copy.sectionReceivablesTitle,
          description: copy.sectionReceivablesDescription,
          href: `/${locale}/admin/finance/receivables`,
        },
        {
          title: copy.sectionPayablesTitle,
          description: copy.sectionPayablesDescription,
          href: `/${locale}/admin/finance/payables`,
        },
        {
          title: copy.sectionBankCashTitle,
          description: copy.sectionBankCashDescription,
          href: `/${locale}/admin/finance/bank-cash`,
        },
        {
          title: copy.sectionTransactionsTitle,
          description: copy.sectionTransactionsDescription,
          href: `/${locale}/admin/finance/transactions`,
        },
        {
          title: copy.sectionReportsTitle,
          description: copy.sectionReportsDescription,
          href: `/${locale}/admin/finance/reports`,
        },
        {
          title: copy.sectionTrialBalanceTitle,
          description: copy.sectionTrialBalanceDescription,
          href: `/${locale}/admin/finance/reports/trial-balance`,
        },
        {
          title: copy.sectionLedgerTitle,
          description: copy.sectionLedgerDescription,
          href: `/${locale}/admin/finance/ledger-entries`,
        },
        {
          title: copy.sectionInstrumentsTitle,
          description: copy.sectionInstrumentsDescription,
          href: `/${locale}/admin/finance/instruments`,
          permissionKey: "finance.manage",
        },
        {
          title: copy.sectionBankReconciliationTitle,
          description: copy.sectionBankReconciliationDescription,
          href: `/${locale}/admin/finance/bank-reconciliation`,
          permissionKey: "finance.manage",
        },
        {
          title: copy.sectionExportsTitle,
          description: copy.sectionExportsDescription,
          href: `/${locale}/admin/finance/exports`,
          permissionKey: "finance.audit.read",
        },
      ],
    };
  }
}

export const financeOverviewService = new FinanceOverviewService();
