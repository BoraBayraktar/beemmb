import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logError } from "@/lib/observability";
import { AuthContextError, requirePlatformOperator } from "@/modules/identity/services/auth-context.service";
import { PlatformPolicyError, platformService } from "@/modules/platform/services/platform.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    await requirePlatformOperator();
    const tenants = await platformService.listTenants();
    return NextResponse.json({ items: tenants });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    logError("Tenant listesi yüklenemedi", { scope: "platform.tenants", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ message: "Tenant listesi yüklenirken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformOperator();
    const payload = await request.json();
    const { tenant, adminUser } = await platformService.provisionTenant(payload, user.id);
    await auditLogService.recordFromRequest(request, {
      entityType: "TENANT",
      entityId: tenant.id,
      action: "CREATE",
      actorUserId: user.id,
      tenantId: tenant.id,
      summary: `Tenant oluşturuldu: ${tenant.name} (${tenant.slug})`,
      metadata: { slug: tenant.slug, adminUserEmail: adminUser.email },
    });

    return NextResponse.json({ item: { tenant, adminUser } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof PlatformPolicyError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    logError("Tenant oluşturulamadı", {
      scope: "platform.tenants",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ message: "Tenant oluşturulurken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin veya sistem yöneticinize başvurun." }, { status: 500 });
  }
}
