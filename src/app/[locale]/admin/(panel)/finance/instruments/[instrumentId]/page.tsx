import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { financialAccountsService } from "@/modules/finance/services/financial-accounts.service";
import { resolveNegotiableInstrumentCopy } from "@/modules/finance/services/negotiable-instrument-copy.resolver";
import { negotiableInstrumentService } from "@/modules/finance/services/negotiable-instrument.service";
import { getCurrentUserFromContext } from "@/modules/identity/services/auth-context.service";
import { NegotiableInstrumentsManager } from "@/ui/admin/negotiable-instruments-manager";

export default async function AdminNegotiableInstrumentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; instrumentId: string }>;
}) {
  const { locale, instrumentId } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const user = await getCurrentUserFromContext();
  if (!user) {
    notFound();
  }

  const [detail, accountOptions] = await Promise.all([
    negotiableInstrumentService.getInstrumentDetail(instrumentId, locale),
    financialAccountsService.listAccountOptions(),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <NegotiableInstrumentsManager
      locale={locale}
      mode="detail"
      detail={detail}
      accountOptions={accountOptions}
      copy={resolveNegotiableInstrumentCopy(locale)}
    />
  );
}
