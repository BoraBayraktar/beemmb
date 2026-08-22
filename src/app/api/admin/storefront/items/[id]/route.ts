import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { storefrontService } from "@/modules/storefront/services/storefront.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("storefront.manage");
    const { id } = await context.params;
    const payload = await request.json();
    const item = await storefrontService.upsertItem({ id, ...payload });
    await auditLogService.recordFromRequest(request, {
      entityType: "STOREFRONT_ITEM",
      entityId: item.id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: `Mağaza içeriği güncellendi: ${item.section}`,
    });
    return NextResponse.json({ item });
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
    const user = await requirePermission("storefront.manage");
    const { id } = await context.params;
    await storefrontService.softDeleteItem(id, user.id);
    await auditLogService.recordFromRequest(request, {
      entityType: "STOREFRONT_ITEM",
      entityId: id,
      action: "DELETE",
      actorUserId: user.id,
      summary: "Mağaza içeriği silindi",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
