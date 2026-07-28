import type { ParsedBankStatementLine } from "@/modules/finance/services/bank-statement-csv.parser";

export type SandboxBankStatementLineInput = {
  transactionAt: string;
  description: string;
  amount: number;
  signedAmount?: number;
  balanceAfter?: number | null;
};

export function parseSandboxBankStatementLines(input: unknown): ParsedBankStatementLine[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("Sandbox banka ekstresi en az bir satır içermelidir.");
  }

  return input.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`Satır ${index + 1} geçersiz.`);
    }

    const line = raw as SandboxBankStatementLineInput;
    const transactionAt = new Date(line.transactionAt);
    if (Number.isNaN(transactionAt.getTime())) {
      throw new Error(`Satır ${index + 1} tarihi geçersiz.`);
    }

    const amount = Number(line.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Satır ${index + 1} tutarı geçersiz.`);
    }

    const signedAmount = line.signedAmount === undefined ? amount : Number(line.signedAmount);
    if (!Number.isFinite(signedAmount) || signedAmount === 0) {
      throw new Error(`Satır ${index + 1} işaretli tutarı geçersiz.`);
    }

    const description = typeof line.description === "string" && line.description.trim().length > 0
      ? line.description.trim().slice(0, 500)
      : "Sandbox banka hareketi";

    return {
      lineIndex: index + 1,
      transactionAt,
      description,
      amount: Math.abs(amount),
      signedAmount,
      balanceAfter: line.balanceAfter === undefined || line.balanceAfter === null ? null : Number(line.balanceAfter),
    };
  });
}

export function readSandboxBankStatementFromEnv() {
  const raw = process.env.FINANCE_BANK_SANDBOX_STATEMENT_JSON?.trim();
  if (!raw) {
    return null;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error("FINANCE_BANK_SANDBOX_STATEMENT_JSON geçerli JSON olmalıdır.");
  }

  return parseSandboxBankStatementLines(decoded);
}
