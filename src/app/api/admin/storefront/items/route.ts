import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { storefrontService } from "@/modules/storefront/services/storefront.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    await requirePermission("storefront.manage");
    const items = await storefrontService.listAdminItems();
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("storefront.manage");
    const payload = await request.json();
    const item = await storefrontService.upsertItem(payload);
    await auditLogService.recordFromRequest(request, {
      entityType: "STOREFRONT_ITEM",
      entityId: item.id,
      action: "CREATE",
      actorUserId: user.id,
      summary: `Mağaza içeriği oluşturuldu: ${item.section}`,
    });
    return NextResponse.json({ item }, { status: 201 });
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
