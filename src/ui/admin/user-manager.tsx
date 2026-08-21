"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserItem = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR" | "CUSTOMER";
  roleIds: string[];
  roleNames: string[];
  createdAt: string;
};

type AvailableRole = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
};

type Labels = {
  title: string;
  createTitle: string;
  listTitle: string;
  search: string;
  allRoles: string;
  roleAdmin: string;
  roleEditor: string;
  roleCustomer: string;
  email: string;
  name: string;
  role: string;
  roles: string;
  password: string;
  passwordOptional: string;
  changePassword: string;
  page: string;
  prev: string;
  next: string;
  save: string;
  create: string;
  edit: string;
  delete: string;
  cancel: string;
  empty: string;
  opFailed: string;
  validationRequired: string;
  validationPassword: string;
  validationDeleteSelf: string;
  loading: string;
};

type Props = {
  initialResult: {
    items: UserItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  labels: Labels;
  availableRoles?: AvailableRole[];
  fixedRole?: "CUSTOMER";
};

type DrawerMode = "create" | "edit";

type UserForm = {
  email: string;
  name: string;
  roleIds: string[];
  password: string;
};

const emptyForm: UserForm = {
  email: "",
  name: "",
  roleIds: [],
  password: "",
};

function mapPayload(form: UserForm, mode: DrawerMode, fixedRole?: "CUSTOMER") {
  if (mode === "create") {
    return {
      email: form.email,
      name: form.name,
      ...(fixedRole ? { role: fixedRole } : {}),
      roleIds: form.roleIds,
      password: form.password,
    };
  }

  return {
    email: form.email,
    name: form.name,
    ...(fixedRole ? { role: fixedRole } : {}),
    roleIds: form.roleIds,
    ...(form.password.trim() ? { password: form.password } : {}),
  };
}

const ALL_ROLES = "__all_roles__";

export function UserManager({ initialResult, labels, availableRoles = [], fixedRole }: Props) {
  const [result, setResult] = useState(initialResult);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<typeof ALL_ROLES | "ADMIN" | "EDITOR" | "CUSTOMER">(fixedRole ?? ALL_ROLES);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [createForm, setCreateForm] = useState<UserForm>(emptyForm);
  const [editForm, setEditForm] = useState<UserForm>(emptyForm);

  const activeForm = drawerMode === "edit" ? editForm : createForm;
  const activeTitle = drawerMode === "edit" ? labels.edit : labels.createTitle;
  const activeSubmit = drawerMode === "edit" ? labels.save : labels.create;

  function patchActiveField(field: keyof UserForm, value: string) {
    if (drawerMode === "edit") {
      setEditForm((prev) => ({ ...prev, [field]: value }));
      return;
    }

    setCreateForm((prev) => ({ ...prev, [field]: value }));
  }

  function validateForm(form: UserForm, mode: DrawerMode) {
    if (!form.email.trim() || !form.name.trim()) {
      return labels.validationRequired;
    }

    if (!fixedRole && form.roleIds.length === 0) {
      return labels.validationRequired;
    }

    if (mode === "create" && form.password.trim().length < 6) {
      return labels.validationPassword;
    }

    if (mode === "edit" && form.password.trim() && form.password.trim().length < 6) {
      return labels.validationPassword;
    }

    return null;
  }

  async function fetchUsers(nextQuery: string, nextRole: typeof ALL_ROLES | "ADMIN" | "EDITOR" | "CUSTOMER", page: number) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) {
      params.set("search", nextQuery.trim());
    }

    if (nextRole !== ALL_ROLES) {
      params.set("role", nextRole);
    }

    params.set("page", String(page));
    params.set("pageSize", String(result.pageSize));

    const response = await fetch(`/api/admin/users?${params.toString()}`, {
      method: "GET",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? labels.opFailed);
    }

    const payload = (await response.json()) as typeof initialResult;
    setResult(payload);
  }

  function openCreateDrawer() {
    setError(null);
    setEditingId(null);
    setPasswordChangeOpen(false);
    setCreateForm(emptyForm);
    setDrawerMode("create");
  }

  function openEditDrawer(user: UserItem) {
    setError(null);
    setEditingId(user.id);
    setPasswordChangeOpen(false);
    setEditForm({
      email: user.email,
      name: user.name,
      roleIds: user.roleIds,
      password: "",
    });
    setDrawerMode("edit");
  }

  function closeDrawer() {
    if (loading) {
      return;
    }

    setDrawerMode(null);
    setEditingId(null);
    setPasswordChangeOpen(false);
    setError(null);
  }

  async function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await fetchUsers(query, roleFilter, 1);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  async function goToPage(nextPage: number) {
    setLoading(true);
    setError(null);

    try {
      await fetchUsers(query, roleFilter, nextPage);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  async function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!drawerMode) {
      return;
    }

    const form = drawerMode === "edit" ? editForm : createForm;
    const validationError = validateForm(form, drawerMode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(drawerMode === "edit" && editingId ? `/api/admin/users/${editingId}` : "/api/admin/users", {
        method: drawerMode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mapPayload(form, drawerMode, fixedRole)),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      setCreateForm(emptyForm);
      setDrawerMode(null);
      setEditingId(null);
      setPasswordChangeOpen(false);
      await fetchUsers(query, roleFilter, result.page);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(userId: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = payload?.message ?? labels.opFailed;
        setError(message.includes("own account") ? labels.validationDeleteSelf : message);
        return;
      }

      await fetchUsers(query, roleFilter, Math.min(result.page, Math.max(1, result.totalPages)));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : labels.opFailed);
    } finally {
      setLoading(false);
    }
  }

  function getRoleLabel(role: "ADMIN" | "EDITOR" | "CUSTOMER") {
    if (role === "ADMIN") {
      return labels.roleAdmin;
    }

    if (role === "EDITOR") {
      return labels.roleEditor;
    }

    return labels.roleCustomer;
  }

  function toggleRole(roleId: string) {
    const patchRoleIds = (prev: UserForm) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    });

    if (drawerMode === "edit") {
      setEditForm(patchRoleIds);
      return;
    }

    setCreateForm(patchRoleIds);
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.listTitle}</h2>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{result.total} kullanıcı listeleniyor</p>
        </div>
        <Button type="button" onClick={openCreateDrawer}>{labels.createTitle}</Button>
      </div>

      <div className="p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <form className={`mb-5 grid gap-3 ${fixedRole ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-[1fr_180px_auto]"}`} onSubmit={applyFilters}>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
          {!fixedRole ? (
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof ALL_ROLES | "ADMIN" | "EDITOR" | "CUSTOMER")}>
              <SelectTrigger>
                <SelectValue placeholder={labels.allRoles} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ROLES}>{labels.allRoles}</SelectItem>
                <SelectItem value="ADMIN">{labels.roleAdmin}</SelectItem>
                <SelectItem value="EDITOR">{labels.roleEditor}</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <Button type="submit" variant="secondary" disabled={loading}>{labels.search}</Button>
        </form>

        <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)]">
          <div className="hidden grid-cols-[1.1fr_1fr_140px_190px] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
            <span>{labels.name}</span>
            <span>{labels.email}</span>
            <span>{labels.role}</span>
            <span className="text-right">Islem</span>
          </div>

          {result.items.length === 0 ? (
            <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{labels.empty}</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-border)]">
              {result.items.map((user) => (
                <article key={user.id} className="grid gap-4 p-4 lg:grid-cols-[1.1fr_1fr_140px_190px] lg:items-center">
                  <div>
                    <h3 className="font-medium text-[color:var(--color-text)]">{user.name}</h3>
                  </div>
                  <p className="text-sm text-[color:var(--color-text-muted)]">{user.email}</p>
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">{user.roleNames.length > 0 ? user.roleNames.join(", ") : getRoleLabel(user.role)}</p>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => openEditDrawer(user)}>{labels.edit}</Button>
                    <Button type="button" size="sm" variant="destructive" disabled={loading} onClick={() => deleteUser(user.id)}>{labels.delete}</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" disabled={result.page <= 1 || loading} onClick={() => goToPage(Math.max(1, result.page - 1))}>{labels.prev}</Button>
          <span className="text-sm text-[color:var(--color-text-muted)]">{labels.page} {result.page}/{result.totalPages}</span>
          <Button type="button" variant="secondary" disabled={result.page >= result.totalPages || loading} onClick={() => goToPage(Math.min(result.totalPages, result.page + 1))}>{labels.next}</Button>
        </div>
      </div>

      {drawerMode ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label={labels.cancel} className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[color:var(--color-border)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{activeTitle}</h3>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={closeDrawer} disabled={loading}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitUser}>
              <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5">
                <div className="grid gap-2">
                  <Label>{labels.name}</Label>
                  <Input value={activeForm.name} onChange={(event) => patchActiveField("name", event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>{labels.email}</Label>
                  <Input type="email" value={activeForm.email} onChange={(event) => patchActiveField("email", event.target.value)} required />
                </div>
                {!fixedRole ? (
                  <div className="grid gap-2">
                    <Label>{labels.roles}</Label>
                    <div className="grid gap-2 rounded-xl border border-[color:var(--color-border)] p-3">
                      {availableRoles.map((role) => (
                        <label key={role.id} className="flex items-start gap-2 text-sm text-[color:var(--color-text)]">
                          <input type="checkbox" className="mt-1" checked={activeForm.roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                          <span>
                            <span className="block font-medium text-[color:var(--color-text)]">{role.name}</span>
                            {role.description ? <span className="block text-xs text-[color:var(--color-text-muted)]">{role.description}</span> : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                {drawerMode === "create" ? (
                  <div className="grid gap-2">
                    <Label>{labels.password}</Label>
                    <Input type="password" value={activeForm.password} onChange={(event) => patchActiveField("password", event.target.value)} required />
                  </div>
                ) : (
                  <div className="grid gap-2 rounded-xl border border-[color:var(--color-border)] p-3">
                    {passwordChangeOpen ? (
                      <>
                        <Label>{labels.passwordOptional}</Label>
                        <Input type="password" value={activeForm.password} onChange={(event) => patchActiveField("password", event.target.value)} autoFocus />
                      </>
                    ) : (
                      <Button type="button" variant="secondary" onClick={() => setPasswordChangeOpen(true)}>
                        {labels.changePassword}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-5">
                <Button type="button" variant="secondary" onClick={closeDrawer} disabled={loading}>{labels.cancel}</Button>
                <Button type="submit" disabled={loading}>{loading ? labels.loading : activeSubmit}</Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
