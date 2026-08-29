import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { commerceService } from "@/modules/commerce/services/commerce.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";

type OrderStatusFilter = "CONFIRMED" | "CANCELLED";
type PaymentStatusFilter = "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED";
type ShipmentStatusFilter = "NOT_SHIPPED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "RETURNED";

type OrdersPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    paymentStatus?: string;
    shipmentStatus?: string;
    carrierCompanyId?: string;
    page?: string;
  }>;
};

const ORDER_STATUS_VALUES: OrderStatusFilter[] = ["CONFIRMED", "CANCELLED"];
const PAYMENT_STATUS_VALUES: PaymentStatusFilter[] = ["PENDING", "AUTHORIZED", "PAID", "FAILED", "REFUNDED"];
const SHIPMENT_STATUS_VALUES: ShipmentStatusFilter[] = ["NOT_SHIPPED", "PREPARING", "SHIPPED", "DELIVERED", "RETURNED"];

function formatMoney(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRestockStatus(value: "NOT_RESTOCKED" | "RESTOCKED" | "PARTIALLY_RESTOCKED", dictionary: ReturnType<typeof getDictionary>) {
  switch (value) {
    case "RESTOCKED":
      return dictionary.admin.inventoryMovementRestockDone;
    case "PARTIALLY_RESTOCKED":
      return dictionary.admin.inventoryMovementRestockPartial;
    default:
      return dictionary.admin.inventoryMovementRestockNone;
  }
}

function formatLastRestockedAt(value: string | null, locale: Locale, dictionary: ReturnType<typeof getDictionary>) {
  if (!value) {
    return dictionary.common.notSpecified;
  }

  return formatDate(value, locale);
}

function formatPaymentStatus(value: PaymentStatusFilter) {
  if (value === "AUTHORIZED") {
    return "Provizyonlu";
  }

  if (value === "PAID") {
    return "Ödendi";
  }

  if (value === "FAILED") {
    return "Başarısız ödeme";
  }

  if (value === "REFUNDED") {
    return "İade edildi";
  }

  return "Bekleyen ödeme";
}

function formatShipmentStatus(value: ShipmentStatusFilter, dictionary: ReturnType<typeof getDictionary>) {
  switch (value) {
    case "PREPARING":
      return dictionary.admin.orderShipmentStatusPreparing;
    case "SHIPPED":
      return dictionary.admin.orderShipmentStatusShipped;
    case "DELIVERED":
      return dictionary.admin.orderShipmentStatusDelivered;
    case "RETURNED":
      return dictionary.admin.orderShipmentStatusReturned;
    default:
      return dictionary.admin.orderShipmentStatusNotShipped;
  }
}

function buildTrackingUrl(template: string | null, trackingNumber: string | null) {
  if (!template || !trackingNumber) {
    return null;
  }

  return template.replaceAll("{trackingNumber}", encodeURIComponent(trackingNumber));
}

function shipmentStatusBadgeClass(value: ShipmentStatusFilter) {
  switch (value) {
    case "SHIPPED":
      return "bg-blue-100 text-blue-700";
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-700";
    case "RETURNED":
      return "bg-rose-100 text-rose-700";
    case "PREPARING":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-neutral-200 text-neutral-900";
  }
}

export default async function AdminOrdersPage({ params, searchParams }: OrdersPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "orders.read"))) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const query = await searchParams;
  const statusFilter = ORDER_STATUS_VALUES.includes(query.status as OrderStatusFilter) ? (query.status as OrderStatusFilter) : undefined;
  const paymentStatusFilter = PAYMENT_STATUS_VALUES.includes(query.paymentStatus as PaymentStatusFilter) ? (query.paymentStatus as PaymentStatusFilter) : undefined;
  const shipmentStatusFilter = SHIPMENT_STATUS_VALUES.includes(query.shipmentStatus as ShipmentStatusFilter) ? (query.shipmentStatus as ShipmentStatusFilter) : undefined;
  const carrierCompanyIdFilter = query.carrierCompanyId?.trim() || undefined;
  const hasActiveFilters = Boolean(statusFilter || paymentStatusFilter || shipmentStatusFilter || carrierCompanyIdFilter);

  const [result, carrierCompanies] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      commerceService.listOrders({
        search: query.search,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        shipmentStatus: shipmentStatusFilter,
        carrierCompanyId: carrierCompanyIdFilter,
        page: query.page ? Number(query.page) : 1,
        pageSize: 10,
      }),
      catalogAdminService.listCarrierCompanies(),
    ]),
  );

  const prevPage = result.page > 1 ? result.page - 1 : null;
  const nextPage = result.page < result.totalPages ? result.page + 1 : null;

  function getPageHref(page: number) {
    const params = new URLSearchParams();
    if (query.search) {
      params.set("search", query.search);
    }
    if (query.status) {
      params.set("status", query.status);
    }
    if (query.paymentStatus) {
      params.set("paymentStatus", query.paymentStatus);
    }
    if (query.shipmentStatus) {
      params.set("shipmentStatus", query.shipmentStatus);
    }
    if (query.carrierCompanyId) {
      params.set("carrierCompanyId", query.carrierCompanyId);
    }
    if (page > 1) {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `/${locale}/admin/orders?${qs}` : `/${locale}/admin/orders`;
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-2 border-b border-[color:var(--color-border)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{dictionary.admin.orderManager}</p>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{dictionary.admin.orderList}</h2>
            <p className="text-sm text-[color:var(--color-text-muted)]">{result.total} {dictionary.admin.orderCountLabel}</p>
          </div>
          <Link
            href={`/${locale}/admin/orders/shipping-report`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-[color:var(--color-border)] px-3 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
          >
            {dictionary.admin.shippingReportTitle}
          </Link>
        </div>

        <details className="mt-2 rounded-xl border border-[color:var(--color-border)]" open={hasActiveFilters}>
          <summary className="cursor-pointer select-none rounded-xl px-4 py-3 text-sm font-medium text-[color:var(--color-text)]">
            {dictionary.admin.orderListAdvancedFilters}
          </summary>
          <form method="GET" className="grid gap-3 border-t border-[color:var(--color-border)] p-4 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="text"
              name="search"
              defaultValue={query.search ?? ""}
              placeholder={dictionary.admin.orderListSearchPlaceholder}
              className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
            />
            <select name="status" defaultValue={statusFilter ?? ""} className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm">
              <option value="">{dictionary.admin.orderListFilterStatus}: {dictionary.admin.orderListFilterAll}</option>
              <option value="CONFIRMED">{dictionary.admin.orderStatusConfirmed}</option>
              <option value="CANCELLED">{dictionary.admin.orderStatusCancelled}</option>
            </select>
            <select name="paymentStatus" defaultValue={paymentStatusFilter ?? ""} className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm">
              <option value="">{dictionary.admin.orderListFilterPaymentStatus}: {dictionary.admin.orderListFilterAll}</option>
              {PAYMENT_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{formatPaymentStatus(value)}</option>
              ))}
            </select>
            <select name="shipmentStatus" defaultValue={shipmentStatusFilter ?? ""} className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm">
              <option value="">{dictionary.admin.orderListFilterShipmentStatus}: {dictionary.admin.orderListFilterAll}</option>
              {SHIPMENT_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>{formatShipmentStatus(value, dictionary)}</option>
              ))}
            </select>
            <select name="carrierCompanyId" defaultValue={carrierCompanyIdFilter ?? ""} className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm">
              <option value="">{dictionary.admin.orderListFilterCarrier}: {dictionary.admin.orderListFilterAll}</option>
              {carrierCompanies.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 xl:col-span-5">
              <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-800">
                {dictionary.admin.orderListApplyFilters}
              </button>
              {hasActiveFilters ? (
                <Link href={`/${locale}/admin/orders`} className="inline-flex h-10 items-center justify-center rounded-md border border-[color:var(--color-border)] px-4 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]">
                  {dictionary.admin.orderListClearFilters}
                </Link>
              ) : null}
            </div>
          </form>
        </details>
      </div>

      <div className="rounded-b-2xl">
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,0.7fr)_minmax(0,0.75fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.4fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.95fr)_minmax(0,0.55fr)] gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
          <span className="min-w-0 break-words">{dictionary.admin.orderNumber}</span>
          <span className="min-w-0 break-words">{dictionary.admin.customerAccountsTitle}</span>
          <span className="min-w-0 break-words">{dictionary.admin.orderStatus}</span>
          <span className="min-w-0 break-words">{dictionary.admin.paymentStatus}</span>
          <span className="min-w-0 break-words">{dictionary.admin.orderListCarrierColumn}</span>
          <span className="min-w-0 break-words">{dictionary.admin.inventoryRestockStatus}</span>
          <span className="min-w-0 break-words">{dictionary.admin.inventoryLastRestockedAt}</span>
          <span className="min-w-0 break-words">{dictionary.admin.orderItems}</span>
          <span className="min-w-0 break-words">{dictionary.admin.orderSubtotal}</span>
          <span className="min-w-0 break-words">{dictionary.admin.orderTotal}</span>
          <span className="min-w-0 break-words">{dictionary.admin.orderDate}</span>
          <span className="min-w-0 break-words">Detay</span>
        </div>

        {result.items.length === 0 ? (
          <p className="p-6 text-sm text-[color:var(--color-text-muted)]">{dictionary.admin.emptyOrders}</p>
        ) : (
          <div>
            <div className="divide-y divide-[color:var(--color-border)]">
              {result.items.map((item) => (
                <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,0.7fr)_minmax(0,0.75fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.4fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.95fr)_minmax(0,0.55fr)] lg:items-center lg:gap-3">
                  <p className="min-w-0 font-medium text-[color:var(--color-text)]">
                    <Link href={`/${locale}/admin/orders/${item.id}`} className="break-words underline-offset-4 hover:underline">
                      {item.orderNumber}
                    </Link>
                  </p>
                  <p className="min-w-0 break-words text-sm text-[color:var(--color-text)]">{item.customerAccountName ?? "Cari kart bağlanmadı"}</p>
                  <p className="min-w-0">
                    <span className={`inline-flex max-w-full whitespace-normal break-words rounded-full px-2 py-1 text-xs font-semibold ${item.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-900"}`}>
                      {item.status === "CONFIRMED" ? dictionary.admin.orderStatusConfirmed : dictionary.admin.orderStatusCancelled}
                    </span>
                  </p>
                  <p className="min-w-0">
                    <span className="inline-flex max-w-full whitespace-normal break-words rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {formatPaymentStatus(item.paymentStatus)}
                    </span>
                  </p>
                  <div className="min-w-0">
                    <span className={`inline-flex max-w-full whitespace-normal break-words rounded-full px-2 py-1 text-xs font-semibold ${shipmentStatusBadgeClass(item.shipmentStatus)}`}>
                      {formatShipmentStatus(item.shipmentStatus, dictionary)}
                    </span>
                    {item.carrierCompanyName ? (
                      <p className="mt-1 truncate text-xs text-[color:var(--color-text-muted)]">{item.carrierCompanyName}</p>
                    ) : null}
                    {(() => {
                      const trackingUrl = buildTrackingUrl(item.carrierTrackingUrlTemplate, item.cargoTrackingNumber);
                      return trackingUrl ? (
                        <a href={trackingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[color:var(--color-text-muted)] underline underline-offset-4 hover:text-[color:var(--color-text)]">
                          {dictionary.admin.orderListTrackingLink}
                        </a>
                      ) : null;
                    })()}
                  </div>
                  <p className="min-w-0">
                    <span className={`inline-flex max-w-full whitespace-normal break-words rounded-full px-2 py-1 text-xs font-semibold ${item.restockStatus === "RESTOCKED" ? "bg-emerald-100 text-emerald-700" : item.restockStatus === "PARTIALLY_RESTOCKED" ? "bg-amber-100 text-amber-700" : "bg-neutral-200 text-neutral-900"}`}>
                      {formatRestockStatus(item.restockStatus, dictionary)}
                    </span>
                  </p>
                  <p className="min-w-0 break-words text-sm text-[color:var(--color-text-muted)]">{formatLastRestockedAt(item.lastRestockedAt, locale as Locale, dictionary)}</p>
                  <p className="min-w-0 break-words text-sm text-[color:var(--color-text)]">{item.itemCount}</p>
                  <p className="min-w-0 break-words text-sm text-[color:var(--color-text)]">{formatMoney(item.subtotal, item.currency, locale as Locale)}</p>
                  <p className="min-w-0 break-words text-sm font-semibold text-[color:var(--color-text)]">{formatMoney(item.total, item.currency, locale as Locale)}</p>
                  <p className="min-w-0 break-words text-sm text-[color:var(--color-text-muted)]">{formatDate(item.createdAt, locale as Locale)}</p>
                  <p className="min-w-0">
                    <Link
                      href={`/${locale}/admin/orders/${item.id}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-bg-soft)]"
                    >
                      Detay
                    </Link>
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border)] p-4">
        {prevPage ? (
          <Link href={getPageHref(prevPage)} className="rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]">
            {dictionary.admin.prev}
          </Link>
        ) : <span />}
        <p className="text-sm text-[color:var(--color-text-muted)]">{dictionary.admin.page} {result.page}/{result.totalPages}</p>
        {nextPage ? (
          <Link href={getPageHref(nextPage)} className="rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]">
            {dictionary.admin.next}
          </Link>
        ) : <span />}
      </div>
    </section>
  );
}
