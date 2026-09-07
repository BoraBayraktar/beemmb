"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DelegationSummary } from "@/modules/delegation/contracts/delegation.contract";
import { ConfirmDeleteButton } from "@/ui/admin/confirm-delete-button";

export type DelegationManagerLabels = {
  pageTitle: string;
  pageDescription: string;
  giveTitle: string;
  granteeLabel: string;
  granteePlaceholder: string;
  startLabel: string;
  endLabel: string;
  submit: string;
  givenListTitle: string;
  receivedListTitle: string;
  revoke: string;
  statusActive: string;
  statusRevoked: string;
  statusExpired: string;
  emptyGiven: string;
  emptyReceived: string;
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  cancel: string;
  save: string;
  loading: string;
  opFailed: string;
};

type GrantableUser = { id: string; name: string; email: string };

type Props = {
  currentUserId: string;
  initialGiven: DelegationSummary[];
  initialReceived: DelegationSummary[];
  grantableUsers: GrantableUser[];
  labels: DelegationManagerLabels;
};

function statusVariant(status: DelegationSummary["status"]): "accent" | "secondary" | "outline" {
  if (status === "ACTIVE") return "accent";
  if (status === "REVOKED") return "outline";
  return "secondary";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR");
}

export function DelegationManager({ initialGiven, initialReceived, grantableUsers, labels }: Props) {
  const router = useRouter();
  const [granteeUserId, setGranteeUserId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  function statusLabel(status: DelegationSummary["status"]) {
    if (status === "ACTIVE") return labels.statusActive;
    if (status === "REVOKED") return labels.statusRevoked;
    return labels.statusExpired;
  }

  async function submitDelegation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!granteeUserId || !startAt || !endAt) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/delegation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      const response = await fetch(`/api/admin/delegation/${id}`, { method: "DELETE" });
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
            <div className="grid gap-2 sm:col-span-2">
              <Label>{labels.granteeLabel}</Label>
              <Select value={granteeUserId} onValueChange={setGranteeUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={labels.granteePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {grantableUsers.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name} • {candidate.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{labels.startLabel}</Label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>{labels.endLabel}</Label>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting || !granteeUserId}>
                {submitting ? labels.loading : labels.submit}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.givenListTitle}</CardTitle>
          <CardDescription>{labels.emptyGiven}</CardDescription>
        </CardHeader>
        <CardContent>
          {initialGiven.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-muted)]">{labels.emptyGiven}</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-border)]">
              {initialGiven.map((item) => (
                <article key={item.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-medium text-[color:var(--color-text)]">{item.granteeName}</p>
                    <p className="text-sm text-[color:var(--color-text-muted)]">
                      {formatDateTime(item.startAt)} – {formatDateTime(item.endAt)}
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

      <Card>
        <CardHeader>
          <CardTitle>{labels.receivedListTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {initialReceived.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-muted)]">{labels.emptyReceived}</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-border)]">
              {initialReceived.map((item) => (
                <article key={item.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-medium text-[color:var(--color-text)]">{item.grantorName}</p>
                    <p className="text-sm text-[color:var(--color-text-muted)]">
                      {formatDateTime(item.startAt)} – {formatDateTime(item.endAt)}
                    </p>
                  </div>
                  <div className="sm:justify-self-end">
                    <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
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
