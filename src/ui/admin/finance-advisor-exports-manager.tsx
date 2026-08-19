"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminFinanceAdvisorExportPackage } from "@/modules/finance/contracts/finance-advisor-export.contract";
import type { FinanceAdvisorExportCopy } from "@/modules/finance/services/finance-advisor-export-copy.resolver";

type Props = {
  locale: string;
  initialPackage: AdminFinanceAdvisorExportPackage;
  copy: FinanceAdvisorExportCopy;
  initialFrom: string;
  initialTo: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function buildDownloadHref(basePath: string, format: "xml" | "json", from: string, to: string) {
  const params = new URLSearchParams({ format });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `${basePath}?${params.toString()}`;
}

export function FinanceAdvisorExportsManager({ locale, initialPackage, copy, initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const pkg = initialPackage;

  const pageHref = `/${locale}/admin/finance/exports`;
  const downloadXmlHref = useMemo(() => buildDownloadHref("/api/admin/finance/advisor-export/package", "xml", from, to), [from, to]);
  const downloadJsonHref = useMemo(() => buildDownloadHref("/api/admin/finance/advisor-export/package", "json", from, to), [from, to]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.title}</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">{copy.description}</p>
          <p className="text-xs text-[color:var(--color-text-muted)]">{copy.readOnlyHint}</p>
        </div>
      </section>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border p-4" action={pageHref} method="get">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="from">
            {copy.periodLabel} (başlangıç)
          </label>
          <Input id="from" name="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="to">
            {copy.periodLabel} (bitiş)
          </label>
          <Input id="to" name="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        <Button type="submit">Dönemi uygula</Button>
      </form>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{copy.periodLabel}</p>
            <p className="font-medium">{pkg.periodLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.generatedAt}: {formatDateTime(pkg.generatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={downloadXmlHref}>{copy.downloadXml}</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={downloadJsonHref}>{copy.downloadJson}</a>
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">{copy.includedFiles}</p>
          <ul className="space-y-2 text-sm">
            {pkg.files.map((file) => (
              <li key={file.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                <span>{file.title}</span>
                <span className="text-muted-foreground">
                  {file.format.toUpperCase()} · {file.rowCount} satır
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        <Link className="underline underline-offset-2" href={`/${locale}/admin/finance/reports`}>
          Finans raporları
        </Link>
      </p>
    </div>
  );
}
