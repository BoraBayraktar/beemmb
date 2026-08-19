"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminPaymentsResult } from "@/modules/finance/contracts/payments.contract";

type AccountOption = {
  id: string;
  label: string;
};

type Labels = {
  title: string;
  description: string;
  totalPendingAmount: string;
  totalRecordedAmount: string;
  supplierCount: string;
  draftDocumentCount: string;
  financeStatus: string;
  financeStatusPending: string;
  financeStatusPartial: string;
  financeStatusCompleted: string;
  recordedCount: string;
  supplier: string;
  documentCount: string;
  lastIssueDate: string;
  amount: string;
  remainingAmount: string;
  recordedPaymentCount: string;
  openDetail: string;
  openSource: string;
  createRecord: string;
  creatingRecord: string;
  createRecordSuccess: string;
  createRecordFailed: string;
  account: string;
  accountRequired: string;
  action: string;
  noResults: string;
};

type Props = {
  result: AdminPaymentsResult;
  accountOptions: AccountOption[];
  labels: Labels;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function getFinanceStatus(item: AdminPaymentsResult["items"][number], labels: Labels) {
  if (item.remainingAmount <= 0) {
    return {
      label: labels.financeStatusCompleted,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (item.recordedPaymentCount > 0) {
    return {
      label: labels.financeStatusPartial,
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: labels.financeStatusPending,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

export function PaymentReadinessManager({ result, accountOptions, labels }: Props) {
  const router = useRouter();
  const [busySupplierKey, setBusySupplierKey] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function createPaymentRecord(supplierId: string, supplierKey: string, amount: number) {
    const financialAccountId = selectedAccountIds[supplierKey] ?? accountOptions[0]?.id ?? "";

    if (!financialAccountId) {
      setMessage(labels.accountRequired);
      return;
    }

    setBusySupplierKey(supplierKey);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/finance/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplierId,
            financialAccountId,
            amount,
            paidAt: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          throw new Error(payload?.message ?? labels.createRecordFailed);
        }

        setMessage(labels.createRecordSuccess);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : labels.createRecordFailed);
      } finally {
        setBusySupplierKey(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{labels.title}</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
        </div>
      </section>

      {message ? (
        <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-text)] shadow-sm">
          {message}
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{labels.totalPendingAmount}</p>
          <p className="mt-3 text-2xl font-semibold text-amber-950">{formatMoney(result.summary.totalPendingAmount, result.summary.currency)}</p>
        </article>
        <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{labels.totalRecordedAmount}</p>
          <p className="mt-3 text-2xl font-semibold text-blue-950">{formatMoney(result.summary.totalRecordedAmount, result.summary.currency)}</p>
        </article>
        <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.supplierCount}</p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{result.summary.supplierCount}</p>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.draftDocumentCount}</p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{result.summary.draftDocumentCount}</p>
        </article>
        <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.recordedCount}</p>
          <p className="mt-3 text-2xl font-semibold text-[color:var(--color-text)]">{result.summary.recordedCount}</p>
        </article>
      </section>

      <section className="overflow-visible rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <div className="hidden grid-cols-[150px_1.2fr_170px_170px_140px_150px_88px] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
          <span>{labels.financeStatus}</span>
          <span>{labels.supplier}</span>
          <span>{labels.amount}</span>
          <span>{labels.remainingAmount}</span>
          <span>{labels.documentCount}</span>
          <span>{labels.lastIssueDate}</span>
          <span className="text-right">{labels.action}</span>
        </div>

        {result.items.length === 0 ? (
          <p className="p-6 text-sm text-[color:var(--color-text-muted)]">
            {labels.noResults}
          </p>
        ) : result.items.map((item) => (
          <article key={item.supplierKey} className="grid gap-4 border-b border-[color:var(--color-border)] p-4 last:border-b-0 lg:grid-cols-[150px_1.2fr_170px_170px_140px_150px_88px] lg:items-center">
            {(() => {
              const financeStatus = getFinanceStatus(item, labels);

              return (
                <>
                  <div>
                    <Badge className={financeStatus.className}>
                      {financeStatus.label}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[color:var(--color-text)]">{item.supplierName}</p>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.recordedPaymentCount}: {item.recordedPaymentCount}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-[color:var(--color-text-muted)]">Varyant özeti: {item.topVariantSummary ?? "-"}</p>
                  </div>
                  <p className="text-sm font-medium text-[color:var(--color-text)]">{formatMoney(item.totalAmount, item.currency)}</p>
                  <p className="text-sm font-medium text-[color:var(--color-text)]">{formatMoney(item.remainingAmount, item.currency)}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{item.documentCount} / {labels.draftDocumentCount}: {item.draftCount}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{item.lastIssueDate ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(item.lastIssueDate)) : "-"}</p>
                  <div className="relative flex justify-start lg:justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={() => setOpenActionMenuId((current) => current === item.supplierKey ? null : item.supplierKey)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {openActionMenuId === item.supplierKey ? (
                      <div className="absolute bottom-11 right-0 z-10 grid min-w-64 gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2 shadow-xl">
                        <select
                          value={selectedAccountIds[item.supplierKey] ?? accountOptions[0]?.id ?? ""}
                          onChange={(event) => setSelectedAccountIds((current) => ({ ...current, [item.supplierKey]: event.target.value }))}
                          className="h-10 rounded-lg border border-[color:var(--color-border)] px-3 text-sm text-[color:var(--color-text)]"
                        >
                          {accountOptions.length === 0 ? <option value="">{labels.account}</option> : null}
                          {accountOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!item.supplierId || item.remainingAmount <= 0 || busySupplierKey === item.supplierKey || isPending}
                          onClick={() => {
                            createPaymentRecord(item.supplierId, item.supplierKey, item.remainingAmount);
                            setOpenActionMenuId(null);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busySupplierKey === item.supplierKey ? labels.creatingRecord : labels.createRecord}
                        </button>
                        <Link
                          href={item.detailHref}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                          onClick={() => setOpenActionMenuId(null)}
                        >
                          {labels.openDetail}
                        </Link>
                        <Link
                          href={item.sourceHref}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                          onClick={() => setOpenActionMenuId(null)}
                        >
                          {labels.openSource}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </>
              );
            })()}
          </article>
        ))}
      </section>
    </div>
  );
}
