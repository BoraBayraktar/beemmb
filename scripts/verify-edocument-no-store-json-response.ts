import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const headers = buildNoStoreHeaders();
assert(headers.get("cache-control") === "no-store", "Ortak no-store JSON helper cache koruması üretmelidir.");
assert(headers.get("x-content-type-options") === "nosniff", "Ortak no-store JSON helper MIME sniffing koruması üretmelidir.");

const response = noStoreJson({ ok: true }, { status: 202 });
assert(response.status === 202, "Ortak no-store JSON helper response status değerini korumalıdır.");
assert(response.headers.get("cache-control") === "no-store", "Ortak no-store JSON response cache içinde saklanmamalıdır.");
assert(response.headers.get("x-content-type-options") === "nosniff", "Ortak no-store JSON response MIME sniffing koruması taşımalıdır.");

console.log("E-belge no-store JSON response doğrulaması geçti.");
