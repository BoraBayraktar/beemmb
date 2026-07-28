import { NextResponse } from "next/server";

import { documentFinancePreviewService } from "@/modules/finance/services/document-finance-preview.service";
import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    await requirePermission("finance.read");
    const { documentId } = await context.params;
    const locale = new URL(request.url).searchParams.get("locale") ?? "tr";
    const preview = await documentFinancePreviewService.getPreview(locale, documentId);

    if (!preview) {
      return NextResponse.json({ message: "Belge bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ preview });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
