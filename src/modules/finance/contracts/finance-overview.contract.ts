export type AdminFinanceOverviewMetric = {
  label: string;
  value: number;
  currency?: string;
  tone: "neutral" | "success" | "warning";
  href: string;
  hint: string;
};

export type AdminFinanceOverviewSection = {
  title: string;
  description: string;
  href: string;
  permissionKey?: string;
};

export type AdminFinanceOverview = {
  metrics: AdminFinanceOverviewMetric[];
  sections: AdminFinanceOverviewSection[];
};
