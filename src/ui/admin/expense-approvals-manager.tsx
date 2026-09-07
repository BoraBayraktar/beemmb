"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorToast } from "@/components/ui/toast";
import type { AdminExpenseReportDetail, AdminExpenseReportListResult } from "@/modules/expense-reports/contracts/expense-report.contract";

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR");
}

const HISTORY_EVENT_TYPES = new Set(["CREATED", "SUBMITTED", "RESUBMITTED", "STEP_APPROVED", "APPROVED", "REJECTED", "RETURNED"]);

function eventTypeLabel(eventType: string) {
  switch (eventType) {
    case "CREATED": return "Oluşturuldu";
    case "SUBMITTED": return "Gönderildi";
    case "RESUBMITTED": return "Tekrar gönderildi";
    case "STEP_APPROVED": return "Onaylandı";
    case "APPROVED": return "Onaylandı";
    case "REJECTED": return "Reddedildi";
    case "RETURNED": return "Geri gönderildi";
    default: return eventType;
  }
}

type DecisionMode = "reject" | "return" | null;
type DetailTab = "expenses" | "history";

export function ExpenseApprovalsManager({
  result,
  emptyLabel,
  approveLabel,
  rejectLabel,
  rejectNoteLabel,
  rejectNoteRequiredLabel,
  returnLabel,
  returnNoteLabel,
  returnNoteRequiredLabel,
  delegatedToLabel,
}: {
  locale: string;
  result: AdminExpenseReportListResult;
  emptyLabel: string;
  approveLabel: string;
  rejectLabel: string;
  rejectNoteLabel: string;
  rejectNoteRequiredLabel: string;
  returnLabel: string;
  returnNoteLabel: string;
  returnNoteRequiredLabel: string;
  delegatedToLabel: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(result.items);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [detail, setDetail] = useState<AdminExpenseReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("expenses");

  async function refreshList() {
    const response = await fetch("/api/admin/expense-reports/approvals?pageSize=50");
    if (response.ok) {
      const payload = await response.json();
      setItems(payload.items ?? []);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setError(null);
    setDecisionMode(null);
    setDecisionNote("");
    setActiveTab("expenses");
    try {
      const response = await fetch(`/api/admin/expense-reports/${id}`);
      if (!response.ok) {
        setError(await readErrorMessage(response, "Masraf bildirimi yüklenemedi."));
        return;
      }
      const payload = await response.json();
      setDetail(payload.item);
    } finally {
      setDetailLoading(false);
    }
  }

  async function approve() {
    if (!detail) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/${detail.id}/approve`, { method: "POST" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Onaylama başarısız oldu."));
        return;
      }
      setDetail(null);
      await refreshList();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function confirmDecision() {
    if (!detail || !decisionMode) return;
    if (!decisionNote.trim()) {
      setError(decisionMode === "reject" ? rejectNoteRequiredLabel : returnNoteRequiredLabel);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const endpoint = decisionMode === "reject" ? "reject" : "return";
      const response = await fetch(`/api/admin/expense-reports/${detail.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionNote }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, decisionMode === "reject" ? "Reddetme başarısız oldu." : "Geri gönderme başarısız oldu."));
        return;
      }
      setDetail(null);
      setDecisionMode(null);
      setDecisionNote("");
      await refreshList();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const currentStepInfo = detail?.approvals.find(
    (approval) => approval.round === detail.currentRound && approval.status === "PENDING" && approval.approverUserId === detail.currentApproverUserId,
  );
  const totalSteps = detail?.approvals.filter((approval) => approval.round === detail.currentRound).length ?? 0;

  return (
    <div className="space-y-6">
      {error ? <ErrorToast message={error} onDismiss={() => setError(null)} /> : null}

      <section className="overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-sm">
        {items.length === 0 ? (
          <p className="p-10 text-center text-sm text-[color:var(--color-text-muted)]">{emptyLabel}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[color:var(--color-bg-soft)] text-xs uppercase text-[color:var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Personel</th>
                    <th className="px-4 py-3">Onaycı</th>
                    <th className="px-4 py-3">Masraf</th>
                    <th className="px-4 py-3">Tutar</th>
                    <th className="px-4 py-3">Gönderilme</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-[color:var(--color-border)]">
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">{item.reportNumber}</td>
                      <td className="px-4 py-3">{item.employeeName}</td>
                      <td className="px-4 py-3">
                        <span>{item.currentApproverName}</span>
                        {item.currentApproverDelegateNames.length > 0 ? (
                          <span className="block text-xs text-[color:var(--color-text-muted)]">
                            {delegatedToLabel}: {item.currentApproverDelegateNames.join(", ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{item.itemCount}</td>
                      <td className="px-4 py-3">{formatCurrency(item.totalAmount, item.currency)}</td>
                      <td className="px-4 py-3">{formatDateTime(item.submittedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="outline" onClick={() => void openDetail(item.id)}>Detay</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[color:var(--color-border)] p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[color:var(--color-text)]">{item.reportNumber}</span>
                    <Badge>{item.employeeName}</Badge>
                  </div>
                  <p className="mt-1 font-medium text-[color:var(--color-text)]">{formatCurrency(item.totalAmount, item.currency)}</p>
                  <p className="mt-1 text-[color:var(--color-text-muted)]">Onaycı: {item.currentApproverName}</p>
                  {item.currentApproverDelegateNames.length > 0 ? (
                    <p className="text-xs text-[color:var(--color-text-muted)]">{delegatedToLabel}: {item.currentApproverDelegateNames.join(", ")}</p>
                  ) : null}
                  <p className="mt-1 text-[color:var(--color-text-muted)]">Gönderilme: {formatDateTime(item.submittedAt)}</p>
                  <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void openDetail(item.id)}>Detay</Button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {detail || detailLoading ? (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-xl overflow-y-auto bg-[color:var(--color-surface)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{detail ? detail.reportNumber : "Yükleniyor..."}</h2>
              <Button type="button" variant="ghost" onClick={() => setDetail(null)}>Kapat</Button>
            </div>

            {detail ? (
              <div className="mt-4 space-y-5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{detail.employeeName}</Badge>
                  <span className="font-medium text-[color:var(--color-text)]">{formatCurrency(detail.totalAmount, detail.currency)}</span>
                  {currentStepInfo && totalSteps > 1 ? (
                    <Badge className="border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text-muted)]">
                      {currentStepInfo.stepOrder}. / {totalSteps} onaycı
                    </Badge>
                  ) : null}
                </div>

                {detail.currentApproverDelegateNames.length > 0 ? (
                  <p className="text-xs text-[color:var(--color-text-muted)]">
                    {delegatedToLabel}: {detail.currentApproverDelegateNames.join(", ")}
                  </p>
                ) : null}

                {detail.note ? <p className="text-[color:var(--color-text-muted)]">{detail.note}</p> : null}

                <div className="flex gap-2 border-b border-[color:var(--color-border)]">
                  <button
                    type="button"
                    className={`px-3 py-2 text-sm font-medium ${activeTab === "expenses" ? "border-b-2 border-[color:var(--color-brand)] text-[color:var(--color-text)]" : "text-[color:var(--color-text-muted)]"}`}
                    onClick={() => setActiveTab("expenses")}
                  >
                    Masraflar
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2 text-sm font-medium ${activeTab === "history" ? "border-b-2 border-[color:var(--color-brand)] text-[color:var(--color-text)]" : "text-[color:var(--color-text-muted)]"}`}
                    onClick={() => setActiveTab("history")}
                  >
                    Akış Tarihçesi
                  </button>
                </div>

                {activeTab === "expenses" ? (
                  <div className="space-y-1">
                    {detail.items.map((line) => (
                      <div key={line.id} className="rounded-xl border border-[color:var(--color-border)] px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-[color:var(--color-text)]">{line.vendorName}</p>
                          <span className="font-medium">{formatCurrency(line.amount, line.currency)}</span>
                        </div>
                        <p className="text-xs text-[color:var(--color-text-muted)]">{line.categoryName} • {formatDateTime(line.expenseDate)} • {line.receiptNo ?? "Fiş no yok"}</p>
                        {line.receiptUrl ? (
                          <a href={line.receiptUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[color:var(--color-brand)] underline">
                            Fiş görselini görüntüle
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ol className="space-y-3">
                    {[...detail.lifecycleEvents].reverse().filter((event) => HISTORY_EVENT_TYPES.has(event.eventType)).map((event) => {
                      const isDelegated = Boolean(event.assignedApproverUserId && event.actorUserId !== event.assignedApproverUserId);
                      const primaryName = isDelegated ? event.assignedApproverName : event.actorName;
                      return (
                        <li key={event.id} className="rounded-xl border border-[color:var(--color-border)] px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-[color:var(--color-text)]">{eventTypeLabel(event.eventType)}</span>
                            <span className="text-xs text-[color:var(--color-text-muted)]">{formatDateTime(event.occurredAt)}</span>
                          </div>
                          <p className="text-xs text-[color:var(--color-text-muted)]">
                            {primaryName ?? "Sistem"}
                            {event.assignedApproverDescription ? ` (${event.assignedApproverDescription})` : ""}
                          </p>
                          {isDelegated ? (
                            <p className="text-xs text-[color:var(--color-text-muted)]">{delegatedToLabel}: {event.actorName}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-[color:var(--color-text)]">{event.summary}</p>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {decisionMode ? (
                  <div className="space-y-2 rounded-2xl border border-dashed border-[color:var(--color-border)] p-4">
                    <Label>{decisionMode === "reject" ? rejectNoteLabel : returnNoteLabel}</Label>
                    <Textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} rows={3} />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => void confirmDecision()} disabled={pending}>
                        {decisionMode === "reject" ? rejectLabel : returnLabel}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setDecisionMode(null); setDecisionNote(""); }}>Vazgeç</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentStepInfo?.canApprove !== false ? (
                      <Button type="button" onClick={() => void approve()} disabled={pending}>{approveLabel}</Button>
                    ) : null}
                    {currentStepInfo?.canReturn !== false ? (
                      <Button type="button" variant="outline" onClick={() => setDecisionMode("return")} disabled={pending}>{returnLabel}</Button>
                    ) : null}
                    {currentStepInfo?.canReject !== false ? (
                      <Button type="button" variant="outline" onClick={() => setDecisionMode("reject")} disabled={pending}>{rejectLabel}</Button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">Yükleniyor...</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
