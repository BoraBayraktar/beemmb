import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import { isMarketplaceSystemRequestAuthorized } from "@/modules/integration/services/marketplace-system-auth.service";
import { pazaramaStockSyncService } from "@/modules/integration/services/pazarama-stock-sync.service";

async function handle(request: Request) {
  if (!isMarketplaceSystemRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const result = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: true },
      () => pazaramaStockSyncService.followUpPendingListingBatches({
        limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
        minCheckIntervalMinutes: searchParams.get("minCheckIntervalMinutes")
          ? Number(searchParams.get("minCheckIntervalMinutes"))
          : undefined,
      }),
    );

    return NextResponse.json(result);
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
// AUDIT_EXEMPT_REASON: Sistem callback endpointi; entegrasyon job/dead-letter geçmişi teknik iz olarak tutulur.
