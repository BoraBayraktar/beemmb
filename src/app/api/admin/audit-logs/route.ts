import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";
import { AUDIT_LOG_ACTIONS, AUDIT_LOG_ENTITY_TYPES, type AuditLogAction, type AuditLogEntityType } from "@/modules/system/contracts/audit-log.contract";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return await requirePermission(searchParams.get("export") === "manifest" ? "audit.export" : "audit.read", async (user) => {
      const entityType = AUDIT_LOG_ENTITY_TYPES.includes(searchParams.get("entityType") as AuditLogEntityType)
        ? searchParams.get("entityType") as AuditLogEntityType
        : undefined;
      const action = AUDIT_LOG_ACTIONS.includes(searchParams.get("action") as AuditLogAction)
        ? searchParams.get("action") as AuditLogAction
        : undefined;
      const query = {
        search: searchParams.get("search") ?? undefined,
        entityType,
        action,
        actorUserId: searchParams.get("actorUserId") ?? undefined,
        startDate: searchParams.get("startDate") ?? undefined,
        endDate: searchParams.get("endDate") ?? undefined,
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 20,
      };

      if (searchParams.get("export") === "manifest") {
        const manifest = await auditLogService.exportManifest({
          ...query,
          pageSize: Math.min(query.pageSize, 100),
        });
        await auditLogService.recordFromRequest(request, {
          entityType: "AUTH",
          action: "AUDIT_EXPORT",
          actorUserId: user.id,
          summary: "Audit manifest dışa aktarıldı",
          metadata: {
            manifestHash: manifest.manifestHash,
            recordCount: manifest.recordCount,
            query,
          },
        });

        return new NextResponse(JSON.stringify(manifest, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="audit-manifest-${new Date().toISOString().slice(0, 10)}.json"`,
          },
        });
      }

      const result = await auditLogService.list(query);

      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
