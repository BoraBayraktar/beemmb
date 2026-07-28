import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildFinanceAdvisorExportXml } from "@/modules/finance/services/finance-advisor-export-xml.util";
import { resolveFinanceAdvisorExportCopy } from "@/modules/finance/services/finance-advisor-export-copy.resolver";
import { RBAC_PERMISSIONS, RBAC_SYSTEM_ROLES } from "@/modules/identity/contracts/rbac.contract";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const service = readRepo("src/modules/finance/services/finance-advisor-export.service.ts");
const route = readRepo("src/app/api/admin/finance/advisor-export/package/route.ts");
const page = readRepo("src/app/[locale]/admin/(panel)/finance/exports/page.tsx");
const migration = readRepo("prisma/migrations/20260728180000_add_finance_audit_read_rbac/migration.sql");

assert(service.includes("financeReportExportService") === false, "Advisor export doğrudan rapor servislerini kullanmalıdır.");
assert(service.includes("reportsService.getVatSummaryReport"), "Advisor export KDV raporunu dahil etmelidir.");
assert(service.includes("logo-luca-journal"), "Advisor export Logo/Luca yevmiye dosyasını paketlemelidir.");
assert(service.includes("buildLogoLucaJournalCsv"), "Advisor export Logo/Luca CSV builder kullanmalıdır.");
assert(!service.includes("prisma."), "Advisor export servisi doğrudan Prisma kullanmamalıdır.");

assert(route.includes("requireAnyPermission"), "Export route finance.audit.read veya finance.manage istemelidir.");
assert(route.includes("finance.audit.read"), "Export route finance.audit.read iznini kapsamalıdır.");
assert(route.includes("auditLogService.recordFromRequest"), "Export route audit kaydı yapmalıdır.");
assert(!route.includes("prisma."), "Export route doğrudan Prisma kullanmamalıdır.");

assert(page.includes("financeAdvisorExportService.getExportPackage"), "Export sayfası servis kullanmalıdır.");
assert(page.includes("finance.audit.read"), "Export sayfası audit export iznini kontrol etmelidir.");

assert(migration.includes("finance.audit.read"), "RBAC migration finance.audit.read içermelidir.");
assert(migration.includes("accountant"), "RBAC migration mali müşavir rolünü içermelidir.");

assert(
  RBAC_PERMISSIONS.some((permission) => permission.key === "finance.audit.read"),
  "RBAC contract finance.audit.read tanımlı olmalıdır.",
);
assert(
  RBAC_SYSTEM_ROLES.some((role) => role.key === "accountant" && role.permissions.includes("finance.audit.read")),
  "Mali müşavir rolü finance.audit.read içermelidir.",
);

const copy = resolveFinanceAdvisorExportCopy("tr");
assert(copy.title.length > 0, "Advisor export copy resolver çalışmalıdır.");

const xml = buildFinanceAdvisorExportXml({
  generatedAt: "2026-07-28T10:00:00.000Z",
  periodLabel: "Test",
  from: "2026-07-01",
  to: "2026-07-31",
  files: [{ key: "aging", title: "Yaşlandırma", format: "csv", filename: "aging.csv", content: "a,b\n1,2" }],
});
assert(xml.includes("<FinanceAdvisorExport"), "XML paket kök elemanı üretilmelidir.");
assert(xml.includes("CDATA"), "XML paket CSV içeriğini CDATA ile taşımalıdır.");

console.log("verify-finance-advisor-export: ok");
