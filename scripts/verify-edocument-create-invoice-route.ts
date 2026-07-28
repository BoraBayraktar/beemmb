import {
  buildCreateInvoiceHeaders,
  createInvoiceJson,
} from "@/app/api/admin/documents/[id]/create-invoice/route";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const headers = buildCreateInvoiceHeaders();
assert(headers.get("cache-control") === "no-store", "İrsaliyeden e-fatura API response cache içinde saklanmamalıdır.");
assert(headers.get("x-content-type-options") === "nosniff", "İrsaliyeden e-fatura API response MIME sniffing koruması taşımalıdır.");

const successResponse = createInvoiceJson({ item: { id: "document-1" } }, { status: 201 });
assert(successResponse.status === 201, "İrsaliyeden e-fatura success response status değerini korumalıdır.");
assert(successResponse.headers.get("cache-control") === "no-store", "İrsaliyeden e-fatura success response cache içinde saklanmamalıdır.");

const errorResponse = createInvoiceJson({ message: "Bu e-fatura numarası zaten kullanılıyor." }, { status: 409 });
assert(errorResponse.status === 409, "İrsaliyeden e-fatura error response status değerini korumalıdır.");
assert(errorResponse.headers.get("x-content-type-options") === "nosniff", "İrsaliyeden e-fatura error response MIME sniffing koruması taşımalıdır.");

console.log("E-belge create invoice route doğrulaması geçti.");
