export type AdminFinanceLedgerAccountCategory = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export type AdminFinanceLedgerAccountItem = {
  id: string;
  code: string;
  name: string;
  category: AdminFinanceLedgerAccountCategory;
  isActive: boolean;
};
