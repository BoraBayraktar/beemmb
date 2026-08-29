import { NextResponse } from "next/server";

import { logError } from "@/lib/observability";
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

    logError("Modül kataloğu yüklenemedi", { scope: "platform.modules", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ message: "Modül kataloğu yüklenirken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
