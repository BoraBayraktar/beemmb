"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DelegationSummary } from "@/modules/delegation/contracts/delegation.contract";
import { ConfirmDeleteButton } from "@/ui/admin/confirm-delete-button";

export type DelegationAdminManagerLabels = {
  pageTitle: string;
  pageDescription: string;
  giveTitle: string;
  grantorLabel: string;
  grantorPlaceholder: string;
  granteeLabel: string;
  granteePlaceholder: string;
  startLabel: string;
  endLabel: string;
  submit: string;
  listTitle: string;
  searchPlaceholder: string;
  emptyList: string;
  grantorColumn: string;
  granteeColumn: string;
  createdByLabel: string;
  createdBySelf: string;
  revoke: string;
  statusActive: string;
  statusRevoked: string;
  statusExpired: string;
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  cancel: string;
  loading: string;
  opFailed: string;
};

type SelectableUser = { id: string; name: string; email: string };

type Props = {
  initialItems: DelegationSummary[];
  users: SelectableUser[];
  labels: DelegationAdminManagerLabels;
};

function statusVariant(status: DelegationSummary["status"]): "accent" | "secondary" | "outline" {
  if (status === "ACTIVE") return "accent";
  if (status === "REVOKED") return "outline";
  return "secondary";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR");
}

export function DelegationAdminManager({ initialItems, users, labels }: Props) {
  const router = useRouter();
  const [grantorUserId, setGrantorUserId] = useState("");
  const [granteeUserId, setGranteeUserId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  function statusLabel(status: DelegationSummary["status"]) {
    if (status === "ACTIVE") return labels.statusActive;
    if (status === "REVOKED") return labels.statusRevoked;
    return labels.statusExpired;
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    if (!term) {
      return initialItems;
    }
    return initialItems.filter(
      (item) =>
        item.grantorName.toLocaleLowerCase("tr-TR").includes(term) ||
        item.granteeName.toLocaleLowerCase("tr-TR").includes(term),
    );
  }, [initialItems, search]);

  async function submitDelegation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!grantorUserId || !granteeUserId || !startAt || !endAt) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/delegations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantorUserId,
          granteeUserId,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      setGrantorUserId("");
      setGranteeUserId("");
      setStartAt("");
      setEndAt("");
      router.refresh();
    } catch {
      setError(labels.opFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeDelegation(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/delegations/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }
      router.refresh();
    } catch {
      setError(labels.opFailed);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--color-text)]">{labels.pageTitle}</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.pageDescription}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.giveTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitDelegation}>
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">{error}</p>
            ) : null}
            <div className="grid gap-2">
              <Label>{labels.grantorLabel}</Label>
              <Select value={grantorUserId} onValueChange={setGrantorUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={labels.grantorPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name} • {candidate.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{labels.granteeLabel}</Label>
              <Select value={granteeUserId} onValueChange={setGranteeUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={labels.granteePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((candidate) => candidate.id !== grantorUserId)
                    .map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name} • {candidate.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{labels.startLabel}</Label>
              <Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>{labels.endLabel}</Label>
              <Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting || !grantorUserId || !granteeUserId}>
                {submitting ? labels.loading : labels.submit}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>{labels.listTitle}</CardTitle>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="sm:max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-muted)]">{labels.emptyList}</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-border)]">
              {filteredItems.map((item) => (
                <article key={item.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-medium text-[color:var(--color-text)]">
                      {labels.grantorColumn}: {item.grantorName} → {labels.granteeColumn}: {item.granteeName}
                    </p>
                    <p className="text-sm text-[color:var(--color-text-muted)]">
                      {formatDateTime(item.startAt)} – {formatDateTime(item.endAt)}
                    </p>
                    <p className="text-xs text-[color:var(--color-text-muted)]">
                      {labels.createdByLabel}: {item.createdByUserId === item.grantorUserId ? labels.createdBySelf : (item.createdByName ?? "—")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                    {item.status === "ACTIVE" ? (
                      <ConfirmDeleteButton
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={revokingId === item.id}
                        onConfirm={() => revokeDelegation(item.id)}
                        title={labels.revokeConfirmTitle}
                        description={labels.revokeConfirmDescription}
                        confirmLabel={labels.revoke}
                        cancelLabel={labels.cancel}
                      >
                        {labels.revoke}
                      </ConfirmDeleteButton>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
