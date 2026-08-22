import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";

export async function GET(request: Request) {
  try {
    await requirePermission("productQuestions.read");
    const { searchParams } = new URL(request.url);

    const result = await catalogAdminService.listProductQuestions({
      status: (searchParams.get("status") as "all" | "pending" | "answered" | null) ?? "all",
      sort: (searchParams.get("sort") as "priority" | "latest" | "oldest" | null) ?? "priority",
      search: searchParams.get("search") ?? undefined,
      questionId: searchParams.get("questionId") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
    });

    return NextResponse.json(result);
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
