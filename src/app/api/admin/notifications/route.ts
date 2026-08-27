import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { notificationService } from "@/modules/system/services/notification.service";

export async function GET(request: Request) {
  try {
    return await requirePermission("admin.access", async (user) => {
      const { searchParams } = new URL(request.url);

      const result = await notificationService.listInAppForUser({
        userId: user.id,
        unreadOnly: searchParams.get("unreadOnly") === "1",
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 8,
      });

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
