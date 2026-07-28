"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { AdminBankReconciliationHubResult } from "@/modules/finance/contracts/bank-reconciliation.contract";
import type { BankReconciliationCopy } from "@/modules/finance/services/bank-reconciliation-copy.resolver";

type Props = {
  locale: string;
  hub: AdminBankReconciliationHubResult;
  copy: BankReconciliationCopy;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function BankReconciliationHubManager({ locale, hub, copy }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <Link
          href={`/${locale}/admin/finance/bank-cash`}
          className="text-sm font-medium text-neutral-500 no-underline hover:text-neutral-950"
        >
          {copy.hubBackToBankCash}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-950">{copy.hubTitle}</h1>
        <p className="mt-1 text-sm text-neutral-600">{copy.hubDescription}</p>
      </section>

      {hub.items.length === 0 ? (
        <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-center">
          <p className="text-sm font-medium text-neutral-950">{copy.hubEmpty}</p>
          <p className="mt-2 text-sm text-neutral-600">{copy.hubEmptyHint}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href={`/${locale}/admin/finance/bank-cash`}>{copy.hubBackToBankCash}</Link>
          </Button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.4fr_180px_180px] gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 lg:grid">
            <span>{copy.hubColAccount}</span>
            <span>{copy.hubColBalance}</span>
            <span>{copy.openReconciliation}</span>
          </div>
          {hub.items.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 border-b border-neutral-200 p-4 last:border-b-0 lg:grid-cols-[1.4fr_180px_180px] lg:items-center"
            >
              <div>
                <p className="font-medium text-neutral-950">{item.name}</p>
                <Link
                  href={`/${locale}/admin/finance/bank-cash/${item.id}`}
                  className="mt-1 inline-flex text-xs text-neutral-500 underline underline-offset-2"
                >
                  {copy.hubOpenAccount}
                </Link>
              </div>
              <p className="text-sm font-medium text-neutral-950">{formatMoney(item.currentBalance, item.currency)}</p>
              <Link
                href={item.reconciliationHref}
                className="text-sm font-medium text-neutral-950 underline underline-offset-4"
              >
                {copy.openReconciliation}
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
