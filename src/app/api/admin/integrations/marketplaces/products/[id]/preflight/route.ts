import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { hepsiburadaProductSyncService } from "@/modules/integration/services/hepsiburada-product-sync.service";
import { n11ProductSyncService } from "@/modules/integration/services/n11-product-sync.service";
import { pazaramaProductSyncService } from "@/modules/integration/services/pazarama-product-sync.service";
import { trendyolProductSyncService } from "@/modules/integration/services/trendyol-product-sync.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("integrations.read", async () => {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const channel = (searchParams.get("channel") as "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA" | null) ?? "TRENDYOL";
      const result = channel === "N11"
        ? await n11ProductSyncService.preflightProduct(id)
        : channel === "PAZARAMA"
          ? await pazaramaProductSyncService.preflightProduct(id)
        : channel === "HEPSIBURADA"
          ? await hepsiburadaProductSyncService.preflightProduct(id)
          : await trendyolProductSyncService.preflightProduct(id);
      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && (error.message === "TRENDYOL_PRODUCT_SYNC_PRODUCT_NOT_FOUND" || error.message === "N11_PRODUCT_SYNC_PRODUCT_NOT_FOUND" || error.message === "PAZARAMA_PRODUCT_SYNC_PRODUCT_NOT_FOUND" || error.message === "HEPSIBURADA_PRODUCT_SYNC_PRODUCT_NOT_FOUND")) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
