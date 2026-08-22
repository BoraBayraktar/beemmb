import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";

export async function GET(request: Request) {
  try {
    await requirePermission("integrationsTrendyol.manage");
    const { searchParams } = new URL(request.url);
    const result = await marketplaceIntegrationService.listTrendyolCategoryAttributes({
      categoryId: searchParams.get("categoryId") ?? "",
    });

    return NextResponse.json(result);
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
