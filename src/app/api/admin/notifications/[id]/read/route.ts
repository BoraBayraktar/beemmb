import { NextResponse } from "next/server";

import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { notificationService } from "@/modules/system/services/notification.service";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("admin.access", async (user) => {
      const { id } = await context.params;
      await notificationService.markAsRead(id, user.id);
      return NextResponse.json({ ok: true });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
