import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logError } from "@/lib/observability";
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

    logError("Tenant entitlement listesi yüklenemedi", { scope: "platform.tenants.entitlements", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ message: "Modül yetkileri yüklenirken beklenmeyen bir hata oluştu." }, { status: 500 });
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
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    logError("Tenant modül yetkisi güncellenemedi", { scope: "platform.tenants.entitlements", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ message: "Modül yetkisi güncellenirken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
