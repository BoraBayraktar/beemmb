import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(request: Request) {
  try {
    await requirePermission("categories.manage");
    const { searchParams } = new URL(request.url);

    const categories = await catalogAdminService.listCategories({
      search: searchParams.get("search") ?? undefined,
      parentId: searchParams.get("parentId") ?? undefined,
      rootOnly: searchParams.get("rootOnly") === "true",
      hasProducts: (searchParams.get("hasProducts") as "all" | "with_products" | "without_products" | null) ?? undefined,
      sort: (searchParams.get("sort") as "updated_desc" | "name_asc" | "name_desc" | "product_count_desc" | null) ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
    });

    return NextResponse.json(categories);
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

export async function POST(request: Request) {
  try {
    const user = await requirePermission("categories.manage");
    const payload = await request.json();
    const created = await catalogAdminService.createCategory(payload);
    await auditLogService.recordFromRequest(request, {
      entityType: "CATEGORY",
      entityId: created.id,
      action: "CREATE",
      actorUserId: user.id,
      summary: `Kategori oluşturuldu: ${created.slug}`,
    });
    return NextResponse.json({ item: created }, { status: 201 });
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
