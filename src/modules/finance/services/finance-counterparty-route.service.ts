import { cariService } from "@/modules/cari/services/cari.service";

export class FinanceCounterpartyRouteService {
  async resolveCounterpartyLedgerPath(id: string): Promise<string | null> {
    const cari = await cariService.getCariById(id);

    if (!cari) {
      return null;
    }

    return `/admin/finance/cari/${encodeURIComponent(cari.slug)}`;
  }
}

export const financeCounterpartyRouteService = new FinanceCounterpartyRouteService();
