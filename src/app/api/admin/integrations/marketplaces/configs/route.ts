import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    return await requirePermission("integrations.read", async () => {
      const result = await marketplaceIntegrationService.listConfigs();
      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await requirePermission("integrations.manage", async (user) => {
      const payload = await request.json();
      const result = await marketplaceIntegrationService.upsertConfig(payload);
      await auditLogService.recordFromRequest(request, {
        entityType: "MARKETPLACE_ACCOUNT",
        entityId: result.id,
        action: "UPDATE",
        actorUserId: user.id,
        summary: `Pazaryeri entegrasyon ayarı kaydedildi: ${result.displayName}`,
        metadata: {
          channel: result.channel,
          sellerId: result.sellerId,
          credentialsChanged: Boolean(payload.apiKey || payload.apiSecret || payload.serviceToken),
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

    if (error instanceof Error && error.message === "MARKETPLACE_CONFIG_SECRET_REQUIRED") {
      return NextResponse.json({ message: "Marketplace credentials are required" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
