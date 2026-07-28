"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminFinanceLedgerEntriesResult } from "@/modules/finance/contracts/finance-account-entry.contract";
import type { FinanceLedgerEntriesCopy } from "@/modules/finance/services/finance-ledger-entries-copy.resolver";

type Props = {
  locale: string;
  initialResult: AdminFinanceLedgerEntriesResult;
  initialFrom: string;
  initialTo: string;
  initialSearch: string;
  copy: FinanceLedgerEntriesCopy;
  canBackfill: boolean;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function FinanceLedgerEntriesManager({
  locale,
  initialResult,
  initialFrom,
  initialTo,
  initialSearch,
  copy,
  canBackfill,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pageHref = `/${locale}/admin/finance/ledger-entries`;

  async function runBackfill() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/finance/account-entries/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 300 }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Projeksiyon başarısız.");
      }

      setMessage(`Projeksiyon tamamlandı: ${payload.projected} satır, ${payload.skipped} atlandı.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Projeksiyon başarısız.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-950">{copy.title}</h1>
          <p className="text-sm text-neutral-600">{copy.description}</p>
        </div>
      </section>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border p-4" action={pageHref} method="get">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="from">
            {copy.periodLabel}
          </label>
          <Input id="from" name="from" type="date" defaultValue={initialFrom} />
        </div>
        <div className="space-y-1">
          <Input name="to" type="date" defaultValue={initialTo} aria-label={copy.periodLabel} />
        </div>
        <Input name="search" placeholder={copy.search} defaultValue={initialSearch} className="max-w-xs" />
        <Button type="submit">Filtrele</Button>
        {canBackfill ? (
          <Button type="button" variant="outline" disabled={pending} onClick={runBackfill}>
            {copy.backfillAction}
          </Button>
        ) : null}
      </form>

      {canBackfill ? <p className="text-xs text-muted-foreground">{copy.backfillHint}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">{copy.summaryEntryCount}</p>
          <p className="text-lg font-semibold">{initialResult.summary.entryCount}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">{copy.summaryTotalDebit}</p>
          <p className="text-lg font-semibold">{formatMoney(initialResult.summary.totalDebit, initialResult.summary.currency)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">{copy.summaryTotalCredit}</p>
          <p className="text-lg font-semibold">{formatMoney(initialResult.summary.totalCredit, initialResult.summary.currency)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">{copy.colDate}</th>
              <th className="px-3 py-2">{copy.colAccount}</th>
              <th className="px-3 py-2">{copy.colSide}</th>
              <th className="px-3 py-2">{copy.colAmount}</th>
              <th className="px-3 py-2">{copy.colSource}</th>
              <th className="px-3 py-2">{copy.colTitle}</th>
            </tr>
          </thead>
          <tbody>
            {initialResult.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                  {copy.emptyList}
                </td>
              </tr>
            ) : (
              initialResult.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{formatDate(item.entryAt)}</td>
                  <td className="px-3 py-2">
                    {item.ledgerAccountCode} · {item.ledgerAccountName}
                  </td>
                  <td className="px-3 py-2">{item.side === "DEBIT" ? copy.sideDebit : copy.sideCredit}</td>
                  <td className="px-3 py-2">{formatMoney(item.amount, item.currency)}</td>
                  <td className="px-3 py-2">
                    {item.sourceType} / {item.sourceId.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">{item.title}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
