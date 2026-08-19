import Link from "next/link";

import type { AdminFinanceOverview } from "@/modules/finance/contracts/finance-overview.contract";

type Labels = {
  title: string;
  description: string;
  sectionsTitle: string;
  openRoute: string;
};

type Props = {
  locale: string;
  overview: AdminFinanceOverview;
  labels: Labels;
};

function formatMetricValue(value: number, currency?: string) {
  if (!currency) {
    return value.toLocaleString("tr-TR");
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function resolveToneClass(tone: "neutral" | "success" | "warning") {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)]";
}

export function FinanceOverviewManager({ overview, labels }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{labels.title}</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">{labels.description}</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {overview.metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 ${resolveToneClass(metric.tone)}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold">{formatMetricValue(metric.value, metric.currency)}</p>
            <p className="mt-2 text-sm opacity-80">{metric.hint}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{labels.sectionsTitle}</h2>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {overview.sections.map((section) => (
            <article key={section.href} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
              <h3 className="text-base font-semibold text-[color:var(--color-text)]">{section.title}</h3>
              <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{section.description}</p>
              <Link href={section.href} className="mt-4 inline-flex text-sm font-medium text-[color:var(--color-text)] underline underline-offset-4">
                {labels.openRoute}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
