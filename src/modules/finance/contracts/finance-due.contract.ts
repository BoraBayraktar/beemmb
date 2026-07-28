export const FINANCE_DEFAULT_PAYMENT_TERM_DAYS = 30;
export const FINANCE_DUE_WITHIN_DAYS_THRESHOLD = 7;

export type AdminFinanceDueKpi = {
  overdueAmount: number;
  dueWithinDaysAmount: number;
  nearestDueDate: string | null;
  currency: string;
  dueWithinDaysThreshold: number;
};

export type AdminFinanceDueDocumentFields = {
  dueDate: string | null;
  effectiveDueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
};
