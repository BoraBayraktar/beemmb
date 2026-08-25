import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
    return await requirePermission("products.manage", async (user) => {
      const { id } = await context.params;
      const payload = await request.json();
      const updated = await catalogAdminService.updateProductVariants({
        productId: id,
        attributeLinks: payload.attributeLinks ?? [],
        variants: payload.variants ?? [],
      });

      await auditLogService.recordFromRequest(request, {
        entityType: "PRODUCT",
        entityId: updated.id,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Ürün varyantları güncellendi: ${updated.slug}`,
      });

      return NextResponse.json({ item: updated });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Mükerrer SKU veya slug kullanılamaz." }, { status: 409 });
    }

    if (error instanceof Error && error.message === "Product not found") {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
