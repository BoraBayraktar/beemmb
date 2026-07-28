import { buildNoStoreHeaders, noStoreJson } from "@/lib/no-store-json-response";
import { eDocumentConfigReadinessService } from "@/modules/edocument/services/edocument-config-readiness.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

export function buildEDocumentConfigReadinessHeaders() {
  return buildNoStoreHeaders();
}

export function eDocumentConfigReadinessJson(body: unknown, init?: ResponseInit) {
  return noStoreJson(body, init);
}

export async function GET() {
  try {
    await requirePermission("documents.read");
    return eDocumentConfigReadinessJson({ report: eDocumentConfigReadinessService.getReport() });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return eDocumentConfigReadinessJson({ message: error.message }, { status: error.status });
    }

    return eDocumentConfigReadinessJson({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
