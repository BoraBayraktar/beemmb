import {
  buildDocumentDispatchHeaders,
  documentDispatchJson,
} from "@/app/api/admin/documents/[id]/dispatch/route";
import {
  buildDocumentStatusSyncHeaders,
  documentStatusSyncJson,
} from "@/app/api/admin/documents/[id]/status-sync/route";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const dispatchHeaders = buildDocumentDispatchHeaders();
assert(dispatchHeaders.get("cache-control") === "no-store", "Belge dispatch API response cache içinde saklanmamalıdır.");
assert(dispatchHeaders.get("x-content-type-options") === "nosniff", "Belge dispatch API response MIME sniffing koruması taşımalıdır.");

const dispatchResponse = documentDispatchJson({ item: { id: "document-1" } }, { status: 201 });
assert(dispatchResponse.status === 201, "Belge dispatch success response status değerini korumalıdır.");
assert(dispatchResponse.headers.get("cache-control") === "no-store", "Belge dispatch success response cache içinde saklanmamalıdır.");

const dispatchErrorResponse = documentDispatchJson({ message: "Doğrulama hatası oluştu." }, { status: 400 });
assert(dispatchErrorResponse.status === 400, "Belge dispatch error response status değerini korumalıdır.");
assert(dispatchErrorResponse.headers.get("x-content-type-options") === "nosniff", "Belge dispatch error response MIME sniffing koruması taşımalıdır.");

const statusSyncHeaders = buildDocumentStatusSyncHeaders();
assert(statusSyncHeaders.get("cache-control") === "no-store", "Belge status sync API response cache içinde saklanmamalıdır.");
assert(statusSyncHeaders.get("x-content-type-options") === "nosniff", "Belge status sync API response MIME sniffing koruması taşımalıdır.");

const statusSyncResponse = documentStatusSyncJson({ item: { id: "document-1" } }, { status: 201 });
assert(statusSyncResponse.status === 201, "Belge status sync success response status değerini korumalıdır.");
assert(statusSyncResponse.headers.get("cache-control") === "no-store", "Belge status sync success response cache içinde saklanmamalıdır.");

const statusSyncErrorResponse = documentStatusSyncJson({ message: "Doğrulama hatası oluştu." }, { status: 400 });
assert(statusSyncErrorResponse.status === 400, "Belge status sync error response status değerini korumalıdır.");
assert(statusSyncErrorResponse.headers.get("x-content-type-options") === "nosniff", "Belge status sync error response MIME sniffing koruması taşımalıdır.");

console.log("E-belge dispatch route doğrulaması geçti.");
