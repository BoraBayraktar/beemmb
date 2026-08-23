export type AdminFinanceCounterpartyKind = "CUSTOMER" | "SUPPLIER" | "CARRIER";

export type AdminFinanceCounterpartyOption = {
  id: string;
  kind: AdminFinanceCounterpartyKind;
  slug: string;
  label: string;
  subtitle: string | null;
};

export type AdminFinanceCounterpartyLookupQuery = {
  search?: string;
  kind?: "all" | AdminFinanceCounterpartyKind;
  limit?: number;
};

export type AdminFinanceCounterpartyLookupResult = {
  items: AdminFinanceCounterpartyOption[];
};
