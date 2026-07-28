import { commerceService } from "@/modules/commerce/services/commerce.service";

export class FinanceOrderCustomerLinkService {
  async linkOrderCustomerAccountFromDocuments(orderId: string) {
    return commerceService.linkCustomerAccountFromOrderDocuments(orderId);
  }
}

export const financeOrderCustomerLinkService = new FinanceOrderCustomerLinkService();
