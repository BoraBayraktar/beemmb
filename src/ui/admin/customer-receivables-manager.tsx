"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminReceivablesResult } from "@/modules/finance/contracts/receivables.contract";

type Labels = {
  title: string;
  description: string;
  search: string;
  allStatuses: string;
  pending: string;
  authorized: string;
  failed: string;
  totalOpenAmount: string;
  pendingCount: string;
  authorizedCount: string;
  failedCount: string;
  noResults: string;
  orderNumber: string;
  counterparty: string;
  paymentStatus: string;
  totalAmount: string;
  itemCount: string;
  orderDate: string;
  latestDocument: string;
  openOrder: string;
  openDetail: string;
  notSpecified: string;
  cancel: string;
  overdueAmountKpi: string;
  dueWithinDaysKpi: string;
  nearestDueDateKpi: string;
  overdueFilter: string;
  allOpenFilter: string;
  dueColumn: string;
  dueStatusOverdue: string;
  dueStatusDueInDays: string;
  dueStatusDueLater: string;
  dueStatusOverdueDays: string;
  dueStatusDueInDaysHint: string;
  dueStatusDueLaterHint: string;
  actions: string;
};

type Props = {
  locale: string;
  result: AdminReceivablesResult;
  initialSearch: string;
  initialPaymentStatus: "all" | "PENDING" | "AUTHORIZED" | "FAILED";
  overdueOnly: boolean;
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

function buildStatusHref(
  locale: string,
  status: "all" | "PENDING" | "AUTHORIZED" | "FAILED",
  search: string,
  overdueOnly: boolean,
) {
  const params = new URLSearchParams();
  if (status !== "all") {
    params.set("paymentStatus", status);
  }
  if (search.trim()) {
    params.set("search", search.trim());
  }
  if (overdueOnly) {
    params.set("overdueOnly", "1");
  }
  const query = params.toString();
  return query ? `/${locale}/admin/finance/receivables?${query}` : `/${locale}/admin/finance/receivables`;
}

function resolveDueHint(item: AdminReceivablesResult["items"][number], labels: Labels) {
  if (item.isOverdue) {
    return `${labels.dueStatusOverdue}: ${labels.dueStatusOverdueDays.replace("{days}", String(Math.abs(item.daysUntilDue)))}`;
  }

  if (item.daysUntilDue <= 7) {
    return `${labels.dueStatusDueInDays}: ${labels.dueStatusDueInDaysHint.replace("{days}", String(item.daysUntilDue))}`;
  }

  return `${labels.dueStatusDueLater}: ${labels.dueStatusDueLaterHint.replace("{days}", String(item.daysUntilDue))}`;
}

function resolveStatusBadge(status: "PENDING" | "AUTHORIZED" | "FAILED") {
  if (status === "AUTHORIZED") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "FAILED") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

function formatStatusLabel(status: "PENDING" | "AUTHORIZED" | "FAILED", labels: Labels) {
  if (status === "AUTHORIZED") {
    return labels.authorized;
  }

  if (status === "FAILED") {
    return labels.failed;
  }

  return labels.pending;
}

export function CustomerReceivablesManager({
  locale,
  result,
  initialSearch,
  initialPaymentStatus,
  overdueOnly,
  labels,
}: Props) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const selectedItem = useMemo(
    () => result.items.find((item) => item.orderId === selectedOrderId) ?? null,
    [result.items, selectedOrderId],
  );

  useEffect(() => {
    if (!openActionMenuId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenActionMenuId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openActionMenuId]);

  const dueWithinLabel = labels.dueWithinDaysKpi.replace("{days}", String(result.dueKpi.dueWithinDaysThreshold));

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-neutral-200 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{labels.title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{labels.description}</p>
        </div>
      </div>

      <div className="p-5">
        <form action={`/${locale}/admin/finance/receivables`} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            type="search"
            name="search"
            defaultValue={initialSearch}
            placeholder={labels.search}
          />
          <input type="hidden" name="paymentStatus" value={initialPaymentStatus === "all" ? "" : initialPaymentStatus} />
          {overdueOnly ? <input type="hidden" name="overdueOnly" value="1" /> : null}
          <Button type="submit" variant="secondary">
            {labels.search}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={buildStatusHref(locale, "all", initialSearch, overdueOnly)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialPaymentStatus === "all" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-neutral-100 text-neutral-700 hover:text-neutral-950"}`}>{labels.allStatuses}</Link>
          <Link href={buildStatusHref(locale, "PENDING", initialSearch, overdueOnly)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialPaymentStatus === "PENDING" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-neutral-100 text-neutral-700 hover:text-neutral-950"}`}>{labels.pending}</Link>
          <Link href={buildStatusHref(locale, "AUTHORIZED", initialSearch, overdueOnly)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialPaymentStatus === "AUTHORIZED" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-neutral-100 text-neutral-700 hover:text-neutral-950"}`}>{labels.authorized}</Link>
          <Link href={buildStatusHref(locale, "FAILED", initialSearch, overdueOnly)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${initialPaymentStatus === "FAILED" ? "bg-neutral-950 !text-white hover:!text-white" : "bg-neutral-100 text-neutral-700 hover:text-neutral-950"}`}>{labels.failed}</Link>
          <Link href={buildStatusHref(locale, initialPaymentStatus, initialSearch, false)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${!overdueOnly ? "bg-neutral-950 !text-white hover:!text-white" : "bg-neutral-100 text-neutral-700 hover:text-neutral-950"}`}>{labels.allOpenFilter}</Link>
          <Link href={buildStatusHref(locale, initialPaymentStatus, initialSearch, true)} className={`rounded-full px-3 py-2 text-sm font-medium no-underline transition-colors ${overdueOnly ? "bg-neutral-950 !text-white hover:!text-white" : "bg-neutral-100 text-neutral-700 hover:text-neutral-950"}`}>{labels.overdueFilter}</Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm md:col-span-1 xl:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">{labels.overdueAmountKpi}</p>
            <p className="mt-3 text-2xl font-semibold text-rose-950">{formatMoney(result.dueKpi.overdueAmount, result.dueKpi.currency)}</p>
          </article>
          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm md:col-span-1 xl:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{dueWithinLabel}</p>
            <p className="mt-3 text-2xl font-semibold text-amber-950">{formatMoney(result.dueKpi.dueWithinDaysAmount, result.dueKpi.currency)}</p>
          </article>
          <article className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm md:col-span-1 xl:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.nearestDueDateKpi}</p>
            <p className="mt-3 text-lg font-semibold text-neutral-950">
              {result.dueKpi.nearestDueDate ? formatDate(result.dueKpi.nearestDueDate) : labels.notSpecified}
            </p>
          </article>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{labels.totalOpenAmount}</p>
            <p className="mt-3 text-2xl font-semibold text-emerald-950">{formatMoney(result.summary.totalOpenAmount, result.summary.currency)}</p>
          </article>
          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{labels.pendingCount}</p>
            <p className="mt-3 text-2xl font-semibold text-amber-950">{result.summary.pendingCount}</p>
          </article>
          <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{labels.authorizedCount}</p>
            <p className="mt-3 text-2xl font-semibold text-blue-950">{result.summary.authorizedCount}</p>
          </article>
          <article className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">{labels.failedCount}</p>
            <p className="mt-3 text-2xl font-semibold text-rose-950">{result.summary.failedCount}</p>
          </article>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
          <div className="hidden grid-cols-[1.2fr_1.2fr_160px_180px_180px_200px_88px] gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 lg:grid">
            <span>{labels.orderNumber}</span>
            <span>{labels.counterparty}</span>
            <span>{labels.paymentStatus}</span>
            <span>{labels.totalAmount}</span>
            <span>{labels.orderDate}</span>
            <span>{labels.dueColumn}</span>
            <span className="text-right">{labels.actions}</span>
          </div>

          {result.items.length === 0 ? (
            <p className="p-6 text-sm text-neutral-500">{labels.noResults}</p>
          ) : (
            <div className="divide-y divide-neutral-200">
              {result.items.map((item) => (
                <article key={item.orderId} className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1.2fr_160px_180px_180px_200px_88px] lg:items-center">
                  <div>
                    <p className="font-medium text-neutral-950">{item.orderNumber}</p>
                    <p className="mt-1 text-sm text-neutral-500">{labels.itemCount}: {item.itemCount}</p>
                  </div>
                  <p className="text-sm text-neutral-500">{item.counterpartyName}</p>
                  <div>
                    <Badge className={resolveStatusBadge(item.paymentStatus)}>
                      {formatStatusLabel(item.paymentStatus, labels)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-neutral-950">{formatMoney(item.totalAmount, item.currency)}</p>
                  <p className="text-sm text-neutral-500">{formatDate(item.createdAt)}</p>
                  <p className={`text-sm ${item.isOverdue ? "font-medium text-rose-700" : "text-neutral-600"}`}>{resolveDueHint(item, labels)}</p>
                  <div ref={openActionMenuId === item.orderId ? actionMenuRef : null} className="relative flex justify-start lg:justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={() => setOpenActionMenuId((current) => current === item.orderId ? null : item.orderId)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {openActionMenuId === item.orderId ? (
                      <div className="absolute right-0 top-11 z-10 min-w-44 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(item.orderId);
                            setOpenActionMenuId(null);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                          {labels.openDetail}
                        </button>
                        <Link
                          href={`/${locale}/admin/orders/${item.orderId}`}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                          onClick={() => setOpenActionMenuId(null)}
                        >
                          {labels.openOrder}
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
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={() => setSelectedOrderId(null)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-200 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{selectedItem.orderNumber}</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setSelectedOrderId(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={resolveStatusBadge(selectedItem.paymentStatus)}>
                  {formatStatusLabel(selectedItem.paymentStatus, labels)}
                </Badge>
              </div>
              <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm text-neutral-700">{labels.counterparty}: <span className="font-medium text-neutral-950">{selectedItem.counterpartyName}</span></p>
                <p className="text-sm text-neutral-700">{labels.totalAmount}: <span className="font-medium text-neutral-950">{formatMoney(selectedItem.totalAmount, selectedItem.currency)}</span></p>
                <p className="text-sm text-neutral-700">{labels.itemCount}: <span className="font-medium text-neutral-950">{selectedItem.itemCount}</span></p>
                <p className="text-sm text-neutral-700">{labels.orderDate}: <span className="font-medium text-neutral-950">{formatDate(selectedItem.createdAt)}</span></p>
                <p className="text-sm text-neutral-700">{labels.latestDocument}: <span className="font-medium text-neutral-950">{selectedItem.latestDocument?.documentNumber ?? labels.notSpecified}</span></p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Link href={`/${locale}/admin/finance/receivables/${selectedItem.orderId}`} className="inline-flex h-10 items-center rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-700">
                  {labels.latestDocument}
                </Link>
                <Link href={`/${locale}/admin/orders/${selectedItem.orderId}`} className="inline-flex h-10 items-center rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-700">
                  {labels.openOrder}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
