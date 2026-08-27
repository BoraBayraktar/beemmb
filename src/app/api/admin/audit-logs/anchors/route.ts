import { NextResponse } from "next/server";

import { AuthContextError, requirePlatformOperator } from "@/modules/identity/services/auth-context.service";
import { auditAnchorService } from "@/modules/system/services/audit-anchor.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    // AuditAnchor/hash-chain PLATFORM-GENELI (tenant-siz) bir yapidir --
    // tek bir tenant'in denetciliginin coklu-tenant zinciri icin anchor
    // olusturmasi dogru degil, bu yuzden platform operatorleriyle
    // sinirlandirilir.
    const user = await requirePlatformOperator();
    const payload = await request.json();
    const anchor = await auditAnchorService.createDailyAnchor({
      startDate: payload.startDate,
      endDate: payload.endDate,
      createdByUserId: user.id,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "AUTH",
      action: "AUDIT_EXPORT",
      actorUserId: user.id,
      summary: "Audit anchor oluşturuldu",
      metadata: {
        anchorId: anchor.id,
        manifestHash: anchor.manifestHash,
        periodStart: anchor.periodStart,
        periodEnd: anchor.periodEnd,
        storageMode: anchor.storageMode,
      },
    });

    return NextResponse.json({ item: anchor }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
