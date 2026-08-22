import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { collectionsService } from "@/modules/finance/services/collections.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET() {
  try {
    await requirePermission("financeCollections.manage");
    const items = await collectionsService.listCollectionRecords();
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("financeCollections.manage");
    const payload = await request.json();
    const created = await collectionsService.createCollectionRecord({
      ...payload,
      recordedByUserId: user.id,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "FINANCE_COLLECTION",
      entityId: created.id,
      action: "CREATE",
      actorUserId: user.id,
      summary: "Tahsilat kaydı oluşturuldu",
      metadata: {
        collectionRecordId: created.id,
        orderId: created.orderId,
        amount: created.amount,
        currency: created.currency,
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
