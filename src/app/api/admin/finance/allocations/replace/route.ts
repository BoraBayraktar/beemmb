import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { financeAllocationService } from "@/modules/finance/services/allocation.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function POST(request: Request) {
  try {
    return await requirePermission("finance.manage", async (user) => {
      const payload = await request.json() as {
        type?: "collection" | "payment";
        collectionRecordId?: string;
        paymentRecordId?: string;
        items?: Array<{ businessDocumentLineId: string; amount: number }>;
      };

      if (payload.type === "collection" && payload.collectionRecordId && payload.items) {
        const summary = await financeAllocationService.replaceCollectionAllocations({
          collectionRecordId: payload.collectionRecordId,
          items: payload.items,
        });

        await auditLogService.recordFromRequest(request, {
          entityType: "FINANCE_COLLECTION",
          entityId: payload.collectionRecordId,
          action: "UPDATE",
          actorUserId: user.id,
          summary: "Tahsilat kaydı manuel eşleştirmesi güncellendi",
          metadata: {
            collectionRecordId: payload.collectionRecordId,
            allocatedAmount: summary.allocatedAmount,
            expectedAmount: summary.expectedAmount,
            itemCount: summary.items.length,
          },
        });

        return NextResponse.json({ summary });
      }

      if (payload.type === "payment" && payload.paymentRecordId && payload.items) {
        const summary = await financeAllocationService.replacePaymentAllocations({
          paymentRecordId: payload.paymentRecordId,
          items: payload.items,
        });

        await auditLogService.recordFromRequest(request, {
          entityType: "FINANCE_PAYMENT",
          entityId: payload.paymentRecordId,
          action: "UPDATE",
          actorUserId: user.id,
          summary: "Ödeme kaydı manuel eşleştirmesi güncellendi",
          metadata: {
            paymentRecordId: payload.paymentRecordId,
            allocatedAmount: summary.allocatedAmount,
            expectedAmount: summary.expectedAmount,
            itemCount: summary.items.length,
          },
        });

        return NextResponse.json({ summary });
      }

      return NextResponse.json({ message: "Geçersiz eşleştirme isteği." }, { status: 400 });
    });
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
