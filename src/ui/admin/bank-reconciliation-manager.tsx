"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminBankReconciliationWorkspace } from "@/modules/finance/contracts/bank-reconciliation.contract";
import type { BankReconciliationCopy } from "@/modules/finance/services/bank-reconciliation-copy.resolver";

type Props = {
  locale: string;
  accountId: string;
  initialWorkspace: AdminBankReconciliationWorkspace;
  copy: BankReconciliationCopy;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

function resolveStatusLabel(status: string, copy: BankReconciliationCopy) {
  if (status === "CONFIRMED") {
    return copy.statusConfirmed;
  }

  if (status === "SUGGESTED") {
    return copy.statusSuggested;
  }

  return copy.statusUnmatched;
}

export function BankReconciliationManager({ locale, accountId, initialWorkspace, copy }: Props) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [file, setFile] = useState<File | null>(null);
  const [autoConfirmHighConfidence, setAutoConfirmHighConfidence] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({});

  const importSummary = workspace.importSummary;

  const defaultSelections = useMemo(() => {
    const next: Record<string, string> = {};
    for (const line of workspace.lines) {
      if (line.suggestedMatch?.cashTransactionId) {
        next[line.id] = line.suggestedMatch.cashTransactionId;
      }
    }
    return next;
  }, [workspace.lines]);

  const effectiveSelections = { ...defaultSelections, ...selectedMatches };

  async function uploadStatement() {
    if (!file) {
      setError("CSV dosyası seçin.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const csvContent = await file.text();
      const response = await fetch("/api/admin/finance/bank-reconciliation/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financialAccountId: accountId,
          fileName: file.name,
          csvContent,
          autoConfirmHighConfidence,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "İçe aktarma başarısız.");
      }

      setWorkspace(payload.workspace);
      setSelectedMatches({});
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "İçe aktarma başarısız.");
    } finally {
      setPending(false);
    }
  }

  async function applyMatch(statementLineId: string) {
    const cashTransactionId = effectiveSelections[statementLineId];
    if (!cashTransactionId) {
      setError(copy.matchPlaceholder);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/finance/bank-reconciliation/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementLineId, cashTransactionId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Eşleştirme başarısız.");
      }

      setWorkspace(payload.workspace);
      router.refresh();
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Eşleştirme başarısız.");
    } finally {
      setPending(false);
    }
  }

  async function confirmLine(statementLineId: string, createCashTransactionIfMissing: boolean) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/finance/bank-reconciliation/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statementLineId,
          cashTransactionId: effectiveSelections[statementLineId],
          createCashTransactionIfMissing: !effectiveSelections[statementLineId],
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Onay başarısız.");
      }

      setWorkspace(payload.workspace);
      router.refresh();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Onay başarısız.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <Link href={`/${locale}/admin/finance/bank-cash/${accountId}`} className="text-sm font-medium text-neutral-500 no-underline hover:text-neutral-950">
          {copy.backToAccount}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-950">{copy.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">{copy.description}</p>
        <p className="mt-2 text-sm text-neutral-700">
          {workspace.financialAccountName} · {workspace.currency}
        </p>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-950">{copy.uploadTitle}</h2>
        <p className="mt-1 text-sm text-neutral-600">{copy.uploadHint}</p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <Input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <Button type="button" disabled={pending} onClick={uploadStatement}>
            {copy.uploadButton}
          </Button>
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={autoConfirmHighConfidence}
            onChange={(event) => setAutoConfirmHighConfidence(event.target.checked)}
          />
          <span>{copy.autoConfirmLabel}</span>
        </label>
      </section>

      {importSummary ? (
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">{copy.summaryLineCount}: <strong>{importSummary.lineCount}</strong></div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">{copy.summaryUnmatched}: <strong>{importSummary.unmatchedCount}</strong></div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">{copy.summarySuggested}: <strong>{importSummary.suggestedCount}</strong></div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">{copy.summaryConfirmed}: <strong>{importSummary.confirmedCount}</strong></div>
        </section>
      ) : (
        <p className="text-sm text-neutral-600">{copy.emptyImport}</p>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {workspace.lines.length > 0 ? (
        <section className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">{copy.colDate}</th>
                <th className="px-4 py-3 font-medium">{copy.colDescription}</th>
                <th className="px-4 py-3 font-medium text-right">{copy.colAmount}</th>
                <th className="px-4 py-3 font-medium">{copy.colStatus}</th>
                <th className="px-4 py-3 font-medium">{copy.colMatch}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {workspace.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3">{formatDate(line.transactionAt)}</td>
                  <td className="px-4 py-3">{line.description}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(line.amount, workspace.currency)}</td>
                  <td className="px-4 py-3">{resolveStatusLabel(line.matchStatus, copy)}</td>
                  <td className="px-4 py-3">
                    {line.matchStatus === "CONFIRMED" ? (
                      line.matchedCashTransactionTitle ?? "-"
                    ) : (
                      <Select
                        value={effectiveSelections[line.id] ?? ""}
                        onValueChange={(value) => setSelectedMatches((current) => ({ ...current, [line.id]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={copy.matchPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {workspace.candidateTransactions.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.title} · {formatMoney(candidate.amount, candidate.currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {line.matchStatus === "CONFIRMED" ? null : (
                      <div className="flex flex-col gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => applyMatch(line.id)}>
                          {copy.applyMatchButton}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending}
                          onClick={() => confirmLine(line.id, !effectiveSelections[line.id])}
                        >
                          {copy.confirmButton}
                        </Button>
                        {!effectiveSelections[line.id] ? (
                          <span className="text-xs text-neutral-500">{copy.confirmCreateHint}</span>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
