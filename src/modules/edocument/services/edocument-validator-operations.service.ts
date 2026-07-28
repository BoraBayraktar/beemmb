import type { AdminBusinessDocumentXmlRootType, EDocumentValidatorOperationReport } from "@/modules/edocument/contracts/edocument.contract";
import { gibSchemaManifestService } from "@/modules/edocument/services/gib-schema-manifest.service";
import { UBL_TR_SCHEMA_VERSION } from "@/modules/edocument/services/ubl-xml.util";

const documentRootTypes: AdminBusinessDocumentXmlRootType[] = ["INVOICE", "DESPATCH_ADVICE"];

function resolveValidator(args: {
  type: "XSD" | "SCHEMATRON";
  commandKey: string;
  argsKey: string;
}) {
  const command = process.env[args.commandKey]?.trim() ?? "";
  const argTemplate = process.env[args.argsKey]?.trim() ?? "";
  const hasXmlPlaceholder = argTemplate.includes("{xml}");
  const hasSchemaPlaceholder = argTemplate.includes("{schema}");
  const commandConfigured = command.length > 0;
  const argsConfigured = argTemplate.length > 0;

  return {
    type: args.type,
    commandKey: args.commandKey,
    argsKey: args.argsKey,
    commandConfigured,
    argsConfigured,
    hasXmlPlaceholder,
    hasSchemaPlaceholder,
    evidenceReady: commandConfigured && argsConfigured && hasXmlPlaceholder && hasSchemaPlaceholder,
  };
}

export class EDocumentValidatorOperationsService {
  getReport(): EDocumentValidatorOperationReport {
    const schemas = documentRootTypes.map((documentRootType) => {
      const status = gibSchemaManifestService.getStatus(documentRootType);
      return {
        documentRootType,
        xsdPath: status.xsdPath,
        xsdHash: status.xsdHash,
        schematronPath: status.schematronPath,
        schematronHash: status.schematronHash,
        officialSchemaReady: status.officialSchemaReady,
        officialSchematronReady: status.officialSchematronReady,
      };
    });
    const validators = [
      resolveValidator({
        type: "XSD",
        commandKey: "EDOCUMENT_XSD_VALIDATOR_COMMAND",
        argsKey: "EDOCUMENT_XSD_VALIDATOR_ARGS",
      }),
      resolveValidator({
        type: "SCHEMATRON",
        commandKey: "EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND",
        argsKey: "EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS",
      }),
    ];

    return {
      schemaVersion: UBL_TR_SCHEMA_VERSION,
      capturedAt: new Date().toISOString(),
      schemas,
      validators,
      evidenceReady: schemas.every((item) => item.officialSchemaReady && item.officialSchematronReady) && validators.every((item) => item.evidenceReady),
    };
  }
}

export const eDocumentValidatorOperationsService = new EDocumentValidatorOperationsService();
