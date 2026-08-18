import type { FinanceAccountEntrySide } from "@/modules/finance/contracts/finance-account-entry.contract";

export type PlannedFinanceAccountEntryLine = {
  lineKey: string;
  ledgerAccountCode: string;
  side: FinanceAccountEntrySide;
  amount: number;
  title: string;
  note?: string | null;
};

export function resolveCashLedgerAccountCode(financialAccountType: "CASH" | "BANK") {
  return financialAccountType === "CASH" ? "100" : "102";
}

export function buildCollectionEntryLines(args: {
  collectionRecordId: string;
  amount: number;
  financialAccountType: "CASH" | "BANK";
}) {
  const cashCode = resolveCashLedgerAccountCode(args.financialAccountType);
  return [
    {
      lineKey: `collection:${args.collectionRecordId}:debit:${cashCode}`,
      ledgerAccountCode: cashCode,
      side: "DEBIT" as const,
      amount: args.amount,
      title: "Tahsilat — kasa/banka borç",
    },
    {
      lineKey: `collection:${args.collectionRecordId}:credit:120`,
      ledgerAccountCode: "120",
      side: "CREDIT" as const,
      amount: args.amount,
      title: "Tahsilat — alıcılar alacak",
    },
  ];
}

export function buildPaymentEntryLines(args: {
  paymentRecordId: string;
  amount: number;
  financialAccountType: "CASH" | "BANK";
}) {
  const cashCode = resolveCashLedgerAccountCode(args.financialAccountType);
  return [
    {
      lineKey: `payment:${args.paymentRecordId}:debit:320`,
      ledgerAccountCode: "320",
      side: "DEBIT" as const,
      amount: args.amount,
      title: "Ödeme — satıcılar borç",
    },
    {
      lineKey: `payment:${args.paymentRecordId}:credit:${cashCode}`,
      ledgerAccountCode: cashCode,
      side: "CREDIT" as const,
      amount: args.amount,
      title: "Ödeme — kasa/banka alacak",
    },
  ];
}

export function buildManualCashEntryLines(args: {
  cashTransactionId: string;
  direction: "IN" | "OUT";
  amount: number;
  financialAccountType: "CASH" | "BANK";
  title: string;
}) {
  const cashCode = resolveCashLedgerAccountCode(args.financialAccountType);

  if (args.direction === "IN") {
    return [
      {
        lineKey: `cash:${args.cashTransactionId}:debit:${cashCode}`,
        ledgerAccountCode: cashCode,
        side: "DEBIT" as const,
        amount: args.amount,
        title: args.title,
      },
      {
        lineKey: `cash:${args.cashTransactionId}:credit:600`,
        ledgerAccountCode: "600",
        side: "CREDIT" as const,
        amount: args.amount,
        title: "Gelir karşılığı",
      },
    ];
  }

  return [
    {
      lineKey: `cash:${args.cashTransactionId}:debit:770`,
      ledgerAccountCode: "770",
      side: "DEBIT" as const,
      amount: args.amount,
      title: "Gider kaydı",
    },
    {
      lineKey: `cash:${args.cashTransactionId}:credit:${cashCode}`,
      ledgerAccountCode: cashCode,
      side: "CREDIT" as const,
      amount: args.amount,
      title: args.title,
    },
  ];
}

export function buildTransferCashEntryLines(args: {
  cashTransactionId: string;
  direction: "IN" | "OUT";
  amount: number;
  financialAccountType: "CASH" | "BANK";
  title: string;
}) {
  const cashCode = resolveCashLedgerAccountCode(args.financialAccountType);

  if (args.direction === "IN") {
    return [
      {
        lineKey: `cash:${args.cashTransactionId}:debit:${cashCode}`,
        ledgerAccountCode: cashCode,
        side: "DEBIT" as const,
        amount: args.amount,
        title: args.title,
      },
      {
        lineKey: `cash:${args.cashTransactionId}:credit:102-transfer`,
        ledgerAccountCode: "102",
        side: "CREDIT" as const,
        amount: args.amount,
        title: "Transfer çıkış karşılığı",
      },
    ];
  }

  return [
    {
      lineKey: `cash:${args.cashTransactionId}:debit:102-transfer`,
      ledgerAccountCode: "102",
      side: "DEBIT" as const,
      amount: args.amount,
      title: "Transfer giriş karşılığı",
    },
    {
      lineKey: `cash:${args.cashTransactionId}:credit:${cashCode}`,
      ledgerAccountCode: cashCode,
      side: "CREDIT" as const,
      amount: args.amount,
      title: args.title,
    },
  ];
}

export type BusinessDocumentLedgerType = "PURCHASE_DOCUMENT" | "DELIVERY_NOTE" | "E_INVOICE" | "E_DISPATCH";

export function buildBusinessDocumentEntryLines(args: {
  documentId: string;
  documentNumber: string;
  documentType: BusinessDocumentLedgerType;
  lines: Array<{ id: string; productName: string; lineTotal: number }>;
}) {
  const planned: PlannedFinanceAccountEntryLine[] = [];
  const isPurchase = args.documentType === "PURCHASE_DOCUMENT";
  const isSales =
    args.documentType === "E_INVOICE" || args.documentType === "DELIVERY_NOTE" || args.documentType === "E_DISPATCH";

  for (const line of args.lines) {
    if (line.lineTotal <= 0) {
      continue;
    }

    const label = line.productName.slice(0, 80);

    if (isPurchase) {
      planned.push(
        {
          lineKey: `document-line:${line.id}:debit:770`,
          ledgerAccountCode: "770",
          side: "DEBIT",
          amount: line.lineTotal,
          title: `Alış belgesi ${args.documentNumber} — ${label}`,
        },
        {
          lineKey: `document-line:${line.id}:credit:320`,
          ledgerAccountCode: "320",
          side: "CREDIT",
          amount: line.lineTotal,
          title: `Alış belgesi ${args.documentNumber} — ${label}`,
        },
      );
    } else if (isSales) {
      planned.push(
        {
          lineKey: `document-line:${line.id}:debit:120`,
          ledgerAccountCode: "120",
          side: "DEBIT",
          amount: line.lineTotal,
          title: `Satış belgesi ${args.documentNumber} — ${label}`,
        },
        {
          lineKey: `document-line:${line.id}:credit:600`,
          ledgerAccountCode: "600",
          side: "CREDIT",
          amount: line.lineTotal,
          title: `Satış belgesi ${args.documentNumber} — ${label}`,
        },
      );
    }
  }

  return planned;
}

export function buildIncomingInvoiceEntryLines(args: {
  incomingInvoiceId: string;
  documentNumber: string;
  lines: Array<{ id: string; productName: string; lineTotal: number }>;
}) {
  const planned: PlannedFinanceAccountEntryLine[] = [];

  for (const line of args.lines) {
    if (line.lineTotal <= 0) {
      continue;
    }

    const label = line.productName.slice(0, 80);

    planned.push(
      {
        lineKey: `incoming-invoice-line:${line.id}:debit:770`,
        ledgerAccountCode: "770",
        side: "DEBIT",
        amount: line.lineTotal,
        title: `Gelen fatura ${args.documentNumber} — ${label}`,
      },
      {
        lineKey: `incoming-invoice-line:${line.id}:credit:320`,
        ledgerAccountCode: "320",
        side: "CREDIT",
        amount: line.lineTotal,
        title: `Gelen fatura ${args.documentNumber} — ${label}`,
      },
    );
  }

  return planned;
}

export function assertBalancedEntryLines(lines: PlannedFinanceAccountEntryLine[]) {
  const debit = lines.filter((line) => line.side === "DEBIT").reduce((sum, line) => sum + line.amount, 0);
  const credit = lines.filter((line) => line.side === "CREDIT").reduce((sum, line) => sum + line.amount, 0);
  if (Math.abs(debit - credit) > 0.01) {
    throw new Error("Defter satırları borç/alacak dengesinde değil.");
  }
}
