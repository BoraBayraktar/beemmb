import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

export async function GET(request: Request) {
  try {
    return await requirePermission("financeBankCash.manage", async () => {
      const { searchParams } = new URL(request.url);
      const items = await financialAccountsService.listAccounts({
        search: searchParams.get("search") ?? undefined,
        type: (searchParams.get("type") as "all" | "CASH" | "BANK" | null) ?? undefined,
      });
      return NextResponse.json(items);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Doğrulama hatası oluştu." }, { status: 400 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await requirePermission("financeBankCash.manage", async (user) => {
      const payload = await request.json();
      const item = await financialAccountsService.createAccount(payload);
      await auditLogService.recordFromRequest(request, {
        entityType: "FINANCE_PAYMENT",
        entityId: item.id,
        action: "CREATE",
        actorUserId: user.id,
        summary: `Finans hesabı oluşturuldu: ${item.name}`,
      });
      return NextResponse.json({ item }, { status: 201 });
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
