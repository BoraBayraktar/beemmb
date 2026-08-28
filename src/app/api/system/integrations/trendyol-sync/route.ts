import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isMarketplaceSystemRequestAuthorized } from "@/modules/integration/services/marketplace-system-auth.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { platformService } from "@/modules/platform/services/platform.service";

async function handle(request: Request) {
  if (!isMarketplaceSystemRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    // Sistem cron'u (paylasilan secret, oturumsuz). Pazaryeri entegrasyon
    // config'leri tenant-scoped (Faz 1 / Dalga 15) -- her aktif tenant icin
    // ayri ayri calistirilir, boylece Trendyol'u baglayan HER tenant senkron
    // olur, sadece platform tenant'i degil.
    const outcomes = await platformService.runForEachActiveTenant(() => marketplaceIntegrationService.scheduleActiveTrendyolImports({
      processQueue: searchParams.get("processQueue") !== "false",
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 20,
      followUpBatches: searchParams.get("followUpBatches") !== "false",
      batchLimit: searchParams.get("batchLimit") ? Number(searchParams.get("batchLimit")) : undefined,
      batchMinCheckIntervalMinutes: searchParams.get("batchMinCheckIntervalMinutes")
        ? Number(searchParams.get("batchMinCheckIntervalMinutes"))
        : undefined,
    }));

    return NextResponse.json({ tenants: outcomes });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
// AUDIT_EXEMPT_REASON: Sistem cron endpointi; entegrasyon job geçmişi teknik iz olarak tutulur.
