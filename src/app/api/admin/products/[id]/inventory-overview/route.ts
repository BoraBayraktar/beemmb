import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";

/**
 * Stok Kartı'nın "Depo Stokları"/"Hareketler" sekmeleri için tek ürünün
 * depo dağılımını döner. Bilinçli olarak `products.read` ile korunur (yeni bir
 * `inventoryProducts.read` gerekliliği koymaz) -- temel stok görünürlüğü her
 * `products` entitlement'lı tenant'a dahildir; derin envanter işlemleri
 * (transfer/sayım/düzeltme) ayrı `/api/admin/inventory/*` route'larında
 * `inventory`/`inventoryQuickActions` iznine bağlı kalır.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("products.read", async () => {
      const { id } = await context.params;
      const items = await inventoryService.getInventoryOverviewItemsForProduct(id);
      return NextResponse.json({ items });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
