import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { integrationService } from "@/modules/integration/services/integration.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(request: Request) {
  try {
    return await requirePermission("integrations.read", async () => {
      const { searchParams } = new URL(request.url);

      const result = await integrationService.listJobs({
        channel: (searchParams.get("channel") as "TRENDYOL" | "N11" | "PAZARAMA" | "HEPSIBURADA" | "EDOCS_MOCK" | null) ?? undefined,
        jobType: (searchParams.get("jobType") as "PRODUCT_SYNC" | "PRICE_SYNC" | "STOCK_SYNC" | "ORDER_IMPORT" | "ORDER_STATUS_SYNC" | "DOCUMENT_OUTBOUND" | "DOCUMENT_STATUS_SYNC" | null) ?? undefined,
        status: (searchParams.get("status") as "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "DEAD_LETTER" | null) ?? undefined,
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 20,
      });

      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const payload = await request.json();
      const result = await integrationService.dispatchJobs(payload);
      await auditLogService.recordFromRequest(request, {
        entityType: "INTEGRATION",
        action: "SYNC",
        actorUserId: user.id,
        summary: "Entegrasyon işi oluşturuldu",
        metadata: {
          channel: payload.channel,
          jobType: payload.jobType,
          entityType: payload.entityType,
        },
      });
      return NextResponse.json(result, { status: 201 });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
