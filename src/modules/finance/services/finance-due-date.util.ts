import {
  FINANCE_DEFAULT_PAYMENT_TERM_DAYS,
  FINANCE_DUE_WITHIN_DAYS_THRESHOLD,
  type AdminFinanceDueDocumentFields,
  type AdminFinanceDueKpi,
} from "@/modules/finance/contracts/finance-due.contract";

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function resolveEffectivePaymentTermDays(stored: number | null | undefined): number {
  if (stored != null && Number.isFinite(stored) && stored >= 0) {
    return stored;
  }

  return FINANCE_DEFAULT_PAYMENT_TERM_DAYS;
}

export function resolveDocumentEffectiveDueDate(
  issueDateIso: string,
  dueDateIso: string | null | undefined,
  paymentTermDays?: number | null,
): string {
  if (dueDateIso) {
    return dueDateIso;
  }

  const term = resolveEffectivePaymentTermDays(paymentTermDays);
  const issue = new Date(issueDateIso);
  const due = new Date(startOfUtcDay(issue));
  due.setUTCDate(due.getUTCDate() + term);
  return due.toISOString();
}

export function resolveReceivableEffectiveDueDate(args: {
  orderCreatedAtIso: string;
  latestDocumentIssueDateIso?: string | null;
  latestDocumentDueDateIso?: string | null;
  customerDefaultPaymentTermDays?: number | null;
}): string {
  const paymentTermDays = args.customerDefaultPaymentTermDays ?? null;

  if (args.latestDocumentIssueDateIso) {
    return resolveDocumentEffectiveDueDate(
      args.latestDocumentIssueDateIso,
      args.latestDocumentDueDateIso ?? null,
      paymentTermDays,
    );
  }

  return resolveDocumentEffectiveDueDate(args.orderCreatedAtIso, null, paymentTermDays);
}

export function computeDaysUntilDue(effectiveDueDateIso: string, referenceDate = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = startOfUtcDay(new Date(effectiveDueDateIso)) - startOfUtcDay(referenceDate);
  return Math.round(diff / msPerDay);
}

export function computeDaysPastDue(effectiveDueDateIso: string, referenceDate = new Date()): number {
  return Math.max(0, -computeDaysUntilDue(effectiveDueDateIso, referenceDate));
}

export function buildDocumentDueFields(
  issueDateIso: string,
  dueDateIso: string | null | undefined,
  referenceDate = new Date(),
  paymentTermDays?: number | null,
): AdminFinanceDueDocumentFields {
  const effectiveDueDate = resolveDocumentEffectiveDueDate(issueDateIso, dueDateIso, paymentTermDays);
  const daysUntilDue = computeDaysUntilDue(effectiveDueDate, referenceDate);

  return {
    dueDate: dueDateIso ?? null,
    effectiveDueDate,
    daysUntilDue,
    isOverdue: daysUntilDue < 0,
  };
}

export function buildFinanceDueKpi(
  entries: Array<{ amount: number; effectiveDueDate: string; currency: string }>,
  threshold = FINANCE_DUE_WITHIN_DAYS_THRESHOLD,
  referenceDate = new Date(),
): AdminFinanceDueKpi {
  let overdueAmount = 0;
  let dueWithinDaysAmount = 0;
  let nearestDueDate: string | null = null;
  let nearestMs = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    const daysUntilDue = computeDaysUntilDue(entry.effectiveDueDate, referenceDate);

    if (daysUntilDue < 0) {
      overdueAmount += entry.amount;
    } else if (daysUntilDue <= threshold) {
      dueWithinDaysAmount += entry.amount;
    }

    const dueMs = new Date(entry.effectiveDueDate).getTime();
    if (dueMs < nearestMs) {
      nearestMs = dueMs;
      nearestDueDate = entry.effectiveDueDate;
    }
  }

  return {
    overdueAmount: Number(overdueAmount.toFixed(2)),
    dueWithinDaysAmount: Number(dueWithinDaysAmount.toFixed(2)),
    nearestDueDate,
    currency: entries[0]?.currency ?? "TRY",
    dueWithinDaysThreshold: threshold,
  };
}

export { FINANCE_DEFAULT_PAYMENT_TERM_DAYS, FINANCE_DUE_WITHIN_DAYS_THRESHOLD };
