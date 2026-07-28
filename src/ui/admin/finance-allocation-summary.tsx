import type { AdminFinanceAllocationSummary } from "@/modules/finance/contracts/allocation.contract";

type Props = {
  summary: AdminFinanceAllocationSummary | null;
  labels: {
    title: string;
    empty: string;
    target: string;
    amount: string;
    mismatch?: string;
  };
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function FinanceAllocationSummaryPanel({ summary, labels }: Props) {
  if (!summary || summary.items.length === 0) {
    return (
      <details className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-neutral-900">{labels.title}</summary>
        <p className="mt-3 text-sm text-neutral-500">{labels.empty}</p>
      </details>
    );
  }

  const isBalanced = summary.allocatedAmount === summary.expectedAmount;

  return (
    <details className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4" open>
      <summary className="cursor-pointer text-sm font-medium text-neutral-900">{labels.title}</summary>
      {!isBalanced && labels.mismatch ? (
        <p className="mt-3 text-sm text-amber-700">
          {labels.mismatch
            .replace("{allocated}", formatMoney(summary.allocatedAmount, summary.currency))
            .replace("{expected}", formatMoney(summary.expectedAmount, summary.currency))}
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {summary.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
            <span className="text-neutral-700">{labels.target}: <span className="font-medium text-neutral-950">{item.targetLabel}</span></span>
            <span className="font-medium text-neutral-950">{labels.amount}: {formatMoney(item.amount, item.currency)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
