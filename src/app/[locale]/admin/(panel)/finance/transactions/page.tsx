import { notFound } from "next/navigation";

import { cashTransactionsService } from "@/modules/finance/services/cash-transactions.service";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { CashTransactionsManager } from "@/ui/admin/cash-transactions-manager";

export default async function AdminCashTransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; direction?: string; accountId?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const direction =
    resolvedSearchParams.direction === "IN" || resolvedSearchParams.direction === "OUT" || resolvedSearchParams.direction === "TRANSFER"
      ? resolvedSearchParams.direction
      : "all";
  const [result, accountOptions] = await Promise.all([
    cashTransactionsService.listTransactions({
      search: resolvedSearchParams.search,
      direction,
      accountId: resolvedSearchParams.accountId,
    }),
    financialAccountsService.listAccountOptions(),
  ]);

  return (
    <CashTransactionsManager
      locale={locale}
      result={result}
      accountOptions={accountOptions}
      initialSearch={resolvedSearchParams.search ?? ""}
      initialDirection={direction}
      initialAccountId={resolvedSearchParams.accountId ?? ""}
      labels={{
        title: dictionary.admin.financeCashTransactionsTitle,
        description: dictionary.admin.financeCashTransactionsDescription,
        search: dictionary.admin.financeCashTransactionsSearch,
        allDirections: dictionary.admin.financeCashTransactionsAllDirections,
        incoming: dictionary.admin.financeCashTransactionsIncoming,
        outgoing: dictionary.admin.financeCashTransactionsOutgoing,
        transfer: dictionary.admin.financeCashTransactionsTransfer,
        refund: dictionary.admin.financeCashTransactionsRefund,
        totalIncoming: dictionary.admin.financeCashTransactionsTotalIncoming,
        totalOutgoing: dictionary.admin.financeCashTransactionsTotalOutgoing,
        netAmount: dictionary.admin.financeCashTransactionsNetAmount,
        transactionCount: dictionary.admin.financeCashTransactionsCount,
        account: dictionary.admin.financeCashTransactionsAccount,
        targetAccount: dictionary.admin.financeCashTransactionsTargetAccount,
        amount: dictionary.admin.financeCashTransactionsAmount,
        transactionDate: dictionary.admin.financeCashTransactionsDate,
        titleField: dictionary.admin.financeCashTransactionsTitleField,
        sourceType: dictionary.admin.financeCashTransactionsSourceType,
        category: dictionary.admin.financeCashTransactionsCategory,
        note: dictionary.admin.financeCashTransactionsNote,
        counterparty: dictionary.admin.financeCashTransactionsCounterparty,
        counterpartyKind: dictionary.admin.financeCashTransactionsCounterpartyKind,
        counterpartyCustomer: dictionary.admin.financeCashTransactionsCounterpartyCustomer,
        counterpartySupplier: dictionary.admin.financeCashTransactionsCounterpartySupplier,
        counterpartyUnregistered: dictionary.admin.financeCashTransactionsCounterpartyUnregistered,
        counterpartySearch: dictionary.admin.financeCashTransactionsCounterpartySearch,
        counterpartySelected: dictionary.admin.financeCashTransactionsCounterpartySelected,
        openLedger: dictionary.admin.financeCashTransactionsOpenLedger,
        createTitle: dictionary.admin.financeCashTransactionsCreateTitle,
        createAction: dictionary.admin.financeCashTransactionsCreateAction,
        creatingAction: dictionary.admin.financeCashTransactionsCreatingAction,
        createSuccess: dictionary.admin.financeCashTransactionsCreateSuccess,
        createFailed: dictionary.admin.financeCashTransactionsCreateFailed,
        empty: dictionary.admin.financeCashTransactionsEmpty,
        cancel: dictionary.admin.cancel,
      }}
    />
  );
}
