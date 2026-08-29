"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminFinanceAccountsResult, AdminFinanceAccountsQuery } from "@/modules/finance/contracts/accounts.contract";

type FilterType = NonNullable<AdminFinanceAccountsQuery["type"]>;

type Labels = {
  title: string;
  description: string;
  search: string;
  allTypes: string;
  receivable: string;
  payable: string;
  cash: string;
  cashIn: string;
  cashOut: string;
  receivableCount: string;
  payableCount: string;
  cashMovementCount: string;
  totalReceivableAmount: string;
  totalPayableAmount: string;
  totalCashInAmount: string;
  totalCashOutAmount: string;
  counterparty: string;
  sourceNumber: string;
  sourceDate: string;
  status: string;
  amount: string;
  openFinanceRoute: string;
  openSource: string;
  openCounterpartyLedger: string;
  openDetail: string;
  openFinanceMovementPreview: string;
  noResults: string;
  cancel: string;
};

type Props = {
  locale: string;
  result: AdminFinanceAccountsResult;
  initialSearch: string;
  initialType: FilterType;
  labels: Labels;
};

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

function buildTypeHref(locale: string, type: FilterType, search: string) {
  const params = new URLSearchParams();
  if (type !== "all") {
    params.set("type", type);
  }
  if (search.trim()) {
    params.set("search", search.trim());
  }
  const query = params.toString();
  return query ? `/${locale}/admin/finance/accounts?${query}` : `/${locale}/admin/finance/accounts`;
}

function typeBadgeClassName(type: AdminFinanceAccountsResult["items"][number]["type"]) {
  switch (type) {
    case "RECEIVABLE":
    case "CASH_IN":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    default:
      return "border-amber-200 bg-amber-100 text-amber-700";
  }
}

function typeLabel(type: AdminFinanceAccountsResult["items"][number]["type"], labels: Labels) {
  switch (type) {
    case "RECEIVABLE":
      return labels.receivable;
    case "PAYABLE":
      return labels.payable;
    case "CASH_IN":
      return labels.cashIn;
    case "CASH_OUT":
      return labels.cashOut;
    default:
      return type;
  }
}

function formatStatusLabel(value: string) {
  if (value === "PENDING") {
    return "Bekleyen ödeme";
  }

  if (value === "AUTHORIZED") {
    return "Provizyonlu";
  }

  if (value === "FAILED") {
    return "Başarısız ödeme";
  }

  if (value === "RECORDED") {
    return "Kaydedildi";
  }

  return value;
}

export function FinanceAccountsManager({ locale, result, initialSearch, initialType, labels }: Props) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => result.items.find((item) => item.id === selectedEntryId) ?? null,
    [result.items, selectedEntryId],
  );

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.title}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
        </div>
      </div>

      <div className="p-5">
        <form action={`/${locale}/admin/finance/accounts`} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            type="search"
            name="search"
            defaultValue={initialSearch}
            placeholder={labels.search}
          />
          <Button type="submit" variant="secondary">
            {labels.search}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={buildTypeHref(locale, "all", initialSearch)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialType === "all" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)] hover:text-[color:var(--color-text)]"}`}>{labels.allTypes}</Link>
          <Link href={buildTypeHref(locale, "RECEIVABLE", initialSearch)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialType === "RECEIVABLE" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)] hover:text-[color:var(--color-text)]"}`}>{labels.receivable}</Link>
          <Link href={buildTypeHref(locale, "PAYABLE", initialSearch)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialType === "PAYABLE" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)] hover:text-[color:var(--color-text)]"}`}>{labels.payable}</Link>
          <Link href={buildTypeHref(locale, "CASH", initialSearch)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialType === "CASH" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-[color:var(--color-bg-soft)] text-[color:var(--color-text)] hover:text-[color:var(--color-text)]"}`}>{labels.cash}</Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{labels.totalReceivableAmount}</p>
            <p className="mt-3 text-2xl font-semibold text-emerald-950">{formatMoney(result.summary.totalReceivableAmount, result.summary.currency)}</p>
            <p className="mt-1 text-xs text-emerald-700">{labels.receivableCount}: {result.summary.receivableCount}</p>
          </article>
          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{labels.totalPayableAmount}</p>
            <p className="mt-3 text-2xl font-semibold text-amber-950">{formatMoney(result.summary.totalPayableAmount, result.summary.currency)}</p>
            <p className="mt-1 text-xs text-amber-700">{labels.payableCount}: {result.summary.payableCount}</p>
          </article>
          <article className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{labels.cash}</p>
            <p className="mt-3 text-lg font-semibold text-emerald-700">+{formatMoney(result.summary.totalCashInAmount, result.summary.currency)}</p>
            <p className="text-lg font-semibold text-amber-700">-{formatMoney(result.summary.totalCashOutAmount, result.summary.currency)}</p>
            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{labels.cashMovementCount}: {result.summary.cashMovementCount}</p>
          </article>
        </div>

        <div className="mt-5 overflow-visible rounded-xl border border-[color:var(--color-border)]">
          <div className="hidden grid-cols-[130px_1.2fr_1fr_180px_180px_88px] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
            <span>{labels.status}</span>
            <span>{labels.counterparty}</span>
            <span>{labels.sourceNumber}</span>
            <span>{labels.sourceDate}</span>
            <span>{labels.amount}</span>
            <span className="text-right">İşlem</span>
          </div>

          {result.items.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{labels.noResults}</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-border)]">
              {result.items.map((item) => (
                <article key={item.id} className="grid gap-4 p-4 lg:grid-cols-[130px_1.2fr_1fr_180px_180px_88px] lg:items-center">
                  <div>
                    <Badge className={typeBadgeClassName(item.type)}>
                      {typeLabel(item.type, labels)}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-[color:var(--color-text)]">{item.counterpartyName}</p>
                    <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.status}: {formatStatusLabel(item.statusLabel)}</p>
                  </div>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{item.sourceNumber}</p>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{formatDate(item.sourceDate)}</p>
                  <p className="text-sm font-medium text-[color:var(--color-text)]">{formatMoney(item.totalAmount, item.currency)}</p>
                  <div className="relative flex justify-start lg:justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={() => setOpenActionMenuId((current) => current === item.id ? null : item.id)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {openActionMenuId === item.id ? (
                      <div className="absolute bottom-11 right-0 z-10 min-w-44 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEntryId(item.id);
                            setOpenActionMenuId(null);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                        >
                          {labels.openDetail}
                        </button>
                        <Link
                          href={item.detailHref}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                          onClick={() => setOpenActionMenuId(null)}
                        >
                          {labels.openFinanceRoute}
                        </Link>
                        {item.counterpartyLedgerHref ? (
                          <Link
                            href={item.counterpartyLedgerHref}
                            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                            onClick={() => setOpenActionMenuId(null)}
                          >
                            {labels.openCounterpartyLedger}
                          </Link>
                        ) : null}
                        {item.financeMovementPreviewHref ? (
                          <Link
                            href={item.financeMovementPreviewHref}
                            className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]"
                            onClick={() => setOpenActionMenuId(null)}
                          >
                            {labels.openFinanceMovementPreview}
                          </Link>
                        ) : null}
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
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={() => setSelectedEntryId(null)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{selectedItem.counterpartyName}</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setSelectedEntryId(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={typeBadgeClassName(selectedItem.type)}>
                  {typeLabel(selectedItem.type, labels)}
                </Badge>
              </div>
              <div className="grid gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
                <p className="text-sm text-[color:var(--color-text)]">{labels.counterparty}: <span className="font-medium text-[color:var(--color-text)]">{selectedItem.counterpartyName}</span></p>
                <p className="text-sm text-[color:var(--color-text)]">{labels.sourceNumber}: <span className="font-medium text-[color:var(--color-text)]">{selectedItem.sourceNumber}</span></p>
                <p className="text-sm text-[color:var(--color-text)]">{labels.sourceDate}: <span className="font-medium text-[color:var(--color-text)]">{formatDate(selectedItem.sourceDate)}</span></p>
                <p className="text-sm text-[color:var(--color-text)]">{labels.status}: <span className="font-medium text-[color:var(--color-text)]">{formatStatusLabel(selectedItem.statusLabel)}</span></p>
                <p className="text-sm text-[color:var(--color-text)]">{labels.amount}: <span className="font-medium text-[color:var(--color-text)]">{formatMoney(selectedItem.totalAmount, selectedItem.currency)}</span></p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {selectedItem.counterpartyLedgerHref ? (
                  <Link href={selectedItem.counterpartyLedgerHref} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)]">
                    {labels.openCounterpartyLedger}
                  </Link>
                ) : null}
                <Link href={selectedItem.detailHref} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)]">
                  {labels.openFinanceRoute}
                </Link>
                {selectedItem.financeMovementPreviewHref ? (
                  <Link href={selectedItem.financeMovementPreviewHref} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)]">
                    {labels.openFinanceMovementPreview}
                  </Link>
                ) : null}
                <Link href={selectedItem.sourceHref} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)]">
                  {labels.openSource}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
