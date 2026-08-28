import { notFound } from "next/navigation";

import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { runWithTenantContext } from "@/lib/tenant-context";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { rbacService } from "@/modules/identity/services/rbac.service";
import { ProductQuestionsManager } from "@/ui/admin/product-questions-manager";

function getQuestionSlaHours() {
  const parsed = Number(process.env.PRODUCT_QUESTION_SLA_HOURS ?? "24");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24;
  }

  return parsed;
}

export default async function AdminProductQuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    questionId?: string;
    status?: string;
    sort?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const { questionId, status, sort, search, page } = await searchParams;

  const initialStatus = status === "pending" || status === "answered" ? status : "all";
  const initialSort = sort === "latest" || sort === "oldest" ? sort : "priority";
  const initialPage = Number(page ?? "1");
  const initialSearch = typeof search === "string" ? search.trim() : "";
  const initialQuestionPage = Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale as Locale);
  const user = await getCurrentUserFromContext();
  const questionSlaHours = getQuestionSlaHours();

  if (!user) {
    notFound();
  }

  if (!(await rbacService.hasPermission(user, "productQuestions.read"))) {
    notFound();
  }

  const [questionResult, questionStats] = await runWithTenantContext(
    { tenantId: user.tenantId, isPlatformOperator: user.isSuperAdmin },
    () => Promise.all([
      catalogAdminService.listProductQuestions({
        status: initialStatus,
        sort: initialSort,
        search: initialSearch || undefined,
        questionId: questionId ?? undefined,
        page: initialQuestionPage,
        pageSize: 12,
      }),
      catalogAdminService.getProductQuestionStats(questionSlaHours),
    ]),
  );

  return (
    <ProductQuestionsManager
      key="product-questions"
      initialFocusQuestionId={questionId ?? null}
      slaHours={questionSlaHours}
      initialQuery={{
        status: initialStatus,
        sort: initialSort,
        search: initialSearch,
        page: initialQuestionPage,
      }}
      initialQuestionResult={questionResult}
      initialStats={{
        total: questionStats.total,
        pending: questionStats.pending,
        answered: questionStats.answered,
        overdue: questionStats.overdue,
      }}
      labels={{
        title: dictionary.admin.questionManager,
        search: dictionary.admin.search,
        page: dictionary.admin.page,
        prev: dictionary.admin.prev,
        next: dictionary.admin.next,
        sort: dictionary.admin.sort,
        sortPriority: dictionary.admin.sortPriority,
        sortLatest: dictionary.admin.sortLatest,
        sortOldest: dictionary.admin.sortOldest,
        clearFilters: dictionary.admin.clearFilters,
        summaryTitle: dictionary.admin.summaryTitle,
        summaryCurrent: dictionary.admin.summaryCurrent,
        summaryPending: dictionary.admin.summaryPending,
        summaryAnswered: dictionary.admin.summaryAnswered,
        summaryOverdue: dictionary.admin.summaryOverdue,
        opFailed: dictionary.admin.operationFailed,
        validationRequired: dictionary.admin.validationRequired,
        questionManager: dictionary.admin.questionManager,
        status: dictionary.admin.status,
        statusAll: dictionary.admin.statusAll,
        statusPending: dictionary.admin.statusPending,
        statusAnswered: dictionary.admin.statusAnswered,
        answerLabel: dictionary.admin.answerLabel,
        answerQuestion: dictionary.admin.answerQuestion,
        removeQuestion: dictionary.admin.removeQuestion,
        emptyQuestions: dictionary.admin.emptyQuestions,
        save: dictionary.admin.save,
        overdue: dictionary.admin.questionOverdue,
        askedAt: dictionary.admin.askedAt,
        answeredBy: dictionary.admin.answeredBy,
        answeredAt: dictionary.admin.answeredAt,
        operationsTitle: dictionary.admin.questionOpsTitle,
        searchHistory: dictionary.admin.searchHistory,
        bulkActions: dictionary.admin.bulkActions,
        selectedCount: dictionary.admin.selectedCount,
        selectAllOnPage: dictionary.admin.selectAllOnPage,
        clearSelection: dictionary.admin.clearSelection,
        bulkAnswer: dictionary.admin.bulkAnswer,
        bulkDelete: dictionary.admin.bulkDelete,
        bulkAnswerPlaceholder: dictionary.admin.bulkAnswerPlaceholder,
        cancel: dictionary.admin.cancel,
        deleteConfirmTitle: dictionary.admin.deleteConfirmTitle,
        deleteConfirmDescription: dictionary.admin.deleteConfirmDescription,
      }}
    />
  );
}
