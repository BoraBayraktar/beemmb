"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TenantStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "ARCHIVED";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  taxNumber: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: TenantStatus;
  isPlatformTenant: boolean;
};

type ModuleCatalogEntry = {
  key: string;
  name: string;
  description: string | null;
};

type Entitlement = {
  moduleKey: string;
  isEnabled: boolean;
};

type Props = {
  initialTenants: Tenant[];
  modules: ModuleCatalogEntry[];
  initialEntitlements: Array<{ tenantId: string; entitlements: Entitlement[] }>;
};

const STATUS_LABELS: Record<TenantStatus, string> = {
  ACTIVE: "Aktif",
  TRIAL: "Deneme",
  SUSPENDED: "Askıda",
  ARCHIVED: "Arşivlendi",
};

const emptyForm = {
  slug: "",
  name: "",
  legalName: "",
  taxNumber: "",
  contactEmail: "",
  contactPhone: "",
  moduleKeys: [] as string[],
  adminEmail: "",
  adminName: "",
  adminPassword: "",
};

export function PlatformTenantsManager({ initialTenants, modules, initialEntitlements }: Props) {
  const [tenants, setTenants] = useState(initialTenants);
  const [entitlementsByTenant, setEntitlementsByTenant] = useState<Record<string, Entitlement[]>>(
    Object.fromEntries(initialEntitlements.map((item) => [item.tenantId, item.entitlements])),
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEntitlement, setPendingEntitlement] = useState<string | null>(null);

  function toggleModuleKey(moduleKey: string) {
    setForm((prev) => ({
      ...prev,
      moduleKeys: prev.moduleKeys.includes(moduleKey)
        ? prev.moduleKeys.filter((key) => key !== moduleKey)
        : [...prev.moduleKeys, moduleKey],
    }));
  }

  function openCreateDrawer() {
    setForm(emptyForm);
    setError(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (loading) {
      return;
    }

    setDrawerOpen(false);
  }

  async function refreshTenants() {
    const response = await fetch("/api/admin/platform/tenants");
    if (!response.ok) {
      throw new Error("Tenant listesi yüklenemedi");
    }

    const payload = (await response.json()) as { items: Tenant[] };
    setTenants(payload.items);
  }

  async function submitTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          legalName: form.legalName || undefined,
          taxNumber: form.taxNumber || undefined,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
          moduleKeys: form.moduleKeys,
          adminUser: {
            email: form.adminEmail,
            name: form.adminName,
            password: form.adminPassword,
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "İşlem başarısız oldu");
      }

      const payload = (await response.json()) as { item: { tenant: Tenant } };
      setEntitlementsByTenant((prev) => ({
        ...prev,
        [payload.item.tenant.id]: form.moduleKeys.map((moduleKey) => ({ moduleKey, isEnabled: true })),
      }));
      setDrawerOpen(false);
      setForm(emptyForm);
      await refreshTenants();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "İşlem başarısız oldu");
    } finally {
      setLoading(false);
    }
  }

  async function toggleEntitlement(tenantId: string, moduleKey: string, isEnabled: boolean) {
    setPendingEntitlement(`${tenantId}:${moduleKey}`);

    try {
      const response = await fetch(`/api/admin/platform/tenants/${tenantId}/entitlements`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, isEnabled }),
      });

      if (!response.ok) {
        throw new Error("Entitlement güncellenemedi");
      }

      setEntitlementsByTenant((prev) => {
        const current = prev[tenantId] ?? [];
        const withoutModule = current.filter((item) => item.moduleKey !== moduleKey);
        return { ...prev, [tenantId]: [...withoutModule, { moduleKey, isEnabled }] };
      });
    } catch {
      // isteğin sonucu grid'i değiştirmez -- checkbox eski haline geri döner (yeniden render)
    } finally {
      setPendingEntitlement(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Platform Yönetimi</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">Tenant&apos;lar</h2>
        </div>
        <Button type="button" onClick={openCreateDrawer}>Yeni Tenant</Button>
      </div>

      <div className="grid gap-3 p-5">
        {tenants.map((tenant) => {
          const entitlements = entitlementsByTenant[tenant.id] ?? [];
          const enabledKeys = new Set(entitlements.filter((item) => item.isEnabled).map((item) => item.moduleKey));

          return (
            <article key={tenant.id} className="rounded-xl border border-[color:var(--color-border)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-[color:var(--color-text)]">{tenant.name}</h3>
                  <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{tenant.slug} · {tenant.contactEmail}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[color:var(--color-bg-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text-muted)]">{STATUS_LABELS[tenant.status]}</span>
                  {tenant.isPlatformTenant ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Platform</span> : null}
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Modül Erişimi</p>
                <div className="flex flex-wrap gap-3">
                  {modules.map((module) => {
                    const key = `${tenant.id}:${module.key}`;
                    return (
                      <label key={module.key} className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                        <input
                          type="checkbox"
                          checked={enabledKeys.has(module.key)}
                          disabled={pendingEntitlement === key}
                          onChange={(event) => toggleEntitlement(tenant.id, module.key, event.target.checked)}
                        />
                        {module.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Kapat" className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">Platform Yönetimi</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-[color:var(--color-text)]">Yeni Tenant</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={loading}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitTenant}>
              <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5">
                {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

                <div className="grid gap-2">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} placeholder="ornek-sirket" required />
                </div>
                <div className="grid gap-2">
                  <Label>Şirket Adı</Label>
                  <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
                </div>
                <div className="grid gap-2">
                  <Label>Ünvan (opsiyonel)</Label>
                  <Input value={form.legalName} onChange={(event) => setForm((prev) => ({ ...prev, legalName: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Vergi Numarası (opsiyonel)</Label>
                  <Input value={form.taxNumber} onChange={(event) => setForm((prev) => ({ ...prev, taxNumber: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>İletişim E-postası</Label>
                  <Input type="email" value={form.contactEmail} onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))} required />
                </div>
                <div className="grid gap-2">
                  <Label>İletişim Telefonu (opsiyonel)</Label>
                  <Input value={form.contactPhone} onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))} />
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">Açık Modüller</p>
                  <div className="rounded-xl border border-[color:var(--color-border)] p-3">
                    <div className="grid gap-2">
                      {modules.map((module) => (
                        <label key={module.key} className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                          <input type="checkbox" checked={form.moduleKeys.includes(module.key)} onChange={() => toggleModuleKey(module.key)} />
                          {module.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 rounded-xl border border-[color:var(--color-border)] p-3">
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">İlk Yönetici Kullanıcı</p>
                  <div className="grid gap-2">
                    <Label>E-posta</Label>
                    <Input type="email" value={form.adminEmail} onChange={(event) => setForm((prev) => ({ ...prev, adminEmail: event.target.value }))} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ad Soyad</Label>
                    <Input value={form.adminName} onChange={(event) => setForm((prev) => ({ ...prev, adminName: event.target.value }))} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Şifre</Label>
                    <Input type="password" value={form.adminPassword} onChange={(event) => setForm((prev) => ({ ...prev, adminPassword: event.target.value }))} minLength={6} required />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-5">
                <Button type="button" variant="secondary" onClick={closeDrawer} disabled={loading}>Vazgeç</Button>
                <Button type="submit" disabled={loading}>Oluştur</Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
