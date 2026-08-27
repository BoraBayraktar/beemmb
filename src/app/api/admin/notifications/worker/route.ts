import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { notificationService } from "@/modules/system/services/notification.service";

export async function POST(request: Request) {
  try {
    return await requirePermission("users.manage", async () => {
      const payload = await request.json().catch(() => ({}));
      const result = await notificationService.processEmailQueue(payload);
      return NextResponse.json(result);
    });
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
