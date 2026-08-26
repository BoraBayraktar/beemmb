import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const payload = await request.json();
      const result = await marketplaceIntegrationService.testConnection(payload);
      await auditLogService.recordFromRequest(request, {
        entityType: "INTEGRATION",
        entityId: payload.configId ?? null,
        action: "SYNC",
        actorUserId: user.id,
        summary: "Pazaryeri bağlantısı test edildi",
        metadata: {
          ok: result.ok,
        },
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

    if (error instanceof Error && error.message === "MARKETPLACE_CONFIG_NOT_FOUND") {
      return NextResponse.json({ message: "Marketplace config not found" }, { status: 404 });
    }

    if (error instanceof Error && (error.message === "TRENDYOL_CONFIG_INCOMPLETE" || error.message === "N11_CONFIG_INCOMPLETE" || error.message === "PAZARAMA_CONFIG_INCOMPLETE" || error.message === "HEPSIBURADA_CONFIG_INCOMPLETE" || error.message === "MARKETPLACE_CONFIG_INCOMPLETE")) {
      return NextResponse.json({ message: "Marketplace config is incomplete" }, { status: 400 });
    }

    if (error instanceof Error && (error.message.startsWith("TRENDYOL_GET_SHIPMENT_PACKAGES_FAILED") || error.message.startsWith("N11_GET_SHIPMENT_PACKAGES_FAILED") || error.message.startsWith("PAZARAMA_GET_ORDERS_FAILED") || error.message.startsWith("PAZARAMA_AUTH_FAILED") || error.message.startsWith("HEPSIBURADA_GET_ORDERS_FAILED"))) {
      return NextResponse.json({ message: "Marketplace connection failed" }, { status: 502 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
