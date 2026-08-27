import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/lib/auth";
import { identityService } from "@/modules/identity/services/identity.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? cookieStore.get(LEGACY_AUTH_COOKIE_NAME)?.value;
    const user = await identityService.getAuthenticatedUser(token);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    await identityService.changePassword({
      userId: user.id,
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "AUTH",
      entityId: user.id,
      action: "PASSWORD_RESET_COMPLETE",
      actorUserId: user.id,
      actorType: "USER",
      tenantId: user.tenantId,
      summary: `Kullanıcı şifresini değiştirdi: ${user.email}`,
      metadata: {
        flow: "AUTHENTICATED_CHANGE_PASSWORD",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "CURRENT_PASSWORD_INVALID") {
      return NextResponse.json({ message: "Current password invalid" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "PASSWORD_REUSE_NOT_ALLOWED") {
      return NextResponse.json({ message: "Password reuse not allowed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
