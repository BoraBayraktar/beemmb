"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminDocumentProviderConfigItem } from "@/modules/documents/contracts/document.contract";

type Labels = {
  title: string;
  description: string;
  providerCode: string;
  providerDisplayName: string;
  providerEndpointUrl: string;
  providerSenderLabel: string;
  providerSenderVkn: string;
  providerUsername: string;
  providerSecret: string;
  providerWebhookSecret: string;
  providerCompanyName: string;
  providerSupportsStatusSync: string;
  providerIsActive: string;
  providerIsDefault: string;
  providerSave: string;
  saving: string;
  providerNone: string;
  notSpecified: string;
  operationFailed: string;
  adapterRegistered: string;
  adapterConfigured: string;
  adapterOperational: string;
  adapterReady: string;
  adapterNotReady: string;
};

export function DocumentProviderManager({
  items,
  labels,
}: {
  items: AdminDocumentProviderConfigItem[];
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerCode, setProviderCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [senderLabel, setSenderLabel] = useState("");
  const [senderVkn, setSenderVkn] = useState("");
  const [username, setUsername] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [supportsStatusSync, setSupportsStatusSync] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(items.length === 0);

  async function saveProvider() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/documents/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerCode,
          channel: "EDOCS_MOCK",
          displayName,
          endpointUrl: endpointUrl || undefined,
          senderLabel: senderLabel || undefined,
          senderVkn: senderVkn || undefined,
          username: username || undefined,
          secretKey: secretKey || undefined,
          webhookSecret: webhookSecret || undefined,
          companyName: companyName || undefined,
          supportsStatusSync,
          isActive,
          isDefault,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.operationFailed);
        return;
      }

      router.refresh();
      setProviderCode("");
      setDisplayName("");
      setEndpointUrl("");
      setSenderLabel("");
      setSenderVkn("");
      setUsername("");
      setSecretKey("");
      setWebhookSecret("");
      setCompanyName("");
      setSupportsStatusSync(true);
      setIsActive(true);
      setIsDefault(false);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{labels.title}</h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {items.length === 0 ? (
              <article className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 text-sm text-[color:var(--color-text-muted)]">{labels.providerNone}</article>
            ) : items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 text-sm text-[color:var(--color-text)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{item.displayName}</Badge>
                  {item.isDefault ? <Badge className="border-sky-200 bg-sky-100 text-sky-700">{labels.providerIsDefault}</Badge> : null}
                  {item.isActive ? <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">{labels.providerIsActive}</Badge> : null}
                </div>
                <p className="mt-2">{labels.providerCode}: {item.providerCode}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className={item.adapterRegistered ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-rose-200 bg-rose-100 text-rose-700"}>
                    {labels.adapterRegistered}: {item.adapterRegistered ? labels.adapterReady : labels.adapterNotReady}
                  </Badge>
                  <Badge className={item.adapterConfigured ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-amber-200 bg-amber-100 text-amber-700"}>
                    {labels.adapterConfigured}: {item.adapterConfigured ? labels.adapterReady : labels.adapterNotReady}
                  </Badge>
                  <Badge className={item.adapterOperational ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-amber-200 bg-amber-100 text-amber-700"}>
                    {labels.adapterOperational}: {item.adapterOperational ? labels.adapterReady : labels.adapterNotReady}
                  </Badge>
                </div>
                <p className="mt-1">{labels.providerEndpointUrl}: {item.endpointUrl ?? labels.notSpecified}</p>
                <p className="mt-1">{labels.providerUsername}: {item.username ?? labels.notSpecified}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-3 rounded-2xl border border-[color:var(--color-border)] p-4">
            <Input value={providerCode} onChange={(event) => setProviderCode(event.target.value)} placeholder={labels.providerCode} />
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={labels.providerDisplayName} />
            <Input value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} placeholder={labels.providerEndpointUrl} />
            <Input value={senderLabel} onChange={(event) => setSenderLabel(event.target.value)} placeholder={labels.providerSenderLabel} />
            <Input value={senderVkn} onChange={(event) => setSenderVkn(event.target.value)} placeholder={labels.providerSenderVkn} />
            <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={labels.providerUsername} />
            <Input type="password" autoComplete="new-password" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} placeholder={labels.providerSecret} />
            <Input type="password" autoComplete="new-password" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} placeholder={labels.providerWebhookSecret} />
            <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder={labels.providerCompanyName} />
            <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]"><input type="checkbox" checked={supportsStatusSync} onChange={(event) => setSupportsStatusSync(event.target.checked)} />{labels.providerSupportsStatusSync}</label>
            <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />{labels.providerIsActive}</label>
            <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />{labels.providerIsDefault}</label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="button" onClick={() => void saveProvider()} disabled={pending}>
              {pending ? labels.saving : labels.providerSave}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
