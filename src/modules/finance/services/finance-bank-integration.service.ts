import { bankReconciliationService } from "@/modules/finance/services/bank-reconciliation.service";
import { parseSandboxBankStatementLines, readSandboxBankStatementFromEnv } from "@/modules/finance/services/bank-sandbox-statement.util";

function readLinesFromPayload(payload: Record<string, unknown> | null | undefined) {
  if (payload?.lines !== undefined) {
    return parseSandboxBankStatementLines(payload.lines);
  }

  const fromEnv = readSandboxBankStatementFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  throw new Error("Sandbox banka ekstresi bulunamadı. payload.lines veya FINANCE_BANK_SANDBOX_STATEMENT_JSON gerekli.");
}

export class FinanceBankIntegrationService {
  async importSandboxStatementFromConnectorResult(args: {
    financialAccountId: string;
    integrationJobId: string;
    responsePayload: Record<string, unknown> | null | undefined;
    importedByUserId?: string | null;
  }) {
    const lines = readLinesFromPayload(args.responsePayload ?? null);
    const fileName =
      typeof args.responsePayload?.fileName === "string" && args.responsePayload.fileName.trim().length > 0
        ? args.responsePayload.fileName.trim()
        : `bank-sandbox-${args.integrationJobId}.json`;

    return bankReconciliationService.importStructuredStatement({
      financialAccountId: args.financialAccountId,
      fileName,
      sourceReference: args.integrationJobId,
      lines,
      importedByUserId: args.importedByUserId ?? null,
      autoConfirmHighConfidence: true,
    });
  }
}

export const financeBankIntegrationService = new FinanceBankIntegrationService();
