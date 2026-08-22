import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { trendyolStockSyncService } from "@/modules/integration/services/trendyol-stock-sync.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("integrationsTrendyol.manage");
    const { id } = await params;
    const result = await trendyolStockSyncService.getBatchResultForJob(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message === "INTEGRATION_JOB_NOT_FOUND") {
      return NextResponse.json({ message: "Integration job not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "TRENDYOL_BATCH_JOB_UNSUPPORTED") {
      return NextResponse.json({ message: "Unsupported Trendyol batch job" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "TRENDYOL_BATCH_REQUEST_ID_NOT_FOUND") {
      return NextResponse.json({ message: "Batch request id not found" }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
