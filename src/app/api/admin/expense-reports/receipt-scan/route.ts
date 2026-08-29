import { NextResponse } from "next/server";

import { AuthContextError, requirePermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";
import { MediaUploadError, mediaStorageService } from "@/modules/system/services/media-storage.service";
import { expenseOcrService } from "@/modules/expense-reports/services/expense-ocr.service";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("expenseReports.submit");
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Fiş/fatura görseli zorunludur." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const uploaded = await mediaStorageService.uploadExpenseReceipt({
      bytes,
      fileName: file.name,
      contentType: file.type,
      tenantId: user.tenantId,
    });

    const ocr = await expenseOcrService.extract({ bytes, contentType: file.type });

    await auditLogService.recordFromRequest(request, {
      entityType: "EXPENSE_REPORT",
      action: "UPDATE",
      actorUserId: user.id,
      tenantId: user.tenantId,
      summary: `Fiş/fatura görseli yüklendi: ${uploaded.objectKey}`,
      metadata: { bucket: uploaded.bucket, objectKey: uploaded.objectKey, ocrStatus: ocr.status },
    });

    return NextResponse.json({ receipt: uploaded, ocr }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof MediaUploadError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
