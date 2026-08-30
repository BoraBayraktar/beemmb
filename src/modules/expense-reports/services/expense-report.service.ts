import { z } from "zod";

import type {
  AdminAddExpenseReportItemInput,
  AdminExpenseReportDetail,
  AdminExpenseReportListItem,
  AdminExpenseReportListQuery,
  AdminExpenseReportListResult,
  AdminRejectExpenseReportInput,
  AdminUpdateExpenseReportInput,
} from "@/modules/expense-reports/contracts/expense-report.contract";
import { ExpenseReportRepository, expenseReportRepository } from "@/modules/expense-reports/repositories/expense-report.repository";
import { expenseSettingsService } from "@/modules/expense-reports/services/expense-settings.service";
import { notificationService } from "@/modules/system/services/notification.service";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const addItemSchema = z.object({
  categoryId: z.string().trim().min(1, "Harcama cinsi seçilmelidir."),
  expenseDate: z.string().datetime(),
  receiptNo: z.string().trim().max(80).optional().nullable(),
  amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalıdır."),
  currency: z.string().trim().min(3).max(8).optional(),
  vendorName: z.string().trim().min(1, "Satıcı adı girilmelidir.").max(160),
  description: z.string().trim().max(500).optional().nullable(),
  receiptObjectKey: z.string().trim().max(500).optional().nullable(),
  receiptUrl: z.string().trim().max(2048).optional().nullable(),
  receiptContentType: z.string().trim().max(100).optional().nullable(),
  receiptSize: z.coerce.number().int().nonnegative().optional().nullable(),
  ocrStatus: z.enum(["PENDING", "COMPLETED", "FAILED", "SKIPPED"]).default("SKIPPED"),
  ocrRawResult: z.unknown().optional().nullable(),
  ocrConfidence: z.coerce.number().min(0).max(1).optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().trim().min(1),
  note: z.string().trim().max(500).optional().nullable(),
});

const rejectSchema = z.object({
  id: z.string().trim().min(1),
  decisionNote: z.string().trim().min(1, "Red gerekçesi girilmelidir.").max(500),
});

export class ExpenseReportAdminError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "ExpenseReportAdminError";
  }
}

function toNumber(value: { toNumber: () => number } | null | undefined) {
  return value ? value.toNumber() : null;
}

type ExpenseReportDetailRow = NonNullable<Awaited<ReturnType<ExpenseReportRepository["findById"]>>>;
type ExpenseReportListRow = Awaited<ReturnType<ExpenseReportRepository["listAll"]>>[number];

function mapListItem(item: ExpenseReportListRow): AdminExpenseReportListItem {
  return {
    id: item.id,
    reportNumber: item.reportNumber,
    status: item.status,
    employeeUserId: item.employeeUserId,
    employeeName: item.employee.name,
    approverUserId: item.approverUserId,
    approverName: item.approver?.name ?? null,
    currency: item.currency,
    totalAmount: item.totalAmount.toNumber(),
    itemCount: item._count.items,
    submittedAt: item.submittedAt ? item.submittedAt.toISOString() : null,
    decidedAt: item.decidedAt ? item.decidedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function mapDetail(item: ExpenseReportDetailRow): AdminExpenseReportDetail {
  return {
    id: item.id,
    reportNumber: item.reportNumber,
    status: item.status,
    employeeUserId: item.employeeUserId,
    employeeName: item.employee.name,
    approverUserId: item.approverUserId,
    approverName: item.approver?.name ?? null,
    currency: item.currency,
    totalAmount: item.totalAmount.toNumber(),
    itemCount: item.items.length,
    submittedAt: item.submittedAt ? item.submittedAt.toISOString() : null,
    decidedAt: item.decidedAt ? item.decidedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    note: item.note,
    decisionNote: item.decisionNote,
    items: item.items.map((line) => ({
      id: line.id,
      categoryId: line.categoryId,
      categoryName: line.category.name,
      expenseDate: line.expenseDate.toISOString(),
      receiptNo: line.receiptNo,
      amount: line.amount.toNumber(),
      currency: line.currency,
      vendorName: line.vendorName,
      description: line.description,
      receiptUrl: line.receiptUrl,
      receiptContentType: line.receiptContentType,
      ocrStatus: line.ocrStatus,
      ocrConfidence: toNumber(line.ocrConfidence),
      createdAt: line.createdAt.toISOString(),
    })),
    lifecycleEvents: item.lifecycleEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      actorType: event.actorType,
      summary: event.summary,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}

export type RequestingUser = { id: string; hasManage: boolean };

export class ExpenseReportService {
  constructor(private readonly repository: ExpenseReportRepository) {}

  async listMine(employeeUserId: string, query: AdminExpenseReportListQuery): Promise<AdminExpenseReportListResult> {
    const parsed = listQuerySchema.parse(query);
    const [rows, total] = await Promise.all([
      this.repository.listForEmployee(employeeUserId, parsed),
      this.repository.countForEmployee(employeeUserId, parsed),
    ]);

    return {
      items: rows.map(mapListItem),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async listApprovals(approverUserId: string, query: AdminExpenseReportListQuery): Promise<AdminExpenseReportListResult> {
    const parsed = listQuerySchema.parse(query);
    const [rows, total] = await Promise.all([
      this.repository.listForApprover(approverUserId, parsed),
      this.repository.countForApprover(approverUserId, parsed),
    ]);

    return {
      items: rows.map(mapListItem),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async listAll(query: AdminExpenseReportListQuery): Promise<AdminExpenseReportListResult> {
    const parsed = listQuerySchema.parse(query);
    const [rows, total] = await Promise.all([
      this.repository.listAll(parsed),
      this.repository.countAll(parsed),
    ]);

    return {
      items: rows.map(mapListItem),
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  private async findOrThrow(id: string): Promise<ExpenseReportDetailRow> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new ExpenseReportAdminError("Masraf bildirimi bulunamadı.", 404);
    }
    return existing;
  }

  private assertCanView(report: ExpenseReportDetailRow, user: RequestingUser) {
    const isOwner = report.employeeUserId === user.id;
    const isApprover = report.approverUserId === user.id;
    if (!isOwner && !isApprover && !user.hasManage) {
      throw new ExpenseReportAdminError("Bu masraf bildirimini görüntüleme yetkiniz yok.", 403);
    }
  }

  private assertOwnerDraft(report: ExpenseReportDetailRow, user: RequestingUser) {
    if (report.employeeUserId !== user.id) {
      throw new ExpenseReportAdminError("Yalnızca kendi masraf bildiriminizi düzenleyebilirsiniz.", 403);
    }
    if (report.status !== "DRAFT") {
      throw new ExpenseReportAdminError("Yalnızca taslak durumundaki bildirimler düzenlenebilir.", 400);
    }
  }

  private assertCanDecide(report: ExpenseReportDetailRow, user: RequestingUser) {
    const isAssignedApprover = report.approverUserId === user.id;
    if (!isAssignedApprover && !user.hasManage) {
      throw new ExpenseReportAdminError("Bu masraf bildirimini onaylama/reddetme yetkiniz yok.", 403);
    }
    if (report.status !== "SUBMITTED") {
      throw new ExpenseReportAdminError("Yalnızca onaya gönderilmiş bildirimler karara bağlanabilir.", 400);
    }
  }

  async getDetail(id: string, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const report = await this.findOrThrow(id);
    this.assertCanView(report, user);
    return mapDetail(report);
  }

  async createDraft(employeeUserId: string): Promise<AdminExpenseReportDetail> {
    const created = await this.repository.createDraft({ employeeUserId });
    return mapDetail(created);
  }

  async updateNote(input: AdminUpdateExpenseReportInput, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const parsed = updateSchema.parse(input);
    const report = await this.findOrThrow(parsed.id);
    this.assertOwnerDraft(report, user);

    const updated = await this.repository.updateNote({ id: parsed.id, note: parsed.note ?? null });
    return mapDetail(updated);
  }

  async discardDraft(id: string, user: RequestingUser): Promise<void> {
    const report = await this.findOrThrow(id);
    this.assertOwnerDraft(report, user);
    await this.repository.softDelete({ id, actorUserId: user.id });
  }

  async addItem(reportId: string, input: AdminAddExpenseReportItemInput, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const report = await this.findOrThrow(reportId);
    this.assertOwnerDraft(report, user);

    const parsed = addItemSchema.parse(input);

    const category = await expenseSettingsService.listAllCategories();
    const matchedCategory = category.find((item) => item.id === parsed.categoryId);
    if (!matchedCategory) {
      throw new ExpenseReportAdminError("Geçersiz harcama cinsi.", 400);
    }
    if (matchedCategory.slug === "diger" && !parsed.description?.trim()) {
      throw new ExpenseReportAdminError("\"Diğer\" seçildiğinde açıklama girilmelidir.", 400);
    }

    const updated = await this.repository.addItem({
      expenseReportId: reportId,
      categoryId: parsed.categoryId,
      expenseDate: new Date(parsed.expenseDate),
      receiptNo: parsed.receiptNo ?? null,
      amount: parsed.amount,
      currency: parsed.currency ?? report.currency,
      vendorName: parsed.vendorName,
      description: parsed.description ?? null,
      receiptObjectKey: parsed.receiptObjectKey ?? null,
      receiptUrl: parsed.receiptUrl ?? null,
      receiptContentType: parsed.receiptContentType ?? null,
      receiptSize: parsed.receiptSize ?? null,
      ocrStatus: parsed.ocrStatus,
      ocrRawResult: parsed.ocrRawResult ?? null,
      ocrConfidence: parsed.ocrConfidence ?? null,
      actorUserId: user.id,
    });

    return mapDetail(updated);
  }

  async removeItem(reportId: string, itemId: string, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const report = await this.findOrThrow(reportId);
    this.assertOwnerDraft(report, user);

    const updated = await this.repository.removeItem({ expenseReportId: reportId, itemId, actorUserId: user.id });
    return mapDetail(updated);
  }

  async submit(id: string, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const report = await this.findOrThrow(id);
    this.assertOwnerDraft(report, user);

    if (report.items.length === 0) {
      throw new ExpenseReportAdminError("En az bir harcama kalemi eklemelisiniz.", 400);
    }

    const approverSetting = await expenseSettingsService.getApproverSetting();
    if (!approverSetting) {
      throw new ExpenseReportAdminError("Masraf onaycısı tanımlanmamış. Lütfen sistem yöneticinize başvurun.", 400);
    }

    const updated = await this.repository.markSubmitted({
      id,
      approverUserId: approverSetting.approverUserId,
      actorUserId: user.id,
    });

    await notificationService.createForRecipients({
      recipients: [{ id: approverSetting.approverUserId }],
      type: "EXPENSE_REPORT_SUBMITTED",
      title: "Yeni masraf bildirimi onayınızı bekliyor",
      message: `${updated.employee.name} tarafından gönderilen ${updated.reportNumber} numaralı masraf bildirimi (${updated.totalAmount.toNumber()} ${updated.currency}) onayınızı bekliyor.`,
      linkUrl: "/admin/expense-reports/approvals",
      channels: ["IN_APP", "EMAIL"],
    });

    return mapDetail(updated);
  }

  async approve(id: string, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const report = await this.findOrThrow(id);
    this.assertCanDecide(report, user);

    const updated = await this.repository.markApproved({ id, actorUserId: user.id });

    await notificationService.createForRecipients({
      recipients: [{ id: updated.employeeUserId }],
      type: "EXPENSE_REPORT_DECIDED",
      title: "Masraf bildiriminiz onaylandı",
      message: `${updated.reportNumber} numaralı masraf bildiriminiz onaylandı.`,
      linkUrl: "/admin/expense-reports",
      channels: ["IN_APP", "EMAIL"],
    });

    return mapDetail(updated);
  }

  async reject(input: AdminRejectExpenseReportInput, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const parsed = rejectSchema.parse(input);
    const report = await this.findOrThrow(parsed.id);
    this.assertCanDecide(report, user);

    const updated = await this.repository.markRejected({
      id: parsed.id,
      actorUserId: user.id,
      decisionNote: parsed.decisionNote,
    });

    await notificationService.createForRecipients({
      recipients: [{ id: updated.employeeUserId }],
      type: "EXPENSE_REPORT_DECIDED",
      title: "Masraf bildiriminiz reddedildi",
      message: `${updated.reportNumber} numaralı masraf bildiriminiz reddedildi: ${parsed.decisionNote}`,
      linkUrl: "/admin/expense-reports",
      channels: ["IN_APP", "EMAIL"],
    });

    return mapDetail(updated);
  }
}

export const expenseReportService = new ExpenseReportService(expenseReportRepository);
