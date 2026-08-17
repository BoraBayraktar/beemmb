import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { marketplaceIntegrationService } from "@/modules/integration/services/marketplace-integration.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("integrations.manage");
    const { id } = await params;
    const payload = await request.json();
    const result = await marketplaceIntegrationService.createN11CollectionRequest({
      packageId: id,
      ...payload,
    });
    await auditLogService.recordFromRequest(request, {
      entityType: "MARKETPLACE_PACKAGE",
      entityId: id,
      action: "UPDATE",
      actorUserId: user.id,
      summary: "N11 paketi icin toplama talebi olusturuldu",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "MARKETPLACE_PACKAGE_NOT_FOUND") {
      return NextResponse.json({ message: "Package not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message === "MARKETPLACE_PACKAGE_UNSUPPORTED_CHANNEL") {
      return NextResponse.json({ message: "Collection request is not supported for this channel" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "N11_COLLECTION_REQUEST_STATUS_INVALID") {
      return NextResponse.json({ message: "Package status is not eligible for collection request" }, { status: 409 });
    }

    if (error instanceof Error && error.message === "MARKETPLACE_PACKAGE_NO_LINES") {
      return NextResponse.json({ message: "Package has no lines" }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
