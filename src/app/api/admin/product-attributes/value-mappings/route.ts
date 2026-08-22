import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(request: Request) {
  try {
    await requirePermission("productAttributes.manage");
    const { searchParams } = new URL(request.url);
    const channel = (searchParams.get("channel") as "TRENDYOL" | "N11" | "EDOCS_MOCK" | null) ?? "TRENDYOL";
    const items = await catalogAdminService.listAttributeValueMarketplaceMappings(channel);
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
    const user = await requirePermission("productAttributes.manage");
    const payload = await request.json();
    const item = await catalogAdminService.upsertAttributeValueMarketplaceMapping(payload);
    await auditLogService.recordFromRequest(request, {
      entityType: "PRODUCT_ATTRIBUTE",
      entityId: item.id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: "Ürün özellik pazaryeri değer eşlemesi kaydedildi",
      metadata: {
        channel: item.channel,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "Attribute definition not found") {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
