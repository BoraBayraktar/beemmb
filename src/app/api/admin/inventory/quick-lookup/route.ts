import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";

export async function GET(request: Request) {
  try {
    await requirePermission("inventoryQuickActions.manage");
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ message: "Arama değeri gerekli." }, { status: 400 });
    }

    const result = await inventoryService.findInventoryItemQuickMatch(query);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
