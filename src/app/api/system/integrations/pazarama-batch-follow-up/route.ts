import { NextResponse } from "next/server";

import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import { isMarketplaceSystemRequestAuthorized } from "@/modules/integration/services/marketplace-system-auth.service";
import { pazaramaProductSyncService } from "@/modules/integration/services/pazarama-product-sync.service";

async function handle(request: Request) {
  if (!isMarketplaceSystemRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const result = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: true },
      () => pazaramaProductSyncService.followUpPendingBatches({
        limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
        minCheckIntervalMinutes: searchParams.get("minCheckIntervalMinutes")
          ? Number(searchParams.get("minCheckIntervalMinutes"))
          : undefined,
      }),
    );

    return NextResponse.json(result);
  } catch {
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
