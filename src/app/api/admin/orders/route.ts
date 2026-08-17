import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { commerceService } from "@/modules/commerce/services/commerce.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

export async function GET(request: Request) {
  try {
    await requirePermission("orders.read");
    const { searchParams } = new URL(request.url);

    const orders = await commerceService.listOrders({
      search: searchParams.get("search") ?? undefined,
      status: (searchParams.get("status") as "CONFIRMED" | "CANCELLED" | null) ?? undefined,
      paymentStatus: (searchParams.get("paymentStatus") as "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED" | null) ?? undefined,
      shipmentStatus: (searchParams.get("shipmentStatus") as "NOT_SHIPPED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "RETURNED" | null) ?? undefined,
      carrierCompanyId: searchParams.get("carrierCompanyId") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
    });

    return NextResponse.json(orders);
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
