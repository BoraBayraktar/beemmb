import type { AdminBusinessDocumentSyncStatus, DocumentWebhookPayload } from "@/modules/documents/contracts/document.contract";
import { resolveExternalSystemStatusFromProviderStatus, resolveProviderOutcome } from "@/modules/documents/services/document-provider-outcome.service";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function maskProviderPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskProviderPayload(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("secret")
      || lowerKey.includes("token")
      || lowerKey.includes("authorization")
      || lowerKey.includes("signature")
      || lowerKey.includes("password")
      || lowerKey.includes("apikey")
      || lowerKey.includes("api_key")
    ) {
      return [key, "MASKED"];
    }

    return [key, maskProviderPayload(item)];
  }));
}

export function normalizeDocumentWebhookStatus(value: string | null | undefined): AdminBusinessDocumentSyncStatus | null {
  return resolveExternalSystemStatusFromProviderStatus(value);
}

export class DocumentWebhookPayloadService {
  normalize(decoded: unknown): DocumentWebhookPayload {
    const record = isRecord(decoded) ? decoded : {};
    const nestedDocument = isRecord(record.document) ? record.document : {};
    const nestedStatus = isRecord(record.statusDetail) ? record.statusDetail : {};
    const errorRecord = isRecord(record.error) ? record.error : {};
    const documentNumber = readString(record, ["documentNumber", "invoiceNumber", "despatchNumber", "documentNo"])
      ?? readString(nestedDocument, ["documentNumber", "number", "id"]);
    const externalReference = readString(record, ["externalReference", "providerReference", "reference", "uuid"])
      ?? readString(nestedDocument, ["externalReference", "providerReference", "uuid"]);
    const providerStatus = readString(record, ["providerStatus", "status", "state"])
      ?? readString(nestedStatus, ["providerStatus", "status", "state"]);
    const providerErrorCode = readString(record, ["providerErrorCode", "errorCode", "code"]) ?? readString(errorRecord, ["providerErrorCode", "errorCode", "code"]);
    const providerErrorMessage = readString(record, ["providerErrorMessage", "errorMessage", "message"]) ?? readString(errorRecord, ["providerErrorMessage", "errorMessage", "message"]);

    return {
      documentNumber,
      externalReference,
      status: normalizeDocumentWebhookStatus(providerStatus),
      providerCode: readString(record, ["providerCode"]),
      providerStatus,
      providerOutcome: resolveProviderOutcome(providerStatus),
      providerErrorCode,
      providerErrorMessage,
      providerPayload: maskProviderPayload(record) as Record<string, unknown>,
    };
  }
}

export const documentWebhookPayloadService = new DocumentWebhookPayloadService();
