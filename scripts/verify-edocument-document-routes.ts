import {
  adminDocumentDetailJson,
  buildAdminDocumentDetailHeaders,
} from "@/app/api/admin/documents/[id]/route";
import {
  adminDocumentsJson,
  buildAdminDocumentsHeaders,
} from "@/app/api/admin/documents/route";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const listHeaders = buildAdminDocumentsHeaders();
assert(listHeaders.get("cache-control") === "no-store", "Belge liste API response cache içinde saklanmamalıdır.");
assert(listHeaders.get("x-content-type-options") === "nosniff", "Belge liste API response MIME sniffing koruması taşımalıdır.");

const listResponse = adminDocumentsJson({ items: [] });
assert(listResponse.headers.get("cache-control") === "no-store", "Belge liste success response cache içinde saklanmamalıdır.");

const listErrorResponse = adminDocumentsJson({ message: "Doğrulama hatası oluştu." }, { status: 400 });
assert(listErrorResponse.status === 400, "Belge liste error response status değerini korumalıdır.");
assert(listErrorResponse.headers.get("x-content-type-options") === "nosniff", "Belge liste error response MIME sniffing koruması taşımalıdır.");

const detailHeaders = buildAdminDocumentDetailHeaders();
assert(detailHeaders.get("cache-control") === "no-store", "Belge detay API response cache içinde saklanmamalıdır.");
assert(detailHeaders.get("x-content-type-options") === "nosniff", "Belge detay API response MIME sniffing koruması taşımalıdır.");

const detailResponse = adminDocumentDetailJson({ item: { id: "document-1" } });
assert(detailResponse.headers.get("cache-control") === "no-store", "Belge detay success response cache içinde saklanmamalıdır.");

const detailErrorResponse = adminDocumentDetailJson({ message: "Belge bulunamadı." }, { status: 404 });
assert(detailErrorResponse.status === 404, "Belge detay error response status değerini korumalıdır.");
assert(detailErrorResponse.headers.get("x-content-type-options") === "nosniff", "Belge detay error response MIME sniffing koruması taşımalıdır.");

console.log("E-belge document route doğrulaması geçti.");
