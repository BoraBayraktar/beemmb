import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { counterpartyLookupService } from "@/modules/finance/services/counterparty-lookup.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

export async function GET(request: Request) {
  try {
    await requirePermission("finance.read");
    const { searchParams } = new URL(request.url);
    const result = await counterpartyLookupService.searchCounterparties({
      search: searchParams.get("search") ?? undefined,
      kind: (searchParams.get("kind") as "all" | "CUSTOMER" | "SUPPLIER" | null) ?? undefined,
    });
    return NextResponse.json(result);
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
