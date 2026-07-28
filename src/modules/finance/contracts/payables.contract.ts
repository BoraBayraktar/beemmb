import type { AdminFinanceDueKpi } from "@/modules/finance/contracts/finance-due.contract";
import type { AdminBusinessDocumentDetail, AdminOperationalPayableDocument } from "@/modules/documents/contracts/document.contract";

export type AdminSupplierPayablesQuery = {
  search?: string;
  overdueOnly?: boolean;
};

export type AdminSupplierPayablesListResult = {
  items: AdminSupplierPayableSummary[];
  dueKpi: AdminFinanceDueKpi;
};

export type AdminSupplierPayableSummary = {
  supplierId: string | null;
  supplierSlug: string | null;
  supplierKey: string;
  supplierName: string;
  currency: string;
  totalAmount: number;
  documentCount: number;
  draftCount: number;
  lastIssueDate: string | null;
  nearestDueDate: string | null;
  overdueAmount: number;
  topVariantSummary: string | null;
  documents: AdminOperationalPayableDocument[];
};

export type AdminSupplierPayableDetailDocument = AdminBusinessDocumentDetail;

export type AdminSupplierPayableDetail = Omit<AdminSupplierPayableSummary, "documents"> & {
  documents: AdminSupplierPayableDetailDocument[];
};
