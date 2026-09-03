"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminCashTransactionDetail } from "@/modules/finance/contracts/cash-transactions.contract";
import { FinanceAllocationSummaryPanel } from "@/ui/admin/finance-allocation-summary";

type Labels = {
  back: string;
  title: string;
  account: string;
  amount: string;
  date: string;
  direction: string;
  sourceType: string;
  counterparty: string;
  note: string;
  openLedger: string;
  allocationTitle: string;
  allocationEmpty: string;
  allocationTarget: string;
  allocationAmount: string;
  allocationMismatch: string;
  notSpecified: string;
  incoming: string;
  outgoing: string;
  transfer: string;
  manual: string;
  collection: string;
  payment: string;
  order: string;
  document: string;
  expenseReport: string;
  refund: string;
  editAction: string;
  editTitle: string;
  editTitleField: string;
  editNote: string;
  editDate: string;
  editSave: string;
  editSaving: string;
  editCancel: string;
  editFailed: string;
  editUnavailable: string;
};

type Props = {
  locale: string;
  detail: AdminCashTransactionDetail;
  labels: Labels;
};

function formatSourceType(value: AdminCashTransactionDetail["sourceType"], labels: Labels) {
  switch (value) {
    case "COLLECTION":
      return labels.collection;
    case "PAYMENT":
      return labels.payment;
    case "ORDER":
      return labels.order;
    case "DOCUMENT":
      return labels.document;
    case "EXPENSE_REPORT":
      return labels.expenseReport;
    case "REFUND":
      return labels.refund;
    case "TRANSFER":
      return labels.transfer;
    default:
      return labels.manual;
  }
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function CashTransactionDetailManager({ locale, detail, labels }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: String(detail.amount),
    title: detail.title,
    note: detail.note ?? "",
    transactionAt: toDatetimeLocalValue(detail.transactionAt),
  });

  const canEdit = detail.status === "RECORDED" && detail.sourceType === "MANUAL" && detail.direction !== "TRANSFER";

  function openEdit() {
    setMessage(null);
    setForm({
      amount: String(detail.amount),
      title: detail.title,
      note: detail.note ?? "",
      transactionAt: toDatetimeLocalValue(detail.transactionAt),
    });
    setIsEditing(true);
  }

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch(`/api/admin/finance/transactions/${detail.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(form.amount || "0"),
            title: form.title,
            note: form.note.trim() || null,
            transactionAt: new Date(form.transactionAt).toISOString(),
          }),
        });

        const payload = await response.json().catch(() => null) as { item?: AdminCashTransactionDetail; message?: string } | null;

        if (!response.ok || !payload?.item) {
          throw new Error(payload?.message ?? labels.editFailed);
        }

        router.push(`/${locale}/admin/finance/transactions/${payload.item.id}`);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : labels.editFailed);
      }
    });
  }

  const ledgerHref = detail.customerAccountSlug
    ? `/${locale}/admin/finance/cari/${encodeURIComponent(detail.customerAccountSlug)}`
    : detail.supplierSlug
      ? `/${locale}/admin/finance/cari/${encodeURIComponent(detail.supplierSlug)}`
      : null;

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/${locale}/admin/finance/transactions`} className="text-sm font-medium text-[color:var(--color-text-muted)] no-underline hover:text-[color:var(--color-text)]">
            {labels.back}
          </Link>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{detail.title}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.title}</p>
        </div>
        {canEdit ? (
          <Button type="button" variant="secondary" onClick={openEdit} disabled={isPending}>
            {labels.editAction}
          </Button>
        ) : (
          <p className="max-w-xs text-right text-xs text-[color:var(--color-text-muted)]">{labels.editUnavailable}</p>
        )}
      </div>

      {message && !isEditing ? <p className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</p> : null}

      {isEditing ? (
        <form className="grid gap-4 border-b border-[color:var(--color-border)] p-5" onSubmit={submitEdit}>
          <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{labels.editTitle}</h3>
          {message ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</p> : null}
          <div className="grid gap-2">
            <Label>{labels.amount}</Label>
            <MoneyInput value={form.amount} onValueChange={(value) => setForm((current) => ({ ...current, amount: value }))} required />
          </div>
          <div className="grid gap-2">
            <Label>{labels.editTitleField}</Label>
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </div>
          <div className="grid gap-2">
            <Label>{labels.editDate}</Label>
            <Input type="datetime-local" value={form.transactionAt} onChange={(event) => setForm((current) => ({ ...current, transactionAt: event.target.value }))} required />
          </div>
          <div className="grid gap-2">
            <Label>{labels.editNote}</Label>
            <Textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} rows={3} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} disabled={isPending}>
              {labels.editCancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? labels.editSaving : labels.editSave}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 p-5">
        <div className="grid gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 md:grid-cols-2">
          <p className="text-sm text-[color:var(--color-text)]">{labels.account}: <span className="font-medium text-[color:var(--color-text)]">{detail.accountName}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">{labels.amount}: <span className="font-medium text-[color:var(--color-text)]">{formatMoney(detail.amount, detail.currency)}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">{labels.date}: <span className="font-medium text-[color:var(--color-text)]">{formatDate(detail.transactionAt)}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">{labels.direction}: <span className="font-medium text-[color:var(--color-text)]">{detail.direction === "IN" ? labels.incoming : detail.direction === "OUT" ? labels.outgoing : labels.transfer}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">{labels.sourceType}: <span className="font-medium text-[color:var(--color-text)]">{formatSourceType(detail.sourceType, labels)}</span></p>
          <p className="text-sm text-[color:var(--color-text)]">
            {labels.counterparty}:{" "}
            {ledgerHref ? (
              <Link href={ledgerHref} className="font-medium text-[color:var(--color-text)] no-underline hover:underline">
                {detail.counterpartyName ?? labels.openLedger}
              </Link>
            ) : (
              <span className="font-medium text-[color:var(--color-text)]">{detail.counterpartyName ?? labels.notSpecified}</span>
            )}
          </p>
          <p className="text-sm text-[color:var(--color-text)] md:col-span-2">{labels.note}: <span className="font-medium text-[color:var(--color-text)]">{detail.note ?? labels.notSpecified}</span></p>
        </div>

        <FinanceAllocationSummaryPanel
          summary={detail.allocationSummary}
          labels={{
            title: labels.allocationTitle,
            empty: labels.allocationEmpty,
            target: labels.allocationTarget,
            amount: labels.allocationAmount,
            mismatch: labels.allocationMismatch,
          }}
        />
      </div>
    </section>
  );
}
