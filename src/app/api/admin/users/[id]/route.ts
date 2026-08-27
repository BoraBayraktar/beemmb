import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  IdentityAdminDeleteError,
  identityAdminService,
} from "@/modules/identity/services/identity-admin.service";
import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { RbacPolicyError } from "@/modules/identity/services/rbac.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

function permissionForRole(role: "ADMIN" | "EDITOR" | "CUSTOMER" | null): "customers.manage" | "systemUsers.manage" {
  return role === "CUSTOMER" ? "customers.manage" : "systemUsers.manage";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const existingRole = await identityAdminService.getUserRole(id);
    const payload = await request.json();
    const nextRole = (payload?.role as "ADMIN" | "EDITOR" | "CUSTOMER" | undefined) ?? existingRole;

    const user = await requirePermission(permissionForRole(existingRole));
    if (nextRole !== existingRole) {
      // Rol, müşteri/personel sınırını aşacak şekilde değişiyorsa hem kaynağın hem hedefin iznine sahip olunmalı.
      await requirePermission(permissionForRole(nextRole));
    }

    const updated = await identityAdminService.updateUser({
      id,
      ...payload,
    }, user.id, user.tenantId);

    await auditLogService.recordFromRequest(request, {
      entityType: "USER",
      entityId: updated.id,
      action: "UPDATE",
      actorUserId: user.id,
      tenantId: user.tenantId,
      summary: `Kullanıcı güncellendi: ${updated.email}`,
    });
    if (payload.role !== undefined || payload.roleIds !== undefined || payload.password !== undefined) {
      await auditLogService.recordFromRequest(request, {
        entityType: "AUTH",
        entityId: updated.id,
        action: "PERMISSION_CHANGE",
        actorUserId: user.id,
        tenantId: user.tenantId,
        summary: `Kullanıcı güvenlik bilgisi güncellendi: ${updated.email}`,
        metadata: {
          roleChanged: payload.role !== undefined,
          rbacRolesChanged: payload.roleIds !== undefined,
          passwordChanged: payload.password !== undefined,
          targetRole: payload.role ?? updated.role,
          targetRoleIds: payload.roleIds ?? updated.roleIds,
        },
      });
    }

    return NextResponse.json({ item: updated });
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const existingRole = await identityAdminService.getUserRole(id);
    const user = await requirePermission(permissionForRole(existingRole));
    await identityAdminService.softDeleteUser(id, user.id);
    await auditLogService.recordFromRequest(request, {
      entityType: "USER",
      entityId: id,
      action: "DELETE",
      actorUserId: user.id,
      tenantId: user.tenantId,
      summary: "Kullanıcı silindi",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof IdentityAdminDeleteError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
