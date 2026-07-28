import type { ChannelConnector, ConnectorDispatchResult, ConnectorSyncJob } from "@/modules/integration/connectors/channel.connector";
import { parseSandboxBankStatementLines, readSandboxBankStatementFromEnv } from "@/modules/finance/services/bank-sandbox-statement.util";

function readLines(job: ConnectorSyncJob) {
  if (job.payload?.lines !== undefined) {
    return parseSandboxBankStatementLines(job.payload.lines);
  }

  const fromEnv = readSandboxBankStatementFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  throw new Error("BANK_SANDBOX: payload.lines veya FINANCE_BANK_SANDBOX_STATEMENT_JSON gerekli.");
}

export class BankSandboxConnector implements ChannelConnector {
  channel = "BANK_SANDBOX" as const;

  async dispatch(job: ConnectorSyncJob): Promise<ConnectorDispatchResult> {
    if (job.jobType !== "BANK_STATEMENT_SYNC") {
      throw new Error("BANK_SANDBOX yalnızca BANK_STATEMENT_SYNC işlerini destekler.");
    }

    if (job.entityType !== "FINANCIAL_ACCOUNT") {
      throw new Error("Banka ekstresi senkronu FINANCIAL_ACCOUNT varlığı gerektirir.");
    }

    if (job.payload?.forceFail) {
      throw new Error("BANK_SANDBOX_FORCED_FAILURE");
    }

    const lines = readLines(job);
    const fileName =
      typeof job.payload?.fileName === "string" && job.payload.fileName.trim().length > 0
        ? job.payload.fileName.trim()
        : `sandbox-${job.entityId}.json`;

    return {
      providerKey: "bank-sandbox",
      externalReference: `sandbox-import:${job.id}`,
      responsePayload: {
        fileName,
        lineCount: lines.length,
        lines: lines.map((line) => ({
          transactionAt: line.transactionAt.toISOString(),
          description: line.description,
          amount: line.amount,
          signedAmount: line.signedAmount,
          balanceAfter: line.balanceAfter,
        })),
      },
    };
  }
}
