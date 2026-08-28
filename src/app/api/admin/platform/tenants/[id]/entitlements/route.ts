import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePlatformOperator } from "@/modules/identity/services/auth-context.service";
import { platformService } from "@/modules/platform/services/platform.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformOperator();
    const { id } = await context.params;
    const [entitlements, modules] = await Promise.all([
      platformService.listEntitlements(id),
      platformService.listModuleCatalog(),
    ]);

    return NextResponse.json({ items: entitlements, modules });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePlatformOperator();
    const { id } = await context.params;
    const payload = await request.json();
    const entitlement = await platformService.setEntitlement({
      ...payload,
      tenantId: id,
      grantedByUserId: user.id,
    });
    await auditLogService.recordFromRequest(request, {
      entityType: "TENANT",
      entityId: id,
      action: "PERMISSION_CHANGE",
      actorUserId: user.id,
      tenantId: id,
      summary: `Tenant modül entitlement değişti: ${entitlement.moduleKey} → ${entitlement.isEnabled ? "açık" : "kapalı"}`,
      metadata: { moduleKey: entitlement.moduleKey, isEnabled: entitlement.isEnabled },
    });

    return NextResponse.json({ item: entitlement });
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
