"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDeleteButton } from "@/ui/admin/confirm-delete-button";

type Labels = {
  title: string;
  search: string;
  page: string;
  prev: string;
  next: string;
  sort: string;
  sortPriority: string;
  sortLatest: string;
  sortOldest: string;
  clearFilters: string;
  summaryTitle: string;
  summaryCurrent: string;
  summaryPending: string;
  summaryAnswered: string;
  summaryOverdue: string;
  questionManager: string;
  status: string;
  statusAll: string;
  statusPending: string;
  statusAnswered: string;
  answerLabel: string;
  answerQuestion: string;
  save: string;
  removeQuestion: string;
  emptyQuestions: string;
  opFailed: string;
  validationRequired: string;
  overdue: string;
  askedAt: string;
  answeredBy: string;
  answeredAt: string;
  operationsTitle: string;
  searchHistory: string;
  bulkActions: string;
  selectedCount: string;
  selectAllOnPage: string;
  clearSelection: string;
  bulkAnswer: string;
  bulkDelete: string;
  bulkAnswerPlaceholder: string;
  cancel: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
};
type ProductQuestion = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  isAnswered: boolean;
};

type ProductQuestionsManagerProps = {
  labels: Labels;
  initialFocusQuestionId?: string | null;
  slaHours?: number;
  initialQuery: {
    status: "all" | "pending" | "answered";
    sort: "priority" | "latest" | "oldest";
    search: string;
    page: number;
  };
  initialQuestionResult: {
    items: ProductQuestion[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  initialStats: {
    total: number;
    pending: number;
    answered: number;
    overdue: number;
  };
};

export function ProductQuestionsManager({
  labels,
  initialQuestionResult,
  initialQuery,
  initialStats,
  initialFocusQuestionId = null,
  slaHours = 24,
}: ProductQuestionsManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [referenceTime, setReferenceTime] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [questionStatus, setQuestionStatus] = useState<"all" | "pending" | "answered">(initialQuery.status);
  const [questionSort, setQuestionSort] = useState<"priority" | "latest" | "oldest">(initialQuery.sort);
  const [questionSearch, setQuestionSearch] = useState(initialQuery.search);
  const [questionPage, setQuestionPage] = useState(initialQuery.page);
  const [questionTotalPages, setQuestionTotalPages] = useState(initialQuestionResult.totalPages);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questions, setQuestions] = useState<ProductQuestion[]>(initialQuestionResult.items);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialQuestionResult.items.map((item) => [item.id, item.answer ?? ""])),
  );
  const [pinnedQuestionId, setPinnedQuestionId] = useState<string | null>(initialFocusQuestionId);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [bulkAnswerDraft, setBulkAnswerDraft] = useState("");
  const [stats, setStats] = useState<{ total: number; pending: number; answered: number; overdue: number }>(
    initialStats,
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReferenceTime(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  function persistSearchHistory(term: string) {
    const normalized = term.trim();
    if (!normalized) {
      return;
    }

    setSearchHistory((prev) => {
      const next = [normalized, ...prev.filter((item) => item !== normalized)].slice(0, 5);
      window.localStorage.setItem("admin:question-search-history", JSON.stringify(next));
      return next;
    });
  }

  function mergeQuestionDrafts(items: ProductQuestion[]) {
    setAnswerDrafts((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (next[item.id] === undefined) {
          next[item.id] = item.answer ?? "";
        }
      }
      return next;
    });
  }

  async function fetchStats() {
    try {
      const response = await fetch("/api/admin/products/questions/stats");
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        total: number;
        pending: number;
        answered: number;
        overdue: number;
      };

      setStats(payload);
    } catch {
      // ignore stats refresh failures to keep moderation flow uninterrupted
    }
  }

  function toggleQuestionSelection(questionId: string) {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
    );
  }

  function selectAllOnPage() {
    const ids = questions.map((item) => item.id);
    setSelectedQuestionIds(ids);
  }

  function clearSelection() {
    setSelectedQuestionIds([]);
  }

  async function bulkModerateQuestions(action: "answer" | "delete") {
    if (selectedQuestionIds.length === 0) {
      return;
    }

    if (action === "answer" && bulkAnswerDraft.trim().length < 3) {
      setError(labels.validationRequired);
      return;
    }

    setQuestionLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/products/questions/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedQuestionIds,
          action,
          answer: action === "answer" ? bulkAnswerDraft.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      setSelectedQuestionIds([]);
      if (action === "answer") {
        setBulkAnswerDraft("");
      }

      await fetchQuestions({
        status: questionStatus,
        sort: questionSort,
        search: questionSearch,
        page: questionPage,
        questionId: pinnedQuestionId,
      });
      await fetchStats();
    } catch {
      setError(labels.opFailed);
    } finally {
      setQuestionLoading(false);
    }
  }

  useEffect(() => {
    if (!pinnedQuestionId) {
      return;
    }

    const target = document.getElementById(`question-${pinnedQuestionId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [questions, pinnedQuestionId]);

  async function fetchQuestions(params: {
    status: "all" | "pending" | "answered";
    sort: "priority" | "latest" | "oldest";
    search: string;
    page: number;
    questionId?: string | null;
  }) {
    setQuestionLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.set("status", params.status);
      query.set("sort", params.sort);
      query.set("page", String(params.page));
      query.set("pageSize", "10");
      if (params.search.trim()) {
        query.set("search", params.search.trim());
      }
      if (params.questionId) {
        query.set("questionId", params.questionId);
      }

      const nextUrl = query.toString().length > 0 ? `${pathname}?${query.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });

      const response = await fetch(`/api/admin/products/questions?${query.toString()}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      const payload = (await response.json()) as {
        items?: ProductQuestion[];
        page?: number;
        totalPages?: number;
      };
      const nextItems = payload.items ?? [];
      setQuestions(nextItems);
      mergeQuestionDrafts(nextItems);
      setSelectedQuestionIds([]);
      setQuestionPage(payload.page ?? 1);
      setQuestionTotalPages(payload.totalPages ?? 1);
    } catch {
      setError(labels.opFailed);
    } finally {
      setQuestionLoading(false);
    }
  }

  async function answerQuestion(questionId: string) {
    const answer = (answerDrafts[questionId] ?? "").trim();
    if (!answer) {
      setError(labels.validationRequired);
      return;
    }

    setQuestionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/questions/${questionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answer }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      setAnswerDrafts((prev) => ({ ...prev, [questionId]: "" }));
      await fetchQuestions({
        status: questionStatus,
        sort: questionSort,
        search: questionSearch,
        page: questionPage,
        questionId: pinnedQuestionId,
      });
      await fetchStats();
    } catch {
      setError(labels.opFailed);
    } finally {
      setQuestionLoading(false);
    }
  }

  async function removeQuestion(questionId: string) {
    setQuestionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/questions/${questionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? labels.opFailed);
        return;
      }

      await fetchQuestions({
        status: questionStatus,
        sort: questionSort,
        search: questionSearch,
        page: questionPage,
        questionId: pinnedQuestionId,
      });
      await fetchStats();
    } catch {
      setError(labels.opFailed);
    } finally {
      setQuestionLoading(false);
    }
  }

  function applyQuestionFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPinnedQuestionId(null);
    setQuestionPage(1);
    persistSearchHistory(questionSearch);
    void fetchQuestions({
      status: questionStatus,
      sort: questionSort,
      search: questionSearch,
      page: 1,
      questionId: null,
    });
  }

  function runQuestionSearch(term: string) {
    const normalized = term.trim();
    if (!normalized) {
      return;
    }

    setPinnedQuestionId(null);
    setQuestionSearch(normalized);
    setQuestionPage(1);
    persistSearchHistory(normalized);
    void fetchQuestions({
      status: questionStatus,
      sort: questionSort,
      search: normalized,
      page: 1,
      questionId: null,
    });
  }

  function clearFilters() {
    setPinnedQuestionId(null);
    setQuestionStatus("pending");
    setQuestionSort("priority");
    setQuestionSearch("");
    setQuestionPage(1);
    void fetchQuestions({
      status: "pending",
      sort: "priority",
      search: "",
      page: 1,
      questionId: null,
    });
  }

  function goToQuestionPage(nextPage: number) {
    setQuestionPage(nextPage);
    void fetchQuestions({
      status: questionStatus,
      sort: questionSort,
      search: questionSearch,
      page: nextPage,
      questionId: pinnedQuestionId,
    });
  }

  function isOverdue(item: ProductQuestion) {
    if (item.isAnswered) {
      return false;
    }

    const askedAtMs = new Date(item.askedAt).getTime();
    if (Number.isNaN(askedAtMs)) {
      return false;
    }

    const slaMs = Math.max(1, slaHours) * 60 * 60 * 1000;
    return referenceTime - askedAtMs > slaMs;
  }

  const overdueCount = questions.filter((item) => isOverdue(item)).length;
  const answeredCount = questions.filter((item) => item.isAnswered).length;
  const pendingCount = questions.length - answeredCount;

  function formatQuestionDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--color-border)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--color-text)]">{labels.questionManager}</h2>
        </div>
      </div>

      <div className="p-5">
        {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="rounded-xl border border-[color:var(--color-border)]">
          <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)] px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{labels.questionManager}</h3>
                <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{labels.summaryTitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-[color:var(--color-text)]">
                  {labels.summaryCurrent}: {questions.length}
                </span>
                <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-[color:var(--color-text)]">
                  {labels.summaryPending}: {pendingCount}
                </span>
                <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-[color:var(--color-text)]">
                  {labels.summaryAnswered}: {answeredCount}
                </span>
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-medium text-red-700">
                  {labels.summaryOverdue}: {overdueCount}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-[color:var(--color-text-muted)]">{labels.status}</span>
                <Select
                  value={questionStatus}
                  onValueChange={(value: "all" | "pending" | "answered") => {
                    setPinnedQuestionId(null);
                    setQuestionStatus(value);
                    setQuestionPage(1);
                    void fetchQuestions({
                      status: value,
                      sort: questionSort,
                      search: questionSearch,
                      page: 1,
                      questionId: null,
                    });
                  }}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{labels.statusAll}</SelectItem>
                    <SelectItem value="pending">{labels.statusPending}</SelectItem>
                    <SelectItem value="answered">{labels.statusAnswered}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-[color:var(--color-text-muted)]">{labels.sort}</span>
                <Select
                  value={questionSort}
                  onValueChange={(value: "priority" | "latest" | "oldest") => {
                    setPinnedQuestionId(null);
                    setQuestionSort(value);
                    setQuestionPage(1);
                    void fetchQuestions({
                      status: questionStatus,
                      sort: value,
                      search: questionSearch,
                      page: 1,
                      questionId: null,
                    });
                  }}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">{labels.sortPriority}</SelectItem>
                    <SelectItem value="latest">{labels.sortLatest}</SelectItem>
                    <SelectItem value="oldest">{labels.sortOldest}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-start lg:justify-end">
                <Button type="button" variant="secondary" onClick={clearFilters} disabled={questionLoading}>
                  {labels.clearFilters}
                </Button>
              </div>
            </div>
          </div>

          <form className="border-b border-[color:var(--color-border)] px-4 py-3" onSubmit={applyQuestionFilters}>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input
                value={questionSearch}
                onChange={(event) => {
                  setPinnedQuestionId(null);
                  setQuestionSearch(event.target.value);
                }}
                placeholder={labels.search}
              />
              <Button type="submit" variant="secondary" disabled={questionLoading}>
                {labels.search}
              </Button>
            </div>
            {searchHistory.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--color-text-muted)]">
                <span className="py-1">{labels.searchHistory}:</span>
                {searchHistory.map((term) => (
                  <Button
                    key={term}
                    type="button"
                    variant="secondary"
                    className="h-7 rounded-full px-3 text-xs"
                    disabled={questionLoading}
                    onClick={() => {
                      runQuestionSearch(term);
                    }}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            ) : null}
          </form>

          <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-soft)]/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.operationsTitle}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-[color:var(--color-text)]">
                {labels.summaryCurrent}: {stats?.total ?? "-"}
              </span>
              <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-[color:var(--color-text)]">
                {labels.summaryPending}: {stats?.pending ?? "-"}
              </span>
              <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-[color:var(--color-text)]">
                {labels.summaryAnswered}: {stats?.answered ?? "-"}
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-medium text-red-700">
                {labels.summaryOverdue}: {stats?.overdue ?? "-"}
              </span>
            </div>
          </div>

          <div className="border-b border-[color:var(--color-border)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{labels.bulkActions}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-[color:var(--color-text)]">
                {labels.selectedCount}: {selectedQuestionIds.length}
              </span>
              <Button type="button" variant="secondary" size="sm" disabled={questionLoading || questions.length === 0} onClick={selectAllOnPage}>
                {labels.selectAllOnPage}
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={questionLoading || selectedQuestionIds.length === 0} onClick={clearSelection}>
                {labels.clearSelection}
              </Button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <Input
                value={bulkAnswerDraft}
                onChange={(event) => setBulkAnswerDraft(event.target.value)}
                placeholder={labels.bulkAnswerPlaceholder}
              />
              <Button
                type="button"
                size="sm"
                disabled={questionLoading || selectedQuestionIds.length === 0}
                onClick={() => void bulkModerateQuestions("answer")}
              >
                {labels.bulkAnswer}
              </Button>
              <ConfirmDeleteButton
                type="button"
                size="sm"
                variant="destructive"
                disabled={questionLoading || selectedQuestionIds.length === 0}
                onConfirm={() => void bulkModerateQuestions("delete")}
                title={labels.deleteConfirmTitle}
                description={labels.deleteConfirmDescription}
                confirmLabel={labels.bulkDelete}
                cancelLabel={labels.cancel}
              >
                {labels.bulkDelete}
              </ConfirmDeleteButton>
            </div>
          </div>

          <div className="divide-y divide-[color:var(--color-border)]">
            {questions.length === 0 ? (
              <p className="p-4 text-sm text-[color:var(--color-text-muted)]">{labels.emptyQuestions}</p>
            ) : (
              questions.map((item) => (
                <article
                  key={item.id}
                  id={`question-${item.id}`}
                  className={`grid gap-4 p-4 transition-colors ${pinnedQuestionId === item.id ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-[color:var(--color-border)]"
                        checked={selectedQuestionIds.includes(item.id)}
                        onChange={() => toggleQuestionSelection(item.id)}
                        aria-label={`${labels.selectedCount}: ${item.productName}`}
                      />
                      <div>
                        <p className="font-semibold text-[color:var(--color-text)]">{item.productName}</p>
                        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                          {item.productSlug} • {item.askedBy}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[color:var(--color-text-muted)]">
                          <span className="rounded-full bg-[color:var(--color-bg-soft)] px-2 py-1">
                            {labels.askedAt}: {formatQuestionDate(item.askedAt)}
                          </span>
                          {item.isAnswered ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                              {labels.answeredAt}: {item.answeredAt ? formatQuestionDate(item.answeredAt) : "-"}
                            </span>
                          ) : null}
                          {item.answeredBy ? (
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                              {labels.answeredBy}: {item.answeredBy}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOverdue(item) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                          {labels.overdue}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-[color:var(--color-border)] px-2 py-1 text-xs text-[color:var(--color-text-muted)]">
                        {item.isAnswered ? labels.statusAnswered : labels.statusPending}
                      </span>
                    </div>
                  </div>

                  <p className="rounded-xl bg-[color:var(--color-bg-soft)] p-4 text-sm leading-6 text-[color:var(--color-text)]">{item.question}</p>

                  {item.answer ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{labels.statusAnswered}</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-950">{item.answer}</p>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Label>{labels.answerLabel}</Label>
                    <Textarea
                      value={answerDrafts[item.id] ?? ""}
                      onChange={(event) => setAnswerDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      placeholder={labels.answerLabel}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={questionLoading} onClick={() => answerQuestion(item.id)}>
                      {item.isAnswered ? labels.save : labels.answerQuestion}
                    </Button>
                    <ConfirmDeleteButton
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={questionLoading}
                      onConfirm={() => removeQuestion(item.id)}
                      title={labels.deleteConfirmTitle}
                      description={labels.deleteConfirmDescription}
                      confirmLabel={labels.removeQuestion}
                      cancelLabel={labels.cancel}
                    >
                      {labels.removeQuestion}
                    </ConfirmDeleteButton>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[color:var(--color-border)] px-4 py-3">
            <Button
              type="button"
              variant="secondary"
              disabled={questionLoading || questionPage <= 1}
              onClick={() => goToQuestionPage(Math.max(1, questionPage - 1))}
            >
              {labels.prev}
            </Button>
            <span className="text-sm text-[color:var(--color-text-muted)]">
              {labels.page} {questionPage}/{Math.max(1, questionTotalPages)}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={questionLoading || questionPage >= Math.max(1, questionTotalPages)}
              onClick={() => goToQuestionPage(Math.min(Math.max(1, questionTotalPages), questionPage + 1))}
            >
              {labels.next}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
