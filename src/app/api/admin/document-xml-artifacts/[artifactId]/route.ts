import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { sanitizeAttachmentFileName } from "@/lib/attachment-file-name";
import { noStoreJson } from "@/lib/no-store-json-response";
import { eDocumentService, EDocumentError } from "@/modules/edocument/services/edocument.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

type XmlArtifactDownloadItem = Awaited<ReturnType<typeof eDocumentService.getXmlArtifact>>;

export function buildXmlArtifactAuditMetadata(item: XmlArtifactDownloadItem) {
  return {
    artifactId: item.id,
    documentRootType: item.documentRootType,
    schemaVersion: item.schemaVersion,
    xmlHash: item.xmlHash,
    xsdHash: item.xsdHash,
    schematronHash: item.schematronHash,
    validationStatus: item.validationStatus,
  };
}

export function buildXmlArtifactDownloadHeaders(item: XmlArtifactDownloadItem) {
  const safeArtifactId = sanitizeAttachmentFileName(item.id);

  const headers = new Headers({
    "Content-Type": "application/xml; charset=utf-8",
    "Content-Disposition": `attachment; filename="${item.documentRootType.toLowerCase()}-${safeArtifactId}.xml"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-BEEMMB-XML-Hash": item.xmlHash,
    "X-BEEMMB-Schema-Version": item.schemaVersion,
  });
  if (item.xsdHash) {
    headers.set("X-BEEMMB-XSD-Hash", item.xsdHash);
  }
  if (item.schematronHash) {
    headers.set("X-BEEMMB-Schematron-Hash", item.schematronHash);
  }

  return headers;
}

export function xmlArtifactErrorJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export async function GET(request: Request, context: { params: Promise<{ artifactId: string }> }) {
  try {
    const user = await requirePermission("documents.read");
    const { artifactId } = await context.params;
    const item = await eDocumentService.getXmlArtifact(artifactId);

    await auditLogService.recordFromRequest(request, {
      entityType: "BUSINESS_DOCUMENT",
      entityId: item.businessDocumentId,
      action: "AUDIT_EXPORT",
      actorUserId: user.id,
      summary: `UBL-TR XML indirildi: ${item.documentRootType}`,
      metadata: buildXmlArtifactAuditMetadata(item),
    });

    return new NextResponse(item.xmlContent ?? "", {
      headers: buildXmlArtifactDownloadHeaders(item),
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return xmlArtifactErrorJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof EDocumentError) {
      return xmlArtifactErrorJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return xmlArtifactErrorJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return xmlArtifactErrorJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
