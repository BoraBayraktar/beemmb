type LogoLucaJournalRow = {
  entryAt: string;
  voucherNo: string;
  ledgerAccountCode: string;
  debit: number;
  credit: number;
  description: string;
  documentReference: string | null;
};

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

function formatLogoDate(iso: string) {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function buildLogoLucaJournalCsv(args: {
  rows: LogoLucaJournalRow[];
  headerDate: string;
  headerVoucherNo: string;
  headerAccountCode: string;
  headerDebit: string;
  headerCredit: string;
  headerDescription: string;
  headerDocumentNo: string;
}) {
  const header = [
    args.headerDate,
    args.headerVoucherNo,
    args.headerAccountCode,
    args.headerDebit,
    args.headerCredit,
    args.headerDescription,
    args.headerDocumentNo,
  ]
    .map(escapeCsvValue)
    .join(";");

  const body = args.rows.map((row) =>
    [
      formatLogoDate(row.entryAt),
      row.voucherNo,
      row.ledgerAccountCode,
      row.debit > 0 ? row.debit.toFixed(2).replace(".", ",") : "",
      row.credit > 0 ? row.credit.toFixed(2).replace(".", ",") : "",
      row.description,
      row.documentReference ?? "",
    ]
      .map((cell) => escapeCsvValue(String(cell)))
      .join(";"),
  );

  return `\uFEFF${[header, ...body].join("\n")}`;
}

export function mapFinanceEntriesToLogoLucaRows(
  entries: Array<{
    entryAt: Date;
    sourceReference: string | null;
    sourceId: string;
    title: string;
    side: "DEBIT" | "CREDIT";
    amount: { toNumber(): number } | number;
    ledgerAccount: { code: string };
  }>,
) {
  function toNumber(value: { toNumber(): number } | number) {
    return typeof value === "number" ? value : value.toNumber();
  }

  return entries.map((entry) => {
    const amount = toNumber(entry.amount);
    return {
      entryAt: entry.entryAt.toISOString(),
      voucherNo: entry.sourceReference ?? entry.sourceId.slice(0, 12),
      ledgerAccountCode: entry.ledgerAccount.code,
      debit: entry.side === "DEBIT" ? amount : 0,
      credit: entry.side === "CREDIT" ? amount : 0,
      description: entry.title,
      documentReference: entry.sourceReference,
    };
  });
}
