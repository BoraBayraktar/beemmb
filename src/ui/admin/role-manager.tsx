"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminMenuItem } from "@/ui/admin/admin-menu";

type Permission = {
  id: string;
  key: string;
  module: string;
  name: string;
};

function collectMenuPermissionKeys(items: AdminMenuItem[]): Set<string> {
  const keys = new Set<string>();

  for (const item of items) {
    if (item.permissionKey) {
      keys.add(item.permissionKey);
    }
    if (item.children) {
      for (const key of collectMenuPermissionKeys(item.children)) {
        keys.add(key);
      }
    }
  }

  return keys;
}

type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionKeys: string[];
  userCount: number;
};

type Props = {
  initialRoles: Role[];
  permissions: Permission[];
  menuTree: AdminMenuItem[];
  labels: {
    title: string;
    subtitle: string;
    newRole: string;
    key: string;
    name: string;
    description: string;
    menuAccessTitle: string;
    menuAccessHint: string;
    otherPermissionsTitle: string;
    save: string;
    create: string;
    cancel: string;
    edit: string;
    delete: string;
    systemRole: string;
    active: string;
    passive: string;
    users: string;
    operationFailed: string;
    permissionModules: Record<string, string>;
  };
};

const emptyForm = {
  id: "",
  key: "",
  name: "",
  description: "",
  isActive: true,
  permissionKeys: [] as string[],
};

export function RoleManager({ initialRoles, permissions, menuTree, labels }: Props) {
  const [roles, setRoles] = useState(initialRoles);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const menuPermissionKeys = collectMenuPermissionKeys(menuTree);
  const otherPermissions = permissions.filter((permission) => !menuPermissionKeys.has(permission.key));
  const groupedOtherPermissions = otherPermissions.reduce<Record<string, Permission[]>>((groups, permission) => {
    groups[permission.module] = [...(groups[permission.module] ?? []), permission];
    return groups;
  }, {});

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  function openCreateDrawer() {
    resetForm();
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (loading) {
      return;
    }

    setDrawerOpen(false);
    resetForm();
  }

  function editRole(role: Role) {
    setEditingId(role.id);
    setForm({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description ?? "",
      isActive: role.isActive,
      permissionKeys: role.permissionKeys,
    });
    setError(null);
    setDrawerOpen(true);
  }

  function togglePermission(permissionKey: string) {
    setForm((prev) => ({
      ...prev,
      permissionKeys: prev.permissionKeys.includes(permissionKey)
        ? prev.permissionKeys.filter((key) => key !== permissionKey)
        : [...prev.permissionKeys, permissionKey],
    }));
  }

  async function refreshRoles() {
    const response = await fetch("/api/admin/roles");
    if (!response.ok) {
      throw new Error(labels.operationFailed);
    }

    const payload = (await response.json()) as { roles: Role[] };
    setRoles(payload.roles);
  }

  async function submitRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(isEdit ? `/api/admin/roles/${editingId}` : "/api/admin/roles", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: form.key,
          name: form.name,
          description: form.description,
          isActive: form.isActive,
          permissionKeys: form.permissionKeys,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? labels.operationFailed);
      }

      resetForm();
      setDrawerOpen(false);
      await refreshRoles();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.operationFailed);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRole(roleId: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? labels.operationFailed);
      }

      await refreshRoles();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.operationFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.subtitle}</h2>
        </div>
        <Button type="button" onClick={openCreateDrawer}>{labels.newRole}</Button>
      </div>
      <div className="p-5">
        <div className="mt-5 grid gap-3">
          {roles.map((role) => (
            <article key={role.id} className="rounded-xl border border-[color:var(--color-border)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-[color:var(--color-text)]">{role.name}</h3>
                  <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{role.description}</p>
                  <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">{role.key} · {role.userCount} {labels.users}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[color:var(--color-bg-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text-muted)]">{role.isActive ? labels.active : labels.passive}</span>
                  {role.isSystem ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{labels.systemRole}</span> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {role.key !== "super-admin" ? <Button type="button" size="sm" variant="secondary" onClick={() => editRole(role)} disabled={loading}>{labels.edit}</Button> : null}
                {!role.isSystem ? <Button type="button" size="sm" variant="destructive" onClick={() => deleteRole(role.id)} disabled={loading}>{labels.delete}</Button> : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-[color:var(--color-text)]">{editingId ? labels.edit : labels.newRole}</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={loading}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitRole}>
              <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5">
                {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
                <div className="grid gap-2">
                  <Label>{labels.key}</Label>
                  <Input value={form.key} onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))} disabled={Boolean(editingId)} required />
                </div>
                <div className="grid gap-2">
                  <Label>{labels.name}</Label>
                  <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
                </div>
                <div className="grid gap-2">
                  <Label>{labels.description}</Label>
                  <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-[color:var(--color-text)]">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                  {labels.active}
                </label>
                <div className="grid gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--color-text)]">{labels.menuAccessTitle}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">{labels.menuAccessHint}</p>
                  </div>
                  {menuTree.map((group) => (
                    <div key={group.href} className="rounded-xl border border-[color:var(--color-border)] p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{group.label}</p>
                      <div className="grid gap-2">
                        {(group.children ?? [group]).map((item) => (
                          <label key={`${group.href}-${item.href}-${item.permissionKey}`} className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                            <input
                              type="checkbox"
                              checked={Boolean(item.permissionKey) && form.permissionKeys.includes(item.permissionKey!)}
                              onChange={() => item.permissionKey && togglePermission(item.permissionKey)}
                              disabled={!item.permissionKey}
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {otherPermissions.length > 0 ? (
                  <details className="rounded-xl border border-[color:var(--color-border)] p-3">
                    <summary className="cursor-pointer select-none text-sm font-semibold text-[color:var(--color-text)]">{labels.otherPermissionsTitle}</summary>
                    <div className="mt-3 grid gap-3">
                      {Object.entries(groupedOtherPermissions).map(([module, modulePermissions]) => (
                        <div key={module} className="rounded-xl border border-[color:var(--color-border)] p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.permissionModules[module] ?? module}</p>
                          <div className="grid gap-2">
                            {modulePermissions.map((permission) => (
                              <label key={permission.key} className="flex items-center gap-2 text-sm text-[color:var(--color-text)]">
                                <input type="checkbox" checked={form.permissionKeys.includes(permission.key)} onChange={() => togglePermission(permission.key)} />
                                {permission.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-5">
                <Button type="button" variant="secondary" onClick={closeDrawer} disabled={loading}>{labels.cancel}</Button>
                <Button type="submit" disabled={loading}>{editingId ? labels.save : labels.create}</Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
