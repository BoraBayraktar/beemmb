import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("productQuestions.manage");
    const { id } = await context.params;
    const payload = await request.json();

    const updated = await catalogAdminService.answerProductQuestion({
      id,
      answer: payload.answer,
      answeredBy: user.name,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "PRODUCT",
      entityId: id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: `Ürün sorusu yanıtlandı: ${updated.productSlug}`,
    });

    return NextResponse.json({ item: updated });
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("productQuestions.manage");
    const { id } = await context.params;

    await catalogAdminService.softDeleteProductQuestion(id, user.id);

    await auditLogService.recordFromRequest(request, {
      entityType: "PRODUCT",
      entityId: id,
      action: "DELETE",
      actorUserId: user.id,
      summary: "Ürün sorusu moderasyon ile kaldırıldı",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
