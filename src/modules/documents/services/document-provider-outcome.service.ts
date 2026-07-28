import type { AdminBusinessDocumentSyncStatus } from "@/modules/documents/contracts/document.contract";

export type DocumentProviderOutcome = "ACCEPTED" | "REJECTED" | "CANCELLED" | "RETURNED" | "UNKNOWN";

const acceptedStatuses = ["SENT", "DELIVERED", "ACCEPTED", "APPROVED", "COMPLETED", "SUCCESS"];
const queuedStatuses = ["QUEUED", "PROCESSING", "PENDING", "SUBMITTED", "IN_PROGRESS"];
const rejectedStatuses = ["FAILED", "REJECTED", "ERROR", "DECLINED", "DENIED"];
const cancelledStatuses = ["CANCELLED", "CANCELED", "VOID", "ABORTED"];
const returnedStatuses = ["RETURNED", "RETURN", "REFUNDED", "REFUND", "IADEN", "IADE"];

function normalize(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

export function resolveProviderOutcome(providerStatus: string | null | undefined): DocumentProviderOutcome {
  const normalized = normalize(providerStatus);

  if (!normalized) {
    return "UNKNOWN";
  }

  if (acceptedStatuses.includes(normalized) || queuedStatuses.includes(normalized)) {
    return "ACCEPTED";
  }

  if (rejectedStatuses.includes(normalized)) {
    return "REJECTED";
  }

  if (cancelledStatuses.includes(normalized)) {
    return "CANCELLED";
  }

  if (returnedStatuses.includes(normalized)) {
    return "RETURNED";
  }

  return "UNKNOWN";
}

export function resolveExternalSystemStatusFromProviderStatus(providerStatus: string | null | undefined): AdminBusinessDocumentSyncStatus | null {
  const normalized = normalize(providerStatus);

  if (!normalized) {
    return null;
  }

  if (acceptedStatuses.includes(normalized)) {
    return "SENT";
  }

  if (queuedStatuses.includes(normalized)) {
    return "QUEUED";
  }

  if (normalized === "NOT_SENT") {
    return "NOT_SENT";
  }

  return "FAILED";
}
