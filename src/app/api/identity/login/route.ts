import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, AUTH_TOKEN_REMEMBER_ME_TTL_SECONDS, AUTH_TOKEN_TTL_SECONDS } from "@/lib/auth";
import { identityService } from "@/modules/identity/services/identity.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

function maskEmail(value: unknown) {
  if (typeof value !== "string" || !value.includes("@")) {
    return null;
  }

  const [name, domain] = value.toLowerCase().split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

export async function POST(request: Request) {
  const payload = await request.json();
  const maxAge = payload?.rememberMe ? AUTH_TOKEN_REMEMBER_ME_TTL_SECONDS : AUTH_TOKEN_TTL_SECONDS;

  const result = await identityService.login(payload);
  if (!result) {
    await auditLogService.recordFromRequest(request, {
      entityType: "AUTH",
      action: "LOGIN_FAILED",
      actorType: "SYSTEM",
      summary: "Başarısız giriş denemesi",
      metadata: {
        emailMasked: maskEmail(payload?.email),
      },
    });
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  await auditLogService.recordFromRequest(request, {
    entityType: "AUTH",
    entityId: result.user.id,
    action: "LOGIN",
    actorUserId: result.user.id,
    tenantId: result.user.tenantId,
    summary: `Kullanıcı giriş yaptı: ${result.user.email}`,
    metadata: {
      role: result.user.role,
      rememberMe: Boolean(payload?.rememberMe),
    },
  });

  const canAccessAdmin = await rbacService.hasPermission(result.user, "admin.access");
  const response = NextResponse.json({ user: result.user, canAccessAdmin });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: result.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  return response;
}
