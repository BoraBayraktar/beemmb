import { NextResponse } from "next/server";

import { catalogImportService } from "@/modules/catalog/services/catalog-import.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    return await requirePermission("products.manage", async (user) => {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ message: "İçe aktarmak için Excel veya CSV dosyası gereklidir." }, { status: 400 });
      }

      const filename = file.name.toLocaleLowerCase("tr-TR");
      const result = filename.endsWith(".xlsx")
        ? await catalogImportService.importProductsFromXlsx(await file.arrayBuffer())
        : await catalogImportService.importProductsFromText(await file.text());

      await auditLogService.recordFromRequest(request, {
        entityType: "PRODUCT",
        action: "IMPORT",
        actorUserId: user.id,
        summary: `ÜRÜN_İÇE_AKTARIM | ${result.createdCount} ürün oluşturuldu`,
        metadata: {
          scope: "product_import",
          createdCount: result.createdCount,
          failedCount: result.failedCount,
          validatedCount: result.validatedCount ?? 0,
        },
      });

      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
