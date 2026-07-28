export type NegotiableInstrumentType = "CHECK" | "PROMISSORY_NOTE";
export type NegotiableInstrumentDirection = "RECEIVABLE" | "PAYABLE";
export type NegotiableInstrumentStatus = "PORTFOLIO" | "COLLECTED" | "PAID" | "BOUNCED" | "CANCELLED";
export type NegotiableInstrumentLifecycleAction = "collect" | "pay" | "bounce" | "cancel";

export type AdminNegotiableInstrumentListItem = {
  id: string;
  instrumentNumber: string;
  instrumentType: NegotiableInstrumentType;
  direction: NegotiableInstrumentDirection;
  status: NegotiableInstrumentStatus;
  amount: number;
  currency: string;
  dueDate: string;
  issueDate: string | null;
  counterpartyName: string | null;
  customerAccountSlug: string | null;
  supplierSlug: string | null;
  isOverdue: boolean;
  daysUntilDue: number;
  detailHref: string;
};

export type AdminNegotiableInstrumentDetail = AdminNegotiableInstrumentListItem & {
  endorserName: string | null;
  note: string | null;
  financialAccountId: string | null;
  financialAccountName: string | null;
  cashTransactionId: string | null;
  cashTransactionHref: string | null;
  allowedActions: NegotiableInstrumentLifecycleAction[];
};

export type AdminNegotiableInstrumentsSummary = {
  portfolioCount: number;
  overdueCount: number;
  receivablePortfolioAmount: number;
  payablePortfolioAmount: number;
  currency: string;
};

export type AdminNegotiableInstrumentsQuery = {
  search?: string;
  direction?: "all" | NegotiableInstrumentDirection;
  status?: "all" | NegotiableInstrumentStatus;
  overdueOnly?: boolean;
};

export type AdminNegotiableInstrumentsResult = {
  items: AdminNegotiableInstrumentListItem[];
  summary: AdminNegotiableInstrumentsSummary;
};

export type AdminCreateNegotiableInstrumentInput = {
  instrumentNumber: string;
  instrumentType: NegotiableInstrumentType;
  direction: NegotiableInstrumentDirection;
  amount: number;
  currency?: string;
  dueDate: string;
  issueDate?: string | null;
  counterpartyKind?: "CUSTOMER" | "SUPPLIER" | "UNREGISTERED";
  customerAccountId?: string | null;
  supplierId?: string | null;
  counterpartyName?: string | null;
  endorserName?: string | null;
  note?: string | null;
};

export type AdminNegotiableInstrumentLifecycleInput = {
  instrumentId: string;
  action: NegotiableInstrumentLifecycleAction;
  financialAccountId?: string;
};
