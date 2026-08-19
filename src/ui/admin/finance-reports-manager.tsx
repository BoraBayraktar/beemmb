import Link from "next/link";

import type { AdminFinanceReportsOverview } from "@/modules/finance/contracts/reports.contract";

type Labels = {
  title: string;
  description: string;
};

type Props = {
  overview: AdminFinanceReportsOverview;
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

export function FinanceReportsManager({ overview, labels }: Props) {
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

      <section className="grid gap-3 lg:grid-cols-3">
        {overview.cards.map((card) => (
          <article key={card.href} className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{card.title}</h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{card.description}</p>
            <Link href={card.href} className="mt-4 inline-flex text-sm font-medium text-[color:var(--color-text)] underline underline-offset-4">
              {card.ctaLabel}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
