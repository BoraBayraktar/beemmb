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
    <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-neutral-200 p-5">
        <Link href={`/${locale}/admin/orders`} className="text-sm text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline">
          {dictionary.admin.shippingReportBack}
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{dictionary.admin.orderManager}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{dictionary.admin.shippingReportTitle}</h2>
        <p className="text-sm text-neutral-500">{dictionary.admin.shippingReportDescription}</p>
      </div>

      <div className="rounded-b-2xl">
        <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.7fr)] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 lg:grid">
          <span>{dictionary.admin.shippingReportCarrier}</span>
          <span>{dictionary.admin.shippingReportOrderCount}</span>
          <span>{dictionary.admin.shippingReportShippedCount}</span>
          <span>{dictionary.admin.shippingReportDeliveredCount}</span>
          <span>{dictionary.admin.shippingReportAvgDeliveryHours}</span>
          <span className="text-right">{dictionary.admin.shippingReportViewOrders}</span>
        </div>

        {report.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">{dictionary.admin.shippingReportEmpty}</p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {report.map((row) => (
              <article
                key={row.carrierCompanyId ?? "unassigned"}
                className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.7fr)] lg:items-center"
              >
                <p className="min-w-0 font-medium text-neutral-950">
                  {row.carrierCompanyName ?? dictionary.admin.shippingReportUnassigned}
                </p>
                <p className="text-sm text-neutral-700">{row.orderCount}</p>
                <p className="text-sm text-neutral-700">{row.shippedCount}</p>
                <p className="text-sm text-neutral-700">{row.deliveredCount}</p>
                <p className="text-sm text-neutral-700">{row.averageDeliveryHours ?? dictionary.admin.shippingReportNotSpecified}</p>
                <p className="text-right">
                  <Link
                    href={row.carrierCompanyId
                      ? `/${locale}/admin/orders?carrierCompanyId=${row.carrierCompanyId}`
                      : `/${locale}/admin/orders`}
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
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
