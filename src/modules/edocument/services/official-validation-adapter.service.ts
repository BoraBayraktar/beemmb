import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import type {
  AdminBusinessDocumentXmlRootType,
  OfficialValidationAdapterResult,
} from "@/modules/edocument/contracts/edocument.contract";
import { gibSchemaManifestService } from "@/modules/edocument/services/gib-schema-manifest.service";

const VALIDATOR_OUTPUT_LIMIT = 2_000;

export function normalizeValidatorOutput(value: string | null | undefined) {
  const normalized = (value ?? "").trim();

  if (!normalized) {
    return "Bilinmeyen doğrulama hatası";
  }

  if (normalized.length <= VALIDATOR_OUTPUT_LIMIT) {
    return normalized;
  }

  return `${normalized.slice(0, VALIDATOR_OUTPUT_LIMIT)}...`;
}

export function buildValidatorArgs(template: string | undefined, values: Record<string, string>) {
  if (!template?.trim()) {
    return [];
  }

  const args: string[] = [];
  let current = "";
  let quote: "\"" | "'" | null = null;

  for (const character of template.trim()) {
    if ((character === "\"" || character === "'") && quote === null) {
      quote = character;
      continue;
    }

    if (character === quote) {
      quote = null;
      continue;
    }

    if (character === " " && quote === null) {
      if (current.trim()) {
        args.push(current.trim());
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Object.entries(values).reduce(
      (current, [key, value]) => current.replaceAll(`{${key}}`, value),
      item,
    ));
}

function runExternalValidator(args: {
  command: string | undefined;
  argTemplate: string | undefined;
  xmlContent: string;
  schemaPath: string;
  missingEngineCode: "MISSING_VALIDATION_ENGINE";
  failedMessage: string;
}): OfficialValidationAdapterResult {
  if (!args.command?.trim()) {
    return {
      ready: false,
      issues: [{
        code: args.missingEngineCode,
        severity: "ERROR",
        message: "Resmi doğrulama dosyası var ancak validator komutu tanımlı değil.",
        path: args.schemaPath,
      }],
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beemmb-ubl-"));
  const xmlPath = path.join(tempDir, "document.xml");

  try {
    fs.writeFileSync(xmlPath, args.xmlContent, "utf8");
    const result = spawnSync(args.command, buildValidatorArgs(args.argTemplate, {
      xml: xmlPath,
      schema: args.schemaPath,
    }), {
      encoding: "utf8",
      timeout: 30_000,
    });

    if (result.error) {
      return {
        ready: true,
        issues: [{
          code: "OFFICIAL_VALIDATION_FAILED",
          severity: "ERROR",
          message: `${args.failedMessage}: ${normalizeValidatorOutput(result.error.message)}`,
          path: args.schemaPath,
        }],
      };
    }

    if (result.status === 0) {
      return { ready: true, issues: [] };
    }

    return {
      ready: true,
      issues: [{
        code: "OFFICIAL_VALIDATION_FAILED",
        severity: "ERROR",
        message: `${args.failedMessage}: ${normalizeValidatorOutput(result.stderr || result.stdout)}`,
        path: args.schemaPath,
      }],
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export class OfficialValidationAdapterService {
  validateXsd(documentRootType: AdminBusinessDocumentXmlRootType, xmlContent: string): OfficialValidationAdapterResult {
    const schemaStatus = gibSchemaManifestService.getStatus(documentRootType);
    if (!schemaStatus.officialSchemaReady) {
      return {
        ready: false,
        issues: [{
          code: "MISSING_OFFICIAL_SCHEMA",
          severity: "ERROR",
          message: "Resmi GİB UBL-TR XSD dosyası bulunmadığı için tam şema doğrulaması yapılamadı.",
          path: schemaStatus.xsdPath,
        }],
      };
    }

    return runExternalValidator({
      command: process.env.EDOCUMENT_XSD_VALIDATOR_COMMAND,
      argTemplate: process.env.EDOCUMENT_XSD_VALIDATOR_ARGS,
      xmlContent,
      schemaPath: schemaStatus.xsdPath,
      missingEngineCode: "MISSING_VALIDATION_ENGINE",
      failedMessage: "Resmi XSD doğrulaması başarısız",
    });
  }

  validateSchematron(documentRootType: AdminBusinessDocumentXmlRootType, xmlContent: string): OfficialValidationAdapterResult {
    const schemaStatus = gibSchemaManifestService.getStatus(documentRootType);
    if (!schemaStatus.officialSchematronReady) {
      return {
        ready: false,
        issues: [{
          code: "MISSING_OFFICIAL_SCHEMATRON",
          severity: "ERROR",
          message: "Resmi GİB Schematron dosyası bulunmadığı için iş kuralı doğrulaması tamamlanamadı.",
          path: schemaStatus.schematronPath,
        }],
      };
    }

    return runExternalValidator({
      command: process.env.EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND,
      argTemplate: process.env.EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS,
      xmlContent,
      schemaPath: schemaStatus.schematronPath,
      missingEngineCode: "MISSING_VALIDATION_ENGINE",
      failedMessage: "Resmi Schematron doğrulaması başarısız",
    });
  }
}

export const officialValidationAdapterService = new OfficialValidationAdapterService();
