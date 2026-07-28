import { eDocumentConfigReadinessService } from "@/modules/edocument/services/edocument-config-readiness.service";
import { gibSchemaManifestService } from "@/modules/edocument/services/gib-schema-manifest.service";

const trackedKeys = [
  "EDOCUMENT_SENDER_NAME",
  "EDOCUMENT_SENDER_TAX_NUMBER",
  "EDOCUMENT_SENDER_TAX_OFFICE",
  "EDOCUMENT_SENDER_EMAIL",
  "EDOCUMENT_SENDER_ADDRESS",
  "EDOCUMENT_INVOICE_NUMBER_PREFIX",
  "EDOCUMENT_DEFAULT_VAT_RATE",
  "EDOCUMENT_SHIPMENT_CARRIER_NAME",
  "EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER",
  "EDOCUMENT_SHIPMENT_VEHICLE_PLATE",
  "EDOCUMENT_SHIPMENT_DRIVER_NAME",
  "EDOCUMENT_SHIPMENT_DRIVER_TCKN",
  "EDOCUMENT_XSD_VALIDATOR_COMMAND",
  "EDOCUMENT_XSD_VALIDATOR_ARGS",
  "EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND",
  "EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS",
  "EDOCUMENT_PROVIDER_MODE",
  "EDOCUMENT_LIVE_PROVIDER_PROTOCOL",
  "EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL",
  "EDOCUMENT_LIVE_PROVIDER_USERNAME",
  "EDOCUMENT_LIVE_PROVIDER_SECRET_KEY",
] as const;

const previousEnv = new Map<string, string | undefined>();

function setTrackedEnv(values: Partial<Record<(typeof trackedKeys)[number], string>>) {
  for (const key of trackedKeys) {
    if (!previousEnv.has(key)) {
      previousEnv.set(key, process.env[key]);
    }

    process.env[key] = values[key] ?? "";
  }
}

function restoreEnv() {
  for (const [key, value] of previousEnv.entries()) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function findCheck(key: string) {
  const report = eDocumentConfigReadinessService.getReport();
  const check = report.checks.find((item) => item.key === key);

  assert(Boolean(check), `${key} readiness kontrolü bulunmalıdır.`);

  return { report, check: check! };
}

try {
  setTrackedEnv({});

  const emptyReport = eDocumentConfigReadinessService.getReport();
  assert(!emptyReport.ready, "Boş env ile e-belge hazırlığı hazır olmamalıdır.");
  assert(!emptyReport.senderReady, "Boş env ile gönderici hazır olmamalıdır.");
  assert(!emptyReport.taxReady, "Boş env ile vergi ayarı hazır olmamalıdır.");
  assert(!emptyReport.shipmentReady, "Boş env ile sevkiyat ayarı hazır olmamalıdır.");
  assert(!emptyReport.validationEngineReady, "Boş env ile doğrulama motoru hazır olmamalıdır.");
  assert(!emptyReport.providerReady, "Boş env ile canlı provider hazır olmamalıdır.");
  assert(emptyReport.providerMode === "TANIMSIZ", "Boş env ile provider modu TANIMSIZ dönmelidir.");
  assert(
    emptyReport.registeredProviderAdapters.includes("mock-edocs-provider"),
    "Readiness raporu kayıtlı provider adapter listesini taşımalıdır.",
  );
  assert(
    emptyReport.providerAdapters.some((adapter) => adapter.providerKey === "live-edocs-provider" && !adapter.configured && !adapter.operational),
    "Readiness raporu canlı adapter configured/operational durumunu taşımalıdır.",
  );
  assert(
    emptyReport.productionChecklist.some((item) => item.key === "EVIDENCE_PACKAGE_EXPORTED"),
    "Readiness raporu production checklist maddelerini taşımalıdır.",
  );
  assert(
    emptyReport.productionChecklist.every((item) => item.requiredEvidence.length > 0),
    "Readiness raporu production checklist kanıt alanlarını taşımalıdır.",
  );
  assert(
    emptyReport.liveProviderTestScenarios.some((item) => item.key === "WEBHOOK_STATUS_RECEIVED"),
    "Readiness raporu canlı provider test senaryolarını taşımalıdır.",
  );
  assert(
    emptyReport.liveProviderTestScenarios.every((item) => item.requiredEvidence.length > 0),
    "Readiness raporu canlı provider test senaryo kanıt alanlarını taşımalıdır.",
  );
  assert(
    findCheck("EDOCUMENT_PROVIDER_MODE").check.message === "EDOCUMENT_PROVIDER_MODE LIVE olarak tanımlanmalıdır.",
    "Boş provider modu açık tanım mesajı dönmelidir.",
  );
  assert(emptyReport.schemaReady, "Resmi XSD dosyaları kurulu iken schema hazır olmalıdır.");
  assert(emptyReport.schematronReady, "Resmi Schematron dosyaları kurulu iken Schematron hazır olmalıdır.");

  const invoiceSchema = gibSchemaManifestService.getStatus("INVOICE");
  assert(invoiceSchema.xsdPath.endsWith("xsdrt/maindoc/UBL-Invoice-2.1.xsd"), "Fatura XSD path resmi GİB xsdrt/maindoc yerleşimini göstermelidir.");
  assert(invoiceSchema.officialSchemaReady, "Verify ortamında resmi fatura XSD dosyası hazır olmalıdır.");
  assert(Boolean(invoiceSchema.xsdHash), "Resmi fatura XSD dosyası hash üretmelidir.");
  assert(invoiceSchema.schematronPath.endsWith("schematron/UBL-TR_Main_Schematron.xml"), "Fatura Schematron path resmi GİB ana şematron dosyasını göstermelidir.");
  assert(invoiceSchema.officialSchematronReady, "Verify ortamında resmi fatura Schematron dosyası hazır olmalıdır.");
  assert(Boolean(invoiceSchema.schematronHash), "Resmi fatura Schematron dosyası hash üretmelidir.");

  const despatchSchema = gibSchemaManifestService.getStatus("DESPATCH_ADVICE");
  assert(despatchSchema.xsdPath.endsWith("xsdrt/maindoc/UBL-DespatchAdvice-2.1.xsd"), "İrsaliye XSD path resmi GİB xsdrt/maindoc yerleşimini göstermelidir.");
  assert(despatchSchema.officialSchemaReady, "Verify ortamında resmi irsaliye XSD dosyası hazır olmalıdır.");
  assert(Boolean(despatchSchema.xsdHash), "Resmi irsaliye XSD dosyası hash üretmelidir.");
  assert(despatchSchema.schematronPath.endsWith("schematron/UBL-TR_Main_Schematron.xml"), "İrsaliye Schematron path resmi GİB ana şematron dosyasını göstermelidir.");
  assert(despatchSchema.officialSchematronReady, "Verify ortamında resmi irsaliye Schematron dosyası hazır olmalıdır.");
  assert(Boolean(despatchSchema.schematronHash), "Resmi irsaliye Schematron dosyası hash üretmelidir.");

  setTrackedEnv({
    EDOCUMENT_SENDER_NAME: "BEEMMB Test",
    EDOCUMENT_SENDER_TAX_NUMBER: "1234567890",
    EDOCUMENT_SENDER_TAX_OFFICE: "Kadıköy",
    EDOCUMENT_SENDER_EMAIL: "ebelge@example.com",
    EDOCUMENT_SENDER_ADDRESS: "Test adresi",
    EDOCUMENT_INVOICE_NUMBER_PREFIX: "BEF",
    EDOCUMENT_DEFAULT_VAT_RATE: "20",
    EDOCUMENT_SHIPMENT_CARRIER_NAME: "Test Taşıyıcı",
    EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER: "1234567890",
    EDOCUMENT_SHIPMENT_VEHICLE_PLATE: "34ABC123",
    EDOCUMENT_SHIPMENT_DRIVER_NAME: "Test Şoför",
    EDOCUMENT_SHIPMENT_DRIVER_TCKN: "10000000146",
    EDOCUMENT_XSD_VALIDATOR_COMMAND: "node",
    EDOCUMENT_XSD_VALIDATOR_ARGS: "--schema {schema} {xml}",
    EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND: "node",
    EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS: "--schema {schema} --xml {xml}",
    EDOCUMENT_PROVIDER_MODE: "LIVE",
    EDOCUMENT_LIVE_PROVIDER_PROTOCOL: "CUSTOM_HTTP_JSON",
    EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL: "https://entegrator.example.com/edocument",
    EDOCUMENT_LIVE_PROVIDER_USERNAME: "api-user",
    EDOCUMENT_LIVE_PROVIDER_SECRET_KEY: "api-secret",
  });

  const configuredReport = eDocumentConfigReadinessService.getReport();
  assert(configuredReport.senderReady, "Geçerli gönderici env değerleri hazır sayılmalıdır.");
  assert(configuredReport.taxReady, "Geçerli KDV oranı hazır sayılmalıdır.");
  assert(configuredReport.shipmentReady, "Geçerli sevkiyat env değerleri hazır sayılmalıdır.");
  assert(configuredReport.validationEngineReady, "Validator command ve args değerleri hazır sayılmalıdır.");
  assert(configuredReport.providerReady, "CUSTOM_HTTP_JSON canlı provider HTTP client operasyonel iken provider hazır sayılmalıdır.");
  assert(configuredReport.providerMode === "LIVE", "LIVE provider modu raporda görünmelidir.");
  assert(
    configuredReport.registeredProviderAdapters.includes("live-edocs-provider"),
    "Kayıtlı adapter listesi canlı provider adapter değerini taşımalıdır.",
  );
  assert(
    configuredReport.providerAdapters.some((adapter) => adapter.providerKey === "live-edocs-provider" && adapter.configured && adapter.operational),
    "Env tam iken canlı adapter configured=true operational=true görünmelidir.",
  );
  assert(
    findCheck("EDOCUMENT_LIVE_PROVIDER_CONFIGURED").check.ready,
    "Mock dışı adapter env konfigürasyonu tam iken canlı provider adapter konfigürasyonu hazır olmalıdır.",
  );
  assert(
    findCheck("EDOCUMENT_LIVE_PROVIDER_OPERATIONAL").check.ready,
    "CUSTOM_HTTP_JSON canlı adapter env tam iken canlı provider adapter operasyonel hazır olmalıdır.",
  );
  setTrackedEnv({
    EDOCUMENT_PROVIDER_MODE: "LIVE",
    EDOCUMENT_LIVE_PROVIDER_PROTOCOL: "CUSTOM_HTTP_JSON",
    EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL: "",
    EDOCUMENT_LIVE_PROVIDER_USERNAME: "api-user",
    EDOCUMENT_LIVE_PROVIDER_SECRET_KEY: "api-secret",
  });
  assert(!findCheck("EDOCUMENT_LIVE_PROVIDER_CONFIGURED").check.ready, "Canlı provider endpoint yoksa adapter konfigürasyonu hazır olmamalıdır.");
  assert(!findCheck("EDOCUMENT_LIVE_PROVIDER_OPERATIONAL").check.ready, "Canlı provider endpoint yoksa adapter operasyonel hazır olmamalıdır.");
  assert(configuredReport.ready, "CUSTOM_HTTP_JSON canlı provider HTTP client operasyonel iken genel hazırlık hazır olmalıdır.");

  setTrackedEnv({
    EDOCUMENT_PROVIDER_MODE: "LIVE",
    EDOCUMENT_LIVE_PROVIDER_PROTOCOL: "CUSTOM_HTTP_JSON",
    EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL: "entegrator.example.com/edocument",
    EDOCUMENT_LIVE_PROVIDER_USERNAME: "api-user",
    EDOCUMENT_LIVE_PROVIDER_SECRET_KEY: "api-secret",
  });
  assert(!findCheck("EDOCUMENT_LIVE_PROVIDER_CONFIGURED").check.ready, "Canlı provider endpoint URL protokolsüzse adapter konfigürasyonu hazır olmamalıdır.");

  setTrackedEnv({
    EDOCUMENT_PROVIDER_MODE: "LIVE",
    EDOCUMENT_LIVE_PROVIDER_PROTOCOL: "",
    EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL: "https://entegrator.example.com/edocument",
    EDOCUMENT_LIVE_PROVIDER_USERNAME: "api-user",
    EDOCUMENT_LIVE_PROVIDER_SECRET_KEY: "api-secret",
  });
  assert(!findCheck("EDOCUMENT_LIVE_PROVIDER_PROTOCOL").check.ready, "Canlı provider protokolü boşsa hazır olmamalıdır.");
  assert(!findCheck("EDOCUMENT_LIVE_PROVIDER_CONFIGURED").check.ready, "Canlı provider protokolü yoksa adapter konfigürasyonu hazır olmamalıdır.");

  setTrackedEnv({ EDOCUMENT_LIVE_PROVIDER_PROTOCOL: "SOAP_V1" });
  assert(!findCheck("EDOCUMENT_LIVE_PROVIDER_PROTOCOL").check.ready, "Desteklenmeyen canlı provider protokolü hazır olmamalıdır.");

  setTrackedEnv({ EDOCUMENT_PROVIDER_MODE: "MOCK" });
  const mockProviderMode = findCheck("EDOCUMENT_PROVIDER_MODE");
  assert(!mockProviderMode.check.ready, "Mock provider modu tam uyumluluk için hazır sayılmamalıdır.");
  assert(mockProviderMode.report.providerMode === "MOCK", "Mock provider modu raporda görünmelidir.");
  assert(
    mockProviderMode.check.message === "Mock provider yalnızca geliştirme içindir; tam uyumluluk için EDOCUMENT_PROVIDER_MODE LIVE olmalıdır.",
    "Mock provider modu geliştirme uyarısı dönmelidir.",
  );

  setTrackedEnv({ EDOCUMENT_PROVIDER_MODE: "SANDBOX" });
  const invalidProviderMode = findCheck("EDOCUMENT_PROVIDER_MODE");
  assert(!invalidProviderMode.check.ready, "Bilinmeyen provider modu hazır sayılmamalıdır.");
  assert(invalidProviderMode.report.providerMode === "SANDBOX", "Bilinmeyen provider modu raporda görünmelidir.");
  assert(
    invalidProviderMode.check.message === "EDOCUMENT_PROVIDER_MODE yalnızca LIVE veya MOCK değerini almalıdır; tam uyumluluk için LIVE kullanılmalıdır.",
    "Bilinmeyen provider modu izin verilen değerleri açıklamalıdır.",
  );

  setTrackedEnv({
    EDOCUMENT_XSD_VALIDATOR_COMMAND: "beemmb-missing-xsd-validator",
    EDOCUMENT_XSD_VALIDATOR_ARGS: "--schema {schema} {xml}",
    EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND: "node",
    EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS: "--schema {schema} --xml {xml}",
  });
  assert(!findCheck("EDOCUMENT_XSD_VALIDATOR_COMMAND").check.ready, "PATH içinde bulunmayan validator komutu hazır olmamalıdır.");

  setTrackedEnv({
    EDOCUMENT_XSD_VALIDATOR_COMMAND: "node",
    EDOCUMENT_XSD_VALIDATOR_ARGS: "--schema {schema}",
    EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND: "node",
    EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS: "--schema {schema} --xml {xml}",
  });
  assert(!findCheck("EDOCUMENT_XSD_VALIDATOR_ARGS").check.ready, "Validator argümanları {xml} ve {schema} placeholder değerlerini içermelidir.");

  setTrackedEnv({ EDOCUMENT_INVOICE_NUMBER_PREFIX: "BEEM" });
  assert(!findCheck("EDOCUMENT_INVOICE_NUMBER_PREFIX").check.ready, "Fatura seri prefix değeri 3 karakter değilse hazır olmamalıdır.");

  setTrackedEnv({ EDOCUMENT_DEFAULT_VAT_RATE: "101" });
  assert(!findCheck("EDOCUMENT_DEFAULT_VAT_RATE").check.ready, "KDV oranı 100 üzerinde ise hazır olmamalıdır.");

  console.log("E-belge config readiness doğrulaması geçti.");
} finally {
  restoreEnv();
}
