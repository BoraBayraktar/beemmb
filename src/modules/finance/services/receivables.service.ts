import { z } from "zod";

import type {
  AdminReceivableDetail,
  AdminReceivableListItem,
  AdminReceivablesQuery,
  AdminReceivablesResult,
  AdminReceivablesSummary,
  AdminReceivableStatus,
} from "@/modules/finance/contracts/receivables.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import { financeCounterpartyFinanceTermsService } from "@/modules/finance/services/finance-counterparty-finance-terms.service";
import { resolveFinanceServiceMessages } from "@/modules/finance/services/finance-service-messages.resolver";
import {
  buildFinanceDueKpi,
  computeDaysUntilDue,
  resolveReceivableEffectiveDueDate,
} from "@/modules/finance/services/finance-due-date.util";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  paymentStatus: z.enum(["all", "PENDING", "AUTHORIZED", "FAILED"]).default("all"),
  overdueOnly: z.preprocess(
    (value) => value === true || value === "true" || value === "1",
    z.boolean(),
  ).optional().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(12),
  locale: z.string().trim().optional(),
});

function resolveStatuses(status: "all" | AdminReceivableStatus): AdminReceivableStatus[] {
  if (status === "all") {
    return ["PENDING", "AUTHORIZED", "FAILED"];
  }

  return [status];
}

type ReceivableSource = {
  id: string;
  orderNumber: string;
  paymentStatus: AdminReceivableStatus;
  total: { toNumber: () => number };
  currency: string;
  createdAt: Date;
    customerAccount?: { name: string | null; id?: string | null; slug?: string | null; defaultPaymentTermDays?: number | null } | null;
  items: Array<{ quantity: number }>;
  businessDocuments: Array<{
    id: string;
    documentNumber: string;
    issueDate: Date;
    dueDate: Date | null;
    totalAmount: { toNumber: () => number } | null;
    currency: string;
    counterpartyName: string;
  }>;
};

function mapReceivable(item: ReceivableSource, unlinkedCustomerLabel: string): AdminReceivableListItem {
  const latestDocument = item.businessDocuments[0] ?? null;
  const resolvedCounterpartyName = item.customerAccount?.name?.trim()
    || latestDocument?.counterpartyName?.trim()
    || unlinkedCustomerLabel;

  const effectiveDueDate = resolveReceivableEffectiveDueDate({
    orderCreatedAtIso: item.createdAt.toISOString(),
    latestDocumentIssueDateIso: latestDocument?.issueDate.toISOString() ?? null,
    latestDocumentDueDateIso: latestDocument?.dueDate ? latestDocument.dueDate.toISOString() : null,
    customerDefaultPaymentTermDays: item.customerAccount?.defaultPaymentTermDays ?? null,
  });
  const daysUntilDue = computeDaysUntilDue(effectiveDueDate);

  return {
    orderId: item.id,
    orderNumber: item.orderNumber,
    customerAccountId: item.customerAccount?.id ?? null,
    customerAccountSlug: item.customerAccount?.slug ?? null,
    counterpartyName: resolvedCounterpartyName,
    paymentStatus: item.paymentStatus as AdminReceivableStatus,
    totalAmount: item.total.toNumber(),
    currency: item.currency,
    itemCount: item.items.reduce((sum: number, line: { quantity: number }) => sum + line.quantity, 0),
    createdAt: item.createdAt.toISOString(),
    effectiveDueDate,
    daysUntilDue,
    isOverdue: daysUntilDue < 0,
    latestDocument: latestDocument
      ? {
          id: latestDocument.id,
          documentNumber: latestDocument.documentNumber,
          issueDate: latestDocument.issueDate.toISOString(),
          dueDate: latestDocument.dueDate ? latestDocument.dueDate.toISOString() : null,
          effectiveDueDate,
          totalAmount: latestDocument.totalAmount?.toNumber() ?? null,
          currency: latestDocument.currency,
        }
      : null,
  };
}

function paginateReceivables(items: AdminReceivableListItem[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const start = (normalizedPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: normalizedPage,
    pageSize,
    total,
    totalPages,
  };
}

export class ReceivablesService {
  async listOperationalReceivables(query: AdminReceivablesQuery = {}): Promise<AdminReceivablesResult> {
    const parsed = listQuerySchema.parse(query);
    const messages = resolveFinanceServiceMessages(parsed.locale);
    const paymentStatuses = resolveStatuses(parsed.paymentStatus);

    const summary = await this.getReceivablesSummary();

    if (parsed.overdueOnly) {
      const allItems = await financeRepository.listOperationalReceivables({
        search: parsed.search,
        paymentStatuses,
        page: 1,
        pageSize: 5000,
      });
      const mapped = allItems.map((item: ReceivableSource) => mapReceivable(item, messages.receivables.unlinkedCustomer));
      const filtered = mapped.filter((item: AdminReceivableListItem) => item.isOverdue);
      const dueKpi = buildFinanceDueKpi(
        mapped.map((item: AdminReceivableListItem) => ({
          amount: item.totalAmount,
          effectiveDueDate: item.effectiveDueDate,
          currency: item.currency,
        })),
      );
      const pageResult = paginateReceivables(filtered, parsed.page, parsed.pageSize);

      return {
        ...pageResult,
        summary,
        dueKpi,
      };
    }

    const [items, total, dueSnapshots] = await Promise.all([
      financeRepository.listOperationalReceivables({
        search: parsed.search,
        paymentStatuses,
        page: parsed.page,
        pageSize: parsed.pageSize,
      }),
      financeRepository.countOperationalReceivables({
        search: parsed.search,
        paymentStatuses,
      }),
      financeRepository.listOperationalReceivableDueSnapshots(),
    ]);

    const dueKpi = buildFinanceDueKpi(
      dueSnapshots.map((item) => ({
        amount: item.total.toNumber(),
        effectiveDueDate: resolveReceivableEffectiveDueDate({
          orderCreatedAtIso: item.createdAt.toISOString(),
          latestDocumentIssueDateIso: item.businessDocuments[0]?.issueDate.toISOString() ?? null,
          latestDocumentDueDateIso: item.businessDocuments[0]?.dueDate
            ? item.businessDocuments[0].dueDate.toISOString()
            : null,
          customerDefaultPaymentTermDays: item.customerAccount?.defaultPaymentTermDays ?? null,
        }),
        currency: item.currency,
      })),
    );

    return {
      items: items.map((item: ReceivableSource) => mapReceivable(item, messages.receivables.unlinkedCustomer)),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
      summary,
      dueKpi,
    };
  }

  async getReceivablesSummary(): Promise<AdminReceivablesSummary> {
    return financeRepository.summarizeOperationalReceivables();
  }

  async getReceivableByOrderId(orderId: string, locale?: string): Promise<AdminReceivableDetail | null> {
    const messages = resolveFinanceServiceMessages(locale);
    const order = await financeRepository.findOperationalReceivableOrderById(orderId);

    if (!order) {
      return null;
    }

    const mapped = mapReceivable(order as ReceivableSource, messages.receivables.unlinkedCustomer);
    const documents = (order as ReceivableSource).businessDocuments.map((document) => {
      const effectiveDueDate = resolveReceivableEffectiveDueDate({
        orderCreatedAtIso: order.createdAt.toISOString(),
        latestDocumentIssueDateIso: document.issueDate.toISOString(),
        latestDocumentDueDateIso: document.dueDate ? document.dueDate.toISOString() : null,
      });

      return {
        id: document.id,
        documentNumber: document.documentNumber,
        issueDate: document.issueDate.toISOString(),
        dueDate: document.dueDate ? document.dueDate.toISOString() : null,
        effectiveDueDate,
        totalAmount: document.totalAmount?.toNumber() ?? null,
        currency: document.currency,
      };
    });

    return {
      ...mapped,
      documents,
      counterpartyFinanceTerms: await financeCounterpartyFinanceTermsService.getCustomerFinanceTerms(
        mapped.customerAccountId,
        locale ?? "tr",
      ),
    };
  }
}

export const receivablesService = new ReceivablesService();
