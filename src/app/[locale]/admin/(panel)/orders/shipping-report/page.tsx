import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { commerceService } from "@/modules/commerce/services/commerce.service";

export default async function AdminShippingReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const report = await commerceService.getShipmentCarrierReport();

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-2 border-b border-[color:var(--color-border)] p-5">
        <Link href={`/${locale}/admin/orders`} className="text-sm text-[color:var(--color-text-muted)] underline-offset-4 hover:text-[color:var(--color-text)] hover:underline">
          {dictionary.admin.shippingReportBack}
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{dictionary.admin.orderManager}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{dictionary.admin.shippingReportTitle}</h2>
        <p className="text-sm text-[color:var(--color-text-muted)]">{dictionary.admin.shippingReportDescription}</p>
      </div>

      <div className="rounded-b-2xl">
        <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.7fr)] gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
          <span>{dictionary.admin.shippingReportCarrier}</span>
          <span>{dictionary.admin.shippingReportOrderCount}</span>
          <span>{dictionary.admin.shippingReportShippedCount}</span>
          <span>{dictionary.admin.shippingReportDeliveredCount}</span>
          <span>{dictionary.admin.shippingReportAvgDeliveryHours}</span>
          <span className="text-right">{dictionary.admin.shippingReportViewOrders}</span>
        </div>

        {report.length === 0 ? (
          <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{dictionary.admin.shippingReportEmpty}</p>
        ) : (
          <div className="divide-y divide-[color:var(--color-border)]">
            {report.map((row) => (
              <article
                key={row.carrierCompanyId ?? "unassigned"}
                className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.7fr)] lg:items-center"
              >
                <p className="min-w-0 font-medium text-[color:var(--color-text)]">
                  {row.carrierCompanyName ?? dictionary.admin.shippingReportUnassigned}
                </p>
                <p className="text-sm text-[color:var(--color-text)]">{row.orderCount}</p>
                <p className="text-sm text-[color:var(--color-text)]">{row.shippedCount}</p>
                <p className="text-sm text-[color:var(--color-text)]">{row.deliveredCount}</p>
                <p className="text-sm text-[color:var(--color-text)]">{row.averageDeliveryHours ?? dictionary.admin.shippingReportNotSpecified}</p>
                <p className="text-right">
                  <Link
                    href={row.carrierCompanyId
                      ? `/${locale}/admin/orders?carrierCompanyId=${row.carrierCompanyId}`
                      : `/${locale}/admin/orders`}
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
                  >
                    {dictionary.admin.shippingReportViewOrders}
                  </Link>
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
