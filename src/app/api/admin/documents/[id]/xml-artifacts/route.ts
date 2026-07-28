import { ZodError } from "zod";

import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";
import { eDocumentService, EDocumentError } from "@/modules/edocument/services/edocument.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export function buildDocumentXmlArtifactsHeaders() {
  return buildNoStoreHeaders();
}

export function documentXmlArtifactsJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("documents.read");
    const { id } = await context.params;
    const [items, complianceReport] = await Promise.all([
      eDocumentService.listXmlArtifacts(id),
      eDocumentService.getComplianceReport(id).catch((error) => {
        if (error instanceof EDocumentError && error.status === 400) {
          return null;
        }

        throw error;
      }),
    ]);
    return documentXmlArtifactsJson({ items, complianceReport });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return documentXmlArtifactsJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof EDocumentError) {
      return documentXmlArtifactsJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return documentXmlArtifactsJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return documentXmlArtifactsJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("documents.manage");
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const result = await eDocumentService.generateXml({
      businessDocumentId: id,
      validate: payload.validate !== false,
    });
    const { item } = result;

    await auditLogService.recordFromRequest(request, {
      entityType: "BUSINESS_DOCUMENT",
      entityId: item.businessDocumentId,
      action: result.created ? "CREATE" : "SYNC",
      actorUserId: user.id,
      summary: result.created
        ? `UBL-TR XML üretildi: ${item.documentRootType}`
        : `Mevcut UBL-TR XML tekrar kullanıldı: ${item.documentRootType}`,
      metadata: {
        artifactId: item.id,
        created: result.created,
        deduplicated: !result.created,
        documentRootType: item.documentRootType,
        schemaVersion: item.schemaVersion,
        xmlHash: item.xmlHash,
        validationStatus: item.validationStatus,
      },
    });

    return documentXmlArtifactsJson({ item, created: result.created }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return documentXmlArtifactsJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof EDocumentError) {
      return documentXmlArtifactsJson({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return documentXmlArtifactsJson({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return documentXmlArtifactsJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
