"use client";

import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorToast } from "@/components/ui/toast";
import type {
  AdminBackofficeUserOption,
  AdminExpenseApprovalChainStepItem,
  AdminExpenseCategoryItem,
} from "@/modules/expense-reports/contracts/expense-settings.contract";

type ChainStepRow = {
  key: string;
  stepOrder: number;
  approverUserId: string;
  notifyEmail: string;
  description: string;
  canApprove: boolean;
  canReject: boolean;
  canReturn: boolean;
};

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return payload?.message ?? fallback;
}

function toRows(steps: AdminExpenseApprovalChainStepItem[]): ChainStepRow[] {
  return steps.map((step) => ({
    key: step.id,
    stepOrder: step.stepOrder,
    approverUserId: step.approverUserId,
    notifyEmail: step.notifyEmail ?? "",
    description: step.description ?? "",
    canApprove: step.canApprove,
    canReject: step.canReject,
    canReturn: step.canReturn,
  }));
}

export function ExpenseSettingsManager({
  steps,
  candidates,
  categories,
}: {
  steps: AdminExpenseApprovalChainStepItem[];
  candidates: AdminBackofficeUserOption[];
  categories: AdminExpenseCategoryItem[];
}) {
  const rowKeyPrefix = useId();
  const [rows, setRows] = useState<ChainStepRow[]>(toRows(steps));
  const [chainPending, setChainPending] = useState(false);
  const [chainSaved, setChainSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryList, setCategoryList] = useState(categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryPending, setCategoryPending] = useState(false);

  const sortedRows = [...rows].sort((a, b) => a.stepOrder - b.stepOrder);

  function addRow() {
    const nextOrder = rows.length > 0 ? Math.max(...rows.map((row) => row.stepOrder)) + 1 : 1;
    setRows((current) => [
      ...current,
      {
        key: `${rowKeyPrefix}-${Date.now()}-${current.length}`,
        stepOrder: nextOrder,
        approverUserId: "",
        notifyEmail: "",
        description: "",
        canApprove: true,
        canReject: true,
        canReturn: true,
      },
    ]);
    setChainSaved(false);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
    setChainSaved(false);
  }

  function updateRow(key: string, patch: Partial<ChainStepRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setChainSaved(false);
  }

  async function saveChain() {
    setError(null);

    if (rows.length === 0) {
      setError("En az bir onaycı tanımlamalısınız.");
      return;
    }
    if (rows.some((row) => !row.approverUserId)) {
      setError("Tüm satırlar için bir onaycı seçilmelidir.");
      return;
    }
    const approverIds = rows.map((row) => row.approverUserId);
    if (new Set(approverIds).size !== approverIds.length) {
      setError("Aynı onaycı zincirde birden fazla kez yer alamaz.");
      return;
    }
    if (rows.some((row) => !row.canApprove && !row.canReject && !row.canReturn)) {
      setError("Her onaycı için en az bir işlem yetkisi (Onayla/Reddet/Geri Gönder) seçilmelidir.");
      return;
    }

    setChainPending(true);
    setChainSaved(false);
    try {
      const response = await fetch("/api/admin/expense-reports/settings/approval-chain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: sortedRows.map((row) => ({
            stepOrder: row.stepOrder,
            approverUserId: row.approverUserId,
            notifyEmail: row.notifyEmail || null,
            description: row.description || null,
            canApprove: row.canApprove,
            canReject: row.canReject,
            canReturn: row.canReturn,
          })),
        }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Onay akışı kaydedilemedi."));
        return;
      }
      const payload = await response.json();
      setRows(toRows(payload.steps ?? []));
      setChainSaved(true);
    } finally {
      setChainPending(false);
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;

    setCategoryPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/expense-reports/settings/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName, sortOrder: categoryList.length }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Kategori eklenemedi."));
        return;
      }
      const payload = await response.json();
      setCategoryList((current) => [...current, payload.item]);
      setNewCategoryName("");
    } finally {
      setCategoryPending(false);
    }
  }

  async function toggleCategory(category: AdminExpenseCategoryItem) {
    setCategoryPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/expense-reports/settings/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: category.name, isActive: !category.isActive, sortOrder: category.sortOrder }),
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Kategori güncellenemedi."));
        return;
      }
      const payload = await response.json();
      setCategoryList((current) => current.map((item) => (item.id === category.id ? payload.item : item)));
    } finally {
      setCategoryPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorToast message={error} onDismiss={() => setError(null)} /> : null}

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[color:var(--color-text)]">Onay Akışı</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
          Masraf bildirimleri, aşağıdaki sıraya göre onaycılardan geçer. Bir onaycı onayladığında bildirim otomatik olarak sıradaki
          onaycıya iletilir; son onaycı da onayladığında bildirim muhasebeleştirilir.
        </p>

        <div className="mt-4 space-y-3">
          {sortedRows.map((row) => (
            <div key={row.key} className="space-y-3 rounded-2xl border border-[color:var(--color-border)] p-3">
            <div className="grid gap-3 md:grid-cols-[80px_1.4fr_1.2fr_1.4fr_auto]">
              <div>
                <Label>Sıra</Label>
                <Input
                  type="number"
                  min={1}
                  value={row.stepOrder}
                  onChange={(event) => updateRow(row.key, { stepOrder: Number(event.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Onaycı</Label>
                <Select value={row.approverUserId} onValueChange={(value) => updateRow(row.key, { approverUserId: value })}>
                  <SelectTrigger><SelectValue placeholder="Onaycı seçin" /></SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>{candidate.name} ({candidate.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bildirim e-postası (opsiyonel)</Label>
                <Input
                  value={row.notifyEmail}
                  onChange={(event) => updateRow(row.key, { notifyEmail: event.target.value })}
                  placeholder="onaycının e-postası farklıysa"
                />
              </div>
              <div>
                <Label>Açıklama (opsiyonel)</Label>
                <Input
                  value={row.description}
                  onChange={(event) => updateRow(row.key, { description: event.target.value })}
                  placeholder="ör. Finans Müdürü"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={() => removeRow(row.key)}>Çıkar</Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-dashed border-[color:var(--color-border)] pt-3">
              <span className="text-xs font-medium text-[color:var(--color-text-muted)]">Bu onaycı şunları yapabilir:</span>
              <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                <Checkbox checked={row.canApprove} onCheckedChange={(checked) => updateRow(row.key, { canApprove: checked === true })} />
                Onayla
              </label>
              <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                <Checkbox checked={row.canReject} onCheckedChange={(checked) => updateRow(row.key, { canReject: checked === true })} />
                Reddet
              </label>
              <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                <Checkbox checked={row.canReturn} onCheckedChange={(checked) => updateRow(row.key, { canReturn: checked === true })} />
                Geri Gönder
              </label>
            </div>
            </div>
          ))}
          {sortedRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-4 text-sm text-[color:var(--color-text-muted)]">
              Henüz bir onaycı tanımlanmadı.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={addRow}>Onaycı Ekle</Button>
          <Button type="button" onClick={() => void saveChain()} disabled={chainPending}>Kaydet</Button>
          {chainSaved ? <span className="text-sm text-emerald-600">Kaydedildi.</span> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[color:var(--color-text)]">Harcama Kategorileri</h2>

        <div className="mt-4 space-y-2">
          {categoryList.map((category) => (
            <div key={category.id} className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[color:var(--color-text)]">{category.name}</span>
                {!category.isActive ? <Badge className="border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text-muted)]">Pasif</Badge> : null}
              </div>
              <Button type="button" variant="outline" disabled={categoryPending} onClick={() => void toggleCategory(category)}>
                {category.isActive ? "Pasifleştir" : "Aktifleştir"}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Yeni kategori adı" />
          <Button type="button" onClick={() => void addCategory()} disabled={categoryPending || !newCategoryName.trim()}>Ekle</Button>
        </div>
      </section>
    </div>
  );
}
