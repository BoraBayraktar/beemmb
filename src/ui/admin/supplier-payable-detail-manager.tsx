import Link from "next/link";

import type { AdminSupplierPayableDetail } from "@/modules/finance/contracts/payables.contract";
import type { AdminInventoryPayableSummary } from "@/modules/finance/contracts/inventory-payable-summary.contract";
import { FinanceInventoryPayableSummaryPanel } from "@/ui/admin/finance-inventory-payable-summary-panel";

type Labels = {
  title: string;
  description: string;
  totalAmount: string;
  documentCount: string;
  draftCount: string;
  lastIssueDate: string;
  documentNumber: string;
  documentType: string;
  documentStatus: string;
  orderNumber: string;
  inventoryTransactionNumber: string;
  backToList: string;
  openDocuments: string;
  notSpecified: string;
  financeDocumentMovementPreviewOpen: string;
  inventoryPayableSummaryTitle: string;
  inventoryPayableSummaryLinkedCount: string;
  inventoryPayableSummaryLineQuantity: string;
  inventoryPayableSummaryInventoryTransaction: string;
  inventoryPayableSummaryLineQuantityLabel: string;
  inventoryPayableSummaryOpenInventory: string;
  inventoryPayableSummaryEmpty: string;
  counterpartyFinanceHint: string | null;
};

type Props = {
  locale: string;
  item: AdminSupplierPayableDetail;
  inventorySummary: AdminInventoryPayableSummary;
  labels: Labels;
};

export function SupplierPayableDetailManager({ locale, item, inventorySummary, labels }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-neutral-950">{item.supplierName}</h1>
            <p className="text-sm text-neutral-600">{labels.description}</p>
            {labels.counterpartyFinanceHint ? (
              <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{labels.counterpartyFinanceHint}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/admin/finance/payables`} className="inline-flex h-10 items-center rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-700">
              {labels.backToList}
            </Link>
            <Link href={`/${locale}/admin/documents`} className="inline-flex h-10 items-center rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-700">
              {labels.openDocuments}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{labels.totalAmount}</p>
          <p className="mt-3 text-2xl font-semibold text-amber-950">{item.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.currency}</p>
        </article>
        <article className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.documentCount}</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-950">{item.documentCount}</p>
        </article>
        <article className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.draftCount}</p>
          <p className="mt-3 text-2xl font-semibold text-neutral-950">{item.draftCount}</p>
        </article>
        <article className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{labels.lastIssueDate}</p>
          <p className="mt-3 text-sm font-semibold text-neutral-950">{item.lastIssueDate ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(item.lastIssueDate)) : labels.notSpecified}</p>
        </article>
      </section>

      <FinanceInventoryPayableSummaryPanel
        summary={inventorySummary}
        labels={{
          title: labels.inventoryPayableSummaryTitle,
          linkedDocumentCount: labels.inventoryPayableSummaryLinkedCount,
          totalLineQuantity: labels.inventoryPayableSummaryLineQuantity,
          documentNumber: labels.documentNumber,
          inventoryTransaction: labels.inventoryPayableSummaryInventoryTransaction,
          lineQuantity: labels.inventoryPayableSummaryLineQuantityLabel,
          openInventory: labels.inventoryPayableSummaryOpenInventory,
          empty: labels.inventoryPayableSummaryEmpty,
          notSpecified: labels.notSpecified,
        }}
      />

      <section className="space-y-3">
        {item.documents.map((document) => (
          <article key={document.id} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700">{document.documentType}</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{document.status}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-neutral-950">{document.documentNumber}</h2>
            <div className="mt-3 grid gap-2 text-sm text-neutral-700 md:grid-cols-2 xl:grid-cols-3">
              <p>{labels.documentStatus}: {document.status}</p>
              <p>{labels.documentType}: {document.documentType}</p>
              <p>{labels.orderNumber}: {document.orderNumber ?? labels.notSpecified}</p>
              <p>{labels.inventoryTransactionNumber}: {document.inventoryTransactionNumber ?? labels.notSpecified}</p>
              <p>{labels.lastIssueDate}: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(document.issueDate))}</p>
              <p>{labels.totalAmount}: {(document.totalAmount ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {document.currency}</p>
            </div>
            <div className="mt-4">
              <Link
                href={`/${locale}/admin/finance/business-documents/${document.id}/movements`}
                className="inline-flex text-sm font-medium text-neutral-800 underline-offset-2 hover:underline"
              >
                {labels.financeDocumentMovementPreviewOpen}
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {document.lines.map((line) => (
                <article key={line.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                  <p className="font-semibold text-neutral-950">{line.productName}</p>
                  {line.productVariantTitle ? (
                    <p className="mt-1 text-xs text-neutral-600">
                      Varyant: {line.productVariantTitle}
                      {line.productVariantSku ? ` • ${line.productVariantSku}` : ""}
                    </p>
                  ) : null}
                  <p className="mt-1">
                    SKU: {line.productSku} • {line.quantity}
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Birim maliyet: {line.unitPrice === null ? labels.notSpecified : `${line.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${line.currency}`}
                    {" • "}
                    Satır toplamı: {line.lineTotal === null ? labels.notSpecified : `${line.lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${line.currency}`}
                  </p>
                </article>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
