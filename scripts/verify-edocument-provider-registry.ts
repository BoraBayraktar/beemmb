import type { EDocumentProviderAdapter } from "@/modules/edocument/contracts/edocument-provider.contract";
import {
  EDocumentProviderRegistryError,
  EDocumentProviderRegistryService,
  eDocumentProviderRegistryService,
} from "@/modules/edocument/services/edocument-provider-registry.service";
import {
  buildLiveProviderDispatchRequestEvidence,
  buildLiveProviderStatusRequestEvidence,
  liveEDocumentProviderAdapter,
  LiveEDocumentProviderConfigurationError,
  LiveEDocumentProviderAdapter,
  LiveEDocumentProviderRequestError,
  normalizeLiveEDocumentProviderEndpointUrl,
  normalizeLiveProviderError,
  normalizeLiveProviderResponse,
} from "@/modules/edocument/services/live-edocument-provider.adapter";
import { mockEDocumentProviderAdapter } from "@/modules/edocument/services/mock-edocument-provider.adapter";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const previousLiveProviderEnv = {
  protocol: process.env.EDOCUMENT_LIVE_PROVIDER_PROTOCOL,
  endpointUrl: process.env.EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL,
  username: process.env.EDOCUMENT_LIVE_PROVIDER_USERNAME,
  secretKey: process.env.EDOCUMENT_LIVE_PROVIDER_SECRET_KEY,
};

function setLiveProviderEnv(values: { protocol?: string; endpointUrl?: string; username?: string; secretKey?: string }) {
  process.env.EDOCUMENT_LIVE_PROVIDER_PROTOCOL = values.protocol ?? "";
  process.env.EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL = values.endpointUrl ?? "";
  process.env.EDOCUMENT_LIVE_PROVIDER_USERNAME = values.username ?? "";
  process.env.EDOCUMENT_LIVE_PROVIDER_SECRET_KEY = values.secretKey ?? "";
}

function restoreLiveProviderEnv() {
  if (previousLiveProviderEnv.protocol === undefined) {
    delete process.env.EDOCUMENT_LIVE_PROVIDER_PROTOCOL;
  } else {
    process.env.EDOCUMENT_LIVE_PROVIDER_PROTOCOL = previousLiveProviderEnv.protocol;
  }

  if (previousLiveProviderEnv.endpointUrl === undefined) {
    delete process.env.EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL;
  } else {
    process.env.EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL = previousLiveProviderEnv.endpointUrl;
  }

  if (previousLiveProviderEnv.username === undefined) {
    delete process.env.EDOCUMENT_LIVE_PROVIDER_USERNAME;
  } else {
    process.env.EDOCUMENT_LIVE_PROVIDER_USERNAME = previousLiveProviderEnv.username;
  }

  if (previousLiveProviderEnv.secretKey === undefined) {
    delete process.env.EDOCUMENT_LIVE_PROVIDER_SECRET_KEY;
  } else {
    process.env.EDOCUMENT_LIVE_PROVIDER_SECRET_KEY = previousLiveProviderEnv.secretKey;
  }
}

const customAdapter: EDocumentProviderAdapter = {
  providerKey: "custom-provider",
  async dispatchDocument(input) {
    return {
      accepted: true,
      providerReference: `CUSTOM-${input.documentNumber}`,
      providerStatus: "QUEUED",
      responsePayload: {
        provider: "custom-provider",
        xmlArtifactId: input.xmlArtifactId,
        xmlHash: input.xmlHash,
        xmlContentPresent: input.xmlContent.length > 0,
      },
    };
  },
  async queryDocumentStatus(input) {
    return {
      accepted: true,
      providerReference: input.providerReference ?? null,
      providerStatus: "SENT",
      responsePayload: {
        provider: "custom-provider",
        documentId: input.documentId,
      },
    };
  },
};

const registry = new EDocumentProviderRegistryService([customAdapter]);

assert(registry.resolve("custom-provider") === customAdapter, "Registry bilinen provider adapter değerini döndürmelidir.");
assert(registry.resolve("missing-provider") === mockEDocumentProviderAdapter, "Registry bilinmeyen provider için mock fallback döndürmelidir.");
assert(registry.resolve(null) === mockEDocumentProviderAdapter, "Registry boş provider için mock fallback döndürmelidir.");
assert(registry.resolveRequired("custom-provider") === customAdapter, "Registry zorunlu çözümlemede bilinen adapter değerini döndürmelidir.");
assert(registry.listProviderKeys().join(",") === "custom-provider", "Registry kayıtlı provider anahtarlarını sıralı döndürmelidir.");
assert(
  registry.listProviderStatuses()[0]?.providerKey === "custom-provider" && registry.listProviderStatuses()[0]?.configured && registry.listProviderStatuses()[0]?.operational,
  "Registry provider status listesini configured ve operational değerleriyle döndürmelidir.",
);
assert(registry.hasLiveAdapter(), "Registry mock dışı adapter içeriyorsa canlı adapter hazır sayılmalıdır.");
assert(registry.hasConfiguredLiveAdapter(), "Registry konfigüre sayılan mock dışı adapter içeriyorsa canlı adapter konfigüre sayılmalıdır.");
assert(registry.hasOperationalLiveAdapter(), "Registry operasyonel sayılan mock dışı adapter içeriyorsa canlı adapter operasyonel sayılmalıdır.");
assert(
  !new EDocumentProviderRegistryService([mockEDocumentProviderAdapter]).hasLiveAdapter(),
  "Registry yalnızca mock adapter içeriyorsa canlı adapter hazır sayılmamalıdır.",
);
async function main() {
  try {
    setLiveProviderEnv({});
    assert(
      !new EDocumentProviderRegistryService([liveEDocumentProviderAdapter, mockEDocumentProviderAdapter]).hasConfiguredLiveAdapter(),
      "Canlı adapter env eksikken registry konfigüre canlı adapter hazır saymamalıdır.",
    );
    assert(
      !new EDocumentProviderRegistryService([liveEDocumentProviderAdapter, mockEDocumentProviderAdapter]).hasOperationalLiveAdapter(),
      "Canlı adapter env eksikken registry operasyonel canlı adapter hazır saymamalıdır.",
    );

    setLiveProviderEnv({
      protocol: "CUSTOM_HTTP_JSON",
      endpointUrl: "https://entegrator.example.com/edocument",
      username: "api-user",
      secretKey: "api-secret",
    });
    assert(liveEDocumentProviderAdapter.isConfigured(), "Canlı provider env değerleri tam ise adapter konfigüre sayılmalıdır.");
    assert(liveEDocumentProviderAdapter.isOperational(), "CUSTOM_HTTP_JSON canlı provider HTTP client hazırsa adapter operasyonel sayılmalıdır.");
    assert(
      liveEDocumentProviderAdapter.resolveConfig()?.protocol === "CUSTOM_HTTP_JSON",
      "Canlı provider config desteklenen protokol değerini taşımalıdır.",
    );
    assert(
      liveEDocumentProviderAdapter.resolveConfig()?.endpointUrl === "https://entegrator.example.com/edocument",
      "Canlı provider config geçerli endpoint URL değerini normalize ederek taşımalıdır.",
    );
    assert(
      liveEDocumentProviderAdapter.resolveConfig()?.hasSecretKey === true,
      "Canlı provider config secret değerini açmadan secret varlığını belirtmelidir.",
    );
    const liveConfig = liveEDocumentProviderAdapter.resolveConfig();
    assert(Boolean(liveConfig), "Canlı provider config tam env ile çözümlenmelidir.");
    const dispatchEvidence = buildLiveProviderDispatchRequestEvidence({
      config: liveConfig!,
      input: {
        documentId: "document-1",
        documentNumber: "BEF2026000000001",
        documentType: "INVOICE",
        providerCode: "live-edocs-provider",
        xmlArtifactId: "xml-1",
        xmlHash: "xml-hash",
        xmlContent: "<Invoice />",
        schemaVersion: "UBL-TR-1.2.1",
      },
    });
    assert(dispatchEvidence.operation === "DISPATCH_DOCUMENT", "Canlı provider dispatch evidence operasyon bilgisini taşımalıdır.");
    assert(dispatchEvidence.xmlHash === "xml-hash", "Canlı provider dispatch evidence XML hash değerini taşımalıdır.");
    assert(!("secretKey" in dispatchEvidence), "Canlı provider dispatch evidence secret değerini taşımamalıdır.");
    assert(!("authorization" in dispatchEvidence), "Canlı provider dispatch evidence authorization değeri taşımamalıdır.");

    const statusEvidence = buildLiveProviderStatusRequestEvidence({
      config: liveConfig!,
      input: {
        documentId: "document-1",
        documentNumber: "BEF2026000000001",
        providerReference: "LIVE-REF-1",
      },
    });
    assert(statusEvidence.operation === "QUERY_DOCUMENT_STATUS", "Canlı provider status evidence operasyon bilgisini taşımalıdır.");
    assert(statusEvidence.providerReference === "LIVE-REF-1", "Canlı provider status evidence provider referansını taşımalıdır.");
    assert(!("secretKey" in statusEvidence), "Canlı provider status evidence secret değerini taşımamalıdır.");

    const normalizedAccepted = normalizeLiveProviderResponse({
      accepted: true,
      providerReference: "LIVE-REF-1",
      providerStatus: "SENT",
      token: "provider-token",
      nested: {
        signature: "provider-signature",
        safe: "ok",
      },
    });
    assert(normalizedAccepted.accepted, "Canlı provider response accepted değerini korumalıdır.");
    assert(normalizedAccepted.providerReference === "LIVE-REF-1", "Canlı provider response provider referansını korumalıdır.");
    assert(normalizedAccepted.providerStatus === "SENT", "Canlı provider response status değerini normalize etmelidir.");
    assert(normalizedAccepted.responsePayload.token === "MASKED", "Canlı provider response token değerini maskelemelidir.");
    assert((normalizedAccepted.responsePayload.nested as Record<string, unknown>).signature === "MASKED", "Canlı provider response iç içe signature değerini maskelemelidir.");
    assert((normalizedAccepted.responsePayload.nested as Record<string, unknown>).safe === "ok", "Canlı provider response güvenli alanları korumalıdır.");

    const normalizedFallback = normalizeLiveProviderResponse({
      status: "UNKNOWN",
      providerReference: "",
    });
    assert(!normalizedFallback.accepted, "Bilinmeyen canlı provider status accepted=false üretmelidir.");
    assert(normalizedFallback.providerStatus === "FAILED", "Bilinmeyen canlı provider status FAILED değerine düşmelidir.");
    assert(normalizedFallback.providerReference === null, "Boş canlı provider referansı null değerine düşmelidir.");

    const normalizedError = normalizeLiveProviderError({
      error: {
        code: "GIB_1195",
        message: "UBL doğrulama hatası",
        statusCode: 422,
      },
      authorization: "Bearer provider-token",
      details: {
        apiKey: "provider-api-key",
        safe: "line-1",
      },
    });
    assert(normalizedError.providerErrorCode === "GIB_1195", "Canlı provider error code değerini normalize etmelidir.");
    assert(normalizedError.providerErrorMessage === "UBL doğrulama hatası", "Canlı provider error message değerini normalize etmelidir.");
    assert(normalizedError.statusCode === 422, "Canlı provider error statusCode değerini normalize etmelidir.");
    assert(normalizedError.responsePayload.authorization === "MASKED", "Canlı provider error authorization değerini maskelemelidir.");
    assert((normalizedError.responsePayload.details as Record<string, unknown>).apiKey === "MASKED", "Canlı provider error apiKey değerini maskelemelidir.");
    assert((normalizedError.responsePayload.details as Record<string, unknown>).safe === "line-1", "Canlı provider error güvenli detay alanını korumalıdır.");

    const fallbackError = normalizeLiveProviderError(null);
    assert(fallbackError.providerErrorCode === "LIVE_PROVIDER_ERROR", "Boş canlı provider error fallback code üretmelidir.");
    assert(fallbackError.statusCode === null, "Boş canlı provider error statusCode null üretmelidir.");
    assert(
      new EDocumentProviderRegistryService([liveEDocumentProviderAdapter, mockEDocumentProviderAdapter]).hasConfiguredLiveAdapter(),
      "Canlı adapter env tam ise registry konfigüre canlı adapter hazır saymalıdır.",
    );
    assert(
      new EDocumentProviderRegistryService([liveEDocumentProviderAdapter, mockEDocumentProviderAdapter]).hasOperationalLiveAdapter(),
      "CUSTOM_HTTP_JSON canlı adapter env tam ise registry operasyonel canlı adapter hazır saymalıdır.",
    );
    assert(
      eDocumentProviderRegistryService.resolveRequired("live-edocs-provider") === liveEDocumentProviderAdapter,
      "Varsayılan registry canlı provider adapter değerini içermelidir.",
    );
    assert(eDocumentProviderRegistryService.hasLiveAdapter(), "Varsayılan registry mock dışı canlı adapter içermelidir.");

    setLiveProviderEnv({
      endpointUrl: "https://entegrator.example.com/edocument",
      username: "api-user",
      secretKey: "api-secret",
    });
    assert(!liveEDocumentProviderAdapter.isConfigured(), "Canlı provider protokol env değeri yoksa adapter konfigüre sayılmamalıdır.");

    setLiveProviderEnv({
      protocol: "CUSTOM_HTTP_JSON",
      endpointUrl: "entegrator.example.com/edocument",
      username: "api-user",
      secretKey: "api-secret",
    });
    assert(!liveEDocumentProviderAdapter.isConfigured(), "Canlı provider endpoint URL protokolsüzse adapter konfigüre sayılmamalıdır.");

    setLiveProviderEnv({
      protocol: "CUSTOM_HTTP_JSON",
      endpointUrl: "ftp://entegrator.example.com/edocument",
      username: "api-user",
      secretKey: "api-secret",
    });
    assert(!liveEDocumentProviderAdapter.isConfigured(), "Canlı provider endpoint URL http/https değilse adapter konfigüre sayılmamalıdır.");
    assert(
      normalizeLiveEDocumentProviderEndpointUrl(" https://entegrator.example.com/edocument ") === "https://entegrator.example.com/edocument",
      "Canlı provider endpoint URL trim edilip normalize edilmelidir.",
    );
    assert(normalizeLiveEDocumentProviderEndpointUrl("ftp://entegrator.example.com") === null, "Canlı provider endpoint URL http/https dışı protokol kabul etmemelidir.");

    setLiveProviderEnv({
      protocol: "SOAP_V1",
      endpointUrl: "https://entegrator.example.com/edocument",
      username: "api-user",
      secretKey: "api-secret",
    });
    assert(!liveEDocumentProviderAdapter.isConfigured(), "Desteklenmeyen canlı provider protokolü adapter konfigürasyonunu hazır saymamalıdır.");

    try {
      registry.resolveRequired("missing-provider");
      throw new Error("Bilinmeyen provider adapter için hata beklenmelidir.");
    } catch (error) {
      assert(error instanceof EDocumentProviderRegistryError, "Bilinmeyen provider adapter registry hatası üretmelidir.");
    }

    const dispatchResult = await registry.resolve("custom-provider").dispatchDocument({
      documentId: "document-1",
      documentNumber: "BEF2026000000001",
      documentType: "INVOICE",
      providerCode: "custom-provider",
      xmlArtifactId: "xml-1",
      xmlHash: "xml-hash",
      xmlContent: "<Invoice />",
      schemaVersion: "UBL-TR-1.2.1",
    });

    assert(dispatchResult.providerReference === "CUSTOM-BEF2026000000001", "Registry adapter dispatch sonucunu korumalıdır.");
    const customDispatchPayload = dispatchResult.responsePayload as Record<string, unknown>;
    assert(customDispatchPayload.xmlHash === "xml-hash", "Registry adapter XML hash payload değerini korumalıdır.");
    assert(customDispatchPayload.xmlContentPresent === true, "Registry adapter XML content değerini dispatch input içinde almalıdır.");

    setLiveProviderEnv({
      protocol: "CUSTOM_HTTP_JSON",
      endpointUrl: "https://entegrator.example.com/edocument",
      username: "api-user",
      secretKey: "api-secret",
    });
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const httpAdapter = new LiveEDocumentProviderAdapter(async (url, init) => {
      requests.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({
        accepted: true,
        providerReference: "LIVE-REF-1",
        providerStatus: "QUEUED",
        token: "provider-token",
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    assert(httpAdapter.isOperational(), "CUSTOM_HTTP_JSON canlı adapter env tam ise operasyonel sayılmalıdır.");
    const httpDispatchResult = await httpAdapter.dispatchDocument({
      documentId: "document-1",
      documentNumber: "BEF2026000000001",
      documentType: "INVOICE",
      providerCode: "live-edocs-provider",
      xmlArtifactId: "xml-1",
      xmlHash: "xml-hash",
      xmlContent: "<Invoice />",
      schemaVersion: "UBL-TR-1.2.1",
    });
    assert(httpDispatchResult.providerReference === "LIVE-REF-1", "Canlı provider HTTP dispatch sonucunu normalize etmelidir.");
    assert(httpDispatchResult.responsePayload.token === "MASKED", "Canlı provider HTTP response secret benzeri alanları maskelemelidir.");
    assert(requests[0]?.url === "https://entegrator.example.com/edocument", "Canlı provider HTTP client normalize endpoint değerine istek atmalıdır.");
    assert(requests[0]?.init.method === "POST", "Canlı provider HTTP client POST kullanmalıdır.");
    assert((requests[0]?.init.headers as Record<string, string>)?.Authorization === "Bearer api-secret", "Canlı provider HTTP client bearer auth header üretmelidir.");
    const requestBody = JSON.parse(String(requests[0]?.init.body)) as { operation: string; document: { xmlContent?: string } };
    assert(requestBody.operation === "DISPATCH_DOCUMENT", "Canlı provider HTTP dispatch body operasyon bilgisini taşımalıdır.");
    assert(requestBody.document.xmlContent === "<Invoice />", "Canlı provider HTTP dispatch body XML içeriğini taşımalıdır.");

    const statusResult = await httpAdapter.queryDocumentStatus({
      documentId: "document-1",
      documentNumber: "BEF2026000000001",
      providerReference: "LIVE-REF-1",
    });
    assert(statusResult.providerReference === "LIVE-REF-1", "Canlı provider HTTP status sonucunu normalize etmelidir.");

    const failingHttpAdapter = new LiveEDocumentProviderAdapter(async () => new Response(JSON.stringify({
      error: {
        code: "GIB_1195",
        message: "UBL doğrulama hatası",
      },
      authorization: "Bearer provider-token",
    }), { status: 422, headers: { "content-type": "application/json" } }));
    try {
      await failingHttpAdapter.dispatchDocument({
        documentId: "document-1",
        documentNumber: "BEF2026000000001",
        documentType: "INVOICE",
        providerCode: "live-edocs-provider",
        xmlArtifactId: "xml-1",
        xmlHash: "xml-hash",
        xmlContent: "<Invoice />",
        schemaVersion: "UBL-TR-1.2.1",
      });
      throw new Error("Canlı provider HTTP hata yanıtı exception üretmelidir.");
    } catch (error) {
      assert(error instanceof LiveEDocumentProviderRequestError, "Canlı provider HTTP hata yanıtı request error üretmelidir.");
      assert(error instanceof LiveEDocumentProviderRequestError && error.responsePayload?.authorization === "MASKED", "Canlı provider HTTP hata payload secret alanlarını maskelemelidir.");
    }

    try {
      setLiveProviderEnv({});
      await liveEDocumentProviderAdapter.dispatchDocument({
        documentId: "document-1",
        documentNumber: "BEF2026000000001",
        documentType: "INVOICE",
        providerCode: "live-edocs-provider",
        xmlArtifactId: "xml-1",
        xmlHash: "xml-hash",
        xmlContent: "<Invoice />",
        schemaVersion: "UBL-TR-1.2.1",
      });
      throw new Error("Canlı provider adapter env eksikken gönderimde hata üretmelidir.");
    } catch (error) {
      assert(error instanceof LiveEDocumentProviderConfigurationError, "Canlı provider adapter konfigürasyon hatası üretmelidir.");
    }
  } finally {
    restoreLiveProviderEnv();
  }

  console.log("E-belge provider registry doğrulaması geçti.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
