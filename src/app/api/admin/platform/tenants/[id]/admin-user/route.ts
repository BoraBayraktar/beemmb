import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logError } from "@/lib/observability";
import { AuthContextError, requirePlatformOperator } from "@/modules/identity/services/auth-context.service";
import { PlatformPolicyError, platformService } from "@/modules/platform/services/platform.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformOperator();
    const { id } = await context.params;
    const items = await platformService.getTenantAdminUsers(id);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    logError("Tenant yönetici kullanıcıları yüklenemedi", { scope: "platform.tenants.admin-user", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ message: "Yönetici kullanıcı bilgileri yüklenirken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePlatformOperator();
    const { id } = await context.params;
    const payload = await request.json();
    await platformService.resetAdminUserPassword({ ...payload, tenantId: id });

    await auditLogService.recordFromRequest(request, {
      entityType: "TENANT",
      entityId: id,
      action: "PERMISSION_CHANGE",
      actorUserId: user.id,
      tenantId: id,
      summary: "Tenant yönetici kullanıcısının şifresi sıfırlandı",
      metadata: { userId: payload?.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof PlatformPolicyError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    logError("Tenant yönetici şifresi sıfırlanamadı", { scope: "platform.tenants.admin-user", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ message: "Şifre sıfırlanırken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
