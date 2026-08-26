import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const exportSchema = z.object({
  total: z.coerce.number().int().min(0),
  filters: z.object({
    search: z.string().trim().nullable().optional(),
    stockStatusFilter: z.string().trim().optional(),
    reservationFilter: z.string().trim().optional(),
    warehouseFilter: z.string().trim().optional(),
    movementTypeFilter: z.string().trim().optional(),
  }),
});

export async function POST(request: Request) {
  try {
    return await requirePermission("inventory.manage", async (user) => {
      const payload = exportSchema.parse(await request.json());

      const exportHistory = await inventoryService.recordInventoryExportHistory({
        actorUserId: user.id,
        total: payload.total,
        filters: {
          search: payload.filters.search ?? null,
          stockStatusFilter: payload.filters.stockStatusFilter ?? null,
          reservationFilter: payload.filters.reservationFilter ?? null,
          warehouseFilter: payload.filters.warehouseFilter ?? null,
          movementTypeFilter: payload.filters.movementTypeFilter ?? null,
        },
      });

      await auditLogService.recordFromRequest(request, {
        entityType: "INVENTORY",
        action: "EXPORT",
        actorUserId: user.id,
        summary: `ENVANTER_DIŞA_AKTARIM | ${payload.total} satır dışa aktarıldı`,
        metadata: {
          ...payload,
          scope: "inventory_export",
          exportHistoryId: exportHistory?.id ?? null,
          filterCount: exportHistory?.filterCount ?? 0,
          hasFilters: exportHistory?.hasFilters ?? false,
          exportedAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        ok: true,
        exportHistoryId: exportHistory?.id ?? null,
        filterCount: exportHistory?.filterCount ?? 0,
        hasFilters: exportHistory?.hasFilters ?? false,
      });
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
