export type ParsedBankStatementLine = {
  lineIndex: number;
  transactionAt: Date;
  description: string;
  amount: number;
  signedAmount: number;
  balanceAfter: number | null;
};

export type ParsedBankStatementCsv = {
  lines: ParsedBankStatementLine[];
  periodStart: Date | null;
  periodEnd: Date | null;
};

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function parseMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const negative = trimmed.startsWith("-") || trimmed.includes("(");
  const normalized = trimmed
    .replaceAll("(", "")
    .replaceAll(")", "")
    .replaceAll("₺", "")
    .replaceAll("TRY", "")
    .replaceAll(/\s/g, "")
    .replaceAll(".", "")
    .replaceAll(",", ".")
    .replaceAll(/[^0-9.-]/g, "");

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return negative && parsed > 0 ? -parsed : parsed;
}

function parseDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  }

  const dotParts = trimmed.split(".");
  if (dotParts.length === 3) {
    const [day, month, yearRaw] = dotParts.map(Number);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    if (char === ";" && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function resolveColumnIndex(headers: string[], candidates: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalizedHeaders.indexOf(candidate);
    if (index >= 0) {
      return index;
    }
  }

  return -1;
}

export function parseBankStatementCsv(content: string): ParsedBankStatementCsv {
  const rows = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rows.length === 0) {
    throw new Error("Ekstre dosyası boş.");
  }

  const headerCells = splitCsvLine(rows[0]);
  const dateIndex = resolveColumnIndex(headerCells, ["tarih", "islem tarihi", "işlem tarihi", "date"]);
  const descriptionIndex = resolveColumnIndex(headerCells, ["aciklama", "açıklama", "description", "detay"]);
  const amountIndex = resolveColumnIndex(headerCells, ["tutar", "amount", "islem tutari", "işlem tutarı"]);
  const balanceIndex = resolveColumnIndex(headerCells, ["bakiye", "balance"]);

  const hasHeader = dateIndex >= 0 && descriptionIndex >= 0 && amountIndex >= 0;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const dateIdx = hasHeader ? dateIndex : 0;
  const descriptionIdx = hasHeader ? descriptionIndex : 1;
  const amountIdx = hasHeader ? amountIndex : 2;
  const balanceIdx = hasHeader ? balanceIndex : 3;

  const lines: ParsedBankStatementLine[] = [];

  dataRows.forEach((row, index) => {
    const cells = splitCsvLine(row);
    const transactionAt = parseDate(cells[dateIdx] ?? "");
    const description = (cells[descriptionIdx] ?? "").trim();
    const signedAmount = parseMoney(cells[amountIdx] ?? "");

    if (!transactionAt || !description || signedAmount === null || signedAmount === 0) {
      return;
    }

    const balanceAfter = balanceIdx >= 0 ? parseMoney(cells[balanceIdx] ?? "") : null;

    lines.push({
      lineIndex: index,
      transactionAt,
      description,
      amount: Math.abs(Number(signedAmount.toFixed(2))),
      signedAmount: Number(signedAmount.toFixed(2)),
      balanceAfter: balanceAfter === null ? null : Number(balanceAfter.toFixed(2)),
    });
  });

  if (lines.length === 0) {
    throw new Error("Ekstre dosyasında işlenebilir satır bulunamadı.");
  }

  const sortedDates = lines.map((line) => line.transactionAt.getTime()).sort((left, right) => left - right);

  return {
    lines,
    periodStart: new Date(sortedDates[0]),
    periodEnd: new Date(sortedDates[sortedDates.length - 1]),
  };
}
