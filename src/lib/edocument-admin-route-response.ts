import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";

export function buildAdminDocumentsHeaders() {
  return buildNoStoreHeaders();
}

export function adminDocumentsJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export function buildAdminDocumentDetailHeaders() {
  return buildNoStoreHeaders();
}

export function adminDocumentDetailJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export function buildCreateInvoiceHeaders() {
  return buildNoStoreHeaders();
}

export function createInvoiceJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export function buildDocumentDispatchHeaders() {
  return buildNoStoreHeaders();
}

export function documentDispatchJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export function buildDocumentStatusSyncHeaders() {
  return buildNoStoreHeaders();
}

export function documentStatusSyncJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export function buildDocumentXmlArtifactsHeaders() {
  return buildNoStoreHeaders();
}

export function documentXmlArtifactsJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export function buildEDocumentConfigReadinessHeaders() {
  return buildNoStoreHeaders();
}

export function eDocumentConfigReadinessJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export function buildDocumentProviderConfigHeaders() {
  return buildNoStoreHeaders();
}

export function documentProviderConfigJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}
