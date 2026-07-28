import { financeRepository } from "@/modules/finance/repositories/finance.repository";

export class FinanceCounterpartyRouteService {
  async resolveCounterpartyLedgerPath(id: string): Promise<string | null> {
    const customer = await financeRepository.findCustomerAccountById(id);

    if (customer) {
      return `/admin/finance/customers/${encodeURIComponent(customer.slug)}`;
    }

    const supplier = await financeRepository.findSupplierById(id);

    if (supplier?.slug) {
      return `/admin/finance/suppliers/${encodeURIComponent(supplier.slug)}`;
    }

    return null;
  }
}

export const financeCounterpartyRouteService = new FinanceCounterpartyRouteService();
