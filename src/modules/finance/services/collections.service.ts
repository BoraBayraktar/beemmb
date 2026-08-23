import { z } from "zod";

import { commerceService } from "@/modules/commerce/services/commerce.service";
import type {
  AdminCollectionRecordItem,
  AdminCollectionsResult,
  AdminCreateCollectionRecordInput,
} from "@/modules/finance/contracts/collections.contract";
import type { OnlineCollectionWebhookPayload, OnlineCollectionWebhookProcessResult } from "@/modules/finance/contracts/online-collection.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import { financeAllocationService } from "@/modules/finance/services/allocation.service";
import { financeOrderCustomerLinkService } from "@/modules/finance/services/finance-order-customer-link.service";
import { financeAccountEntryService } from "@/modules/finance/services/finance-account-entry.service";
import { resolveFinanceIntegrationActorUserId } from "@/modules/finance/services/finance-integration-actor.util";
import { buildFinanceMovementReference } from "@/modules/finance/services/finance-movement-reference.service";
import { cashTransactionsService, invalidateFinanceCache } from "@/modules/finance/services/cash-transactions.service";
import { receivablesService } from "@/modules/finance/services/receivables.service";
import { resolveFinanceServiceMessages } from "@/modules/finance/services/finance-service-messages.resolver";

const createCollectionRecordSchema = z.object({
  orderId: z.string().trim().min(1),
  financialAccountId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  collectedAt: z.string().datetime(),
  note: z.string().trim().max(500).optional().nullable(),
  recordedByUserId: z.string().trim().min(1),
  onlineCollectionProvider: z.string().trim().min(1).optional().nullable(),
  onlineCollectionExternalId: z.string().trim().min(1).optional().nullable(),
});

function mapCollectionRecord(item: Awaited<ReturnType<typeof financeRepository.listCollectionRecords>>[number]): AdminCollectionRecordItem {
  return {
    id: item.id,
    orderId: item.orderId,
    financialAccountId: (item as { financialAccountId?: string | null }).financialAccountId ?? null,
    amount: item.amount.toNumber(),
    currency: item.currency,
    status: item.status,
    collectedAt: item.collectedAt.toISOString(),
    note: item.note,
    recordedByUserId: item.recordedByUserId,
    createdAt: item.createdAt.toISOString(),
  };
}

export class CollectionsService {
  async listCollectionReadiness(locale: string): Promise<AdminCollectionsResult> {
    const result = await receivablesService.listOperationalReceivables({
      page: 1,
      pageSize: 100,
      locale,
    });
    const orderIds = result.items.map((item) => item.orderId);
    const collectionRecords = await financeRepository.listCollectionRecords(orderIds);
    const recordsByOrderId = new Map<string, AdminCollectionRecordItem[]>();

    for (const record of collectionRecords.map(mapCollectionRecord)) {
      const current = recordsByOrderId.get(record.orderId) ?? [];
      current.push(record);
      recordsByOrderId.set(record.orderId, current);
    }

    const totalRecordedAmount = collectionRecords.reduce((sum, item) => sum + item.amount.toNumber(), 0);

    return {
      items: result.items.map((item) => {
        const recordedItems = recordsByOrderId.get(item.orderId) ?? [];
        const recordedAmount = recordedItems.reduce((sum, record) => sum + record.amount, 0);

        return {
          orderId: item.orderId,
          orderNumber: item.orderNumber,
          counterpartyName: item.counterpartyName,
          paymentStatus: item.paymentStatus,
          totalAmount: item.totalAmount,
          currency: item.currency,
          createdAt: item.createdAt,
          recordedCollectionCount: recordedItems.length,
          remainingAmount: Math.max(0, Number((item.totalAmount - recordedAmount).toFixed(2))),
          detailHref: `/${locale}/admin/finance/collections/${item.orderId}`,
          sourceHref: `/${locale}/admin/orders/${item.orderId}`,
        };
      }),
      summary: {
        totalPendingAmount: result.summary.totalOpenAmount,
        totalRecordedAmount,
        pendingCount: result.summary.pendingCount,
        authorizedCount: result.summary.authorizedCount,
        failedCount: result.summary.failedCount,
        recordedCount: collectionRecords.length,
        currency: result.summary.currency,
      },
    };
  }

  async getCollectionReadinessByOrderId(locale: string, orderId: string) {
    const result = await this.listCollectionReadiness(locale);
    return result.items.find((item) => item.orderId === orderId) ?? null;
  }

  async listCollectionRecords(orderId?: string) {
    const items = await financeRepository.listCollectionRecords(orderId ? [orderId] : undefined);
    return items.map(mapCollectionRecord);
  }

  async listOrderAllocationContexts(orderId: string, locale?: string) {
    return financeAllocationService.getOrderAllocationContexts(orderId, locale);
  }

  async listSupplierAllocationContexts(supplierId: string, locale?: string) {
    return financeAllocationService.getSupplierAllocationContexts(supplierId, locale);
  }

  async listOrderAllocationLinks(orderId: string) {
    return financeAllocationService.listAllocationsForOrder(orderId);
  }

  async createCollectionRecord(input: AdminCreateCollectionRecordInput & { locale?: string }) {
    const parsed = createCollectionRecordSchema.parse(input);
    const errors = resolveFinanceServiceMessages(input.locale).errors;
    const receivable = await receivablesService.getReceivableByOrderId(parsed.orderId, input.locale);

    if (!receivable) {
      throw new Error(errors.collectionOrderNotFound);
    }

    const existingRecords = await this.listCollectionRecords(parsed.orderId);
    const collectedAmount = existingRecords.reduce((sum, item) => sum + item.amount, 0);
    const remainingAmount = Number((receivable.totalAmount - collectedAmount).toFixed(2));

    if (parsed.amount > remainingAmount) {
      throw new Error(errors.collectionAmountExceedsReceivable);
    }

    const financialAccount = await financeRepository.findFinancialAccountById(parsed.financialAccountId);

    if (!financialAccount || !financialAccount.isActive) {
      throw new Error(errors.collectionInvalidFinancialAccount);
    }

    await financeOrderCustomerLinkService.linkOrderCustomerAccountFromDocuments(parsed.orderId);

    const created = await financeRepository.createCollectionRecord({
      orderId: parsed.orderId,
      financialAccountId: parsed.financialAccountId,
      amount: parsed.amount,
      currency: receivable.currency,
      collectedAt: new Date(parsed.collectedAt),
      note: parsed.note ?? null,
      recordedByUserId: parsed.recordedByUserId,
      onlineCollectionProvider: parsed.onlineCollectionProvider ?? null,
      onlineCollectionExternalId: parsed.onlineCollectionExternalId ?? null,
    });

    const customerAccountId = await financeRepository.findOrderCustomerAccountId(parsed.orderId);

    await financeAllocationService.createCollectionAllocations({
      collectionRecordId: created.id,
      orderId: parsed.orderId,
      amount: parsed.amount,
      currency: receivable.currency,
    });

    await cashTransactionsService.createTransaction({
      accountId: parsed.financialAccountId,
      direction: "IN",
      sourceType: "COLLECTION",
      sourceReferenceId: buildFinanceMovementReference("collection", created.id),
      amount: parsed.amount,
      transactionAt: parsed.collectedAt,
      title: `Tahsilat • ${receivable.orderNumber}`,
      note: parsed.note ?? `Sipariş tahsilatı • ${receivable.orderNumber}`,
      cariId: customerAccountId,
      counterpartyName: receivable.counterpartyName,
      recordedByUserId: parsed.recordedByUserId,
    });

    const newRemainingAmount = Number((remainingAmount - parsed.amount).toFixed(2));

    if (newRemainingAmount <= 0) {
      await commerceService.updateOrderStatus({
        id: parsed.orderId,
        paymentStatus: "PAID",
        changedByUserId: parsed.recordedByUserId,
        note: parsed.note ?? "Tahsilat tamamlandı ve ödeme durumu PAID olarak işaretlendi.",
      });
    }

    try {
      await financeAccountEntryService.syncFromCollectionRecord(created.id);
    } catch (error) {
      console.error("PF8 defter projeksiyonu (tahsilat) başarısız oldu.", error);
    }

    await invalidateFinanceCache();
    return mapCollectionRecord(created);
  }

  async createOnlineCollectionFromWebhook(args: {
    providerCode: string;
    payload: OnlineCollectionWebhookPayload;
  }): Promise<OnlineCollectionWebhookProcessResult> {
    const providerCode = args.providerCode.trim().toLowerCase();
    const existing = await financeRepository.findCollectionRecordByOnlineExternalId(
      providerCode,
      args.payload.externalPaymentId,
    );

    if (existing) {
      return {
        collectionRecordId: existing.id,
        orderId: existing.orderId,
        duplicate: true,
        amount: existing.amount.toNumber(),
        currency: existing.currency,
      };
    }

    const actorUserId = resolveFinanceIntegrationActorUserId();
    const created = await this.createCollectionRecord({
      orderId: args.payload.orderId,
      financialAccountId: args.payload.financialAccountId,
      amount: args.payload.amount,
      collectedAt: args.payload.collectedAt,
      note: args.payload.note ?? `Online tahsilat • ${providerCode}`,
      recordedByUserId: actorUserId,
      onlineCollectionProvider: providerCode,
      onlineCollectionExternalId: args.payload.externalPaymentId,
    });

    return {
      collectionRecordId: created.id,
      orderId: created.orderId,
      duplicate: false,
      amount: created.amount,
      currency: created.currency,
    };
  }
}

export const collectionsService = new CollectionsService();
