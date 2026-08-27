import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/lib/auth";
import { identityService } from "@/modules/identity/services/identity.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? cookieStore.get(LEGACY_AUTH_COOKIE_NAME)?.value;
  const user = await identityService.getAuthenticatedUser(token);

  await identityService.logout(token);
  await auditLogService.recordFromRequest(request, {
    entityType: "AUTH",
    entityId: user?.id ?? null,
    action: "LOGOUT",
    actorUserId: user?.id ?? null,
    actorType: user ? "USER" : "SYSTEM",
    tenantId: user?.tenantId ?? null,
    summary: user ? `Kullanıcı çıkış yaptı: ${user.email}` : "Oturum çıkışı yapıldı",
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: LEGACY_AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
