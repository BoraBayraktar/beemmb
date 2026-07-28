export type AdminFinanceReportDateRangeQuery = {
  from?: string;
  to?: string;
  financialAccountId?: string;
};

export type AdminFinanceReportDateRange = {
  fromIso: string;
  toIso: string;
  fromDate: Date;
  toDate: Date;
};
