import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";

export async function GET(request: Request) {
  try {
    return await requirePermission("integrations.read", async () => {
      const { searchParams } = new URL(request.url);
      const channel = (searchParams.get("channel") as "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA" | null) ?? undefined;
      const result = await marketplaceIntegrationService.getDashboard({ channel });
      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
