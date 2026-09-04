"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminGeneralLedgerReport } from "@/modules/finance/contracts/finance-general-ledger.contract";
import type { FinanceLedgerEntriesCopy } from "@/modules/finance/services/finance-ledger-entries-copy.resolver";
import { formatSourceType } from "@/ui/admin/finance-ledger-entries-manager";

export type FinanceGeneralLedgerCopy = {
  title: string;
  description: string;
  periodLabel: string;
  filterApply: string;
  expandAll: string;
  collapseAll: string;
  colDate: string;
  colSource: string;
  colTitle: string;
  colDebit: string;
  colCredit: string;
  openingBalance: string;
  totalLabel: string;
  closingBalance: string;
  emptyList: string;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

export function FinanceGeneralLedgerManager({
  locale,
  report,
  initialFrom,
  initialTo,
  copy,
  sourceLabels,
}: {
  locale: string;
  report: AdminGeneralLedgerReport;
  initialFrom: string;
  initialTo: string;
  copy: FinanceGeneralLedgerCopy;
  sourceLabels: FinanceLedgerEntriesCopy;
}) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  function toggleAccount(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAll() {
    setCollapsedIds(new Set());
  }

  function collapseAll() {
    setCollapsedIds(new Set(report.accounts.map((account) => account.ledgerAccountId)));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.title}</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">{copy.description}</p>
        </div>
      </section>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border p-4" action={`/${locale}/admin/finance/general-ledger`} method="get">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="from">
            {copy.periodLabel}
          </label>
          <div className="flex items-center gap-2">
            <Input id="from" name="from" type="date" defaultValue={initialFrom} />
            <span className="text-sm text-muted-foreground">–</span>
            <Input id="to" name="to" type="date" defaultValue={initialTo} />
          </div>
        </div>
        <Button type="submit">{copy.filterApply}</Button>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={expandAll}>{copy.expandAll}</Button>
          <Button type="button" variant="outline" onClick={collapseAll}>{copy.collapseAll}</Button>
        </div>
      </form>

      {report.accounts.length === 0 ? (
        <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-10 text-center shadow-sm">
          <p className="text-sm text-[color:var(--color-text-muted)]">{copy.emptyList}</p>
        </section>
      ) : (
        <div className="space-y-4">
          {report.accounts.map((account) => {
            const collapsed = collapsedIds.has(account.ledgerAccountId);
            return (
              <section key={account.ledgerAccountId} className="overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleAccount(account.ledgerAccountId)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 bg-[color:var(--color-bg-soft)] px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-[color:var(--color-text)]">{account.code}</span>
                    <span className="font-medium text-[color:var(--color-text)]">{account.name}</span>
                    <Badge>{account.category}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[color:var(--color-text-muted)]">
                    <span>{copy.openingBalance}: {formatMoney(account.openingDebit, report.currency)} / {formatMoney(account.openingCredit, report.currency)}</span>
                    <span className="font-medium text-[color:var(--color-text)]">{copy.closingBalance}: {formatMoney(account.closingBalance, report.currency)}</span>
                  </div>
                </button>

                {!collapsed ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-[color:var(--color-text-muted)]">
                        <tr>
                          <th className="px-4 py-2">{copy.colDate}</th>
                          <th className="px-4 py-2">{copy.colSource}</th>
                          <th className="px-4 py-2">{copy.colTitle}</th>
                          <th className="px-4 py-2 text-right">{copy.colDebit}</th>
                          <th className="px-4 py-2 text-right">{copy.colCredit}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.lines.map((line) => (
                          <tr key={line.id} className="border-t border-[color:var(--color-border)]">
                            <td className="px-4 py-2">{formatDate(line.entryAt)}</td>
                            <td className="px-4 py-2">{formatSourceType(line.sourceType, sourceLabels)}</td>
                            <td className="px-4 py-2">{line.title}</td>
                            <td className="px-4 py-2 text-right">{line.debit > 0 ? formatMoney(line.debit, report.currency) : ""}</td>
                            <td className="px-4 py-2 text-right">{line.credit > 0 ? formatMoney(line.credit, report.currency) : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-[color:var(--color-border)] font-medium text-[color:var(--color-text)]">
                          <td className="px-4 py-2" colSpan={3}>{copy.totalLabel}</td>
                          <td className="px-4 py-2 text-right">{formatMoney(account.totalDebit, report.currency)}</td>
                          <td className="px-4 py-2 text-right">{formatMoney(account.totalCredit, report.currency)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
