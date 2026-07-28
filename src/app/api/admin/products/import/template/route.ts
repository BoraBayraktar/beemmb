import { NextResponse } from "next/server";

import { catalogImportService } from "@/modules/catalog/services/catalog-import.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("products.read");
    const content = await catalogImportService.buildProductImportTemplate();

    await auditLogService.recordFromRequest(request, {
      entityType: "PRODUCT",
      action: "EXPORT",
      actorUserId: user.id,
      summary: "ÜRÜN_IMPORT_ŞABLONU | Excel şablonu indirildi",
      metadata: {
        scope: "product_import_template",
      },
    });

    return new NextResponse(Buffer.from(content), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"2bem-product-import-template.xlsx\"",
      },
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Product import template download failed", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
