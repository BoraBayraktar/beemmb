"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/ui/admin/confirm-delete-button";

type OrderStatus = "CONFIRMED" | "CANCELLED";
type PaymentStatus = "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED";
type ShipmentStatus = "NOT_SHIPPED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "RETURNED";

type ShipmentInfo = {
  shipmentStatus: ShipmentStatus;
  shipmentAddressLine: string | null;
  shipmentCity: string | null;
  shipmentDistrict: string | null;
  shipmentPostalCode: string | null;
  shipmentCountry: string | null;
  shipmentContactName: string | null;
  shipmentContactPhone: string | null;
  invoiceAddressLine: string | null;
  invoiceCity: string | null;
  invoiceDistrict: string | null;
  invoicePostalCode: string | null;
  carrierCompanyId: string | null;
  carrierCompanyName: string | null;
  cargoTrackingNumber: string | null;
  cargoShippedAt: string | null;
  cargoDeliveredAt: string | null;
};

type CarrierCompanyOption = {
  id: string;
  name: string;
  trackingUrlTemplate: string | null;
};

type Item = {
  id: string;
  productVariantId: string | null;
  productSlug: string;
  productSku: string;
  productVariantSlug: string | null;
  productVariantSku: string | null;
  productVariantTitle: string | null;
  productVariantOptionSummary: string | null;
  productName: string;
  productImageUrl: string;
  quantity: number;
  unitPrice: number;
  compareAtPrice: number | null;
  lineTotal: number;
  currency: string;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  customerAccountId: string | null;
  customerAccountName: string | null;
  customerAccountEmail: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountTotal: number;
  total: number;
  promotionCode: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: Item[];
  documents: {
    id: string;
    documentNumber: string;
    documentType: "PURCHASE_DOCUMENT" | "DELIVERY_NOTE" | "E_INVOICE" | "E_DISPATCH";
    status: "DRAFT" | "LINKED" | "ISSUED" | "CANCELLED";
    externalSystemStatus: "NOT_SENT" | "QUEUED" | "SENT" | "FAILED";
    issueDate: string;
    totalAmount: number | null;
    currency: string;
    inventoryTransactionNumber: string | null;
  }[];
  inventorySummary: {
    reservationCount: number;
    committedReservationCount: number;
    releasedReservationCount: number;
    cancelledReservationCount: number;
    activeReservationCount: number;
    totalReservedQuantity: number;
    restockStatus: "NOT_RESTOCKED" | "RESTOCKED" | "PARTIALLY_RESTOCKED";
    lastRestockedAt: string | null;
  };
  inventoryMovements: {
    id: string;
    type: string;
    quantity: number;
    warehouseCode: string | null;
    reservationId: string | null;
    note: string | null;
    createdAt: string;
  }[];
  financialMovements: {
    id: string;
    accountName: string;
    direction: "IN" | "OUT" | "TRANSFER";
    sourceType: "MANUAL" | "COLLECTION" | "PAYMENT" | "TRANSFER" | "ORDER" | "DOCUMENT" | "REFUND" | "EXPENSE_REPORT";
    category: "GENERAL_INCOME" | "GENERAL_EXPENSE" | "MARKETPLACE_COMMISSION" | "SHIPPING_EXPENSE" | "SERVICE_FEE" | "REFUND" | "TRANSFER" | null;
    amount: number;
    currency: string;
    title: string;
    note: string | null;
    counterpartyName: string | null;
    transactionAt: string;
  }[];
  statusHistory: {
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    source: "SYSTEM" | "ADMIN";
    changedByUserId: string | null;
    note: string | null;
    createdAt: string;
  }[];
  paymentStatusHistory: {
    id: string;
    fromStatus: PaymentStatus | null;
    toStatus: PaymentStatus;
    source: "SYSTEM" | "ADMIN";
    changedByUserId: string | null;
    note: string | null;
    createdAt: string;
  }[];
  shipment: ShipmentInfo;
};

type Labels = {
  back: string;
  orderNumber: string;
  orderStatus: string;
  orderStatusConfirmed: string;
  orderStatusCancelled: string;
  paymentStatus: string;
  orderItems: string;
  orderSubtotal: string;
  orderTotal: string;
  orderDiscount: string;
  promotionCode: string;
  orderDate: string;
  customerAccount: string;
  updateStatus: string;
  deleteOrder: string;
  cancel: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  operationFailed: string;
  loading: string;
  statusHistoryTitle: string;
  historyFrom: string;
  historyTo: string;
  historySource: string;
  historyBy: string;
  historyNote: string;
  historyAt: string;
  historySourceSystem: string;
  historySourceAdmin: string;
  paymentHistoryTitle: string;
  paymentHistoryFrom: string;
  paymentHistoryTo: string;
  collectionSummaryTitle: string;
  collectionRecordedAmount: string;
  collectionRemainingAmount: string;
  createCollection: string;
  createCollectionSuccess: string;
  createCollectionFailed: string;
  collectionFinancialAccount: string;
  collectionFinancialAccountRequired: string;
  collectionAutoPaidTitle: string;
  collectionAutoPaidDescription: string;
  orderDocumentsTitle: string;
  inventorySummaryTitle: string;
  inventoryReservations: string;
  inventoryReservedQuantity: string;
  inventoryRestockStatus: string;
  inventoryLastRestockedAt: string;
  financialMovementsTitle: string;
  financialMovementAccount: string;
  financialMovementDirection: string;
  financialMovementSource: string;
  financialMovementSourceManual: string;
  financialMovementSourceCollection: string;
  financialMovementSourcePayment: string;
  financialMovementSourceOrder: string;
  financialMovementSourceDocument: string;
  financialMovementSourceRefund: string;
  financialMovementSourceTransfer: string;
  financialMovementCategory: string;
  inventoryMovementTitle: string;
  inventoryMovementType: string;
  inventoryMovementQuantity: string;
  inventoryMovementWarehouse: string;
  inventoryMovementReservation: string;
  inventoryMovementInitialLoad: string;
  inventoryMovementManualAdjustment: string;
  inventoryMovementPurchaseReceipt: string;
  inventoryMovementReservationHold: string;
  inventoryMovementReservationRelease: string;
  inventoryMovementOrderCommit: string;
  inventoryMovementOrderCancelRestock: string;
  inventoryMovementReturnRestock: string;
  inventoryMovementDamageWriteOff: string;
  inventoryMovementRestockNone: string;
  inventoryMovementRestockPartial: string;
  inventoryMovementRestockDone: string;
  refundFinancialAccount: string;
  refundFinancialAccountRequired: string;
  notSpecified: string;
  shipmentTitle: string;
  shipmentSummaryEmpty: string;
  shipmentSummaryEmptyAction: string;
  shipmentEdit: string;
  shipmentStatusLabel: string;
  shipmentStatusNotShipped: string;
  shipmentStatusPreparing: string;
  shipmentStatusShipped: string;
  shipmentStatusDelivered: string;
  shipmentStatusReturned: string;
  shipmentCarrier: string;
  shipmentCarrierPlaceholder: string;
  shipmentTrackingNumber: string;
  shipmentTrackingLink: string;
  shipmentAddressLine: string;
  shipmentCity: string;
  shipmentDistrict: string;
  shipmentPostalCode: string;
  shipmentContactName: string;
  shipmentContactPhone: string;
  shipmentSave: string;
  shipmentSaveSuccess: string;
  shipmentClose: string;
};

type AccountOption = {
  id: string;
  label: string;
};

function formatMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRestockStatus(value: OrderDetail["inventorySummary"]["restockStatus"], labels: Labels) {
  if (value === "RESTOCKED") {
    return labels.inventoryMovementRestockDone;
  }

  if (value === "PARTIALLY_RESTOCKED") {
    return labels.inventoryMovementRestockPartial;
  }

  return labels.inventoryMovementRestockNone;
}

function formatFinancialMovementSource(value: OrderDetail["financialMovements"][number]["sourceType"], labels: Labels) {
  switch (value) {
    case "COLLECTION":
      return labels.financialMovementSourceCollection;
    case "PAYMENT":
      return labels.financialMovementSourcePayment;
    case "ORDER":
      return labels.financialMovementSourceOrder;
    case "DOCUMENT":
      return labels.financialMovementSourceDocument;
    case "REFUND":
      return labels.financialMovementSourceRefund;
    case "TRANSFER":
      return labels.financialMovementSourceTransfer;
    default:
      return labels.financialMovementSourceManual;
  }
}

function formatMovementType(value: OrderDetail["inventoryMovements"][number]["type"], labels: Labels) {
  switch (value) {
    case "INITIAL_LOAD":
      return labels.inventoryMovementInitialLoad;
    case "MANUAL_ADJUSTMENT":
      return labels.inventoryMovementManualAdjustment;
    case "PURCHASE_RECEIPT":
      return labels.inventoryMovementPurchaseReceipt;
    case "RESERVATION_HOLD":
      return labels.inventoryMovementReservationHold;
    case "RESERVATION_RELEASE":
      return labels.inventoryMovementReservationRelease;
    case "ORDER_COMMIT":
      return labels.inventoryMovementOrderCommit;
    case "ORDER_CANCEL_RESTOCK":
      return labels.inventoryMovementOrderCancelRestock;
    case "RETURN_RESTOCK":
      return labels.inventoryMovementReturnRestock;
    case "DAMAGE_WRITE_OFF":
      return labels.inventoryMovementDamageWriteOff;
    default:
      return value;
  }
}

function movementBadgeClass(value: OrderDetail["inventoryMovements"][number]["type"]) {
  switch (value) {
    case "ORDER_CANCEL_RESTOCK":
    case "RETURN_RESTOCK":
      return "bg-emerald-100 text-emerald-700";
    case "ORDER_COMMIT":
    case "DAMAGE_WRITE_OFF":
      return "bg-rose-100 text-rose-700";
    case "RESERVATION_HOLD":
    case "RESERVATION_RELEASE":
      return "bg-amber-100 text-amber-700";
    case "MANUAL_ADJUSTMENT":
    case "PURCHASE_RECEIPT":
      return "bg-blue-100 text-blue-700";
    case "INITIAL_LOAD":
    default:
      return "bg-neutral-200 text-neutral-900";
  }
}

function formatFinancialDirection(value: OrderDetail["financialMovements"][number]["direction"]) {
  if (value === "IN") {
    return "Gelir";
  }

  if (value === "OUT") {
    return "Gider";
  }

  return "Transfer";
}

function formatDocumentType(value: OrderDetail["documents"][number]["documentType"]) {
  switch (value) {
    case "PURCHASE_DOCUMENT":
      return "Satın alma belgesi";
    case "DELIVERY_NOTE":
      return "İrsaliye";
    case "E_INVOICE":
      return "E-fatura";
    case "E_DISPATCH":
      return "E-irsaliye";
    default:
      return value;
  }
}

function formatWarehouseCode(value: string | null, labels: Labels) {
  if (!value) {
    return labels.notSpecified;
  }

  if (value === "MAIN") {
    return "Ana depo";
  }

  return value;
}

function formatPaymentStatus(value: PaymentStatus) {
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

function formatOrderStatus(value: OrderStatus, labels: Labels) {
  return value === "CONFIRMED" ? labels.orderStatusConfirmed : labels.orderStatusCancelled;
}

function formatShipmentStatus(value: ShipmentStatus, labels: Labels) {
  switch (value) {
    case "PREPARING":
      return labels.shipmentStatusPreparing;
    case "SHIPPED":
      return labels.shipmentStatusShipped;
    case "DELIVERED":
      return labels.shipmentStatusDelivered;
    case "RETURNED":
      return labels.shipmentStatusReturned;
    case "NOT_SHIPPED":
    default:
      return labels.shipmentStatusNotShipped;
  }
}

function shipmentStatusBadgeClass(value: ShipmentStatus) {
  switch (value) {
    case "SHIPPED":
      return "bg-blue-100 text-blue-700";
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-700";
    case "RETURNED":
      return "bg-rose-100 text-rose-700";
    case "PREPARING":
      return "bg-amber-100 text-amber-700";
    case "NOT_SHIPPED":
    default:
      return "bg-neutral-200 text-neutral-900";
  }
}

function buildTrackingUrl(template: string | null, trackingNumber: string | null) {
  if (!template || !trackingNumber) {
    return null;
  }

  return template.replaceAll("{trackingNumber}", encodeURIComponent(trackingNumber));
}

function formatSystemNote(value: string | null, orderNumber: string, labels: Labels) {
  if (!value) {
    return labels.notSpecified;
  }

  const replacements: Array<[RegExp, string]> = [
    [/^Checkout inventory commit for\s+/i, "Checkout stok ayirma: "],
    [/^Checkout reservation hold for\s+/i, "Checkout rezervasyon ayirma: "],
    [/^Checkout created order$/i, "Checkout siparişi oluşturdu"],
    [/^Checkout initialized payment status$/i, "Checkout ödeme durumunu başlattı"],
    [/^Automatic payment status update after full collection\.$/i, "Tam tahsilat sonrası ödeme durumu otomatik güncellendi."],
  ];

  let formatted = value;

  for (const [pattern, replacement] of replacements) {
    formatted = formatted.replace(pattern, replacement);
  }

  return formatted.replace(orderNumber, orderNumber);
}

export function OrderDetailManager({ locale, order, labels, canManage, accountOptions, carrierCompanies }: { locale: string; order: OrderDetail; labels: Labels; canManage: boolean; accountOptions: AccountOption[]; carrierCompanies: CarrierCompanyOption[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [refundFinancialAccountId, setRefundFinancialAccountId] = useState(accountOptions[0]?.id ?? "");
  const [collectionFinancialAccountId, setCollectionFinancialAccountId] = useState(accountOptions[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipmentPanelOpen, setShipmentPanelOpen] = useState(false);
  const [shipmentSaving, setShipmentSaving] = useState(false);
  const [shipmentError, setShipmentError] = useState<string | null>(null);
  const [shipmentSuccess, setShipmentSuccess] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({
    shipmentStatus: order.shipment.shipmentStatus,
    carrierCompanyId: order.shipment.carrierCompanyId ?? "",
    cargoTrackingNumber: order.shipment.cargoTrackingNumber ?? "",
    shipmentAddressLine: order.shipment.shipmentAddressLine ?? "",
    shipmentCity: order.shipment.shipmentCity ?? "",
    shipmentDistrict: order.shipment.shipmentDistrict ?? "",
    shipmentPostalCode: order.shipment.shipmentPostalCode ?? "",
    shipmentContactName: order.shipment.shipmentContactName ?? "",
    shipmentContactPhone: order.shipment.shipmentContactPhone ?? "",
  });

  const selectedCarrier = carrierCompanies.find((carrier) => carrier.id === order.shipment.carrierCompanyId) ?? null;
  const trackingUrl = buildTrackingUrl(selectedCarrier?.trackingUrlTemplate ?? null, order.shipment.cargoTrackingNumber);
  const hasShipmentInfo = Boolean(order.shipment.carrierCompanyId || order.shipment.cargoTrackingNumber || order.shipment.shipmentAddressLine);

  function patchShipmentField(field: keyof typeof shipmentForm, value: string) {
    setShipmentForm((prev) => ({ ...prev, [field]: value }));
  }

  function openShipmentPanel() {
    setShipmentError(null);
    setShipmentSuccess(false);
    setShipmentForm({
      shipmentStatus: order.shipment.shipmentStatus,
      carrierCompanyId: order.shipment.carrierCompanyId ?? "",
      cargoTrackingNumber: order.shipment.cargoTrackingNumber ?? "",
      shipmentAddressLine: order.shipment.shipmentAddressLine ?? "",
      shipmentCity: order.shipment.shipmentCity ?? "",
      shipmentDistrict: order.shipment.shipmentDistrict ?? "",
      shipmentPostalCode: order.shipment.shipmentPostalCode ?? "",
      shipmentContactName: order.shipment.shipmentContactName ?? "",
      shipmentContactPhone: order.shipment.shipmentContactPhone ?? "",
    });
    setShipmentPanelOpen(true);
  }

  async function saveShipment() {
    setShipmentSaving(true);
    setShipmentError(null);
    setShipmentSuccess(false);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shipmentStatus: shipmentForm.shipmentStatus,
          carrierCompanyId: shipmentForm.carrierCompanyId || null,
          cargoTrackingNumber: shipmentForm.cargoTrackingNumber.trim() || null,
          shipmentAddressLine: shipmentForm.shipmentAddressLine.trim() || null,
          shipmentCity: shipmentForm.shipmentCity.trim() || null,
          shipmentDistrict: shipmentForm.shipmentDistrict.trim() || null,
          shipmentPostalCode: shipmentForm.shipmentPostalCode.trim() || null,
          shipmentContactName: shipmentForm.shipmentContactName.trim() || null,
          shipmentContactPhone: shipmentForm.shipmentContactPhone.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setShipmentError(payload?.message ?? labels.operationFailed);
        return;
      }

      setShipmentSuccess(true);
      router.refresh();
    } catch {
      setShipmentError(labels.operationFailed);
    } finally {
      setShipmentSaving(false);
    }
  }

  const recordedCollectionAmount = order.financialMovements
    .filter((movement) => movement.sourceType === "COLLECTION" && movement.direction === "IN")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const remainingCollectionAmount = Math.max(0, Number((order.total - recordedCollectionAmount).toFixed(2)));
  const isAutoPaidByCollections = paymentStatus === "PAID" && recordedCollectionAmount >= order.total;

  async function updateStatus() {
    setLoading(true);
    setError(null);

    try {
      if (paymentStatus === "REFUNDED" && order.paymentStatus !== "REFUNDED" && !refundFinancialAccountId) {
        setError(labels.refundFinancialAccountRequired);
        return;
      }

      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, paymentStatus, refundFinancialAccountId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.operationFailed);
        return;
      }

      router.refresh();
    } catch {
      setError(labels.operationFailed);
    } finally {
      setLoading(false);
    }
  }

  async function deleteOrder() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.operationFailed);
        return;
      }

      router.push(`/${locale}/admin/orders`);
      router.refresh();
    } catch {
      setError(labels.operationFailed);
    } finally {
      setLoading(false);
    }
  }

  async function createCollection() {
    setLoading(true);
    setError(null);

    try {
      if (!collectionFinancialAccountId) {
        setError(labels.collectionFinancialAccountRequired);
        return;
      }

      const response = await fetch("/api/admin/finance/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          financialAccountId: collectionFinancialAccountId,
          amount: remainingCollectionAmount,
          collectedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.createCollectionFailed);
        return;
      }

      router.refresh();
    } catch {
      setError(labels.createCollectionFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-3 border-b border-[color:var(--color-border)] p-5">
        <Link href={`/${locale}/admin/orders`} className="text-sm text-[color:var(--color-text-muted)] underline-offset-4 hover:text-[color:var(--color-text)] hover:underline">{labels.back}</Link>
        <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{order.orderNumber}</h2>
        <p className="text-sm text-[color:var(--color-text-muted)]">{labels.orderDate}: {formatDate(order.createdAt, locale)}</p>
      </div>

      <div className="grid gap-4 border-b border-[color:var(--color-border)] p-5 md:grid-cols-4">
        <article className="rounded-xl border border-[color:var(--color-border)] p-4 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.customerAccount}</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{order.customerAccountName ?? "Cari kart bağlanmadı"}</p>
          {order.customerAccountEmail ? (
            <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{order.customerAccountEmail}</p>
          ) : null}
          {order.customerAccountId ? (
            <Link href={`/${locale}/admin/cari`} className="mt-2 inline-flex text-sm text-[color:var(--color-text)] underline underline-offset-4">
              {labels.customerAccount}
            </Link>
          ) : null}
        </article>
        <article className="rounded-xl border border-[color:var(--color-border)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.orderStatus}</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{formatOrderStatus(order.status, labels)}</p>
        </article>
        <article className="rounded-xl border border-[color:var(--color-border)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.paymentStatus}</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{formatPaymentStatus(paymentStatus)}</p>
        </article>
        <article className="rounded-xl border border-[color:var(--color-border)] p-4 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.shipmentTitle}</p>
          {hasShipmentInfo ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${shipmentStatusBadgeClass(order.shipment.shipmentStatus)}`}>
                {formatShipmentStatus(order.shipment.shipmentStatus, labels)}
              </span>
              {selectedCarrier ? <span className="text-sm font-medium text-[color:var(--color-text)]">{selectedCarrier.name}</span> : null}
              {order.shipment.cargoTrackingNumber ? (
                trackingUrl ? (
                  <a href={trackingUrl} target="_blank" rel="noreferrer" className="text-sm text-[color:var(--color-text-muted)] underline underline-offset-4 hover:text-[color:var(--color-text)]">
                    {order.shipment.cargoTrackingNumber}
                  </a>
                ) : (
                  <span className="text-sm text-[color:var(--color-text-muted)]">{order.shipment.cargoTrackingNumber}</span>
                )
              ) : null}
              {canManage ? (
                <button type="button" onClick={openShipmentPanel} className="text-xs font-medium text-[color:var(--color-text-muted)] underline decoration-neutral-300 underline-offset-4">
                  {labels.shipmentEdit}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-sm text-[color:var(--color-text-muted)]">{labels.shipmentSummaryEmpty}</p>
              {canManage ? (
                <button type="button" onClick={openShipmentPanel} className="text-xs font-medium text-[color:var(--color-text-muted)] underline decoration-neutral-300 underline-offset-4">
                  {labels.shipmentSummaryEmptyAction}
                </button>
              ) : null}
            </div>
          )}
        </article>
        <article className="rounded-xl border border-[color:var(--color-border)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.orderSubtotal}</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{formatMoney(order.subtotal, order.currency, locale)}</p>
        </article>
        <article className="rounded-xl border border-[color:var(--color-border)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.orderDiscount}</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{formatMoney(order.discountTotal, order.currency, locale)}</p>
        </article>
        <article className="rounded-xl border border-[color:var(--color-border)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.orderItems}</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
        </article>
        <article className="rounded-xl border border-[color:var(--color-border)] p-4 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.orderTotal}</p>
          <p className="mt-2 text-xl font-semibold text-[color:var(--color-text)]">{formatMoney(order.total, order.currency, locale)}</p>
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">{labels.promotionCode}: {order.promotionCode ?? labels.notSpecified}</p>
        </article>
      </div>

      {error ? <p className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="p-5">
        <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)]">
          <div className="hidden grid-cols-[80px_1.2fr_120px_130px_140px] gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)] lg:grid">
            <span>Görsel</span>
            <span>{labels.orderItems}</span>
            <span>Adet</span>
            <span>Birim</span>
            <span>Toplam</span>
          </div>

          <div className="divide-y divide-[color:var(--color-border)]">
            {order.items.map((item) => (
              <article key={item.id} className="grid gap-3 p-4 lg:grid-cols-[80px_1.2fr_120px_130px_140px] lg:items-center">
                <div className="h-20 w-20 overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.productImageUrl} alt={item.productName} className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="font-medium text-[color:var(--color-text)]">{item.productName}</p>
                  <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">/{item.productSlug} · {item.productSku}</p>
                  {item.productVariantTitle ? (
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {item.productVariantTitle}
                      {item.productVariantOptionSummary ? ` • ${item.productVariantOptionSummary}` : ""}
                      {item.productVariantSku ? ` · ${item.productVariantSku}` : ""}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-[color:var(--color-text)]">{item.quantity}</p>
                <p className="text-sm text-[color:var(--color-text)]">{formatMoney(item.unitPrice, item.currency, locale)}</p>
                <p className="text-sm font-semibold text-[color:var(--color-text)]">{formatMoney(item.lineTotal, item.currency, locale)}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      {canManage && shipmentPanelOpen ? (
        <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight text-[color:var(--color-text)]">{labels.shipmentTitle}</h3>
            <button type="button" onClick={() => setShipmentPanelOpen(false)} className="text-xs font-medium text-[color:var(--color-text-muted)] underline decoration-neutral-300 underline-offset-4">
              {labels.shipmentClose}
            </button>
          </div>

          {shipmentError ? <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{shipmentError}</p> : null}
          {shipmentSuccess ? <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{labels.shipmentSaveSuccess}</p> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.shipmentStatusLabel}</label>
              <select
                value={shipmentForm.shipmentStatus}
                onChange={(event) => patchShipmentField("shipmentStatus", event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={shipmentSaving}
              >
                <option value="NOT_SHIPPED">{labels.shipmentStatusNotShipped}</option>
                <option value="PREPARING">{labels.shipmentStatusPreparing}</option>
                <option value="SHIPPED">{labels.shipmentStatusShipped}</option>
                <option value="DELIVERED">{labels.shipmentStatusDelivered}</option>
                <option value="RETURNED">{labels.shipmentStatusReturned}</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.shipmentCarrier}</label>
              <select
                value={shipmentForm.carrierCompanyId}
                onChange={(event) => patchShipmentField("carrierCompanyId", event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={shipmentSaving}
              >
                <option value="">{labels.shipmentCarrierPlaceholder}</option>
                {carrierCompanies.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.shipmentTrackingNumber}</label>
              <input
                value={shipmentForm.cargoTrackingNumber}
                onChange={(event) => patchShipmentField("cargoTrackingNumber", event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={shipmentSaving}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.shipmentContactName}</label>
              <input
                value={shipmentForm.shipmentContactName}
                onChange={(event) => patchShipmentField("shipmentContactName", event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={shipmentSaving}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.shipmentContactPhone}</label>
              <input
                value={shipmentForm.shipmentContactPhone}
                onChange={(event) => patchShipmentField("shipmentContactPhone", event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={shipmentSaving}
              />
            </div>
            <div className="grid gap-1 md:col-span-2">
              <label className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.shipmentAddressLine}</label>
              <input
                value={shipmentForm.shipmentAddressLine}
                onChange={(event) => patchShipmentField("shipmentAddressLine", event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={shipmentSaving}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.shipmentCity}</label>
              <input
                value={shipmentForm.shipmentCity}
                onChange={(event) => patchShipmentField("shipmentCity", event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={shipmentSaving}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.shipmentDistrict}</label>
              <input
                value={shipmentForm.shipmentDistrict}
                onChange={(event) => patchShipmentField("shipmentDistrict", event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={shipmentSaving}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-[color:var(--color-text-muted)]">{labels.shipmentPostalCode}</label>
              <input
                value={shipmentForm.shipmentPostalCode}
                onChange={(event) => patchShipmentField("shipmentPostalCode", event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={shipmentSaving}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" variant="secondary" onClick={saveShipment} disabled={shipmentSaving}>
              {shipmentSaving ? labels.loading : labels.shipmentSave}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="border-t border-[color:var(--color-border)] p-5">
        <h3 className="mb-3 text-lg font-semibold tracking-tight text-[color:var(--color-text)]">{labels.orderDocumentsTitle}</h3>
        <div className="space-y-3">
          {order.documents.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-muted)]">{labels.notSpecified}</p>
          ) : order.documents.map((document) => (
            <article key={document.id} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="grid gap-2 text-sm text-[color:var(--color-text)] md:grid-cols-2">
                  <p><span className="font-medium text-[color:var(--color-text)]">Belge:</span> {document.documentNumber}</p>
                  <p><span className="font-medium text-[color:var(--color-text)]">Tür:</span> {formatDocumentType(document.documentType)}</p>
                  <p><span className="font-medium text-[color:var(--color-text)]">Durum:</span> {document.status}</p>
                  <p><span className="font-medium text-[color:var(--color-text)]">Dış sistem:</span> {document.externalSystemStatus}</p>
                  <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyAt}:</span> {formatDate(document.issueDate, locale)}</p>
                  <p><span className="font-medium text-[color:var(--color-text)]">İşlem no:</span> {document.inventoryTransactionNumber ?? labels.notSpecified}</p>
                  <p><span className="font-medium text-[color:var(--color-text)]">{labels.orderTotal}:</span> {document.totalAmount !== null ? formatMoney(document.totalAmount, document.currency, locale) : labels.notSpecified}</p>
                </div>
                <Link href={`/${locale}/admin/documents`} className="text-xs font-medium text-[color:var(--color-text-muted)] underline decoration-neutral-300 underline-offset-4">
                  Belgelerde aç
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="border-t border-[color:var(--color-border)] p-5">
        <h3 className="mb-3 text-lg font-semibold tracking-tight text-[color:var(--color-text)]">{labels.inventorySummaryTitle}</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.inventoryReservations}</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{order.inventorySummary.reservationCount}</p>
            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">Kesinleşen: {order.inventorySummary.committedReservationCount} · Aktif: {order.inventorySummary.activeReservationCount}</p>
          </article>
          <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.inventoryReservedQuantity}</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{order.inventorySummary.totalReservedQuantity}</p>
            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">Serbest bırakılan: {order.inventorySummary.releasedReservationCount} · İptal edilen: {order.inventorySummary.cancelledReservationCount}</p>
          </article>
          <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.inventoryRestockStatus}</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{formatRestockStatus(order.inventorySummary.restockStatus, labels)}</p>
          </article>
          <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.inventoryLastRestockedAt}</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{order.inventorySummary.lastRestockedAt ? formatDate(order.inventorySummary.lastRestockedAt, locale) : labels.notSpecified}</p>
          </article>
        </div>
      </div>

      <div className="border-t border-[color:var(--color-border)] p-5">
        <h3 className="mb-3 text-lg font-semibold tracking-tight text-[color:var(--color-text)]">{labels.financialMovementsTitle}</h3>
        <div className="space-y-3">
          {order.financialMovements.map((movement) => (
            <article key={movement.id} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
              <div className="grid gap-2 text-sm text-[color:var(--color-text)] md:grid-cols-2">
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.financialMovementAccount}:</span> {movement.accountName}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.financialMovementDirection}:</span> {formatFinancialDirection(movement.direction)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.financialMovementSource}:</span> {formatFinancialMovementSource(movement.sourceType, labels)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.financialMovementCategory}:</span> {movement.category ?? labels.notSpecified}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.orderTotal}:</span> {formatMoney(movement.amount, movement.currency, locale)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyAt}:</span> {formatDate(movement.transactionAt, locale)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.customerAccount}:</span> {movement.counterpartyName ?? labels.notSpecified}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyNote}:</span> {movement.note ?? movement.title}</p>
              </div>
            </article>
          ))}
          {order.financialMovements.length === 0 ? <p className="text-sm text-[color:var(--color-text-muted)]">{labels.notSpecified}</p> : null}
        </div>
      </div>

      <div className="border-t border-[color:var(--color-border)] p-5">
        <h3 className="mb-3 text-lg font-semibold tracking-tight text-[color:var(--color-text)]">{labels.inventoryMovementTitle}</h3>
        <div className="space-y-3">
          {order.inventoryMovements.map((movement) => (
            <article key={movement.id} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
              <div className="grid gap-2 text-sm text-[color:var(--color-text)] md:grid-cols-2">
                <p>
                  <span className="font-medium text-[color:var(--color-text)]">{labels.inventoryMovementType}:</span>{" "}
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${movementBadgeClass(movement.type)}`}>
                    {formatMovementType(movement.type, labels)}
                  </span>
                </p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.inventoryMovementQuantity}:</span> {movement.quantity}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.inventoryMovementWarehouse}:</span> {formatWarehouseCode(movement.warehouseCode, labels)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.inventoryMovementReservation}:</span> {movement.reservationId ?? labels.notSpecified}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyAt}:</span> {formatDate(movement.createdAt, locale)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyNote}:</span> {formatSystemNote(movement.note, order.orderNumber, labels)}</p>
              </div>
            </article>
          ))}
          {order.inventoryMovements.length === 0 ? <p className="text-sm text-[color:var(--color-text-muted)]">{labels.notSpecified}</p> : null}
        </div>
      </div>

      <div className="border-t border-[color:var(--color-border)] p-5">
        <h3 className="mb-3 text-lg font-semibold tracking-tight text-[color:var(--color-text)]">{labels.collectionSummaryTitle}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.collectionRecordedAmount}</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{formatMoney(recordedCollectionAmount, order.currency, locale)}</p>
          </article>
          <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.collectionRemainingAmount}</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--color-text)]">{formatMoney(remainingCollectionAmount, order.currency, locale)}</p>
          </article>
        </div>
        {isAutoPaidByCollections ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">{labels.collectionAutoPaidTitle}</p>
            <p className="mt-1 text-sm text-emerald-800">{labels.collectionAutoPaidDescription}</p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[color:var(--color-border)] p-5">
        <h3 className="mb-3 text-lg font-semibold tracking-tight text-[color:var(--color-text)]">{labels.statusHistoryTitle}</h3>
        <div className="space-y-3">
          {order.statusHistory.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
              <div className="grid gap-2 text-sm text-[color:var(--color-text)] md:grid-cols-2">
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyFrom}:</span> {entry.fromStatus ? formatOrderStatus(entry.fromStatus, labels) : labels.notSpecified}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyTo}:</span> {formatOrderStatus(entry.toStatus, labels)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historySource}:</span> {entry.source === "ADMIN" ? labels.historySourceAdmin : labels.historySourceSystem}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyBy}:</span> {entry.changedByUserId ?? labels.notSpecified}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyAt}:</span> {formatDate(entry.createdAt, locale)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyNote}:</span> {formatSystemNote(entry.note, order.orderNumber, labels)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="border-t border-[color:var(--color-border)] p-5">
        <h3 className="mb-3 text-lg font-semibold tracking-tight text-[color:var(--color-text)]">{labels.paymentHistoryTitle}</h3>
        <div className="space-y-3">
          {order.paymentStatusHistory.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] p-4">
              <div className="grid gap-2 text-sm text-[color:var(--color-text)] md:grid-cols-2">
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.paymentHistoryFrom}:</span> {entry.fromStatus ? formatPaymentStatus(entry.fromStatus) : labels.notSpecified}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.paymentHistoryTo}:</span> {formatPaymentStatus(entry.toStatus)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historySource}:</span> {entry.source === "ADMIN" ? labels.historySourceAdmin : labels.historySourceSystem}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyBy}:</span> {entry.changedByUserId ?? labels.notSpecified}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyAt}:</span> {formatDate(entry.createdAt, locale)}</p>
                <p><span className="font-medium text-[color:var(--color-text)]">{labels.historyNote}:</span> {formatSystemNote(entry.note, order.orderNumber, labels)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--color-border)] p-5">
          {remainingCollectionAmount > 0 && paymentStatus !== "REFUNDED" ? (
            <>
              <select
                value={collectionFinancialAccountId}
                onChange={(event) => setCollectionFinancialAccountId(event.target.value)}
                className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
                disabled={loading}
              >
                <option value="">{labels.collectionFinancialAccount}</option>
                {accountOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={createCollection} disabled={loading}>
                {labels.createCollection}
              </Button>
            </>
          ) : null}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus)}
            className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
            disabled={loading}
          >
            <option value="CONFIRMED">{labels.orderStatusConfirmed}</option>
            <option value="CANCELLED">{labels.orderStatusCancelled}</option>
          </select>
          <select
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}
            className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
            disabled={loading}
          >
            <option value="PENDING">{formatPaymentStatus("PENDING")}</option>
            <option value="AUTHORIZED">{formatPaymentStatus("AUTHORIZED")}</option>
            <option value="PAID">{formatPaymentStatus("PAID")}</option>
            <option value="FAILED">{formatPaymentStatus("FAILED")}</option>
            <option value="REFUNDED">{formatPaymentStatus("REFUNDED")}</option>
          </select>
          {paymentStatus === "REFUNDED" && order.paymentStatus !== "REFUNDED" ? (
            <select
              value={refundFinancialAccountId}
              onChange={(event) => setRefundFinancialAccountId(event.target.value)}
              className="h-10 rounded-md border border-[color:var(--color-border)] px-3 text-sm"
              disabled={loading}
            >
              <option value="">{labels.refundFinancialAccount}</option>
              {accountOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          ) : null}
          <Button type="button" variant="secondary" onClick={updateStatus} disabled={loading}>{loading ? labels.loading : labels.updateStatus}</Button>
          <ConfirmDeleteButton
            type="button"
            variant="destructive"
            disabled={loading}
            onConfirm={deleteOrder}
            title={labels.deleteConfirmTitle}
            description={labels.deleteConfirmDescription}
            confirmLabel={labels.deleteOrder}
            cancelLabel={labels.cancel}
          >
            {labels.deleteOrder}
          </ConfirmDeleteButton>
        </div>
      ) : null}
    </section>
  );
}
