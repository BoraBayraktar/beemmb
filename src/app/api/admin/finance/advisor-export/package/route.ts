import { NextResponse } from "next/server";
import { z } from "zod";

import { financeAdvisorExportService } from "@/modules/finance/services/finance-advisor-export.service";
import { AuthContextError, requireAnyPermission } from "@/modules/identity/services/auth-context.service";
import { auditLogService } from "@/modules/system/services/audit-log.service";

const querySchema = z.object({
  format: z.enum(["xml", "json"]).default("xml"),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  financialAccountId: z.string().trim().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAnyPermission(["finance.audit.read", "finance.manage"]);
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      format: searchParams.get("format") ?? "xml",
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      financialAccountId: searchParams.get("financialAccountId") ?? undefined,
    });

    const exported =
      parsed.format === "json"
        ? await financeAdvisorExportService.exportPackageJson("tr", parsed)
        : await financeAdvisorExportService.exportPackageXml("tr", parsed);

    await auditLogService.recordFromRequest(request, {
      entityType: "FINANCE_COLLECTION",
      entityId: `advisor-export:${parsed.format}`,
      action: "CREATE",
      actorUserId: user.id,
      summary: "Mali müşavir export paketi indirildi",
      metadata: {
        format: parsed.format,
        from: parsed.from ?? null,
        to: parsed.to ?? null,
        fileCount: exported.fileCount,
      },
    });

    const contentType = parsed.format === "json" ? "application/json; charset=utf-8" : "application/xml; charset=utf-8";

    return new NextResponse(exported.content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthContextError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message.includes("satır")) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json({ message: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
