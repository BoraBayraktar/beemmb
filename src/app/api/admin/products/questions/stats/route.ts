import { NextResponse } from "next/server";

import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";

function getQuestionSlaHours() {
  const parsed = Number(process.env.PRODUCT_QUESTION_SLA_HOURS ?? "24");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24;
  }

  return parsed;
}

export async function GET() {
  try {
    return await requirePermission("productQuestions.read", async () => {
      const result = await catalogAdminService.getProductQuestionStats(getQuestionSlaHours());

      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
