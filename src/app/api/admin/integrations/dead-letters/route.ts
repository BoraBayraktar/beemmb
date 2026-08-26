import { NextResponse } from "next/server";

import { integrationService } from "@/modules/integration/services/integration.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

export async function GET() {
  try {
    return await requirePermission("integrations.read", async () => {
      const result = await integrationService.listDeadLetters();
      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
