import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePlatformOperator } from "@/modules/identity/services/auth-context.service";
import { platformService } from "@/modules/platform/services/platform.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformOperator();
    const { id } = await context.params;
    const [tenant, entitlements] = await Promise.all([
      platformService.getTenant(id),
      platformService.listEntitlements(id),
    ]);

    if (!tenant) {
      return NextResponse.json({ message: "Tenant bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ item: tenant, entitlements });
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
    const tenant = await platformService.updateTenant({ ...payload, id });
    await auditLogService.recordFromRequest(request, {
      entityType: "TENANT",
      entityId: tenant.id,
      action: "UPDATE",
      actorUserId: user.id,
      tenantId: tenant.id,
      summary: `Tenant güncellendi: ${tenant.name}`,
      metadata: { status: tenant.status },
    });

    return NextResponse.json({ item: tenant });
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
