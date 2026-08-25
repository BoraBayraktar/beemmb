import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { CommerceOrderAdminError, commerceService } from "@/modules/commerce/services/commerce.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("orders.read", async () => {
      const { id } = await context.params;
      const order = await commerceService.getOrderById(id);
      return NextResponse.json(order);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof CommerceOrderAdminError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("orders.manage", async (user) => {
      const { id } = await context.params;
      const payload = await request.json();
      const updated = await commerceService.updateOrderStatus({ id, changedByUserId: user.id, ...payload });
      await auditLogService.recordFromRequest(request, {
        entityType: "ORDER",
        entityId: id,
        action: "STATUS_UPDATE",
        actorUserId: user.id,
        summary: `Sipariş durumu güncellendi: ${updated.status} / ${updated.paymentStatus}`,
      });
      return NextResponse.json({ item: updated });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof CommerceOrderAdminError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await requirePermission("orders.manage", async (user) => {
      const { id } = await context.params;
      await commerceService.softDeleteOrder(id, user.id);
      await auditLogService.recordFromRequest(request, {
        entityType: "ORDER",
        entityId: id,
        action: "DELETE",
        actorUserId: user.id,
        summary: "Sipariş silindi",
      });
      return NextResponse.json({ ok: true });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof CommerceOrderAdminError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
