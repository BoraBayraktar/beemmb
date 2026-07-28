"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  locale: string;
  reportPath: string;
  fromIso: string;
  toIso: string;
  labels: {
    fromLabel: string;
    toLabel: string;
    applyLabel: string;
    defaultMonthHint: string;
    mobileToggleLabel: string;
  };
};

export function FinanceReportDateRangeFilter({ locale, reportPath, fromIso, toIso, labels }: Props) {
  const router = useRouter();
  const [fromValue, setFromValue] = useState(fromIso);
  const [toValue, setToValue] = useState(toIso);

  function applyRange() {
    const params = new URLSearchParams();
    if (fromValue.trim()) {
      params.set("from", fromValue.trim());
    }
    if (toValue.trim()) {
      params.set("to", toValue.trim());
    }
    const query = params.toString();
    router.push(`/${locale}/admin/finance/reports/${reportPath}${query ? `?${query}` : ""}`);
  }

  const form = (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <p className="text-sm text-neutral-600 md:mr-auto md:self-center">{labels.defaultMonthHint}</p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-800">{labels.fromLabel}</span>
        <Input type="date" value={fromValue} onChange={(event) => setFromValue(event.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-800">{labels.toLabel}</span>
        <Input type="date" value={toValue} onChange={(event) => setToValue(event.target.value)} />
      </label>
      <Button type="button" onClick={applyRange}>
        {labels.applyLabel}
      </Button>
    </div>
  );

  return (
    <section className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="hidden p-4 md:block">{form}</div>
      <details className="md:hidden">
        <summary className="cursor-pointer list-none p-4 font-medium text-neutral-900 marker:content-none">
          {labels.mobileToggleLabel}
        </summary>
        <div className="border-t border-neutral-200 p-4">{form}</div>
      </details>
    </section>
  );
}
