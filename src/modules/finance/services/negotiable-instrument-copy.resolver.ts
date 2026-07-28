import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

function adminCopy(locale: string) {
  const resolvedLocale: Locale = isLocale(locale) ? locale : "tr";
  return getDictionary(resolvedLocale).admin as Record<string, string>;
}

export function resolveNegotiableInstrumentCopy(locale: string) {
  const admin = adminCopy(locale);

  return {
    title: admin.financeNegotiableInstrumentsTitle,
    description: admin.financeNegotiableInstrumentsDescription,
    createTitle: admin.financeNegotiableInstrumentsCreateTitle,
    createAction: admin.financeNegotiableInstrumentsCreateAction,
    search: admin.financeNegotiableInstrumentsSearch,
    filterDirectionAll: admin.financeNegotiableInstrumentsFilterDirectionAll,
    filterDirectionReceivable: admin.financeNegotiableInstrumentsFilterDirectionReceivable,
    filterDirectionPayable: admin.financeNegotiableInstrumentsFilterDirectionPayable,
    filterStatusAll: admin.financeNegotiableInstrumentsFilterStatusAll,
    filterStatusPortfolio: admin.financeNegotiableInstrumentsFilterStatusPortfolio,
    filterOverdueOnly: admin.financeNegotiableInstrumentsFilterOverdueOnly,
    summaryPortfolio: admin.financeNegotiableInstrumentsSummaryPortfolio,
    summaryOverdue: admin.financeNegotiableInstrumentsSummaryOverdue,
    summaryReceivable: admin.financeNegotiableInstrumentsSummaryReceivable,
    summaryPayable: admin.financeNegotiableInstrumentsSummaryPayable,
    colNumber: admin.financeNegotiableInstrumentsColNumber,
    colType: admin.financeNegotiableInstrumentsColType,
    colDirection: admin.financeNegotiableInstrumentsColDirection,
    colStatus: admin.financeNegotiableInstrumentsColStatus,
    colAmount: admin.financeNegotiableInstrumentsColAmount,
    colDueDate: admin.financeNegotiableInstrumentsColDueDate,
    colCounterparty: admin.financeNegotiableInstrumentsColCounterparty,
    typeCheck: admin.financeNegotiableInstrumentsTypeCheck,
    typePromissoryNote: admin.financeNegotiableInstrumentsTypePromissoryNote,
    directionReceivable: admin.financeNegotiableInstrumentsDirectionReceivable,
    directionPayable: admin.financeNegotiableInstrumentsDirectionPayable,
    statusPortfolio: admin.financeNegotiableInstrumentsStatusPortfolio,
    statusCollected: admin.financeNegotiableInstrumentsStatusCollected,
    statusPaid: admin.financeNegotiableInstrumentsStatusPaid,
    statusBounced: admin.financeNegotiableInstrumentsStatusBounced,
    statusCancelled: admin.financeNegotiableInstrumentsStatusCancelled,
    overdueBadge: admin.financeNegotiableInstrumentsOverdueBadge,
    dueInDays: admin.financeNegotiableInstrumentsDueInDays,
    fieldNumber: admin.financeNegotiableInstrumentsFieldNumber,
    fieldType: admin.financeNegotiableInstrumentsFieldType,
    fieldDirection: admin.financeNegotiableInstrumentsFieldDirection,
    fieldAmount: admin.financeNegotiableInstrumentsFieldAmount,
    fieldDueDate: admin.financeNegotiableInstrumentsFieldDueDate,
    fieldIssueDate: admin.financeNegotiableInstrumentsFieldIssueDate,
    fieldCounterpartyName: admin.financeNegotiableInstrumentsFieldCounterpartyName,
    fieldEndorser: admin.financeNegotiableInstrumentsFieldEndorser,
    fieldNote: admin.financeNegotiableInstrumentsFieldNote,
    detailTitle: admin.financeNegotiableInstrumentsDetailTitle,
    detailBack: admin.financeNegotiableInstrumentsDetailBack,
    lifecycleCollect: admin.financeNegotiableInstrumentsLifecycleCollect,
    lifecyclePay: admin.financeNegotiableInstrumentsLifecyclePay,
    lifecycleBounce: admin.financeNegotiableInstrumentsLifecycleBounce,
    lifecycleCancel: admin.financeNegotiableInstrumentsLifecycleCancel,
    financialAccount: admin.financeNegotiableInstrumentsFinancialAccount,
    openCashTransaction: admin.financeNegotiableInstrumentsOpenCashTransaction,
    emptyList: admin.financeNegotiableInstrumentsEmptyList,
  };
}

export type NegotiableInstrumentCopy = ReturnType<typeof resolveNegotiableInstrumentCopy>;

function statusLabel(status: string, copy: NegotiableInstrumentCopy) {
  if (status === "COLLECTED") return copy.statusCollected;
  if (status === "PAID") return copy.statusPaid;
  if (status === "BOUNCED") return copy.statusBounced;
  if (status === "CANCELLED") return copy.statusCancelled;
  return copy.statusPortfolio;
}

function typeLabel(type: string, copy: NegotiableInstrumentCopy) {
  return type === "PROMISSORY_NOTE" ? copy.typePromissoryNote : copy.typeCheck;
}

function directionLabel(direction: string, copy: NegotiableInstrumentCopy) {
  return direction === "PAYABLE" ? copy.directionPayable : copy.directionReceivable;
}

export function formatNegotiableInstrumentStatus(status: string, copy: NegotiableInstrumentCopy) {
  return statusLabel(status, copy);
}

export function formatNegotiableInstrumentType(type: string, copy: NegotiableInstrumentCopy) {
  return typeLabel(type, copy);
}

export function formatNegotiableInstrumentDirection(direction: string, copy: NegotiableInstrumentCopy) {
  return directionLabel(direction, copy);
}
