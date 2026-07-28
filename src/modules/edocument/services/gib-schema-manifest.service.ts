import crypto from "crypto";
import fs from "fs";
import path from "path";

import type { AdminBusinessDocumentXmlRootType } from "@/modules/edocument/contracts/edocument.contract";
import { UBL_TR_SCHEMA_VERSION } from "@/modules/edocument/services/ubl-xml.util";

const schemaRoot = path.join(process.cwd(), "src/modules/edocument/schemas/gib/ubl-tr-1.2.1");

const manifest: Record<AdminBusinessDocumentXmlRootType, {
  xsdPath: string;
  schematronPath: string;
}> = {
  INVOICE: {
    xsdPath: path.join(schemaRoot, "xsdrt/maindoc/UBL-Invoice-2.1.xsd"),
    schematronPath: path.join(schemaRoot, "schematron/UBL-TR_Main_Schematron.xml"),
  },
  DESPATCH_ADVICE: {
    xsdPath: path.join(schemaRoot, "xsdrt/maindoc/UBL-DespatchAdvice-2.1.xsd"),
    schematronPath: path.join(schemaRoot, "schematron/UBL-TR_Main_Schematron.xml"),
  },
};

function hashFileIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export class GIBSchemaManifestService {
  getStatus(documentRootType: AdminBusinessDocumentXmlRootType) {
    const item = manifest[documentRootType];
    const xsdHash = hashFileIfExists(item.xsdPath);
    const schematronHash = hashFileIfExists(item.schematronPath);

    return {
      schemaVersion: UBL_TR_SCHEMA_VERSION,
      xsdPath: item.xsdPath,
      xsdHash,
      schematronPath: item.schematronPath,
      schematronHash,
      officialSchemaReady: xsdHash !== null,
      officialSchematronReady: schematronHash !== null,
    };
  }
}

export const gibSchemaManifestService = new GIBSchemaManifestService();
