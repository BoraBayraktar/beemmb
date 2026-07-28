import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildDocumentDueFields,
  buildFinanceDueKpi,
  computeDaysPastDue,
  computeDaysUntilDue,
  FINANCE_DEFAULT_PAYMENT_TERM_DAYS,
  resolveDocumentEffectiveDueDate,
  resolveReceivableEffectiveDueDate,
} from "../src/modules/finance/services/finance-due-date.util";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const issueDate = "2026-01-01T00:00:00.000Z";
const explicitDue = "2026-01-20T00:00:00.000Z";
const referenceDate = new Date("2026-01-25T00:00:00.000Z");

assert(
  resolveDocumentEffectiveDueDate(issueDate, explicitDue) === explicitDue,
  "Belirtilen vade tarihi korunmalıdır.",
);
assert(
  resolveDocumentEffectiveDueDate(issueDate, null).startsWith("2026-01-31"),
  "Varsayılan vade issueDate + 30 gün olmalıdır.",
);

const overdueFields = buildDocumentDueFields(issueDate, explicitDue, referenceDate);
assert(overdueFields.isOverdue === true, "Gecikmiş belge isOverdue=true olmalıdır.");
assert(computeDaysPastDue(explicitDue, referenceDate) === 5, "Gecikme günü 5 olmalıdır.");

const receivableDue = resolveReceivableEffectiveDueDate({
  orderCreatedAtIso: "2026-01-10T00:00:00.000Z",
  latestDocumentIssueDateIso: issueDate,
  latestDocumentDueDateIso: explicitDue,
});
assert(receivableDue === explicitDue, "Alacak vadesi belge vadesinden türetilmelidir.");

const kpi = buildFinanceDueKpi([
  { amount: 100, effectiveDueDate: "2026-01-01T00:00:00.000Z", currency: "TRY" },
  { amount: 50, effectiveDueDate: "2026-02-01T00:00:00.000Z", currency: "TRY" },
], 7, referenceDate);
assert(kpi.overdueAmount === 100, "KPI vadesi geçen tutarı doğru toplamalıdır.");
assert(kpi.dueWithinDaysAmount === 50, "Yakın vade KPI tutarı doğru olmalıdır.");

assert(FINANCE_DEFAULT_PAYMENT_TERM_DAYS === 30, "Varsayılan vade süresi 30 gün olmalıdır.");
assert(computeDaysUntilDue("2026-02-01T00:00:00.000Z", referenceDate) === 7, "Kalan gün hesabı doğru olmalıdır.");

const payablesService = readRepo("src/modules/finance/services/payables.service.ts");
const receivablesService = readRepo("src/modules/finance/services/receivables.service.ts");
const reportsService = readRepo("src/modules/finance/services/reports.service.ts");
const payablesPage = readRepo("src/app/[locale]/admin/(panel)/finance/payables/page.tsx");
const receivablesPage = readRepo("src/app/[locale]/admin/(panel)/finance/receivables/page.tsx");
const schema = readRepo("prisma/schema.prisma");
const migration = readRepo("prisma/migrations/20260727140000_add_business_document_due_date/migration.sql");

assert(payablesService.includes("buildFinanceDueKpi"), "Payables servisi due KPI hesaplamalıdır.");
assert(payablesService.includes("overdueOnly"), "Payables servisi gecikmiş filtreyi desteklemelidir.");
assert(receivablesService.includes("buildFinanceDueKpi"), "Receivables servisi due KPI hesaplamalıdır.");
assert(receivablesService.includes("resolveReceivableEffectiveDueDate"), "Receivables servisi vade projeksiyonu kullanmalıdır.");
assert(reportsService.includes("computeDaysPastDue"), "Yaşlandırma raporu vadesi geçen gün hesabını kullanmalıdır.");
assert(reportsService.includes("effectiveDueDate"), "Yaşlandırma raporu effectiveDueDate kullanmalıdır.");
assert(payablesPage.includes("dueKpi"), "Payables sayfası KPI verisini UI'a aktarmalıdır.");
assert(receivablesPage.includes("overdueOnly"), "Receivables sayfası gecikmiş filtreyi desteklemelidir.");
assert(schema.includes("dueDate"), "Prisma şemasında dueDate alanı olmalıdır.");
assert(migration.includes("dueDate"), "Migration dueDate kolonunu eklemelidir.");

console.log("verify-finance-due-date: ok");
