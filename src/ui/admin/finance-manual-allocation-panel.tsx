"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminFinanceRecordAllocationContext } from "@/modules/finance/contracts/allocation.contract";
import { FinanceAllocationSummaryPanel } from "@/ui/admin/finance-allocation-summary";

type Labels = {
  title: string;
  record: string;
  line: string;
  amount: string;
  addLine: string;
  save: string;
  saving: string;
  success: string;
  failed: string;
  allocationTitle: string;
  allocationEmpty: string;
  allocationTarget: string;
  allocationAmount: string;
  allocationMismatch: string;
};

type Props = {
  mode: "collection" | "payment";
  contexts: AdminFinanceRecordAllocationContext[];
  labels: Labels;
};

type DraftLine = {
  businessDocumentLineId: string;
  amount: string;
};

export function FinanceManualAllocationPanel({ mode, contexts, labels }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftLine[]>>({});

  if (contexts.length === 0) {
    return null;
  }

  function getDraft(recordId: string): DraftLine[] {
    return drafts[recordId] ?? [{ businessDocumentLineId: "", amount: "" }];
  }

  function updateDraft(recordId: string, next: DraftLine[]) {
    setDrafts((current) => ({
      ...current,
      [recordId]: next,
    }));
  }

  function saveAllocations(context: AdminFinanceRecordAllocationContext) {
    const items = getDraft(context.recordId)
      .filter((item) => item.businessDocumentLineId && item.amount)
      .map((item) => ({
        businessDocumentLineId: item.businessDocumentLineId,
        amount: Number(item.amount),
      }));

    if (items.length === 0) {
      setMessage(labels.failed);
      return;
    }

    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch("/api/admin/finance/allocations/replace", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            mode === "collection"
              ? { type: "collection", collectionRecordId: context.recordId, items }
              : { type: "payment", paymentRecordId: context.recordId, items },
          ),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          throw new Error(payload?.message ?? labels.failed);
        }

        setMessage(labels.success);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : labels.failed);
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{labels.title}</h3>
      </div>

      {message ? <p className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-3 py-2 text-sm text-[color:var(--color-text)]">{message}</p> : null}

      {contexts.map((context) => (
        <div key={context.recordId} className="space-y-3 rounded-2xl border border-[color:var(--color-border)] p-4">
          <p className="text-sm font-medium text-[color:var(--color-text)]">{labels.record}: {context.recordLabel}</p>
          <FinanceAllocationSummaryPanel
            summary={context.summary}
            labels={{
              title: labels.allocationTitle,
              empty: labels.allocationEmpty,
              target: labels.allocationTarget,
              amount: labels.allocationAmount,
              mismatch: labels.allocationMismatch,
            }}
          />

          <details className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-3">
            <summary className="cursor-pointer text-sm font-medium text-[color:var(--color-text)]">{labels.title}</summary>
            <div className="mt-3 space-y-3">
              {getDraft(context.recordId).map((draft, index) => (
                <div key={`${context.recordId}-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px]">
                  <div className="grid gap-1">
                    <Label>{labels.line}</Label>
                    <select
                      value={draft.businessDocumentLineId}
                      onChange={(event) => {
                        const next = [...getDraft(context.recordId)];
                        next[index] = { ...next[index], businessDocumentLineId: event.target.value };
                        updateDraft(context.recordId, next);
                      }}
                      className="h-10 rounded-xl border border-[color:var(--color-border)] px-3 text-sm text-[color:var(--color-text)]"
                    >
                      <option value="">{labels.line}</option>
                      {context.lineOptions.map((option) => (
                        <option key={option.lineId} value={option.lineId}>
                          {option.documentNumber} • {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label>{labels.amount}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.amount}
                      onChange={(event) => {
                        const next = [...getDraft(context.recordId)];
                        next[index] = { ...next[index], amount: event.target.value };
                        updateDraft(context.recordId, next);
                      }}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => updateDraft(context.recordId, [...getDraft(context.recordId), { businessDocumentLineId: "", amount: "" }])}
              >
                {labels.addLine}
              </Button>
              <Button type="button" disabled={isPending} onClick={() => saveAllocations(context)}>
                {isPending ? labels.saving : labels.save}
              </Button>
            </div>
          </details>
        </div>
      ))}
    </section>
  );
}
