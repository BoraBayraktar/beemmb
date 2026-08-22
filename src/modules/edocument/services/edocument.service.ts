import { z } from "zod";
import { Prisma, type BusinessDocumentXmlArtifact } from "@prisma/client";

import type {
  AdminBusinessDocumentXmlArtifactItem,
  GenerateBusinessDocumentXmlInput,
  GenerateBusinessDocumentXmlResult,
  UblBusinessDocumentInput,
} from "@/modules/edocument/contracts/edocument.contract";
import { EDocumentRepository } from "@/modules/edocument/repositories/edocument.repository";
import { eDocumentSenderConfigService } from "@/modules/edocument/services/edocument-sender-config.service";
import { eDocumentShipmentConfigService } from "@/modules/edocument/services/edocument-shipment-config.service";
import { eDocumentTaxConfigService } from "@/modules/edocument/services/edocument-tax-config.service";
import { gibSchemaManifestService } from "@/modules/edocument/services/gib-schema-manifest.service";
import { ublDespatchBuilderService } from "@/modules/edocument/services/ubl-despatch-builder.service";
import { ublInvoiceBuilderService } from "@/modules/edocument/services/ubl-invoice-builder.service";
import { buildDeterministicUuid, hashXml, UBL_TR_SCHEMA_VERSION } from "@/modules/edocument/services/ubl-xml.util";
import { ublValidationService } from "@/modules/edocument/services/ubl-validation.service";

const generateSchema = z.object({
  businessDocumentId: z.string().trim().min(1),
  validate: z.boolean().optional(),
});

type BusinessDocumentForXml = Prisma.BusinessDocumentGetPayload<{
  include: {
    lines: true;
    order: {
      select: {
        carrierCari: {
          select: {
            name: true;
            taxNumber: true;
          };
        };
      };
    };
  };
}>;

export class EDocumentError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "EDocumentError";
  }
}

function toNumber(value: { toNumber: () => number } | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" ? value : value.toNumber();
}

function mapArtifact(item: BusinessDocumentXmlArtifact, includeXml = false, isCurrent = false): AdminBusinessDocumentXmlArtifactItem {
  const validationErrors = Array.isArray(item.validationErrors)
    ? item.validationErrors.filter((error): error is string => typeof error === "string")
    : [];

  return {
    id: item.id,
    businessDocumentId: item.businessDocumentId,
    supersedesArtifactId: item.supersedesArtifactId,
    documentRootType: item.documentRootType,
    schemaVersion: item.schemaVersion,
    xsdHash: item.xsdHash,
    schematronHash: item.schematronHash,
    xmlHash: item.xmlHash,
    validationStatus: item.validationStatus,
    validationErrors,
    isCurrent,
    generatedAt: item.generatedAt.toISOString(),
    validatedAt: item.validatedAt ? item.validatedAt.toISOString() : null,
    ...(includeXml ? { xmlContent: item.xmlContent } : {}),
  };
}

function mapDocument(item: BusinessDocumentForXml): UblBusinessDocumentInput {
  if (item.documentType !== "E_INVOICE" && item.documentType !== "E_DISPATCH") {
    throw new EDocumentError("Yalnızca e-fatura ve e-irsaliye için UBL-TR XML üretilebilir.", 400);
  }

  return {
    id: item.id,
    uuid: buildDeterministicUuid(`${item.documentType}:${item.documentNumber}:${item.id}`),
    documentNumber: item.documentNumber,
    documentType: item.documentType,
    issueDate: item.issueDate,
    currency: item.currency,
    totalAmount: toNumber(item.totalAmount),
    counterpartyName: item.counterpartyName,
    counterpartyTaxNumber: item.counterpartyTaxNumber,
    counterpartyTaxOffice: item.counterpartyTaxOffice,
    counterpartyEmail: item.counterpartyEmail,
    counterpartyAddress: item.counterpartyAddress,
    note: item.note,
    sender: eDocumentSenderConfigService.resolveSender(),
    tax: eDocumentTaxConfigService.resolveTaxConfig(),
    shipment: eDocumentShipmentConfigService.resolveShipment(item.order ? {
      carrierCompanyName: item.order.carrierCari?.name ?? null,
      carrierCompanyTaxNumber: item.order.carrierCari?.taxNumber ?? null,
    } : null),
    lines: item.lines.map((line) => ({
      id: line.id,
      productSku: line.productSku,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: toNumber(line.unitPrice),
      lineTotal: toNumber(line.lineTotal),
      currency: line.currency,
      note: line.note,
    })),
  };
}

export class EDocumentService {
  constructor(private readonly repository: EDocumentRepository) {}

  async listXmlArtifacts(businessDocumentId: string) {
    const items = await this.repository.listXmlArtifacts(z.string().trim().min(1).parse(businessDocumentId));
    const currentArtifactId = items[0]?.id ?? null;
    return items.map((item) => mapArtifact(item, false, item.id === currentArtifactId));
  }

  async getXmlArtifact(id: string) {
    const item = await this.repository.findXmlArtifactById(z.string().trim().min(1).parse(id));
    if (!item) {
      throw new EDocumentError("XML çıktısı bulunamadı.", 404);
    }

    const latest = await this.repository.findLatestXmlArtifact(item.businessDocumentId);
    return mapArtifact(item, true, latest?.id === item.id);
  }

  async getLatestValidXmlArtifact(businessDocumentId: string) {
    const item = await this.repository.findLatestValidXmlArtifact(z.string().trim().min(1).parse(businessDocumentId));
    return item ? mapArtifact(item, false, true) : null;
  }

  async getCurrentValidXmlArtifact(businessDocumentId: string) {
    const item = await this.repository.findLatestXmlArtifact(z.string().trim().min(1).parse(businessDocumentId));
    return item?.validationStatus === "VALID" ? mapArtifact(item, false, true) : null;
  }

  async generateXml(input: GenerateBusinessDocumentXmlInput): Promise<GenerateBusinessDocumentXmlResult> {
    const parsed = generateSchema.parse(input);
    const [item, previousArtifact] = await Promise.all([
      this.repository.findBusinessDocumentForXml(parsed.businessDocumentId),
      this.repository.findLatestXmlArtifact(parsed.businessDocumentId),
    ]);
    if (!item) {
      throw new EDocumentError("Belge bulunamadı.", 404);
    }

    if (!["E_INVOICE", "E_DISPATCH"].includes(item.documentType)) {
      throw new EDocumentError("Yalnızca e-fatura ve e-irsaliye için UBL-TR XML üretilebilir.", 400);
    }

    const document = mapDocument(item);
    const documentRootType = document.documentType === "E_INVOICE" ? "INVOICE" : "DESPATCH_ADVICE";
    const schemaStatus = gibSchemaManifestService.getStatus(documentRootType);
    const xmlContent = document.documentType === "E_INVOICE"
      ? ublInvoiceBuilderService.build(document)
      : ublDespatchBuilderService.build(document);
    const xmlHash = hashXml(xmlContent);
    const existingArtifact = await this.repository.findXmlArtifactByHash({
      businessDocumentId: document.id,
      xmlHash,
    });
    if (existingArtifact) {
      return {
        item: mapArtifact(existingArtifact, true, previousArtifact?.id === existingArtifact.id),
        created: false,
      };
    }

    const complianceReport = parsed.validate === false ? null : ublValidationService.validate(document, xmlContent);
    const validationErrors = complianceReport?.issues.map((issue) => issue.message) ?? [];
    let artifact: BusinessDocumentXmlArtifact;
    let created = true;
    try {
      artifact = await this.repository.createXmlArtifact({
        businessDocumentId: document.id,
        documentRootType,
        schemaVersion: UBL_TR_SCHEMA_VERSION,
        xsdHash: schemaStatus.xsdHash,
        schematronHash: schemaStatus.schematronHash,
        xmlContent,
        xmlHash,
        validationStatus: parsed.validate === false ? "NOT_VALIDATED" : complianceReport?.valid ? "VALID" : "INVALID",
        validationErrors,
        supersedesArtifactId: previousArtifact?.id ?? null,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const duplicate = await this.repository.findXmlArtifactByHash({
          businessDocumentId: document.id,
          xmlHash,
        });

        if (duplicate) {
          artifact = duplicate;
          created = false;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    return {
      item: mapArtifact(artifact, true, true),
      created,
    };
  }

  async getComplianceReport(businessDocumentId: string) {
    const item = await this.repository.findBusinessDocumentForXml(z.string().trim().min(1).parse(businessDocumentId));
    if (!item) {
      throw new EDocumentError("Belge bulunamadı.", 404);
    }

    if (!["E_INVOICE", "E_DISPATCH"].includes(item.documentType)) {
      throw new EDocumentError("Yalnızca e-fatura ve e-irsaliye için GİB uyumluluk raporu üretilebilir.", 400);
    }

    const document = mapDocument(item);
    const xmlContent = document.documentType === "E_INVOICE"
      ? ublInvoiceBuilderService.build(document)
      : ublDespatchBuilderService.build(document);

    return ublValidationService.validate(document, xmlContent);
  }
}

export const eDocumentService = new EDocumentService(new EDocumentRepository());
