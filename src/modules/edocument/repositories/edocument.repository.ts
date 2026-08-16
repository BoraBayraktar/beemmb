import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class EDocumentRepository {
  async findBusinessDocumentForXml(id: string) {
    return prisma.businessDocument.findFirst({
      where: { id, deleted: false },
      include: {
        lines: { orderBy: { createdAt: "asc" } },
        order: {
          select: {
            carrierCompany: {
              select: {
                name: true,
                taxNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async createXmlArtifact(args: {
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
  }) {
    return prisma.businessDocumentXmlArtifact.create({
      data: {
        businessDocumentId: args.businessDocumentId,
        supersedesArtifactId: args.supersedesArtifactId ?? null,
        documentRootType: args.documentRootType,
        schemaVersion: args.schemaVersion,
        xsdHash: args.xsdHash ?? null,
        schematronHash: args.schematronHash ?? null,
        xmlContent: args.xmlContent,
        xmlHash: args.xmlHash,
        validationStatus: args.validationStatus,
        validationErrors: args.validationErrors.length > 0 ? args.validationErrors : Prisma.JsonNull,
        validatedAt: args.validationStatus === "NOT_VALIDATED" ? null : new Date(),
      },
    });
  }

  async listXmlArtifacts(businessDocumentId: string) {
    return prisma.businessDocumentXmlArtifact.findMany({
      where: { businessDocumentId },
      orderBy: { generatedAt: "desc" },
    });
  }

  async findXmlArtifactById(id: string) {
    return prisma.businessDocumentXmlArtifact.findFirst({
      where: { id },
    });
  }

  async findXmlArtifactByHash(args: {
    businessDocumentId: string;
    xmlHash: string;
  }) {
    return prisma.businessDocumentXmlArtifact.findFirst({
      where: {
        businessDocumentId: args.businessDocumentId,
        xmlHash: args.xmlHash,
      },
      orderBy: { generatedAt: "desc" },
    });
  }

  async findLatestValidXmlArtifact(businessDocumentId: string) {
    return prisma.businessDocumentXmlArtifact.findFirst({
      where: {
        businessDocumentId,
        validationStatus: "VALID",
      },
      orderBy: { generatedAt: "desc" },
    });
  }

  async findLatestXmlArtifact(businessDocumentId: string) {
    return prisma.businessDocumentXmlArtifact.findFirst({
      where: { businessDocumentId },
      orderBy: { generatedAt: "desc" },
    });
  }
}
