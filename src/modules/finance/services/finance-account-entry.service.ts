import { z } from "zod";

import type {
  AdminFinanceLedgerBackfillResult,
  AdminFinanceLedgerEntriesQuery,
  AdminFinanceLedgerEntriesResult,
  AdminFinanceLedgerEntryListItem,
  FinanceAccountEntrySourceType,
} from "@/modules/finance/contracts/finance-account-entry.contract";
import { financeAccountEntryRepository } from "@/modules/finance/repositories/finance-account-entry.repository";
import { financeLedgerAccountRepository } from "@/modules/finance/repositories/finance-ledger-account.repository";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";
import {
  assertBalancedEntryLines,
  buildCollectionEntryLines,
  buildManualCashEntryLines,
  buildIncomingInvoiceEntryLines,
  buildPaymentEntryLines,
  buildBusinessDocumentEntryLines,
  buildTransferCashEntryLines,
  type PlannedFinanceAccountEntryLine,
} from "@/modules/finance/services/finance-account-entry-mapping.util";
import { incomingInvoiceRepository } from "@/modules/incoming-invoices/repositories/incoming-invoice.repository";
import { parseFinanceReportDateRangeQuery } from "@/modules/finance/services/finance-report-date-range.util";

const listQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sourceType: z.enum(["all", "CASH_TRANSACTION", "COLLECTION", "PAYMENT", "BUSINESS_DOCUMENT", "INCOMING_INVOICE"]).default("all"),
});

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function resolveCounterpartyName(record: {
  customerAccount?: { name: string } | null;
  supplier?: { name: string } | null;
}) {
  return record.customerAccount?.name ?? record.supplier?.name ?? null;
}

function mapEntry(record: Awaited<ReturnType<typeof financeAccountEntryRepository.listEntries>>[number]): AdminFinanceLedgerEntryListItem {
  return {
    id: record.id,
    lineKey: record.lineKey,
    entryAt: record.entryAt.toISOString(),
    ledgerAccountCode: record.ledgerAccount.code,
    ledgerAccountName: record.ledgerAccount.name,
    side: record.side,
    amount: toNumber(record.amount),
    currency: record.currency,
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    sourceReference: record.sourceReference,
    title: record.title,
    note: record.note,
    counterpartyName: resolveCounterpartyName(record),
  };
}

export class FinanceAccountEntryService {
  private async resolveLedgerAccountMap(codes: string[]) {
    const uniqueCodes = [...new Set(codes)];
    const accounts = await Promise.all(uniqueCodes.map((code) => financeLedgerAccountRepository.findByCode(code)));
    const map = new Map<string, string>();
    for (const account of accounts) {
      if (account) {
        map.set(account.code, account.id);
      }
    }

    const missing = uniqueCodes.filter((code) => !map.has(code));
    if (missing.length > 0) {
      throw new Error(`Hesap planında eksik kod: ${missing.join(", ")}`);
    }

    return map;
  }

  private async persistPlannedLines(args: {
    lines: PlannedFinanceAccountEntryLine[];
    entryAt: Date;
    currency: string;
    sourceType: FinanceAccountEntrySourceType;
    sourceId: string;
    sourceReference?: string | null;
    note?: string | null;
    customerAccountId?: string | null;
    supplierId?: string | null;
    financialAccountId?: string | null;
  }) {
    assertBalancedEntryLines(args.lines);
    const ledgerMap = await this.resolveLedgerAccountMap(args.lines.map((line) => line.ledgerAccountCode));

    return financeAccountEntryRepository.createEntryLines(
      args.lines.map((line) => ({
        lineKey: line.lineKey,
        entryAt: args.entryAt,
        ledgerAccountId: ledgerMap.get(line.ledgerAccountCode)!,
        side: line.side,
        amount: line.amount,
        currency: args.currency,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
        sourceReference: args.sourceReference ?? null,
        title: line.title,
        note: line.note ?? args.note ?? null,
        customerAccountId: args.customerAccountId ?? null,
        supplierId: args.supplierId ?? null,
        financialAccountId: args.financialAccountId ?? null,
      })),
    );
  }

  async syncFromCollectionRecord(collectionRecordId: string) {
    const existing = await financeAccountEntryRepository.countBySource("COLLECTION", collectionRecordId);
    if (existing > 0) {
      return { created: 0, skipped: true };
    }

    const record = await financeRepository.findCollectionRecordById(collectionRecordId);
    if (!record || !record.financialAccountId) {
      return { created: 0, skipped: true };
    }

    const account = await financeRepository.findFinancialAccountById(record.financialAccountId);
    if (!account) {
      return { created: 0, skipped: true };
    }

    const amount = toNumber(record.amount);
    const lines = buildCollectionEntryLines({
      collectionRecordId,
      amount,
      financialAccountType: account.type,
    });

    const customerAccountId = await financeRepository.findOrderCustomerAccountId(record.orderId);

    const result = await this.persistPlannedLines({
      lines,
      entryAt: record.collectedAt,
      currency: record.currency,
      sourceType: "COLLECTION",
      sourceId: collectionRecordId,
      sourceReference: `collection:${collectionRecordId}`,
      note: record.note,
      customerAccountId,
      financialAccountId: record.financialAccountId,
    });

    return { created: result.created, skipped: false };
  }

  async syncFromPaymentRecord(paymentRecordId: string) {
    const existing = await financeAccountEntryRepository.countBySource("PAYMENT", paymentRecordId);
    if (existing > 0) {
      return { created: 0, skipped: true };
    }

    const record = await financeRepository.findPaymentRecordById(paymentRecordId);
    if (!record || !record.financialAccountId) {
      return { created: 0, skipped: true };
    }

    const account = await financeRepository.findFinancialAccountById(record.financialAccountId);
    if (!account) {
      return { created: 0, skipped: true };
    }

    const lines = buildPaymentEntryLines({
      paymentRecordId,
      amount: toNumber(record.amount),
      financialAccountType: account.type,
    });

    const result = await this.persistPlannedLines({
      lines,
      entryAt: record.paidAt,
      currency: record.currency,
      sourceType: "PAYMENT",
      sourceId: paymentRecordId,
      sourceReference: `payment:${paymentRecordId}`,
      note: record.note,
      supplierId: record.supplierId,
      financialAccountId: record.financialAccountId,
    });

    return { created: result.created, skipped: false };
  }

  async syncFromCashTransaction(cashTransactionId: string) {
    const existing = await financeAccountEntryRepository.countBySource("CASH_TRANSACTION", cashTransactionId);
    if (existing > 0) {
      return { created: 0, skipped: true };
    }

    const record = await financeRepository.findCashTransactionById(cashTransactionId);
    if (!record) {
      return { created: 0, skipped: true };
    }

    if (record.sourceType === "COLLECTION" || record.sourceType === "PAYMENT") {
      return { created: 0, skipped: true };
    }

    const account = record.account;
    const amount = toNumber(record.amount);
    let lines: PlannedFinanceAccountEntryLine[];

    if (record.sourceType === "TRANSFER" || record.direction === "TRANSFER") {
      lines = buildTransferCashEntryLines({
        cashTransactionId,
        direction: record.direction === "IN" ? "IN" : "OUT",
        amount,
        financialAccountType: account.type,
        title: record.title,
      });
    } else {
      lines = buildManualCashEntryLines({
        cashTransactionId,
        direction: record.direction === "OUT" ? "OUT" : "IN",
        amount,
        financialAccountType: account.type,
        title: record.title,
      });
    }

    const result = await this.persistPlannedLines({
      lines,
      entryAt: record.transactionAt,
      currency: record.currency,
      sourceType: "CASH_TRANSACTION",
      sourceId: cashTransactionId,
      sourceReference: record.sourceReferenceId,
      note: record.note,
      customerAccountId: record.customerAccountId,
      supplierId: record.supplierId,
      financialAccountId: record.accountId,
    });

    return { created: result.created, skipped: false };
  }

  async syncFromBusinessDocument(businessDocumentId: string) {
    const document = await financeRepository.findBusinessDocumentForLedgerSync(businessDocumentId);
    if (!document || document.status === "DRAFT" || document.status === "CANCELLED") {
      return { created: 0, skipped: true };
    }

    const lineTotals = document.lines
      .map((line) => {
        const explicit = line.lineTotal ? toNumber(line.lineTotal) : 0;
        if (explicit > 0) {
          return { id: line.id, productName: line.productName, lineTotal: explicit };
        }

        const unit = line.unitPrice ? toNumber(line.unitPrice) : 0;
        const computed = Number((unit * line.quantity).toFixed(2));
        return { id: line.id, productName: line.productName, lineTotal: computed };
      })
      .filter((line) => line.lineTotal > 0);

    const lines = buildBusinessDocumentEntryLines({
      documentId: document.id,
      documentNumber: document.documentNumber,
      documentType: document.documentType,
      lines: lineTotals,
    });

    if (lines.length === 0) {
      return { created: 0, skipped: true };
    }

    const result = await this.persistPlannedLines({
      lines,
      entryAt: document.issueDate,
      currency: document.currency,
      sourceType: "BUSINESS_DOCUMENT",
      sourceId: document.id,
      sourceReference: `document:${document.documentNumber}`,
      note: document.note,
      customerAccountId: document.customerAccountId,
      supplierId: document.supplierId,
    });

    return { created: result.created, skipped: result.created === 0 };
  }

  async syncFromIncomingInvoice(incomingInvoiceId: string) {
    const invoice = await incomingInvoiceRepository.findIncomingInvoiceForLedgerSync(incomingInvoiceId);
    if (!invoice || invoice.status === "CANCELLED") {
      return { created: 0, skipped: true };
    }

    const lineTotals = invoice.lines
      .map((line) => {
        const explicit = line.lineTotal ? toNumber(line.lineTotal) : 0;
        if (explicit > 0) {
          return { id: line.id, productName: line.productName, lineTotal: explicit };
        }

        const unit = line.unitPrice ? toNumber(line.unitPrice) : 0;
        const quantity = toNumber(line.quantity);
        const computed = Number((unit * quantity).toFixed(2));
        return { id: line.id, productName: line.productName, lineTotal: computed };
      })
      .filter((line) => line.lineTotal > 0);

    const lines = buildIncomingInvoiceEntryLines({
      incomingInvoiceId: invoice.id,
      documentNumber: invoice.documentNumber,
      lines: lineTotals,
    });

    if (lines.length === 0) {
      return { created: 0, skipped: true };
    }

    const result = await this.persistPlannedLines({
      lines,
      entryAt: invoice.issueDate,
      currency: invoice.currency,
      sourceType: "INCOMING_INVOICE",
      sourceId: invoice.id,
      sourceReference: `incoming-invoice:${invoice.documentNumber}`,
      note: invoice.note,
      supplierId: invoice.supplierId,
    });

    return { created: result.created, skipped: result.created === 0 };
  }

  async listLedgerEntries(query: AdminFinanceLedgerEntriesQuery = {}): Promise<AdminFinanceLedgerEntriesResult> {
    const parsed = listQuerySchema.parse(query);
    const range = parseFinanceReportDateRangeQuery({ from: parsed.from, to: parsed.to });

    const records = await financeAccountEntryRepository.listEntries({
      fromDate: parsed.from || parsed.to ? range.fromDate : undefined,
      toDate: parsed.from || parsed.to ? range.toDate : undefined,
      search: parsed.search,
      sourceType: parsed.sourceType === "all" ? undefined : parsed.sourceType,
    });

    const items = records.map(mapEntry);
    const totalDebit = items
      .filter((item: AdminFinanceLedgerEntryListItem) => item.side === "DEBIT")
      .reduce((sum: number, item: AdminFinanceLedgerEntryListItem) => sum + item.amount, 0);
    const totalCredit = items
      .filter((item: AdminFinanceLedgerEntryListItem) => item.side === "CREDIT")
      .reduce((sum: number, item: AdminFinanceLedgerEntryListItem) => sum + item.amount, 0);

    return {
      items,
      summary: {
        entryCount: items.length,
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        currency: items[0]?.currency ?? "TRY",
      },
    };
  }

  async backfillRecentEntries(limit = 200): Promise<AdminFinanceLedgerBackfillResult> {
    const collections = await financeRepository.listRecentCollectionRecords(limit);
    const payments = await financeRepository.listRecentPaymentRecords(limit);
    const cashTransactions = await financeRepository.listRecentCashTransactionsForLedger(limit);
    const businessDocuments = await financeRepository.listRecentIssuedBusinessDocumentsForLedger(limit);

    let projected = 0;
    let skipped = 0;
    let scanned = 0;

    for (const record of collections) {
      scanned += 1;
      const result = await this.syncFromCollectionRecord(record.id);
      projected += result.created;
      skipped += result.skipped ? 1 : 0;
    }

    for (const record of payments) {
      scanned += 1;
      const result = await this.syncFromPaymentRecord(record.id);
      projected += result.created;
      skipped += result.skipped ? 1 : 0;
    }

    for (const record of cashTransactions) {
      scanned += 1;
      const result = await this.syncFromCashTransaction(record.id);
      projected += result.created;
      skipped += result.skipped ? 1 : 0;
    }

    for (const record of businessDocuments) {
      scanned += 1;
      const result = await this.syncFromBusinessDocument(record.id);
      projected += result.created;
      skipped += result.skipped ? 1 : 0;
    }

    return { scanned, projected, skipped };
  }
}

export const financeAccountEntryService = new FinanceAccountEntryService();
