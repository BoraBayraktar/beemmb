import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { identityAdminService } from "@/modules/identity/services/identity-admin.service";
import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { RbacPolicyError } from "@/modules/identity/services/rbac.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = (searchParams.get("role") as "ADMIN" | "EDITOR" | "CUSTOMER" | null) ?? undefined;
    const user = await requirePermission(roleFilter === "CUSTOMER" ? "customers.manage" : "systemUsers.manage");

    const users = await identityAdminService.listUsers({
      search: searchParams.get("search") ?? undefined,
      role: roleFilter,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
    }, user.tenantId);

    return NextResponse.json(users);
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

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const targetRole = payload?.role as "ADMIN" | "EDITOR" | "CUSTOMER" | undefined;
    const user = await requirePermission(targetRole === "CUSTOMER" ? "customers.manage" : "systemUsers.manage");
    const created = await identityAdminService.createUser(payload, user.id, user.tenantId);
    await auditLogService.recordFromRequest(request, {
      entityType: "USER",
      entityId: created.id,
      action: "CREATE",
      actorUserId: user.id,
      tenantId: user.tenantId,
      summary: `Kullanıcı oluşturuldu: ${created.email}`,
    });
    await auditLogService.recordFromRequest(request, {
      entityType: "AUTH",
      entityId: created.id,
      action: "PERMISSION_CHANGE",
      actorUserId: user.id,
      tenantId: user.tenantId,
      summary: `Kullanıcı yetkisi tanımlandı: ${created.email}`,
      metadata: {
        targetRole: created.role,
        targetRoleIds: payload.roleIds ?? [],
      },
    });
    return NextResponse.json({ item: created }, { status: 201 });
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
