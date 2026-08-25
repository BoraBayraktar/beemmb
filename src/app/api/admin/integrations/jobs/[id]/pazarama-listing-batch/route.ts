import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { pazaramaStockSyncService } from "@/modules/integration/services/pazarama-stock-sync.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("integrationsPazarama.manage", async () => {
      const { id } = await params;
      const result = await pazaramaStockSyncService.getListingBatchResultForJob(id);
      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message === "INTEGRATION_JOB_NOT_FOUND") {
      return NextResponse.json({ message: "Integration job not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "PAZARAMA_LISTING_BATCH_JOB_UNSUPPORTED") {
      return NextResponse.json({ message: "Unsupported Pazarama listing batch job" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "PAZARAMA_LISTING_BATCH_ID_NOT_FOUND") {
      return NextResponse.json({ message: "Listing batch id not found" }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
