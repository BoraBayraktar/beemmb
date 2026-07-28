import { z } from "zod";

import type {
  AdminFinanceReportDateRange,
  AdminFinanceReportDateRangeQuery,
} from "@/modules/finance/contracts/finance-report-date-range.contract";

const dateOnlySchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);

function startOfUtcDayFromDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function endOfUtcDayFromDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

export function resolveDefaultFinanceReportDateRange(referenceDate = new Date()): AdminFinanceReportDateRange {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const fromDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const toDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const fromIso = fromDate.toISOString().slice(0, 10);
  const toIso = toDate.toISOString().slice(0, 10);

  return { fromIso, toIso, fromDate, toDate };
}

export function parseFinanceReportDateRangeQuery(
  query: AdminFinanceReportDateRangeQuery = {},
  referenceDate = new Date(),
): AdminFinanceReportDateRange {
  const defaults = resolveDefaultFinanceReportDateRange(referenceDate);

  const fromRaw = query.from?.trim();
  const toRaw = query.to?.trim();

  if (!fromRaw && !toRaw) {
    return defaults;
  }

  const fromIso = fromRaw && dateOnlySchema.safeParse(fromRaw).success ? fromRaw : defaults.fromIso;
  const toIso = toRaw && dateOnlySchema.safeParse(toRaw).success ? toRaw : defaults.toIso;

  let fromDate = startOfUtcDayFromDateOnly(fromIso);
  let toDate = endOfUtcDayFromDateOnly(toIso);

  if (fromDate.getTime() > toDate.getTime()) {
    return {
      fromIso: toIso,
      toIso: fromIso,
      fromDate: startOfUtcDayFromDateOnly(toIso),
      toDate: endOfUtcDayFromDateOnly(fromIso),
    };
  }

  return { fromIso, toIso, fromDate, toDate };
}

export function formatFinanceReportDateRangeLabel(fromIso: string, toIso: string) {
  const formatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });
  return `${formatter.format(startOfUtcDayFromDateOnly(fromIso))} – ${formatter.format(startOfUtcDayFromDateOnly(toIso))}`;
}

export function isInstantInFinanceReportRange(
  value: string | Date | null | undefined,
  range: AdminFinanceReportDateRange,
) {
  if (!value) {
    return false;
  }

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp >= range.fromDate.getTime() && timestamp <= range.toDate.getTime();
}

export function appendFinanceReportDateRangeDescription(baseDescription: string, periodHint: string, range: AdminFinanceReportDateRange) {
  const label = formatFinanceReportDateRangeLabel(range.fromIso, range.toIso);
  return `${baseDescription} ${periodHint}: ${label}`;
}
