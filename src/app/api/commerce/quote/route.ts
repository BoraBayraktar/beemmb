import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { runWithTenantContext } from "@/lib/tenant-context";
import { PLATFORM_TENANT_ID } from "@/lib/tenant-defaults";
import { commerceService } from "@/modules/commerce/services/commerce.service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const quote = await runWithTenantContext(
      { tenantId: PLATFORM_TENANT_ID, isPlatformOperator: false },
      () => commerceService.quote(payload),
    );
    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
// AUDIT_EXEMPT_REASON: Teklif hesaplama kalıcı finans/e-belge işlemi oluşturmaz; checkout sipariş oluşumunda audit üretilir.
