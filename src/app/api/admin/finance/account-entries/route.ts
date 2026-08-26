import { NextResponse } from "next/server";

import { financeAccountEntryService } from "@/modules/finance/services/finance-account-entry.service";
import { AuthContextError, requireAnyPermission } from "@/modules/identity/services/auth-context.service";

export async function GET(request: Request) {
  try {
    return await requireAnyPermission(["finance.read", "finance.audit.read"], async () => {
      const { searchParams } = new URL(request.url);

      const result = await financeAccountEntryService.listLedgerEntries({
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        search: searchParams.get("search") ?? undefined,
        sourceType: (searchParams.get("sourceType") as "all" | "CASH_TRANSACTION" | "COLLECTION" | "PAYMENT" | null) ?? "all",
      });

      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
