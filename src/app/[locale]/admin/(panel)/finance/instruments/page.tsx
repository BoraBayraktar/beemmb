import { notFound } from "next/navigation";

import { resolveNegotiableInstrumentCopy } from "@/modules/finance/services/negotiable-instrument-copy.resolver";
import { negotiableInstrumentService } from "@/modules/finance/services/negotiable-instrument.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { isLocale } from "@/lib/i18n";
import { NegotiableInstrumentsManager } from "@/ui/admin/negotiable-instruments-manager";

export default async function AdminNegotiableInstrumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; direction?: string; status?: string; overdueOnly?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const direction =
    resolvedSearchParams.direction === "RECEIVABLE" || resolvedSearchParams.direction === "PAYABLE"
      ? resolvedSearchParams.direction
      : "all";
  const status =
    resolvedSearchParams.status === "PORTFOLIO" ||
    resolvedSearchParams.status === "COLLECTED" ||
    resolvedSearchParams.status === "PAID" ||
    resolvedSearchParams.status === "BOUNCED" ||
    resolvedSearchParams.status === "CANCELLED"
      ? resolvedSearchParams.status
      : "all";

  const result = await negotiableInstrumentService.listInstruments(
    {
      search: resolvedSearchParams.search,
      direction,
      status,
      overdueOnly: resolvedSearchParams.overdueOnly === "1",
    },
    locale,
  );

  return (
    <NegotiableInstrumentsManager
      locale={locale}
      mode="list"
      result={result}
      initialSearch={resolvedSearchParams.search ?? ""}
      initialDirection={direction}
      initialStatus={status}
      initialOverdueOnly={resolvedSearchParams.overdueOnly === "1"}
      copy={resolveNegotiableInstrumentCopy(locale)}
    />
  );
}
