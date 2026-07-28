import { z } from "zod";

import { documentService } from "@/modules/documents/services/document.service";
import type {
  AdminCreatePaymentRecordInput,
  AdminPaymentRecordItem,
  AdminPaymentsResult,
} from "@/modules/finance/contracts/payments.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import { financeAllocationService } from "@/modules/finance/services/allocation.service";
import { buildFinanceMovementReference } from "@/modules/finance/services/finance-movement-reference.service";
import { cashTransactionsService } from "@/modules/finance/services/cash-transactions.service";
import { financeAccountEntryService } from "@/modules/finance/services/finance-account-entry.service";
import { payablesService } from "@/modules/finance/services/payables.service";
import { financeCounterpartyFinanceTermsService } from "@/modules/finance/services/finance-counterparty-finance-terms.service";
import { resolveFinanceServiceMessages } from "@/modules/finance/services/finance-service-messages.resolver";

const createPaymentRecordSchema = z.object({
  supplierId: z.string().trim().min(1),
  financialAccountId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  paidAt: z.string().datetime(),
  note: z.string().trim().max(500).optional().nullable(),
  recordedByUserId: z.string().trim().min(1),
});

function mapPaymentRecord(item: Awaited<ReturnType<typeof financeRepository.listPaymentRecords>>[number]): AdminPaymentRecordItem {
  return {
    id: item.id,
    supplierId: item.supplierId,
    financialAccountId: (item as { financialAccountId?: string | null }).financialAccountId ?? null,
    amount: item.amount.toNumber(),
    currency: item.currency,
    status: item.status,
    paidAt: item.paidAt.toISOString(),
    note: item.note,
    recordedByUserId: item.recordedByUserId,
    createdAt: item.createdAt.toISOString(),
  };
}

export class PaymentsService {
  async listPaymentReadiness(locale: string): Promise<AdminPaymentsResult> {
    const { items } = await payablesService.listSupplierPayables();
    const paymentRecords = await financeRepository.listPaymentRecords();
    const paymentRecordTotals = new Map<string, AdminPaymentRecordItem[]>();

    for (const record of paymentRecords.map(mapPaymentRecord)) {
      const current = paymentRecordTotals.get(record.supplierId) ?? [];
      current.push(record);
      paymentRecordTotals.set(record.supplierId, current);
    }

    const enrichedItems = await Promise.all(items.map(async (item) => {
      const records = item.supplierId ? (paymentRecordTotals.get(item.supplierId) ?? []) : [];
      const recordedAmount = records.reduce((sum, record) => sum + record.amount, 0);
      const detailedDocuments = await Promise.all(
        item.documents.map((document) => documentService.getBusinessDocumentById(document.id)),
      );
      const topVariantSummary = detailedDocuments
        .flatMap((document) => document.lines)
        .sort((left, right) => (right.lineTotal ?? 0) - (left.lineTotal ?? 0))
        .slice(0, 2)
        .map((line) => line.productVariantTitle ? `${line.productName} / ${line.productVariantTitle}` : line.productName)
        .join(" + ") || null;

      return {
        supplierId: item.supplierId ?? "",
        supplierKey: item.supplierKey,
        supplierName: item.supplierName,
        totalAmount: item.totalAmount,
        currency: item.currency,
        documentCount: item.documentCount,
        draftCount: item.draftCount,
        lastIssueDate: item.lastIssueDate,
        recordedPaymentCount: records.length,
        remainingAmount: Math.max(0, Number((item.totalAmount - recordedAmount).toFixed(2))),
        topVariantSummary,
        detailHref: `/${locale}/admin/finance/payments/${encodeURIComponent(item.supplierKey)}`,
        sourceHref: `/${locale}/admin/documents`,
        counterpartyFinanceTerms: item.supplierId
          ? await financeCounterpartyFinanceTermsService.getSupplierFinanceTerms(item.supplierId, locale)
          : null,
      };
    }));

    const totalPendingAmount = enrichedItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalRecordedAmount = paymentRecords.reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const draftDocumentCount = items.reduce((sum, item) => sum + item.draftCount, 0);

    return {
      items: enrichedItems,
      summary: {
        totalPendingAmount,
        totalRecordedAmount,
        supplierCount: enrichedItems.length,
        draftDocumentCount,
        recordedCount: paymentRecords.length,
        currency: items[0]?.currency ?? "TRY",
      },
    };
  }

  async getPaymentReadinessBySupplierKey(locale: string, supplierKey: string) {
    const result = await this.listPaymentReadiness(locale);
    return result.items.find((item) => item.supplierKey === supplierKey) ?? null;
  }

  async listPaymentRecords(supplierId?: string) {
    const items = await financeRepository.listPaymentRecords(supplierId ? [supplierId] : undefined);
    return items.map(mapPaymentRecord);
  }

  async listSupplierAllocationContexts(supplierId: string, locale?: string) {
    return financeAllocationService.getSupplierAllocationContexts(supplierId, locale);
  }

  async listSupplierAllocationLinks(supplierId: string) {
    return financeAllocationService.listAllocationsForSupplierDocuments(supplierId);
  }

  async createPaymentRecord(input: AdminCreatePaymentRecordInput & { locale?: string }) {
    const parsed = createPaymentRecordSchema.parse(input);
    const errors = resolveFinanceServiceMessages(input.locale).errors;
    const supplier = await financeRepository.findSupplierById(parsed.supplierId);

    if (!supplier) {
      throw new Error(errors.paymentSupplierNotFound);
    }

    const { items: payableItems } = await payablesService.listSupplierPayables();
    const payable = payableItems.find((item) => item.supplierId === supplier.id);

    if (!payable) {
      throw new Error(errors.paymentPayableNotFound);
    }

    const existingRecords = await this.listPaymentRecords(parsed.supplierId);
    const paidAmount = existingRecords.reduce((sum, item) => sum + item.amount, 0);
    const remainingAmount = Number((payable.totalAmount - paidAmount).toFixed(2));

    if (parsed.amount > remainingAmount) {
      throw new Error(errors.paymentAmountExceedsDebt);
    }

    const financialAccount = await financeRepository.findFinancialAccountById(parsed.financialAccountId);

    if (!financialAccount || !financialAccount.isActive) {
      throw new Error(errors.paymentInvalidFinancialAccount);
    }

    const created = await financeRepository.createPaymentRecord({
      supplierId: parsed.supplierId,
      financialAccountId: parsed.financialAccountId,
      amount: parsed.amount,
      currency: payable.currency,
      paidAt: new Date(parsed.paidAt),
      note: parsed.note ?? null,
      recordedByUserId: parsed.recordedByUserId,
    });

    await financeAllocationService.createPaymentAllocations({
      paymentRecordId: created.id,
      supplierId: parsed.supplierId,
      amount: parsed.amount,
      currency: payable.currency,
    });

    await cashTransactionsService.createTransaction({
      accountId: parsed.financialAccountId,
      direction: "OUT",
      sourceType: "PAYMENT",
      sourceReferenceId: buildFinanceMovementReference("payment", created.id),
      amount: parsed.amount,
      transactionAt: parsed.paidAt,
      title: `Ödeme • ${payable.supplierName}`,
      note: parsed.note ?? `Tedarikçi ödemesi • ${payable.supplierName}`,
      counterpartyKind: "SUPPLIER",
      supplierId: supplier.id,
      counterpartyName: payable.supplierName,
      recordedByUserId: parsed.recordedByUserId,
    });

    try {
      await financeAccountEntryService.syncFromPaymentRecord(created.id);
    } catch (error) {
      console.error("PF8 defter projeksiyonu (ödeme) başarısız oldu.", error);
    }

    return mapPaymentRecord(created);
  }
}

export const paymentsService = new PaymentsService();
