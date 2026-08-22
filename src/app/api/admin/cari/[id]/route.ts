import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { cariService, DuplicateCariSlugError } from "@/modules/cari/services/cari.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("finance.manage");
    const { id } = await context.params;
    const payload = await request.json();
    const updated = await cariService.updateCari({
      id,
      ...payload,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "CARI",
      entityId: updated.id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: `Cari kart güncellendi: ${updated.name}`,
      metadata: {
        scope: "cari",
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof DuplicateCariSlugError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("finance.manage");
    const { id } = await context.params;
    await cariService.deleteCari(id, user.id);

    await auditLogService.recordFromRequest(request, {
      entityType: "CARI",
      entityId: id,
      action: "DELETE",
      actorUserId: user.id,
      summary: "Cari kart silindi",
      metadata: {
        scope: "cari",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
