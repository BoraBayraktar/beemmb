import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requirePermission, AuthContextError } from "@/modules/identity/services/auth-context.service";
import { RbacPolicyError, rbacService } from "@/modules/identity/services/rbac.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    await requirePermission("roles.manage");
    const [roles, permissions] = await Promise.all([
      rbacService.listRoles(),
      rbacService.listPermissions(),
    ]);

    return NextResponse.json({ roles, permissions });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("roles.manage");
    const payload = await request.json();
    const role = await rbacService.createRole(payload);
    await auditLogService.recordFromRequest(request, {
      entityType: "AUTH",
      entityId: role.id,
      action: "PERMISSION_CHANGE",
      actorUserId: user.id,
      summary: `Rol oluşturuldu: ${role.name}`,
      metadata: { roleKey: role.key, permissionKeys: role.permissionKeys },
    });

    return NextResponse.json({ item: role }, { status: 201 });
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
