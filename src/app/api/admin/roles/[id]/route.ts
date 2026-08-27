import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requirePermission, AuthContextError } from "@/modules/identity/services/auth-context.service";
import { RbacPolicyError, rbacService } from "@/modules/identity/services/rbac.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("roles.manage");
    const { id } = await context.params;
    const payload = await request.json();
    const role = await rbacService.updateRole(id, payload);
    await auditLogService.recordFromRequest(request, {
      entityType: "AUTH",
      entityId: role.id,
      action: "PERMISSION_CHANGE",
      actorUserId: user.id,
      tenantId: user.tenantId,
      summary: `Rol güncellendi: ${role.name}`,
      metadata: { roleKey: role.key, permissionKeys: role.permissionKeys },
    });

    return NextResponse.json({ item: role });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof RbacPolicyError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("roles.manage");
    const { id } = await context.params;
    await rbacService.deleteRole(id, user.id);
    await auditLogService.recordFromRequest(request, {
      entityType: "AUTH",
      entityId: id,
      action: "PERMISSION_CHANGE",
      actorUserId: user.id,
      tenantId: user.tenantId,
      summary: "Rol silindi",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof RbacPolicyError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
