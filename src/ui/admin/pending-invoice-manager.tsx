"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AdminBusinessDocumentDetail,
  AdminPendingInvoiceDeliveryNoteListResult,
} from "@/modules/documents/contracts/document.contract";

type Labels = {
  title: string;
  description: string;
  search: string;
  noResults: string;
  viewDetail: string;
  notSpecified: string;
  issueDate: string;
  counterparty: string;
  orderNumber: string;
  inventoryTransactionNumber: string;
  providerSelection: string;
  externalReference: string;
  documentStatus: string;
  externalSystemStatus: string;
  close: string;
  linesTitle: string;
  sourceLabel: string;
  createInvoice: string;
  creatingInvoice: string;
  createAndQueueInvoice: string;
  creatingAndQueueingInvoice: string;
  createInvoiceSuccess: string;
  createInvoiceFailed: string;
  queueInvoiceSuccess: string;
  queueInvoiceFailed: string;
  badgeCreated: string;
  badgeQueued: string;
  badgeSent: string;
};

type Props = {
  locale: string;
  result: AdminPendingInvoiceDeliveryNoteListResult;
  initialSearch: string;
  labels: Labels;
};

type CardStatus = "created" | "queued" | "sent";

export function PendingInvoiceManager({ locale, result, initialSearch, labels }: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<AdminBusinessDocumentDetail | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittingMode, setSubmittingMode] = useState<"create" | "create-and-queue" | null>(null);
  const [cardStatuses, setCardStatuses] = useState<Record<string, CardStatus>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function scheduleRefresh() {
    window.setTimeout(() => {
      router.refresh();
    }, 1400);
  }

  async function openDetail(id: string) {
    const response = await fetch(`/api/admin/documents/${id}`, { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { item: AdminBusinessDocumentDetail };
    setDetail(payload.item);
  }

  async function createInvoice(id: string, queueAfterCreate = false) {
    setSubmittingId(id);
    setSubmittingMode(queueAfterCreate ? "create-and-queue" : "create");
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/documents/${id}/create-invoice`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.createInvoiceFailed);
        return;
      }

      const payload = (await response.json()) as { item: AdminBusinessDocumentDetail };

      if (queueAfterCreate) {
        const queueResponse = await fetch(`/api/admin/documents/${payload.item.id}/dispatch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!queueResponse.ok) {
          const queuePayload = (await queueResponse.json().catch(() => null)) as { message?: string } | null;
          setError(queuePayload?.message ?? labels.queueInvoiceFailed);
          setCardStatuses((current) => ({
            ...current,
            [id]: "created",
          }));
          scheduleRefresh();
          return;
        }

        const queuePayload = (await queueResponse.json()) as { item: AdminBusinessDocumentDetail };
        setCardStatuses((current) => ({
          ...current,
          [id]: queuePayload.item.externalSystemStatus === "SENT" ? "sent" : "queued",
        }));
        setFeedback(labels.queueInvoiceSuccess);
        scheduleRefresh();
        return;
      }

      setCardStatuses((current) => ({
        ...current,
        [id]: "created",
      }));
      setFeedback(labels.createInvoiceSuccess);
      scheduleRefresh();
    } catch {
      setError(queueAfterCreate ? labels.queueInvoiceFailed : labels.createInvoiceFailed);
    } finally {
      setSubmittingId(null);
      setSubmittingMode(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{labels.title}</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
        </div>
        <form action={`/${locale}/admin/documents/pending-invoices`} className="mt-4">
          <Input
            type="search"
            name="search"
            defaultValue={initialSearch}
            placeholder={labels.search}
          />
        </form>
        {feedback ? <p className="mt-3 text-sm text-emerald-700">{feedback}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="grid gap-3">
        {result.items.length === 0 ? (
          <article className="rounded-3xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 text-sm text-[color:var(--color-text-muted)] shadow-sm">
            {labels.noResults}
          </article>
        ) : result.items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-amber-200 bg-amber-100 text-amber-700">{item.documentType}</Badge>
                  <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">{item.status}</Badge>
                  {cardStatuses[item.id] ? (
                    <Badge
                      className={
                        cardStatuses[item.id] === "sent"
                          ? "border-sky-200 bg-sky-100 text-sky-700"
                          : cardStatuses[item.id] === "queued"
                            ? "border-violet-200 bg-violet-100 text-violet-700"
                            : "border-[color:var(--color-border)] bg-neutral-200 text-neutral-900"
                      }
                    >
                      {cardStatuses[item.id] === "sent"
                        ? labels.badgeSent
                        : cardStatuses[item.id] === "queued"
                          ? labels.badgeQueued
                          : labels.badgeCreated}
                    </Badge>
                  ) : null}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-[color:var(--color-text)]">{item.documentNumber}</h2>
                <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{item.counterpartyName}</p>
                <div className="mt-3 grid gap-2 text-sm text-[color:var(--color-text)] md:grid-cols-2 xl:grid-cols-4">
                  <p>{labels.sourceLabel}: {item.sourceLabel}</p>
                  <p>{labels.issueDate}: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.issueDate))}</p>
                  <p>{labels.orderNumber}: {item.orderNumber ?? labels.notSpecified}</p>
                  <p>{labels.inventoryTransactionNumber}: {item.inventoryTransactionNumber ?? labels.notSpecified}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void createInvoice(item.id)}
                  disabled={submittingId === item.id}
                >
                  {submittingId === item.id && submittingMode === "create" ? labels.creatingInvoice : labels.createInvoice}
                </Button>
                <Button
                  type="button"
                  onClick={() => void createInvoice(item.id, true)}
                  disabled={submittingId === item.id}
                  variant="secondary"
                >
                  {submittingId === item.id && submittingMode === "create-and-queue"
                    ? labels.creatingAndQueueingInvoice
                    : labels.createAndQueueInvoice}
                </Button>
                <Button
                  type="button"
                  onClick={() => void openDetail(item.id)}
                  variant="secondary"
                >
                  {labels.viewDetail}
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push(`/${locale}/admin/documents?search=${encodeURIComponent(item.documentNumber)}`)}
                  variant="secondary"
                >
                  {labels.linesTitle}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-neutral-950/35">
          <div className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[color:var(--color-surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{detail.documentType}</p>
                <h3 className="mt-1 text-xl font-semibold text-[color:var(--color-text)]">{detail.documentNumber}</h3>
              </div>
              <Button type="button" onClick={() => setDetail(null)} variant="secondary" size="sm">
                {labels.close}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--color-border)] p-4 text-sm text-[color:var(--color-text)]">
                <p>{labels.counterparty}: {detail.counterpartyName}</p>
                <p className="mt-2">{labels.providerSelection}: {detail.providerDisplayName ?? labels.notSpecified}</p>
                <p className="mt-2">{labels.orderNumber}: {detail.orderNumber ?? labels.notSpecified}</p>
                <p className="mt-2">{labels.inventoryTransactionNumber}: {detail.inventoryTransactionNumber ?? labels.notSpecified}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--color-border)] p-4 text-sm text-[color:var(--color-text)]">
                <p>{labels.documentStatus}: {detail.status}</p>
                <p className="mt-2">{labels.externalSystemStatus}: {detail.externalSystemStatus}</p>
                <p className="mt-2">{labels.externalReference}: {detail.externalReference ?? labels.notSpecified}</p>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-[color:var(--color-text)]">{labels.linesTitle}</h4>
              <div className="mt-3 space-y-3">
                {detail.lines.map((line) => (
                  <article key={line.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 text-sm text-[color:var(--color-text)]">
                    <p className="font-semibold text-[color:var(--color-text)]">{line.productName}</p>
                    <p className="mt-1">{line.productSku} • {line.quantity}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
