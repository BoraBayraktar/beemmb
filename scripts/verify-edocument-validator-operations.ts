import { eDocumentValidatorOperationsService } from "@/modules/edocument/services/edocument-validator-operations.service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const trackedKeys = [
  "EDOCUMENT_XSD_VALIDATOR_COMMAND",
  "EDOCUMENT_XSD_VALIDATOR_ARGS",
  "EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND",
  "EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS",
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

try {
  setTrackedEnv({
    EDOCUMENT_XSD_VALIDATOR_COMMAND: "xmllint",
    EDOCUMENT_XSD_VALIDATOR_ARGS: "--noout --schema {schema} {xml}",
    EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND: "schematron-validator",
    EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS: "--schema {schema} --xml {xml}",
  });

  const report = eDocumentValidatorOperationsService.getReport();
  assert(report.schemaVersion === "UBL-TR-1.2.1", "Validator operasyon raporu UBL-TR schema version değerini taşımalıdır.");
  assert(report.schemas.length === 2, "Validator operasyon raporu fatura ve irsaliye schema durumlarını taşımalıdır.");
  assert(report.schemas.every((item) => item.officialSchemaReady), "Validator operasyon raporu resmi XSD dosyalarının hazır olduğunu göstermelidir.");
  assert(report.schemas.every((item) => item.officialSchematronReady), "Validator operasyon raporu resmi Schematron dosyasının hazır olduğunu göstermelidir.");
  assert(report.schemas.some((item) => item.documentRootType === "INVOICE" && Boolean(item.xsdHash)), "Validator operasyon raporu fatura XSD hash değerini taşımalıdır.");
  assert(report.schemas.some((item) => item.documentRootType === "DESPATCH_ADVICE" && Boolean(item.xsdHash)), "Validator operasyon raporu irsaliye XSD hash değerini taşımalıdır.");
  assert(report.validators.length === 2, "Validator operasyon raporu XSD ve Schematron validator durumlarını taşımalıdır.");
  assert(report.validators.every((item) => item.evidenceReady), "Validator operasyon raporu placeholder değerleri tam ise evidence hazır olmalıdır.");
  assert(report.evidenceReady, "Schema ve validator evidence tam ise operasyon raporu hazır olmalıdır.");

  setTrackedEnv({
    EDOCUMENT_XSD_VALIDATOR_COMMAND: "xmllint",
    EDOCUMENT_XSD_VALIDATOR_ARGS: "--schema {schema}",
    EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND: "schematron-validator",
    EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS: "--schema {schema} --xml {xml}",
  });
  const missingXmlPlaceholderReport = eDocumentValidatorOperationsService.getReport();
  const xsdValidator = missingXmlPlaceholderReport.validators.find((item) => item.type === "XSD");
  assert(Boolean(xsdValidator), "XSD validator operasyon durumu bulunmalıdır.");
  assert(!xsdValidator!.evidenceReady, "XSD validator {xml} placeholder olmadan evidence hazır sayılmamalıdır.");
  assert(!missingXmlPlaceholderReport.evidenceReady, "Validator placeholder eksikse operasyon raporu hazır sayılmamalıdır.");

  console.log("E-belge validator operasyon raporu doğrulaması geçti.");
} finally {
  restoreEnv();
}
