import { EDocumentService } from "@/modules/edocument/services/edocument.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertPresent<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }

  return value;
}

const previousEnv = new Map<string, string | undefined>();

function setEnv(key: string, value: string) {
  if (!previousEnv.has(key)) {
    previousEnv.set(key, process.env[key]);
  }

  process.env[key] = value;
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

const createdAt = new Date("2026-07-25T10:30:00.000Z");
let documentType: "E_INVOICE" | "E_DISPATCH" = "E_INVOICE";
let documentNote = "Servis doğrulama";
let createCallCount = 0;
type CreateXmlArtifactArgs = {
  businessDocumentId: string;
  documentRootType: "INVOICE" | "DESPATCH_ADVICE";
  schemaVersion: string;
  xsdHash?: string | null;
  schematronHash?: string | null;
  xmlContent: string;
  xmlHash: string;
  validationStatus: "NOT_VALIDATED" | "VALID" | "INVALID";
  validationErrors: string[];
  supersedesArtifactId?: string | null;
};

let createArgs: CreateXmlArtifactArgs | null = null;
let existingArtifact: {
  id: string;
  businessDocumentId: string;
  supersedesArtifactId: string | null;
  documentRootType: "INVOICE" | "DESPATCH_ADVICE";
  schemaVersion: string;
  xsdHash: string | null;
  schematronHash: string | null;
  xmlContent: string;
  xmlHash: string;
  validationStatus: "NOT_VALIDATED" | "VALID" | "INVALID";
  validationErrors: string[];
  generatedAt: Date;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
} | null = null;

const repository = {
  async findBusinessDocumentForXml(id: string) {
    return {
      id,
      documentNumber: "BEF2026000000001",
      documentType,
      issueDate: new Date("2026-07-25T10:30:00.000Z"),
      currency: "TRY",
      totalAmount: { toNumber: () => 120 },
      counterpartyName: "Alıcı Test",
      counterpartyTaxNumber: "1234567890",
      counterpartyTaxOffice: "Kadıköy",
      counterpartyEmail: "alici@example.com",
      counterpartyAddress: "Alıcı adresi",
      note: documentNote,
      lines: [{
        id: "line-1",
        productSku: "SKU-1",
        productName: "Test ürün",
        quantity: 2,
        unitPrice: { toNumber: () => 50 },
        lineTotal: { toNumber: () => 100 },
        currency: "TRY",
        note: null,
        createdAt,
      }],
    };
  },
  async findLatestXmlArtifact() {
    return existingArtifact;
  },
  async findXmlArtifactByHash(args: { xmlHash: string }) {
    return existingArtifact?.xmlHash === args.xmlHash ? existingArtifact : null;
  },
  async createXmlArtifact(args: CreateXmlArtifactArgs) {
    createCallCount += 1;
    createArgs = args;

    existingArtifact = {
      id: `xml-${createCallCount}`,
      businessDocumentId: args.businessDocumentId,
      supersedesArtifactId: args.supersedesArtifactId ?? null,
      documentRootType: args.documentRootType,
      schemaVersion: args.schemaVersion,
      xsdHash: args.xsdHash ?? null,
      schematronHash: args.schematronHash ?? null,
      xmlContent: args.xmlContent,
      xmlHash: args.xmlHash,
      validationStatus: args.validationStatus,
      validationErrors: args.validationErrors,
      generatedAt: createdAt,
      validatedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    };

    return existingArtifact;
  },
};

async function main() {
  try {
    setEnv("EDOCUMENT_SENDER_NAME", "BEEMMB Test");
    setEnv("EDOCUMENT_SENDER_TAX_NUMBER", "9876543210");
    setEnv("EDOCUMENT_SENDER_TAX_OFFICE", "Beşiktaş");
    setEnv("EDOCUMENT_SENDER_EMAIL", "ebelge@example.com");
    setEnv("EDOCUMENT_SENDER_ADDRESS", "Gönderici adresi");
    setEnv("EDOCUMENT_DEFAULT_VAT_RATE", "20");
    setEnv("EDOCUMENT_SHIPMENT_CARRIER_NAME", "Taşıyıcı Test");
    setEnv("EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER", "1234567890");
    setEnv("EDOCUMENT_SHIPMENT_VEHICLE_PLATE", "34ABC123");
    setEnv("EDOCUMENT_SHIPMENT_DRIVER_NAME", "Sürücü Test");
    setEnv("EDOCUMENT_SHIPMENT_DRIVER_TCKN", "10000000146");

    const service = new EDocumentService(repository as never);
    const result = await service.generateXml({ businessDocumentId: "document-1" });

    assert(result.created, "Yeni XML artifact oluşturulmalıdır.");
    assert(result.item.documentRootType === "INVOICE", "E-fatura XML artifact root tipi INVOICE olmalıdır.");
    assert(Boolean(result.item.xsdHash), "Resmi XSD kurulu iken servis sonucu xsdHash taşımalıdır.");
    assert(Boolean(result.item.schematronHash), "Resmi Schematron kurulu iken servis sonucu schematronHash taşımalıdır.");
    const createdArgs = assertPresent(createArgs, "Repository createXmlArtifact çağrılmalıdır.");
    assert(Boolean(createdArgs.xsdHash), "Servis create payload içinde XSD hash değerini göndermelidir.");
    assert(Boolean(createdArgs.schematronHash), "Servis create payload içinde Schematron hash değerini göndermelidir.");
    assert(createdArgs.validationStatus === "INVALID", "Validator motoru yokken doğrulanan artifact INVALID olmalıdır.");
    assert(createdArgs.validationErrors.length > 0, "Validator motoru eksikleri validationErrors içine yazılmalıdır.");
    assert(createdArgs.xmlContent.includes("<Invoice "), "Servis Invoice XML içeriği üretmelidir.");

    const duplicateResult = await service.generateXml({ businessDocumentId: "document-1" });
    assert(!duplicateResult.created, "Aynı XML hash için yeni artifact oluşturulmamalıdır.");
    assert(createCallCount === 1, "Duplicate XML üretiminde repository createXmlArtifact yeniden çağrılmamalıdır.");
    assert(duplicateResult.item.id === "xml-1", "Duplicate üretimde mevcut artifact dönmelidir.");
    assert(duplicateResult.item.isCurrent, "Duplicate mevcut artifact güncel ise sonuç güncel işaretlenmelidir.");
    assert(duplicateResult.item.xsdHash === existingArtifact?.xsdHash, "Duplicate sonuç mevcut artifact XSD hash değerini korumalıdır.");
    assert(duplicateResult.item.schematronHash === existingArtifact?.schematronHash, "Duplicate sonuç mevcut artifact Schematron hash değerini korumalıdır.");

    documentNote = "Servis doğrulama revize";
    const supersededResult = await service.generateXml({ businessDocumentId: "document-1" });
    const supersededCreateArgs = assertPresent(createArgs, "Farklı XML için createXmlArtifact çağrısı yakalanmalıdır.");

    assert(supersededResult.created, "XML içeriği değiştiğinde yeni artifact oluşturulmalıdır.");
    assert(createCallCount === 2, "Farklı XML üretiminde ikinci createXmlArtifact çağrısı yapılmalıdır.");
    assert(supersededResult.item.id === "xml-2", "Farklı XML üretiminde yeni artifact dönmelidir.");
    assert(supersededResult.item.isCurrent, "Yeni artifact güncel işaretlenmelidir.");
    assert(supersededCreateArgs.supersedesArtifactId === "xml-1", "Yeni artifact önceki artifact id değerini supersedes olarak taşımalıdır.");
    assert(supersededCreateArgs.xmlHash !== duplicateResult.item.xmlHash, "Revize XML yeni hash üretmelidir.");

    documentType = "E_DISPATCH";
    documentNote = "E-irsaliye servis doğrulama";
    existingArtifact = null;
    createArgs = null;
    createCallCount = 0;

    const despatchResult = await service.generateXml({ businessDocumentId: "document-1" });
    const despatchCreateArgs = assertPresent<CreateXmlArtifactArgs>(createArgs, "E-irsaliye için createXmlArtifact çağrısı yakalanmalıdır.");

    assert(despatchResult.created, "E-irsaliye için yeni XML artifact oluşturulmalıdır.");
    assert(despatchResult.item.documentRootType === "DESPATCH_ADVICE", "E-irsaliye XML artifact root tipi DESPATCH_ADVICE olmalıdır.");
    assert(Boolean(despatchResult.item.xsdHash), "Resmi irsaliye XSD kurulu iken servis sonucu xsdHash taşımalıdır.");
    assert(Boolean(despatchResult.item.schematronHash), "Resmi irsaliye Schematron kurulu iken servis sonucu schematronHash taşımalıdır.");
    assert(despatchCreateArgs.documentRootType === "DESPATCH_ADVICE", "E-irsaliye create payload root tipi DESPATCH_ADVICE olmalıdır.");
    assert(despatchCreateArgs.xmlContent.includes("<DespatchAdvice "), "Servis DespatchAdvice XML içeriği üretmelidir.");
    assert(despatchCreateArgs.validationStatus === "INVALID", "Validator motoru yokken doğrulanan artifact INVALID olmalıdır.");
    assert(despatchCreateArgs.validationErrors.length > 0, "E-irsaliye validator motoru eksikleri validationErrors içine yazılmalıdır.");

    console.log("E-belge service doğrulaması geçti.");
  } finally {
    restoreEnv();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
