import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import { isMarketplaceSystemRequestAuthorized } from "@/modules/integration/services/marketplace-system-auth.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";

async function handle(request: Request) {
  if (!isMarketplaceSystemRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const result = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: true },
      () => marketplaceIntegrationService.scheduleActiveN11Imports({
        processQueue: searchParams.get("processQueue") !== "false",
        limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 20,
        followUpTasks: searchParams.get("followUpTasks") !== "false",
        taskLimit: searchParams.get("taskLimit") ? Number(searchParams.get("taskLimit")) : undefined,
        taskMinCheckIntervalMinutes: searchParams.get("taskMinCheckIntervalMinutes")
          ? Number(searchParams.get("taskMinCheckIntervalMinutes"))
          : undefined,
        status: searchParams.get("status") ?? undefined,
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
// AUDIT_EXEMPT_REASON: Sistem cron endpointi; entegrasyon job geçmişi teknik iz olarak tutulur.
