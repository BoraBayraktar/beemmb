import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { n11StockSyncService } from "@/modules/integration/services/n11-stock-sync.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("integrationsN11.manage");
    const { id } = await params;
    const result = await n11StockSyncService.getTaskResultForJob(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message === "INTEGRATION_JOB_NOT_FOUND") {
      return NextResponse.json({ message: "Integration job not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "N11_TASK_JOB_UNSUPPORTED") {
      return NextResponse.json({ message: "Unsupported N11 task job" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "N11_TASK_ID_NOT_FOUND") {
      return NextResponse.json({ message: "Task id not found" }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
