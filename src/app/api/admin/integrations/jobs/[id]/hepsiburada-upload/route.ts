import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { hepsiburadaStockSyncService } from "@/modules/integration/services/hepsiburada-stock-sync.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await requirePermission("integrationsHepsiburada.manage", async () => {
      const { id } = await params;
      const result = await hepsiburadaStockSyncService.getUploadResultForJob(id);
      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message === "INTEGRATION_JOB_NOT_FOUND") {
      return NextResponse.json({ message: "Integration job not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "HEPSIBURADA_UPLOAD_JOB_UNSUPPORTED") {
      return NextResponse.json({ message: "Unsupported Hepsiburada upload job" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "HEPSIBURADA_UPLOAD_ID_NOT_FOUND") {
      return NextResponse.json({ message: "Upload id not found" }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
