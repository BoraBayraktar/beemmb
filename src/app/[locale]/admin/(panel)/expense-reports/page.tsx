import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { expenseReportService } from "@/modules/expense-reports/services/expense-report.service";
import { expenseSettingsService } from "@/modules/expense-reports/services/expense-settings.service";
import { ExpenseReportManager } from "@/ui/admin/expense-report-manager";

export default async function AdminExpenseReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "expenseReports.submit"))) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const admin = dictionary.admin;

  const [result, categories] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      expenseReportService.listMine(user.id, { scope: "mine", page: 1, pageSize: 50 }),
      expenseSettingsService.listActiveCategories(),
    ]),
  );

  return (
    <ExpenseReportManager
      locale={locale}
      result={result}
      categories={categories}
      copy={{
        title: admin.expenseReportsTitle,
        description: admin.expenseReportsDescription,
        empty: admin.expenseReportsEmpty,
        emptyCta: admin.expenseReportsEmptyCta,
        create: admin.expenseReportCreate,
        statusDraft: admin.expenseReportStatusDraft,
        statusSubmitted: admin.expenseReportStatusSubmitted,
        statusApproved: admin.expenseReportStatusApproved,
        statusRejected: admin.expenseReportStatusRejected,
        total: admin.expenseReportTotal,
        itemCount: admin.expenseReportItemCount,
        addItem: admin.expenseReportAddItem,
        submit: admin.expenseReportSubmit,
        submitConfirm: admin.expenseReportSubmitConfirm,
        discardDraft: admin.expenseReportDiscardDraft,
        dateLabel: admin.expenseItemDateLabel,
        receiptNoLabel: admin.expenseItemReceiptNoLabel,
        amountLabel: admin.expenseItemAmountLabel,
        vatRateLabel: admin.expenseItemVatRateLabel,
        vatAmountLabel: admin.expenseItemVatAmountLabel,
        currencyLabel: admin.expenseItemCurrencyLabel,
        vendorLabel: admin.expenseItemVendorLabel,
        categoryLabel: admin.expenseItemCategoryLabel,
        descriptionLabel: admin.expenseItemDescriptionLabel,
        photoCapture: admin.expenseItemPhotoCapture,
        photoUploading: admin.expenseItemPhotoUploading,
        ocrPrefilled: admin.expenseItemOcrPrefilled,
        ocrFailedManualEntry: admin.expenseItemOcrFailedManualEntry,
        ocrSkipped: admin.expenseItemOcrSkipped,
        ocrConfidenceLabel: admin.expenseItemOcrConfidenceLabel,
        itemRemove: admin.expenseItemRemove,
      }}
    />
  );
}
