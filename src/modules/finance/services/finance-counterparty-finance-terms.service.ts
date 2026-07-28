import type { AdminCounterpartyFinanceTerms } from "@/modules/finance/contracts/counterparty-finance-terms.contract";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";
import { customerAccountService } from "@/modules/customers/services/customer-account.service";
import { resolveEffectivePaymentTermDays } from "@/modules/finance/services/finance-due-date.util";
import { resolveCounterpartyFinanceTermsCopy } from "@/modules/finance/services/finance-counterparty-finance-terms-copy.resolver";

function formatCreditLimit(value: number, currency: string, template: string) {
  const formatted = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

  return template.replace("{amount}", formatted);
}

function buildTerms(args: {
  locale: string;
  defaultPaymentTermDays: number | null;
  creditLimit: number | null;
  currency: string;
  dueHintTemplate: string;
}): AdminCounterpartyFinanceTerms {
  const copy = resolveCounterpartyFinanceTermsCopy(args.locale);
  const effectivePaymentTermDays = resolveEffectivePaymentTermDays(args.defaultPaymentTermDays);

  return {
    defaultPaymentTermDays: args.defaultPaymentTermDays,
    effectivePaymentTermDays,
    creditLimit: args.creditLimit,
    defaultPaymentTermSummary: copy.defaultPaymentTermSummary.replace("{days}", String(effectivePaymentTermDays)),
    creditLimitSummary: args.creditLimit != null
      ? formatCreditLimit(args.creditLimit, args.currency, copy.creditLimitSummary)
      : null,
    collectionOrPaymentDueHint: args.dueHintTemplate.replace("{days}", String(effectivePaymentTermDays)),
  };
}

export class FinanceCounterpartyFinanceTermsService {
  async getCustomerFinanceTerms(customerAccountId: string | null | undefined, locale: string): Promise<AdminCounterpartyFinanceTerms | null> {
    if (!customerAccountId) {
      return null;
    }

    const customer = await customerAccountService.getCustomerAccountById(customerAccountId);
    if (!customer) {
      return null;
    }

    const copy = resolveCounterpartyFinanceTermsCopy(locale);

    return buildTerms({
      locale,
      defaultPaymentTermDays: customer.defaultPaymentTermDays,
      creditLimit: customer.creditLimit,
      currency: "TRY",
      dueHintTemplate: copy.collectionDueHint,
    });
  }

  async getSupplierFinanceTerms(supplierId: string | null | undefined, locale: string): Promise<AdminCounterpartyFinanceTerms | null> {
    if (!supplierId) {
      return null;
    }

    const supplier = await catalogAdminService.getSupplierById(supplierId);
    if (!supplier) {
      return null;
    }

    const copy = resolveCounterpartyFinanceTermsCopy(locale);

    return buildTerms({
      locale,
      defaultPaymentTermDays: supplier.defaultPaymentTermDays,
      creditLimit: supplier.creditLimit,
      currency: "TRY",
      dueHintTemplate: copy.paymentDueHint,
    });
  }

  buildTermsFromProfile(args: {
    locale: string;
    defaultPaymentTermDays: number | null;
    creditLimit: number | null;
    currency: string;
    kind: "customer" | "supplier";
  }): AdminCounterpartyFinanceTerms {
    const copy = resolveCounterpartyFinanceTermsCopy(args.locale);

    return buildTerms({
      locale: args.locale,
      defaultPaymentTermDays: args.defaultPaymentTermDays,
      creditLimit: args.creditLimit,
      currency: args.currency,
      dueHintTemplate: args.kind === "customer" ? copy.collectionDueHint : copy.paymentDueHint,
    });
  }
}

export const financeCounterpartyFinanceTermsService = new FinanceCounterpartyFinanceTermsService();
