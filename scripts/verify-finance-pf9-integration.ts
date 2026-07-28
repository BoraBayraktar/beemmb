import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseSandboxBankStatementLines } from "@/modules/finance/services/bank-sandbox-statement.util";
import { onlineCollectionWebhookPayloadService } from "@/modules/finance/services/online-collection-webhook-payload.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const bankIntegrationService = readRepo("src/modules/finance/services/finance-bank-integration.service.ts");
const bankSandboxConnector = readRepo("src/modules/integration/connectors/bank-sandbox.connector.ts");
const integrationService = readRepo("src/modules/integration/services/integration.service.ts");
const webhookService = readRepo("src/modules/finance/services/online-collection-webhook.service.ts");
const collectionsService = readRepo("src/modules/finance/services/collections.service.ts");
const webhookRoute = readRepo("src/app/api/integrations/finance/online-collection/[providerCode]/route.ts");
const migration = readRepo("prisma/migrations/20260728160000_pf9_finance_integration/migration.sql");

assert(bankIntegrationService.includes("bankReconciliationService.importStructuredStatement"), "Banka entegrasyonu PF4 structured import kullanmalıdır.");
assert(bankSandboxConnector.includes("BANK_STATEMENT_SYNC"), "Sandbox connector banka ekstresi iş tipini desteklemelidir.");
assert(integrationService.includes("financeBankIntegrationService.importSandboxStatementFromConnectorResult"), "Integration kuyruğu banka import servisini tetiklemelidir.");
assert(integrationService.includes("BANK_SANDBOX"), "Integration servisi BANK_SANDBOX kanalını kaydetmelidir.");
assert(!bankIntegrationService.includes("prisma."), "Banka entegrasyon servisi doğrudan Prisma kullanmamalıdır.");

assert(webhookService.includes("collectionsService.createOnlineCollectionFromWebhook"), "Online tahsilat webhook collections servisine yönlendirilmelidir.");
assert(collectionsService.includes("findCollectionRecordByOnlineExternalId"), "Collections servisi online idempotency kontrolü yapmalıdır.");
assert(collectionsService.includes("resolveFinanceIntegrationActorUserId"), "Collections servisi entegrasyon aktörünü kullanmalıdır.");
assert(!webhookRoute.includes("prisma."), "Webhook route doğrudan Prisma kullanmamalıdır.");
assert(webhookRoute.includes("onlineCollectionWebhookService.processProviderWebhook"), "Webhook route servis kullanmalıdır.");
assert(webhookRoute.includes("auditLogService.recordFromRequest"), "Webhook route audit kaydı yapmalıdır.");

assert(migration.includes("CollectionRecord_onlineCollectionProvider_onlineCollectionExternalId_key"), "Migration online tahsilat benzersiz anahtarı içermelidir.");
assert(migration.includes("BANK_SANDBOX"), "Migration BANK_SANDBOX kanalını içermelidir.");

const lines = parseSandboxBankStatementLines([
  {
    transactionAt: "2026-07-28T10:00:00.000Z",
    description: "Sandbox havale",
    amount: 1500,
    signedAmount: 1500,
  },
]);
assert(lines.length === 1, "Sandbox satır parser tek satır döndürmelidir.");
assert(lines[0].amount === 1500, "Sandbox satır tutarı korunmalıdır.");

const normalized = onlineCollectionWebhookPayloadService.normalize({
  order_id: "ord_1",
  financial_account_id: "acc_1",
  amount: 99.5,
  collected_at: "2026-07-28T12:00:00.000Z",
  payment_id: "pay_abc",
});
assert(normalized.externalPaymentId === "pay_abc", "Webhook payload normalize externalPaymentId üretmelidir.");

console.log("verify-finance-pf9-integration: ok");
