"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AccountMenuLabels = {
  menuLabel: string;
  logout: string;
  loading: string;
  changePassword: string;
  changePasswordDescription: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  save: string;
  cancel: string;
  passwordMismatch: string;
  changePasswordSuccess: string;
  currentPasswordInvalid: string;
  passwordReuseNotAllowed: string;
  passwordTooShort: string;
  operationFailed: string;
};

type Props = {
  locale: string;
  labels: AccountMenuLabels;
};

const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function UserAccountMenu({ locale, labels }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyPasswordForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/identity/logout", { method: "POST" });
      router.push(`/${locale}/admin/login`);
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  function openChangePasswordDialog() {
    setForm(emptyPasswordForm);
    setError(null);
    setSuccess(false);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    if (submitting) {
      return;
    }

    setDialogOpen(open);
    if (!open) {
      setForm(emptyPasswordForm);
      setError(null);
      setSuccess(false);
    }
  }

  async function submitChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.newPassword.length < 8) {
      setError(labels.passwordTooShort);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError(labels.passwordMismatch);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/identity/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        if (payload?.message === "CURRENT_PASSWORD_INVALID") {
          setError(labels.currentPasswordInvalid);
        } else if (payload?.message === "PASSWORD_REUSE_NOT_ALLOWED") {
          setError(labels.passwordReuseNotAllowed);
        } else {
          setError(labels.operationFailed);
        }
        return;
      }

      setSuccess(true);
      setForm(emptyPasswordForm);
    } catch {
      setError(labels.operationFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label={labels.menuLabel}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={openChangePasswordDialog}>
            <KeyRound className="h-4 w-4" />
            {labels.changePassword}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={loggingOut} onSelect={handleLogout}>
            <LogOut className="h-4 w-4" />
            {loggingOut ? labels.loading : labels.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.changePassword}</DialogTitle>
            <DialogDescription>{labels.changePasswordDescription}</DialogDescription>
          </DialogHeader>

          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {labels.changePasswordSuccess}
            </p>
          ) : (
            <form className="grid gap-4" onSubmit={submitChangePassword}>
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
              ) : null}
              <div className="grid gap-2">
                <Label>{labels.currentPassword}</Label>
                <Input
                  type="password"
                  value={form.currentPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="grid gap-2">
                <Label>{labels.newPassword}</Label>
                <Input
                  type="password"
                  value={form.newPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-2">
                <Label>{labels.confirmNewPassword}</Label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => handleDialogOpenChange(false)} disabled={submitting}>
                  {labels.cancel}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? labels.loading : labels.save}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
