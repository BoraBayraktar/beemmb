import {
  buildDocumentXmlArtifactsHeaders,
  documentXmlArtifactsJson,
} from "@/lib/edocument-admin-route-response";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const headers = buildDocumentXmlArtifactsHeaders();

assert(headers.get("cache-control") === "no-store", "XML artifact API response cache içinde saklanmamalıdır.");
assert(headers.get("x-content-type-options") === "nosniff", "XML artifact API response MIME sniffing koruması taşımalıdır.");

const createdResponse = documentXmlArtifactsJson({ item: { id: "xml-1" }, created: true }, { status: 201 });
assert(createdResponse.status === 201, "XML artifact success response status değerini korumalıdır.");
assert(createdResponse.headers.get("cache-control") === "no-store", "XML artifact success response cache içinde saklanmamalıdır.");

const errorResponse = documentXmlArtifactsJson({ message: "Doğrulama hatası oluştu." }, { status: 400 });
assert(errorResponse.status === 400, "XML artifact error response status değerini korumalıdır.");
assert(errorResponse.headers.get("cache-control") === "no-store", "XML artifact error response cache içinde saklanmamalıdır.");
assert(errorResponse.headers.get("x-content-type-options") === "nosniff", "XML artifact error response MIME sniffing koruması taşımalıdır.");

console.log("E-belge XML artifacts route doğrulaması geçti.");
