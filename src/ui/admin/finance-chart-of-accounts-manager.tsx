"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AdminFinanceLedgerAccountCategory, AdminFinanceLedgerAccountItem } from "@/modules/finance/contracts/finance-ledger-account.contract";

export type FinanceChartOfAccountsCopy = {
  title: string;
  description: string;
  search: string;
  colCode: string;
  colName: string;
  colCategory: string;
  colStatus: string;
  statusActive: string;
  statusInactive: string;
  categoryAsset: string;
  categoryLiability: string;
  categoryEquity: string;
  categoryIncome: string;
  categoryExpense: string;
  emptyList: string;
};

function categoryLabel(category: AdminFinanceLedgerAccountCategory, copy: FinanceChartOfAccountsCopy) {
  switch (category) {
    case "ASSET":
      return copy.categoryAsset;
    case "LIABILITY":
      return copy.categoryLiability;
    case "EQUITY":
      return copy.categoryEquity;
    case "INCOME":
      return copy.categoryIncome;
    case "EXPENSE":
      return copy.categoryExpense;
    default:
      return category;
  }
}

function categoryBadgeClass(category: AdminFinanceLedgerAccountCategory) {
  if (category === "ASSET") return "border-sky-200 bg-sky-50 text-sky-700";
  if (category === "LIABILITY") return "border-amber-200 bg-amber-50 text-amber-700";
  if (category === "EQUITY") return "border-violet-200 bg-violet-50 text-violet-700";
  if (category === "INCOME") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function FinanceChartOfAccountsManager({
  items,
  copy,
}: {
  items: AdminFinanceLedgerAccountItem[];
  copy: FinanceChartOfAccountsCopy;
}) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (!query) {
      return items;
    }
    return items.filter(
      (item) => item.code.toLocaleLowerCase("tr-TR").includes(query) || item.name.toLocaleLowerCase("tr-TR").includes(query),
    );
  }, [items, search]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.title}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{copy.description}</p>
        <div className="mt-4 max-w-sm">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
        {filteredItems.length === 0 ? (
          <p className="p-10 text-center text-sm text-[color:var(--color-text-muted)]">{copy.emptyList}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[color:var(--color-bg-soft)] text-xs uppercase text-[color:var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">{copy.colCode}</th>
                  <th className="px-4 py-3">{copy.colName}</th>
                  <th className="px-4 py-3">{copy.colCategory}</th>
                  <th className="px-4 py-3">{copy.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-t border-[color:var(--color-border)]">
                    <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">{item.code}</td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">
                      <Badge className={categoryBadgeClass(item.category)}>{categoryLabel(item.category, copy)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={item.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-neutral-200 bg-neutral-100 text-neutral-500"}>
                        {item.isActive ? copy.statusActive : copy.statusInactive}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
