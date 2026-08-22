import { z } from "zod";

import type {
  AdminCreateNegotiableInstrumentInput,
  AdminNegotiableInstrumentDetail,
  AdminNegotiableInstrumentLifecycleInput,
  AdminNegotiableInstrumentListItem,
  AdminNegotiableInstrumentsQuery,
  AdminNegotiableInstrumentsResult,
  NegotiableInstrumentDirection,
  NegotiableInstrumentLifecycleAction,
  NegotiableInstrumentStatus,
  NegotiableInstrumentType,
} from "@/modules/finance/contracts/negotiable-instrument.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import { negotiableInstrumentRepository } from "@/modules/finance/repositories/negotiable-instrument.repository";
import {
  listAllowedNegotiableInstrumentActions,
  requiresFinancialAccountForLifecycleAction,
  resolveNegotiableInstrumentNextStatus,
} from "@/modules/finance/services/negotiable-instrument-lifecycle.util";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  direction: z.enum(["all", "RECEIVABLE", "PAYABLE"]).default("all"),
  status: z.enum(["all", "PORTFOLIO", "COLLECTED", "PAID", "BOUNCED", "CANCELLED"]).default("all"),
  overdueOnly: z.coerce.boolean().optional(),
});

const createSchema = z.object({
  instrumentNumber: z.string().trim().min(1).max(80),
  instrumentType: z.enum(["CHECK", "PROMISSORY_NOTE"]),
  direction: z.enum(["RECEIVABLE", "PAYABLE"]),
  amount: z.coerce.number().positive(),
  currency: z.string().trim().length(3).optional(),
  dueDate: z.string().trim().min(1),
  issueDate: z.string().trim().optional().nullable(),
  counterpartyKind: z.enum(["CUSTOMER", "SUPPLIER", "UNREGISTERED"]).optional(),
  customerAccountId: z.string().trim().optional().nullable(),
  supplierId: z.string().trim().optional().nullable(),
  counterpartyName: z.string().trim().max(160).optional().nullable(),
  endorserName: z.string().trim().max(160).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

const lifecycleSchema = z.object({
  instrumentId: z.string().trim().min(1),
  action: z.enum(["collect", "pay", "bounce", "cancel"]),
  financialAccountId: z.string().trim().optional(),
});

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function startOfUtcDay(value: Date) {
  const next = new Date(value);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function parseDateInput(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Geçerli bir vade tarihi girin.");
  }

  return startOfUtcDay(parsed);
}

function computeDueMetrics(dueDate: Date, status: NegotiableInstrumentStatus) {
  const today = startOfUtcDay(new Date());
  const due = startOfUtcDay(dueDate);
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / MS_PER_DAY);
  const isOverdue = status === "PORTFOLIO" && daysUntilDue < 0;

  return { daysUntilDue, isOverdue };
}

function resolveCounterpartyDisplayName(record: {
  counterpartyName: string | null;
  cari?: { name?: string; slug: string } | null;
}) {
  if (record.counterpartyName) {
    return record.counterpartyName;
  }

  if (record.cari?.name) {
    return record.cari.name;
  }

  return null;
}

function mapListItem(record: Awaited<ReturnType<typeof negotiableInstrumentRepository.listInstruments>>[number], locale: string): AdminNegotiableInstrumentListItem {
  const status = record.status as NegotiableInstrumentStatus;
  const dueMetrics = computeDueMetrics(record.dueDate, status);

  return {
    id: record.id,
    instrumentNumber: record.instrumentNumber,
    instrumentType: record.instrumentType as NegotiableInstrumentType,
    direction: record.direction as NegotiableInstrumentDirection,
    status,
    amount: toNumber(record.amount),
    currency: record.currency,
    dueDate: record.dueDate.toISOString(),
    issueDate: record.issueDate ? record.issueDate.toISOString() : null,
    counterpartyName: resolveCounterpartyDisplayName(record),
    customerAccountSlug: record.counterpartyKind === "CUSTOMER" ? record.cari?.slug ?? null : null,
    supplierSlug: record.counterpartyKind === "SUPPLIER" ? record.cari?.slug ?? null : null,
    isOverdue: dueMetrics.isOverdue,
    daysUntilDue: dueMetrics.daysUntilDue,
    detailHref: `/${locale}/admin/finance/instruments/${record.id}`,
  };
}

function mapDetail(
  record: NonNullable<Awaited<ReturnType<typeof negotiableInstrumentRepository.findInstrumentById>>>,
  locale: string,
): AdminNegotiableInstrumentDetail {
  const base = mapListItem(record, locale);

  return {
    ...base,
    endorserName: record.endorserName,
    note: record.note,
    financialAccountId: record.financialAccountId,
    financialAccountName: record.financialAccount?.name ?? null,
    cashTransactionId: record.cashTransactionId,
    cashTransactionHref: record.cashTransactionId ? `/${locale}/admin/finance/transactions/${record.cashTransactionId}` : null,
    allowedActions: listAllowedNegotiableInstrumentActions({
      direction: record.direction as NegotiableInstrumentDirection,
      status: record.status as NegotiableInstrumentStatus,
    }),
  };
}

function resolveCreateCounterparty(parsed: z.infer<typeof createSchema>) {
  const kind = parsed.counterpartyKind ?? "UNREGISTERED";

  if (kind === "CUSTOMER") {
    if (!parsed.customerAccountId) {
      throw new Error("Müşteri cari seçin.");
    }

    return {
      counterpartyKind: "CUSTOMER" as const,
      customerAccountId: parsed.customerAccountId,
      supplierId: null,
      counterpartyName: parsed.counterpartyName ?? null,
    };
  }

  if (kind === "SUPPLIER") {
    if (!parsed.supplierId) {
      throw new Error("Tedarikçi cari seçin.");
    }

    return {
      counterpartyKind: "SUPPLIER" as const,
      customerAccountId: null,
      supplierId: parsed.supplierId,
      counterpartyName: parsed.counterpartyName ?? null,
    };
  }

  if (!parsed.counterpartyName?.trim()) {
    throw new Error("Kayıtsız cari için isim girin.");
  }

  return {
    counterpartyKind: "UNREGISTERED" as const,
    customerAccountId: null,
    supplierId: null,
    counterpartyName: parsed.counterpartyName.trim(),
  };
}

function buildCashTransactionPayload(args: {
  instrument: NonNullable<Awaited<ReturnType<typeof negotiableInstrumentRepository.findInstrumentById>>>;
  action: NegotiableInstrumentLifecycleAction;
  financialAccountId: string;
  actorUserId: string;
}) {
  const amount = toNumber(args.instrument.amount);
  const instrumentLabel = args.instrument.instrumentType === "CHECK" ? "Çek" : "Senet";
  const referenceId = `negotiable-instrument:${args.instrument.id}`;

  if (args.action === "collect") {
    return {
      accountId: args.financialAccountId,
      direction: "IN" as const,
      sourceType: "COLLECTION" as const,
      category: "GENERAL_INCOME" as const,
      amount,
      currency: args.instrument.currency,
      transactionAt: new Date(),
      title: `${instrumentLabel} tahsilatı: ${args.instrument.instrumentNumber}`.slice(0, 160),
      note: args.instrument.note,
      counterpartyKind: args.instrument.counterpartyKind,
      customerAccountId: args.instrument.customerAccountId,
      supplierId: args.instrument.supplierId,
      counterpartyName: resolveCounterpartyDisplayName(args.instrument),
      sourceReferenceId: referenceId,
      createdByUserId: args.actorUserId,
    };
  }

  return {
    accountId: args.financialAccountId,
    direction: "OUT" as const,
    sourceType: "PAYMENT" as const,
    category: "GENERAL_EXPENSE" as const,
    amount,
    currency: args.instrument.currency,
    transactionAt: new Date(),
    title: `${instrumentLabel} ödemesi: ${args.instrument.instrumentNumber}`.slice(0, 160),
    note: args.instrument.note,
    counterpartyKind: args.instrument.counterpartyKind,
    customerAccountId: args.instrument.customerAccountId,
    supplierId: args.instrument.supplierId,
    counterpartyName: resolveCounterpartyDisplayName(args.instrument),
    sourceReferenceId: referenceId,
    createdByUserId: args.actorUserId,
  };
}

export class NegotiableInstrumentService {
  async listInstruments(query: AdminNegotiableInstrumentsQuery = {}, locale = "tr"): Promise<AdminNegotiableInstrumentsResult> {
    const parsed = listQuerySchema.parse(query);
    const records = await negotiableInstrumentRepository.listInstruments({
      search: parsed.search,
      direction: parsed.direction === "all" ? undefined : parsed.direction,
      status: parsed.status === "all" ? undefined : parsed.status,
      overdueOnly: parsed.overdueOnly,
    });

    type InstrumentRecord = Awaited<ReturnType<typeof negotiableInstrumentRepository.listInstruments>>[number];

    const items = records.map((record: InstrumentRecord) => mapListItem(record, locale));
    const portfolioItems = items.filter((item: AdminNegotiableInstrumentListItem) => item.status === "PORTFOLIO");

    return {
      items,
      summary: {
        portfolioCount: portfolioItems.length,
        overdueCount: portfolioItems.filter((item: AdminNegotiableInstrumentListItem) => item.isOverdue).length,
        receivablePortfolioAmount: Number(
          portfolioItems
            .filter((item: AdminNegotiableInstrumentListItem) => item.direction === "RECEIVABLE")
            .reduce((sum: number, item: AdminNegotiableInstrumentListItem) => sum + item.amount, 0)
            .toFixed(2),
        ),
        payablePortfolioAmount: Number(
          portfolioItems
            .filter((item: AdminNegotiableInstrumentListItem) => item.direction === "PAYABLE")
            .reduce((sum: number, item: AdminNegotiableInstrumentListItem) => sum + item.amount, 0)
            .toFixed(2),
        ),
        currency: items[0]?.currency ?? "TRY",
      },
    };
  }

  async getInstrumentDetail(id: string, locale = "tr"): Promise<AdminNegotiableInstrumentDetail | null> {
    const record = await negotiableInstrumentRepository.findInstrumentById(id);
    if (!record) {
      return null;
    }

    return mapDetail(record, locale);
  }

  async createInstrument(input: AdminCreateNegotiableInstrumentInput & { createdByUserId?: string | null }, locale = "tr") {
    const parsed = createSchema.parse(input);
    const counterparty = resolveCreateCounterparty(parsed);
    const dueDate = parseDateInput(parsed.dueDate);
    const issueDate = parsed.issueDate ? parseDateInput(parsed.issueDate) : null;

    const created = await negotiableInstrumentRepository.createInstrument({
      instrumentNumber: parsed.instrumentNumber,
      instrumentType: parsed.instrumentType,
      direction: parsed.direction,
      amount: parsed.amount,
      currency: parsed.currency?.toUpperCase() ?? "TRY",
      dueDate,
      issueDate,
      ...counterparty,
      endorserName: parsed.endorserName ?? null,
      note: parsed.note ?? null,
      createdByUserId: input.createdByUserId ?? null,
    });

    return mapListItem(created, locale);
  }

  async applyLifecycle(input: AdminNegotiableInstrumentLifecycleInput & { actorUserId: string }, locale = "tr") {
    const parsed = lifecycleSchema.parse(input);
    const record = await negotiableInstrumentRepository.findInstrumentById(parsed.instrumentId);

    if (!record) {
      throw new Error("Çek/senet kaydı bulunamadı.");
    }

    if (record.cashTransactionId) {
      throw new Error("Bu kayıt için finans hareketi zaten oluşturulmuş.");
    }

    const nextStatus = resolveNegotiableInstrumentNextStatus({
      direction: record.direction as NegotiableInstrumentDirection,
      currentStatus: record.status as NegotiableInstrumentStatus,
      action: parsed.action,
    });

    let financialAccountId: string | null = record.financialAccountId;

    if (requiresFinancialAccountForLifecycleAction(parsed.action)) {
      financialAccountId = parsed.financialAccountId ?? financialAccountId;
      if (!financialAccountId) {
        throw new Error("Tahsilat/ödeme için finans hesabı seçin.");
      }

      const account = await financeRepository.findFinancialAccountById(financialAccountId);
      if (!account || !account.isActive) {
        throw new Error("Geçerli bir finans hesabı seçin.");
      }

      if (account.currency !== record.currency) {
        throw new Error("Finans hesabı para birimi çek/senet ile aynı olmalıdır.");
      }
    }

    if (requiresFinancialAccountForLifecycleAction(parsed.action) && financialAccountId) {
      if (nextStatus !== "COLLECTED" && nextStatus !== "PAID") {
        throw new Error("Tahsilat/ödeme durumu finans hareketi oluşturmayı gerektirir.");
      }

      const updated = await negotiableInstrumentRepository.completeLifecycleWithCashTransaction({
        instrumentId: record.id,
        nextStatus,
        financialAccountId,
        cashTransaction: buildCashTransactionPayload({
          instrument: record,
          action: parsed.action,
          financialAccountId,
          actorUserId: input.actorUserId,
        }),
      });

      return mapDetail(updated, locale);
    }

    const updated = await negotiableInstrumentRepository.updateInstrumentStatus({
      id: record.id,
      status: nextStatus,
    });

    return mapDetail(updated, locale);
  }
}

export const negotiableInstrumentService = new NegotiableInstrumentService();
