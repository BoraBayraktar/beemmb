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
    return await requirePermission("products.read", async () => {
      const { searchParams } = new URL(request.url);
      const products = await catalogAdminService.listProducts({
        search: searchParams.get("search") ?? undefined,
        categoryId: searchParams.get("categoryId") ?? undefined,
        status: searchParams.get("status") as "all" | "DRAFT" | "ACTIVE" | "ARCHIVED" | null ?? undefined,
        brandId: searchParams.get("brandId") ?? undefined,
        supplierId: searchParams.get("supplierId") ?? undefined,
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
      });
      return NextResponse.json(products);
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

export async function POST(request: Request) {
  try {
    return await requirePermission("products.manage", async (user) => {
      const payload = await request.json();
      const created = await catalogAdminService.createProduct(payload);
      await auditLogService.recordFromRequest(request, {
        entityType: "PRODUCT",
        entityId: created.id,
        action: "CREATE",
        actorUserId: user.id,
        summary: `Ürün oluşturuldu: ${created.slug}`,
      });
      return NextResponse.json({ item: created }, { status: 201 });
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
