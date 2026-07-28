import type { FinanceReportsCopy } from "@/modules/finance/contracts/finance-reports-copy.contract";

type CashTransactionCategoryKey =
  | "GENERAL_INCOME"
  | "GENERAL_EXPENSE"
  | "MARKETPLACE_COMMISSION"
  | "SHIPPING_EXPENSE"
  | "SERVICE_FEE"
  | "REFUND"
  | "TRANSFER"
  | null
  | undefined;

export function resolveCashTransactionCategoryLabel(
  category: CashTransactionCategoryKey,
  copy: FinanceReportsCopy["incomeExpense"],
) {
  switch (category) {
    case "GENERAL_INCOME":
      return copy.categoryGeneralIncome;
    case "GENERAL_EXPENSE":
      return copy.categoryGeneralExpense;
    case "MARKETPLACE_COMMISSION":
      return copy.categoryMarketplaceCommission;
    case "SHIPPING_EXPENSE":
      return copy.categoryShippingExpense;
    case "SERVICE_FEE":
      return copy.categoryServiceFee;
    case "REFUND":
      return copy.categoryRefund;
    case "TRANSFER":
      return copy.categoryTransfer;
    default:
      return copy.categoryUnspecified;
  }
}

export const INCOME_EXPENSE_CATEGORY_ORDER = [
  "GENERAL_INCOME",
  "GENERAL_EXPENSE",
  "MARKETPLACE_COMMISSION",
  "SHIPPING_EXPENSE",
  "SERVICE_FEE",
  "REFUND",
  "TRANSFER",
  "UNSPECIFIED",
] as const;

export function normalizeIncomeExpenseCategoryKey(category: CashTransactionCategoryKey) {
  return category ?? "UNSPECIFIED";
}
