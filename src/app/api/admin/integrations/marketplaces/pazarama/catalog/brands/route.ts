import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";

export async function GET(request: Request) {
  try {
    return await requirePermission("integrationsPazarama.manage", async () => {
      const { searchParams } = new URL(request.url);
      const result = await marketplaceIntegrationService.searchPazaramaBrands({
        query: searchParams.get("query") ?? "",
      });

      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "PAZARAMA_CONFIG_NOT_FOUND") {
      return NextResponse.json({ message: "Pazarama config not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "PAZARAMA_CONFIG_INCOMPLETE") {
      return NextResponse.json({ message: "Pazarama config is incomplete" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
