import { z } from "zod";

import type {
  AdminAddExpenseReportItemInput,
  AdminExpenseReportDetail,
  AdminExpenseReportListItem,
  AdminExpenseReportListQuery,
  AdminExpenseReportListResult,
  AdminReimburseExpenseReportInput,
  AdminRejectExpenseReportInput,
  AdminReturnExpenseReportInput,
  AdminUpdateExpenseReportInput,
} from "@/modules/expense-reports/contracts/expense-report.contract";
import { ExpenseReportRepository, expenseReportRepository } from "@/modules/expense-reports/repositories/expense-report.repository";
import { expenseSettingsService } from "@/modules/expense-reports/services/expense-settings.service";
import { delegationService } from "@/modules/delegation/services/delegation.service";
import { notificationService } from "@/modules/system/services/notification.service";
import { cashTransactionsService } from "@/modules/finance/services/cash-transactions.service";
import { financeAccountEntryService } from "@/modules/finance/services/finance-account-entry.service";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "RETURNED"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const addItemSchema = z
  .object({
    categoryId: z.string().trim().min(1, "Harcama cinsi seçilmelidir."),
    expenseDate: z.string().datetime(),
    receiptNo: z.string().trim().max(80).optional().nullable(),
    amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalıdır."),
    currency: z.string().trim().min(3).max(8).optional(),
    vatRate: z.coerce.number().min(0, "KDV oranı negatif olamaz.").max(100, "KDV oranı 100'ü geçemez.").optional().nullable(),
    vatAmount: z.coerce.number().min(0, "KDV tutarı negatif olamaz.").optional().nullable(),
    vendorName: z.string().trim().min(1, "Satıcı adı girilmelidir.").max(160),
    description: z.string().trim().max(500).optional().nullable(),
    receiptObjectKey: z.string().trim().max(500).optional().nullable(),
    receiptUrl: z.string().trim().max(2048).optional().nullable(),
    receiptContentType: z.string().trim().max(100).optional().nullable(),
    receiptSize: z.coerce.number().int().nonnegative().optional().nullable(),
    ocrStatus: z.enum(["PENDING", "COMPLETED", "FAILED", "SKIPPED"]).default("SKIPPED"),
    ocrRawResult: z.unknown().optional().nullable(),
    ocrConfidence: z.coerce.number().min(0).max(1).optional().nullable(),
  })
  .refine((value) => value.vatAmount === null || value.vatAmount === undefined || value.vatAmount <= value.amount, {
    message: "KDV tutarı toplam tutarı geçemez.",
    path: ["vatAmount"],
  });

const updateSchema = z.object({
  id: z.string().trim().min(1),
  note: z.string().trim().max(500).optional().nullable(),
});

const rejectSchema = z.object({
  id: z.string().trim().min(1),
  decisionNote: z.string().trim().min(1, "Red gerekçesi girilmelidir.").max(500),
});

const returnSchema = z.object({
  id: z.string().trim().min(1),
  decisionNote: z.string().trim().min(1, "Geri gönderme gerekçesi girilmelidir.").max(500),
});

const reimburseSchema = z.object({
  id: z.string().trim().min(1),
  financialAccountId: z.string().trim().min(1, "Finans hesabı seçilmelidir."),
  transactionAt: z.string().datetime().optional(),
  note: z.string().trim().max(500, "Not en fazla 500 karakter olabilir.").optional().nullable(),
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
    currentApproverUserId: item.currentApproverUserId,
    currentApproverName: item.currentApprover?.name ?? null,
    currentApproverDelegateNames: [],
    currency: item.currency,
    totalAmount: item.totalAmount.toNumber(),
    itemCount: item._count.items,
    submittedAt: item.submittedAt ? item.submittedAt.toISOString() : null,
    decidedAt: item.decidedAt ? item.decidedAt.toISOString() : null,
    reimbursedAt: item.reimbursedAt ? item.reimbursedAt.toISOString() : null,
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
    currentApproverUserId: item.currentApproverUserId,
    currentApproverName: item.currentApprover?.name ?? null,
    currentApproverDelegateNames: [],
    currency: item.currency,
    totalAmount: item.totalAmount.toNumber(),
    itemCount: item.items.length,
    submittedAt: item.submittedAt ? item.submittedAt.toISOString() : null,
    decidedAt: item.decidedAt ? item.decidedAt.toISOString() : null,
    reimbursedAt: item.reimbursedAt ? item.reimbursedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    note: item.note,
    currentRound: item.currentRound,
    items: item.items.map((line) => ({
      id: line.id,
      categoryId: line.categoryId,
      categoryName: line.category.name,
      expenseDate: line.expenseDate.toISOString(),
      receiptNo: line.receiptNo,
      amount: line.amount.toNumber(),
      currency: line.currency,
      vatRate: toNumber(line.vatRate),
      vatAmount: toNumber(line.vatAmount),
      vendorName: line.vendorName,
      description: line.description,
      receiptUrl: line.receiptUrl,
      receiptContentType: line.receiptContentType,
      ocrStatus: line.ocrStatus,
      ocrConfidence: toNumber(line.ocrConfidence),
      createdAt: line.createdAt.toISOString(),
    })),
    approvals: item.approvals.map((approval) => ({
      id: approval.id,
      round: approval.round,
      stepOrder: approval.stepOrder,
      approverUserId: approval.approverUserId,
      approverName: approval.approver.name,
      delegateNames: [],
      notifyEmail: approval.notifyEmail,
      description: approval.description,
      canApprove: approval.canApprove,
      canReject: approval.canReject,
      canReturn: approval.canReturn,
      status: approval.status,
      decisionNote: approval.decisionNote,
      decidedAt: approval.decidedAt ? approval.decidedAt.toISOString() : null,
    })),
    lifecycleEvents: item.lifecycleEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      actorType: event.actorType,
      actorUserId: event.actorUserId,
      actorName: null,
      summary: event.summary,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}

export type RequestingUser = { id: string; tenantId: string; hasManage: boolean };

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

  async listApprovals(user: RequestingUser, query: AdminExpenseReportListQuery): Promise<AdminExpenseReportListResult> {
    const parsed = listQuerySchema.parse(query);
    const delegatedGrantorIds = await delegationService.getActiveGrantorsFor(user.tenantId, user.id);
    const approverUserIds = [user.id, ...delegatedGrantorIds];
    const [rows, total] = await Promise.all([
      this.repository.listForApprover(approverUserIds, parsed),
      this.repository.countForApprover(approverUserIds, parsed),
    ]);

    const items = rows.map(mapListItem);
    const approverIds = [...new Set(items.map((item) => item.currentApproverUserId).filter((id): id is string => Boolean(id)))];
    const delegateNamesByApprover = await delegationService.getActiveDelegateNamesForGrantors(user.tenantId, approverIds);
    for (const item of items) {
      item.currentApproverDelegateNames = item.currentApproverUserId ? (delegateNamesByApprover[item.currentApproverUserId] ?? []) : [];
    }

    return {
      items,
      page: parsed.page,
      pageSize: parsed.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
  }

  async listAll(query: AdminExpenseReportListQuery, tenantId: string): Promise<AdminExpenseReportListResult> {
    const parsed = listQuerySchema.parse(query);
    const [rows, total] = await Promise.all([
      this.repository.listAll(parsed),
      this.repository.countAll(parsed),
    ]);

    const items = rows.map(mapListItem);
    const approverIds = [...new Set(items.map((item) => item.currentApproverUserId).filter((id): id is string => Boolean(id)))];
    const delegateNamesByApprover = await delegationService.getActiveDelegateNamesForGrantors(tenantId, approverIds);
    for (const item of items) {
      item.currentApproverDelegateNames = item.currentApproverUserId ? (delegateNamesByApprover[item.currentApproverUserId] ?? []) : [];
    }

    return {
      items,
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

  /**
   * Goruntuleme, karar vermeden (assertCanDecide) daha genis tutulur: "manage"
   * izni olan biri, kendisine atanmamis veya vekaletini almadigi bir bekleyen
   * onayi da (Tum Bildirimler / denetim sayfasi uzerinden) GOREBILIR, durumdan
   * bagimsiz. Sadece KARAR (approve/reject/return) sirasinda assertCanDecide
   * bunu atanmis onayci veya vekiliyle sinirlar.
   */
  private async assertCanView(report: ExpenseReportDetailRow, user: RequestingUser) {
    const isOwner = report.employeeUserId === user.id;
    const isApprover = report.currentApproverUserId === user.id;
    if (isOwner || isApprover || user.hasManage) {
      return;
    }

    const delegatedGrantorIds = await delegationService.getActiveGrantorsFor(user.tenantId, user.id);
    if (report.currentApproverUserId && delegatedGrantorIds.includes(report.currentApproverUserId)) {
      return;
    }

    throw new ExpenseReportAdminError("Bu masraf bildirimini görüntüleme yetkiniz yok.", 403);
  }

  private assertOwnerEditable(report: ExpenseReportDetailRow, user: RequestingUser) {
    if (report.employeeUserId !== user.id) {
      throw new ExpenseReportAdminError("Yalnızca kendi masraf bildiriminizi düzenleyebilirsiniz.", 403);
    }
    if (report.status !== "DRAFT" && report.status !== "RETURNED") {
      throw new ExpenseReportAdminError("Yalnızca taslak veya geri gönderilmiş bildirimler düzenlenebilir.", 400);
    }
  }

  /**
   * Karar (onay/red/geri gönder) yetkisi kasitli olarak "expenseReports.manage"
   * iznine bakmaz -- bu izin sadece genel gorunurluk/yonetim icindir (bkz.
   * assertCanView, reimburse). Bir adimi SADECE o adima atanmis onayci veya
   * ondan aktif vekalet alan kisi karara baglayabilir; "manage" izni olan
   * baska biri bu adimi bypass edemez.
   */
  private async assertCanDecide(report: ExpenseReportDetailRow, user: RequestingUser) {
    const isAssignedApprover = report.currentApproverUserId === user.id;
    if (!isAssignedApprover) {
      const delegatedGrantorIds = await delegationService.getActiveGrantorsFor(user.tenantId, user.id);
      if (!report.currentApproverUserId || !delegatedGrantorIds.includes(report.currentApproverUserId)) {
        throw new ExpenseReportAdminError("Bu masraf bildirimini onaylama/reddetme yetkiniz yok.", 403);
      }
    }
    if (report.status !== "SUBMITTED") {
      throw new ExpenseReportAdminError("Yalnızca onaya gönderilmiş bildirimler karara bağlanabilir.", 400);
    }
  }

  private async findCurrentApprovalOrThrow(reportId: string) {
    const approval = await this.repository.findCurrentApproval(reportId);
    if (!approval) {
      throw new ExpenseReportAdminError("Bu bildirim için bekleyen bir onay adımı bulunamadı.", 400);
    }
    return approval;
  }

  private assertActionAllowed(
    approval: { canApprove: boolean; canReject: boolean; canReturn: boolean },
    action: "approve" | "reject" | "return",
    user: RequestingUser,
  ) {
    if (user.hasManage) {
      return;
    }
    const allowed = action === "approve" ? approval.canApprove : action === "reject" ? approval.canReject : approval.canReturn;
    if (!allowed) {
      const actionLabel = action === "approve" ? "onaylama" : action === "reject" ? "reddetme" : "geri gönderme";
      throw new ExpenseReportAdminError(`Bu onaycı için ${actionLabel} yetkisi tanımlanmamış.`, 403);
    }
  }

  private async notifyByEmailIfSet(notifyEmail: string | null, subject: string, text: string) {
    if (!notifyEmail) {
      return;
    }
    try {
      await notificationService.sendEmail({ to: notifyEmail, subject, text });
    } catch (error) {
      console.error("Masraf bildirimi bilgilendirme e-postası gönderilemedi.", error);
    }
  }

  async getDetail(id: string, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const report = await this.findOrThrow(id);
    await this.assertCanView(report, user);
    const detail = mapDetail(report);

    const approverIds = [...new Set(detail.approvals.map((approval) => approval.approverUserId))];
    const delegateNamesByApprover = await delegationService.getActiveDelegateNamesForGrantors(user.tenantId, approverIds);
    for (const approval of detail.approvals) {
      approval.delegateNames = delegateNamesByApprover[approval.approverUserId] ?? [];
    }
    if (detail.currentApproverUserId) {
      detail.currentApproverDelegateNames = delegateNamesByApprover[detail.currentApproverUserId] ?? [];
    }

    const actorIds = [...new Set(detail.lifecycleEvents.map((event) => event.actorUserId).filter((value): value is string => Boolean(value)))];
    const actors = await this.repository.findUserNamesByIds(actorIds);
    const actorNameById = new Map(actors.map((actor) => [actor.id, actor.name]));
    for (const event of detail.lifecycleEvents) {
      event.actorName = event.actorUserId ? (actorNameById.get(event.actorUserId) ?? null) : null;
    }

    return detail;
  }

  async createDraft(employeeUserId: string): Promise<AdminExpenseReportDetail> {
    const created = await this.repository.createDraft({ employeeUserId });
    return mapDetail(created);
  }

  async updateNote(input: AdminUpdateExpenseReportInput, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const parsed = updateSchema.parse(input);
    const report = await this.findOrThrow(parsed.id);
    this.assertOwnerEditable(report, user);

    const updated = await this.repository.updateNote({ id: parsed.id, note: parsed.note ?? null });
    return mapDetail(updated);
  }

  async discardDraft(id: string, user: RequestingUser): Promise<void> {
    const report = await this.findOrThrow(id);
    this.assertOwnerEditable(report, user);
    await this.repository.softDelete({ id, actorUserId: user.id });
  }

  async addItem(reportId: string, input: AdminAddExpenseReportItemInput, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const report = await this.findOrThrow(reportId);
    this.assertOwnerEditable(report, user);

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
      vatRate: parsed.vatRate ?? null,
      vatAmount: parsed.vatAmount ?? null,
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
    this.assertOwnerEditable(report, user);

    const updated = await this.repository.removeItem({ expenseReportId: reportId, itemId, actorUserId: user.id });
    return mapDetail(updated);
  }

  async submit(id: string, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const report = await this.findOrThrow(id);
    this.assertOwnerEditable(report, user);

    if (report.items.length === 0) {
      throw new ExpenseReportAdminError("En az bir harcama kalemi eklemelisiniz.", 400);
    }

    const chain = await expenseSettingsService.listApprovalChain();
    if (chain.length === 0) {
      throw new ExpenseReportAdminError("Masraf onay akışı tanımlanmamış. Lütfen sistem yöneticinize başvurun.", 400);
    }

    const round = report.status === "RETURNED" ? report.currentRound + 1 : 1;
    const steps = chain.map((step) => ({
      stepOrder: step.stepOrder,
      approverUserId: step.approverUserId,
      notifyEmail: step.notifyEmail,
      description: step.description,
      canApprove: step.canApprove,
      canReject: step.canReject,
      canReturn: step.canReturn,
    }));

    const updated = await this.repository.submit({ id, round, steps, actorUserId: user.id });
    const firstStep = chain[0];

    await notificationService.createForRecipients({
      recipients: [{ id: firstStep.approverUserId }],
      type: "EXPENSE_REPORT_SUBMITTED",
      title: "Yeni masraf bildirimi onayınızı bekliyor",
      message: `${updated.employee.name} tarafından gönderilen ${updated.reportNumber} numaralı masraf bildirimi (${updated.totalAmount.toNumber()} ${updated.currency}) onayınızı bekliyor.`,
      linkUrl: "/admin/expense-reports/approvals",
      channels: ["IN_APP", "EMAIL"],
    });
    await this.notifyByEmailIfSet(
      firstStep.notifyEmail,
      "Yeni masraf bildirimi onayınızı bekliyor",
      `${updated.employee.name} tarafından gönderilen ${updated.reportNumber} numaralı masraf bildirimi onayınızı bekliyor.`,
    );

    return mapDetail(updated);
  }

  async approve(id: string, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const report = await this.findOrThrow(id);
    await this.assertCanDecide(report, user);
    const approval = await this.findCurrentApprovalOrThrow(id);
    this.assertActionAllowed(approval, "approve", user);

    const updated = await this.repository.approveCurrentStep({
      id,
      approvalId: approval.id,
      round: approval.round,
      stepOrder: approval.stepOrder,
      actorUserId: user.id,
    });

    if (updated.status === "APPROVED") {
      try {
        const vatAmount = updated.items.reduce((sum, line) => sum + (line.vatAmount?.toNumber() ?? 0), 0);
        await financeAccountEntryService.postExpenseReportAccrual({
          expenseReportId: updated.id,
          amount: updated.totalAmount.toNumber(),
          vatAmount,
          currency: updated.currency,
          entryAt: updated.decidedAt ?? new Date(),
          reportNumber: updated.reportNumber,
        });
      } catch (error) {
        console.error("Masraf bildirimi tahakkuk kaydı oluşturulamadı.", error);
      }

      await notificationService.createForRecipients({
        recipients: [{ id: updated.employeeUserId }],
        type: "EXPENSE_REPORT_DECIDED",
        title: "Masraf bildiriminiz onaylandı",
        message: `${updated.reportNumber} numaralı masraf bildiriminiz tüm onaycılar tarafından onaylandı ve muhasebeleştirilmeye alındı.`,
        linkUrl: "/admin/expense-reports",
        channels: ["IN_APP", "EMAIL"],
      });
    } else {
      const nextApproval = updated.approvals.find(
        (item) => item.round === updated.currentRound && item.stepOrder === updated.currentApprovalStepOrder,
      );

      if (nextApproval) {
        await notificationService.createForRecipients({
          recipients: [{ id: nextApproval.approverUserId }],
          type: "EXPENSE_REPORT_SUBMITTED",
          title: "Yeni masraf bildirimi onayınızı bekliyor",
          message: `${updated.employee.name} tarafından gönderilen ${updated.reportNumber} numaralı masraf bildirimi (${updated.totalAmount.toNumber()} ${updated.currency}) onayınızı bekliyor.`,
          linkUrl: "/admin/expense-reports/approvals",
          channels: ["IN_APP", "EMAIL"],
        });
        await this.notifyByEmailIfSet(
          nextApproval.notifyEmail,
          "Yeni masraf bildirimi onayınızı bekliyor",
          `${updated.employee.name} tarafından gönderilen ${updated.reportNumber} numaralı masraf bildirimi onayınızı bekliyor.`,
        );
      }
    }

    return mapDetail(updated);
  }

  async reimburse(input: AdminReimburseExpenseReportInput, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const parsed = reimburseSchema.parse(input);
    const report = await this.findOrThrow(parsed.id);

    if (!user.hasManage) {
      throw new ExpenseReportAdminError("Bu masrafı ödeme yetkiniz yok.", 403);
    }
    if (report.status !== "APPROVED") {
      throw new ExpenseReportAdminError("Yalnızca onaylanmış bildirimler ödenebilir.", 400);
    }
    if (report.reimbursedAt) {
      throw new ExpenseReportAdminError("Bu masraf bildirimi zaten ödendi.", 400);
    }

    const transactionAt = parsed.transactionAt ?? new Date().toISOString();

    const cashTransaction = await cashTransactionsService.createTransaction({
      accountId: parsed.financialAccountId,
      direction: "OUT",
      sourceType: "EXPENSE_REPORT",
      sourceReferenceId: `expense-report:${report.id}`,
      amount: report.totalAmount.toNumber(),
      transactionAt,
      title: `Masraf ödemesi • ${report.reportNumber}`,
      note: parsed.note ?? null,
      counterpartyName: report.employee.name,
      recordedByUserId: user.id,
    });

    try {
      await financeAccountEntryService.syncFromExpenseReportSettlement(cashTransaction.id, report.id);
    } catch (error) {
      console.error("Masraf ödemesi defter kaydı oluşturulamadı.", error);
    }

    const updated = await this.repository.markReimbursed({ id: report.id, actorUserId: user.id });

    await notificationService.createForRecipients({
      recipients: [{ id: updated.employeeUserId }],
      type: "EXPENSE_REPORT_DECIDED",
      title: "Masraf bildiriminiz ödendi",
      message: `${updated.reportNumber} numaralı masraf bildiriminiz ödendi.`,
      linkUrl: "/admin/expense-reports",
      channels: ["IN_APP", "EMAIL"],
    });

    return mapDetail(updated);
  }

  async reject(input: AdminRejectExpenseReportInput, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const parsed = rejectSchema.parse(input);
    const report = await this.findOrThrow(parsed.id);
    await this.assertCanDecide(report, user);
    const approval = await this.findCurrentApprovalOrThrow(parsed.id);
    this.assertActionAllowed(approval, "reject", user);

    const updated = await this.repository.rejectCurrentStep({
      id: parsed.id,
      approvalId: approval.id,
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

  async return(input: AdminReturnExpenseReportInput, user: RequestingUser): Promise<AdminExpenseReportDetail> {
    const parsed = returnSchema.parse(input);
    const report = await this.findOrThrow(parsed.id);
    await this.assertCanDecide(report, user);
    const approval = await this.findCurrentApprovalOrThrow(parsed.id);
    this.assertActionAllowed(approval, "return", user);

    const updated = await this.repository.returnCurrentStep({
      id: parsed.id,
      approvalId: approval.id,
      actorUserId: user.id,
      decisionNote: parsed.decisionNote,
    });

    await notificationService.createForRecipients({
      recipients: [{ id: updated.employeeUserId }],
      type: "EXPENSE_REPORT_DECIDED",
      title: "Masraf bildiriminiz düzenlemeniz için geri gönderildi",
      message: `${updated.reportNumber} numaralı masraf bildiriminiz düzenlenmesi için geri gönderildi: ${parsed.decisionNote}`,
      linkUrl: "/admin/expense-reports",
      channels: ["IN_APP", "EMAIL"],
    });

    return mapDetail(updated);
  }
}

export const expenseReportService = new ExpenseReportService(expenseReportRepository);
