import { NextResponse } from "next/server";
import { z } from "zod";

import { financeAccountEntryService } from "@/modules/finance/services/finance-account-entry.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const bodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    return await requirePermission("finance.manage", async (user) => {
      const payload = bodySchema.parse(await request.json().catch(() => ({})));
      const result = await financeAccountEntryService.backfillRecentEntries(payload.limit ?? 200);

      await auditLogService.recordFromRequest(request, {
        entityType: "FINANCE_COLLECTION",
        entityId: "ledger-backfill",
        action: "UPDATE",
        actorUserId: user.id,
        summary: "Finans defter geriye dönük projeksiyon çalıştırıldı",
        metadata: result,
      });

      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
