import crypto from "crypto";

export const UBL_TR_SCHEMA_VERSION = "UBL-TR-1.2.1";

export function escapeXml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function formatTime(value: Date) {
  return value.toISOString().slice(11, 19);
}

export function formatAmount(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

export function hashXml(xmlContent: string) {
  return crypto.createHash("sha256").update(xmlContent, "utf8").digest("hex");
}

export function normalizeTaxNumber(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function buildDeterministicUuid(seed: string) {
  const hash = crypto.createHash("sha256").update(seed, "utf8").digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

export function isUuid(value: string | null | undefined) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}
