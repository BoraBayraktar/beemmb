import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  buildXmlArtifactAuditMetadata,
  buildXmlArtifactDownloadHeaders,
  xmlArtifactErrorJson,
} from "@/lib/xml-artifact-download-response";
import { eDocumentService, EDocumentError } from "@/modules/edocument/services/edocument.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

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
