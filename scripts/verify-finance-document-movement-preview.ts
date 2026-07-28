import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const movementPage = readFileSync(
  join(process.cwd(), "src/app/[locale]/admin/(panel)/finance/business-documents/[documentId]/movements/page.tsx"),
  "utf8",
);
const movementApi = readFileSync(
  join(process.cwd(), "src/app/api/admin/finance/business-documents/[documentId]/movement-preview/route.ts"),
  "utf8",
);
const previewService = readFileSync(
  join(process.cwd(), "src/modules/finance/services/document-finance-preview.service.ts"),
  "utf8",
);

assert(previewService.includes("resolveDocumentFinancePreviewCopy"), "Belge finans preview servisi i18n copy resolver kullanmalıdır.");
assert(!previewService.includes('"Tahsilat kaydı"'), "Belge finans preview servisi sabit Türkçe başlık içermemelidir.");

assert(movementPage.includes("documentFinancePreviewService.getPreview"), "Belge finans hareket sayfası preview servisini kullanmalıdır.");
assert(movementApi.includes("documentFinancePreviewService.getPreview"), "Belge finans preview API servis katmanını kullanmalıdır.");
assert(!movementApi.includes("prisma."), "Belge finans preview API doğrudan Prisma kullanmamalıdır.");

console.log("verify-finance-document-movement-preview: ok");
