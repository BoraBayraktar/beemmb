import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { cariService, DuplicateCariSlugError } from "@/modules/cari/services/cari.service";
import type { CariRole } from "@/modules/cari/contracts/cari.contract";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

function parseRole(value: string | null): CariRole | undefined {
  if (value === "CUSTOMER" || value === "SUPPLIER" || value === "CARRIER") {
    return value;
  }

  return undefined;
}

export async function GET(request: Request) {
  try {
    return await requirePermission("cari.manage", async () => {
      const { searchParams } = new URL(request.url);
      const items = await cariService.listCari({
        role: parseRole(searchParams.get("role")),
        search: searchParams.get("search") ?? undefined,
      });
      return NextResponse.json({ items });
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
    return await requirePermission("cari.manage", async (user) => {
      const payload = await request.json();
      const created = await cariService.createCari(payload);
      await auditLogService.recordFromRequest(request, {
        entityType: "CARI",
        entityId: created.id,
        action: "CREATE",
        actorUserId: user.id,
        summary: `Cari kart oluşturuldu: ${created.name}`,
        metadata: {
          scope: "cari",
        },
      });
      return NextResponse.json({ item: created }, { status: 201 });
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    if (error instanceof DuplicateCariSlugError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
