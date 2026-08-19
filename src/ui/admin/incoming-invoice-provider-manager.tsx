"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminIncomingInvoiceProviderConfigItem } from "@/modules/incoming-invoices/contracts/incoming-invoice.contract";

export function IncomingInvoiceProviderManager({ items }: { items: AdminIncomingInvoiceProviderConfigItem[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerCode, setProviderCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [username, setUsername] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  async function saveProvider() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/incoming-invoices/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerCode,
          displayName,
          endpointUrl: endpointUrl || undefined,
          username: username || undefined,
          secretKey: secretKey || undefined,
          webhookSecret: webhookSecret || undefined,
          isActive,
          isDefault,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? "İşlem başarısız oldu.");
        return;
      }

      router.refresh();
      setProviderCode("");
      setDisplayName("");
      setEndpointUrl("");
      setUsername("");
      setSecretKey("");
      setWebhookSecret("");
      setIsActive(false);
      setIsDefault(false);
    } catch {
      setError("İşlem başarısız oldu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">Gelen Fatura Entegratörleri</h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          Şu an aktif bir e-fatura entegratörü (Nilvera, Foriba, Uyumsoft vb.) bağlı değil. Bu ekran, ileride bir
          entegratör bağlanacağı zaman kullanılacak yapılandırma altyapısını hazırlar — bir sağlayıcı kaydedip
          &ldquo;Aktif&rdquo; işaretlemediğiniz sürece hiçbir otomatik senkronizasyon çalışmaz.
        </p>
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {items.length === 0 ? (
              <article className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 text-sm text-[color:var(--color-text-muted)]">
                Henüz kayıtlı bir entegratör yapılandırması yok.
              </article>
            ) : items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4 text-sm text-[color:var(--color-text)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{item.displayName}</Badge>
                  {item.isDefault ? <Badge className="border-sky-200 bg-sky-100 text-sky-700">Varsayılan</Badge> : null}
                  {item.isActive ? (
                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">Aktif</Badge>
                  ) : (
                    <Badge className="border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] text-[color:var(--color-text-muted)]">Pasif</Badge>
                  )}
                </div>
                <p className="mt-2">Sağlayıcı kodu: {item.providerCode}</p>
                <p className="mt-1">
                  Adaptör: {item.adapterRegistered ? "Kayıtlı" : "Kayıtlı değil"}
                  {item.adapterRegistered ? ` (${item.adapterConfigured ? "yapılandırılmış" : "yapılandırılmamış"})` : ""}
                </p>
                <p className="mt-1">Uç nokta: {item.endpointUrl ?? "Belirtilmemiş"}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-3 rounded-2xl border border-[color:var(--color-border)] p-4">
            <Input value={providerCode} onChange={(event) => setProviderCode(event.target.value)} placeholder="Sağlayıcı kodu" />
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Görünen ad" />
            <Input value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} placeholder="Uç nokta URL" />
            <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Kullanıcı adı" />
            <Input type="password" autoComplete="new-password" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} placeholder="Gizli anahtar" />
            <Input type="password" autoComplete="new-password" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} placeholder="Webhook gizli anahtarı" />
            <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Aktif
            </label>
            <label className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
              <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
              Varsayılan
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="button" onClick={() => void saveProvider()} disabled={pending || !providerCode || !displayName}>
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
