import { NextResponse } from "next/server";

import { AuthContextError, requirePlatformOperator } from "@/modules/identity/services/auth-context.service";
import { platformService } from "@/modules/platform/services/platform.service";

export async function GET() {
  try {
    await requirePlatformOperator();
    const modules = await platformService.listModuleCatalog();
    return NextResponse.json({ items: modules });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
