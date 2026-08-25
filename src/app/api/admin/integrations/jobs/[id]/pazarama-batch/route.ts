import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { pazaramaProductSyncService } from "@/modules/integration/services/pazarama-product-sync.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("integrationsPazarama.manage", async () => {
      const { id } = await params;
      const result = await pazaramaProductSyncService.getBatchResultForJob(id);
      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message === "INTEGRATION_JOB_NOT_FOUND") {
      return NextResponse.json({ message: "Integration job not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "PAZARAMA_BATCH_JOB_UNSUPPORTED") {
      return NextResponse.json({ message: "Unsupported Pazarama batch job" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "PAZARAMA_BATCH_REQUEST_ID_NOT_FOUND") {
      return NextResponse.json({ message: "Batch request id not found" }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
