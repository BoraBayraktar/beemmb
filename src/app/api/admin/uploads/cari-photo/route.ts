import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthContextError,
  requirePermission,
} from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";
import {
  MediaUploadError,
  mediaStorageService,
} from "@/modules/system/services/media-storage.service";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("cari.manage");
    const formData = await request.formData();
    const file = formData.get("file");
    const slug = formData.get("slug");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Image file is required" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded = await mediaStorageService.uploadCariPhoto({
      bytes,
      fileName: file.name,
      contentType: file.type,
      cariSlug: typeof slug === "string" && slug.trim() ? slug : undefined,
    });

    await auditLogService.recordFromRequest(request, {
      entityType: "CARI",
      action: "UPDATE",
      actorUserId: user.id,
      tenantId: user.tenantId,
      summary: `Cari kart fotoğrafı yüklendi: ${uploaded.objectKey}`,
      metadata: {
        bucket: uploaded.bucket,
        objectKey: uploaded.objectKey,
      },
    });

    return NextResponse.json({
      item: uploaded,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof MediaUploadError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
