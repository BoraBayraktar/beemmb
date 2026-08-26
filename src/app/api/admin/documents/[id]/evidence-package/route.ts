import { NextResponse } from "next/server";

import {
  buildDocumentEvidencePackageAuditMetadata,
  buildDocumentEvidencePackageHeaders,
  documentEvidencePackageErrorJson,
} from "@/lib/document-evidence-package-response";
import { documentEvidencePackageService } from "@/modules/documents/services/document-evidence-package.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("documents.manage", async (user) => {
      const { id } = await context.params;
      const evidencePackage = await documentEvidencePackageService.buildPackage(id);

      await auditLogService.recordFromRequest(request, {
        entityType: "BUSINESS_DOCUMENT",
        entityId: id,
        action: "AUDIT_EXPORT",
        actorUserId: user.id,
        summary: "E-belge kanıt paketi dışa aktarıldı",
        metadata: buildDocumentEvidencePackageAuditMetadata(evidencePackage),
      });

      return new NextResponse(JSON.stringify(evidencePackage, null, 2), {
        status: 200,
        headers: buildDocumentEvidencePackageHeaders(evidencePackage),
      });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return documentEvidencePackageErrorJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message === "DOCUMENT_NOT_FOUND") {
      return documentEvidencePackageErrorJson({ message: "Belge bulunamadı." }, { status: 404 });
    }

    return documentEvidencePackageErrorJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
