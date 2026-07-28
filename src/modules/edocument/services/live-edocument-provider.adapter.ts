import type {
  EDocumentProviderAdapter,
  EDocumentProviderDispatchInput,
  EDocumentProviderDispatchResult,
} from "@/modules/edocument/contracts/edocument-provider.contract";

export class LiveEDocumentProviderConfigurationError extends Error {
  constructor(message = "LIVE_PROVIDER_NOT_CONFIGURED") {
    super(message);
    this.name = "LiveEDocumentProviderConfigurationError";
  }
}

export class LiveEDocumentProviderRequestError extends Error {
  constructor(message: string, public readonly responsePayload: Record<string, unknown> | null = null) {
    super(message);
    this.name = "LiveEDocumentProviderRequestError";
  }
}

export type LiveEDocumentProviderProtocol = "CUSTOM_HTTP_JSON";

export function normalizeLiveEDocumentProviderProtocol(value: string | null | undefined): LiveEDocumentProviderProtocol | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized === "CUSTOM_HTTP_JSON" ? normalized : null;
}

export function normalizeLiveEDocumentProviderEndpointUrl(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export type LiveEDocumentProviderConfig = {
  endpointUrl: string;
  protocol: LiveEDocumentProviderProtocol;
  username: string;
  hasSecretKey: boolean;
  timeoutMs: number;
};

const PROVIDER_ERROR_MESSAGE_LIMIT = 500;
const DEFAULT_PROVIDER_TIMEOUT_MS = 15000;

type LiveEDocumentProviderRuntimeConfig = LiveEDocumentProviderConfig & {
  secretKey: string;
};

type LiveProviderOperation = "DISPATCH_DOCUMENT" | "QUERY_DOCUMENT_STATUS";

type LiveProviderHttpClient = typeof fetch;

export function buildLiveProviderDispatchRequestEvidence(args: {
  config: LiveEDocumentProviderConfig;
  input: EDocumentProviderDispatchInput;
}) {
  return {
    protocol: args.config.protocol,
    endpointUrl: args.config.endpointUrl,
    username: args.config.username,
    hasSecretKey: args.config.hasSecretKey,
    operation: "DISPATCH_DOCUMENT",
    documentId: args.input.documentId,
    documentNumber: args.input.documentNumber,
    documentType: args.input.documentType,
    providerCode: args.input.providerCode,
    xmlArtifactId: args.input.xmlArtifactId,
    xmlHash: args.input.xmlHash,
    schemaVersion: args.input.schemaVersion,
  };
}

export function buildLiveProviderStatusRequestEvidence(args: {
  config: LiveEDocumentProviderConfig;
  input: { documentId: string; documentNumber: string; providerReference?: string | null };
}) {
  return {
    protocol: args.config.protocol,
    endpointUrl: args.config.endpointUrl,
    username: args.config.username,
    hasSecretKey: args.config.hasSecretKey,
    operation: "QUERY_DOCUMENT_STATUS",
    documentId: args.input.documentId,
    documentNumber: args.input.documentNumber,
    providerReference: args.input.providerReference ?? null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function normalizeProviderStatus(value: unknown): EDocumentProviderDispatchResult["providerStatus"] {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (normalized === "SENT" || normalized === "QUEUED" || normalized === "FAILED") {
    return normalized;
  }

  return "FAILED";
}

export function normalizeLiveProviderResponse(payload: unknown): EDocumentProviderDispatchResult {
  const record = isRecord(payload) ? payload : {};
  const providerStatus = normalizeProviderStatus(record.providerStatus ?? record.status);
  const accepted = typeof record.accepted === "boolean" ? record.accepted : providerStatus !== "FAILED";
  const providerReference = typeof record.providerReference === "string" && record.providerReference.trim()
    ? record.providerReference.trim()
    : null;

  return {
    accepted,
    providerReference,
    providerStatus,
    responsePayload: maskProviderPayload(record) as Record<string, unknown>,
  };
}

function normalizeProviderErrorMessage(value: unknown) {
  const message = typeof value === "string" && value.trim() ? value.trim() : "Canlı provider hata yanıtı alındı.";
  return message.length > PROVIDER_ERROR_MESSAGE_LIMIT
    ? `${message.slice(0, PROVIDER_ERROR_MESSAGE_LIMIT)}...`
    : message;
}

function resolveLiveProviderTimeoutMs() {
  const value = Number(process.env.EDOCUMENT_LIVE_PROVIDER_TIMEOUT_MS ?? DEFAULT_PROVIDER_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 120000) : DEFAULT_PROVIDER_TIMEOUT_MS;
}

function buildLiveProviderRequestBody(args: {
  operation: LiveProviderOperation;
  input: EDocumentProviderDispatchInput | { documentId: string; documentNumber: string; providerReference?: string | null };
}) {
  return {
    operation: args.operation,
    document: args.input,
  };
}

export function normalizeLiveProviderError(payload: unknown) {
  const record = isRecord(payload) ? payload : {};
  const errorRecord = isRecord(record.error) ? record.error : {};
  const codeCandidate = record.providerErrorCode ?? record.errorCode ?? record.code ?? errorRecord.code;
  const messageCandidate = record.providerErrorMessage ?? record.errorMessage ?? record.message ?? errorRecord.message;
  const statusCodeCandidate = record.statusCode ?? record.httpStatus ?? errorRecord.statusCode;

  return {
    providerErrorCode: typeof codeCandidate === "string" && codeCandidate.trim() ? codeCandidate.trim() : "LIVE_PROVIDER_ERROR",
    providerErrorMessage: normalizeProviderErrorMessage(messageCandidate),
    statusCode: typeof statusCodeCandidate === "number" && Number.isInteger(statusCodeCandidate) ? statusCodeCandidate : null,
    responsePayload: maskProviderPayload(record) as Record<string, unknown>,
  };
}

export class LiveEDocumentProviderAdapter implements EDocumentProviderAdapter {
  providerKey = "live-edocs-provider";

  constructor(private readonly httpClient: LiveProviderHttpClient = fetch) {}

  isConfigured() {
    return Boolean(this.resolveConfig());
  }

  isOperational() {
    return Boolean(this.resolveRuntimeConfig());
  }

  resolveConfig(): LiveEDocumentProviderConfig | null {
    const runtimeConfig = this.resolveRuntimeConfig();
    if (!runtimeConfig) {
      return null;
    }

    return {
      endpointUrl: runtimeConfig.endpointUrl,
      protocol: runtimeConfig.protocol,
      username: runtimeConfig.username,
      hasSecretKey: runtimeConfig.hasSecretKey,
      timeoutMs: runtimeConfig.timeoutMs,
    };
  }

  private resolveRuntimeConfig(): LiveEDocumentProviderRuntimeConfig | null {
    const endpointUrl = normalizeLiveEDocumentProviderEndpointUrl(process.env.EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL);
    const username = process.env.EDOCUMENT_LIVE_PROVIDER_USERNAME?.trim() ?? "";
    const secretKey = process.env.EDOCUMENT_LIVE_PROVIDER_SECRET_KEY?.trim() ?? "";
    const protocol = normalizeLiveEDocumentProviderProtocol(process.env.EDOCUMENT_LIVE_PROVIDER_PROTOCOL);

    if (!endpointUrl || !username || !secretKey || !protocol) {
      return null;
    }

    return {
      endpointUrl,
      protocol,
      username,
      hasSecretKey: true,
      secretKey,
      timeoutMs: resolveLiveProviderTimeoutMs(),
    };
  }

  private async postJson(args: {
    config: LiveEDocumentProviderRuntimeConfig;
    operation: LiveProviderOperation;
    body: Record<string, unknown>;
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), args.config.timeoutMs);

    try {
      const response = await this.httpClient(args.config.endpointUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${args.config.secretKey}`,
          "Content-Type": "application/json",
          "X-BEEMMB-Provider-Username": args.config.username,
          "X-BEEMMB-Provider-Operation": args.operation,
        },
        body: JSON.stringify(args.body),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({
        providerErrorCode: "LIVE_PROVIDER_NON_JSON_RESPONSE",
        providerErrorMessage: "Canlı provider JSON olmayan yanıt döndürdü.",
        statusCode: response.status,
      }));

      if (!response.ok) {
        const error = normalizeLiveProviderError({
          ...(isRecord(payload) ? payload : { payload }),
          statusCode: response.status,
        });
        throw new LiveEDocumentProviderRequestError(error.providerErrorMessage, error.responsePayload);
      }

      return payload;
    } catch (error) {
      if (error instanceof LiveEDocumentProviderRequestError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new LiveEDocumentProviderRequestError("LIVE_PROVIDER_TIMEOUT", {
          providerErrorCode: "LIVE_PROVIDER_TIMEOUT",
          providerErrorMessage: "Canlı provider yanıt süresi aşıldı.",
          timeoutMs: args.config.timeoutMs,
        });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async dispatchDocument(input: EDocumentProviderDispatchInput): Promise<EDocumentProviderDispatchResult> {
    const config = this.resolveRuntimeConfig();
    if (!config) {
      throw new LiveEDocumentProviderConfigurationError();
    }

    const payload = await this.postJson({
      config,
      operation: "DISPATCH_DOCUMENT",
      body: buildLiveProviderRequestBody({ operation: "DISPATCH_DOCUMENT", input }),
    });

    return normalizeLiveProviderResponse(payload);
  }

  async queryDocumentStatus(input: { documentId: string; documentNumber: string; providerReference?: string | null }): Promise<EDocumentProviderDispatchResult> {
    const config = this.resolveRuntimeConfig();
    if (!config) {
      throw new LiveEDocumentProviderConfigurationError();
    }

    const payload = await this.postJson({
      config,
      operation: "QUERY_DOCUMENT_STATUS",
      body: buildLiveProviderRequestBody({ operation: "QUERY_DOCUMENT_STATUS", input }),
    });

    return normalizeLiveProviderResponse(payload);
  }
}

export const liveEDocumentProviderAdapter = new LiveEDocumentProviderAdapter();
