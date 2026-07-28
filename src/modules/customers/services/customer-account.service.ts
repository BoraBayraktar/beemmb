import { z } from "zod";

import type {
  AdminCreateCustomerAccountInput,
  AdminCustomerAccountItem,
  AdminUpdateCustomerAccountInput,
} from "@/modules/customers/contracts/customer-account.contract";
import { customerAccountRepository } from "@/modules/customers/repositories/customer-account.repository";
import { counterpartyLookupService } from "@/modules/finance/services/counterparty-lookup.service";

const createCustomerAccountSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")).transform((value) => value || null),
  phone: z.string().trim().max(64).optional().nullable().or(z.literal("")).transform((value) => value || null),
  taxNumber: z.string().trim().max(64).optional().nullable().or(z.literal("")).transform((value) => value || null),
  address: z.string().trim().max(500).optional().nullable().or(z.literal("")).transform((value) => value || null),
  note: z.string().trim().max(500).optional().nullable().or(z.literal("")).transform((value) => value || null),
  defaultPaymentTermDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  creditLimit: z.coerce.number().nonnegative().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateCustomerAccountSchema = createCustomerAccountSchema.extend({
  id: z.string().trim().min(1),
});

function mapCustomerAccount(item: Awaited<ReturnType<typeof customerAccountRepository.listCustomerAccounts>>[number]): AdminCustomerAccountItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    email: item.email,
    phone: item.phone,
    taxNumber: item.taxNumber,
    address: item.address,
    note: item.note,
    defaultPaymentTermDays: item.defaultPaymentTermDays ?? null,
    creditLimit: item.creditLimit != null
      ? (typeof item.creditLimit === "object" && item.creditLimit !== null && "toNumber" in item.creditLimit
        ? (item.creditLimit as { toNumber: () => number }).toNumber()
        : Number(item.creditLimit))
      : null,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export class CustomerAccountService {
  async listCustomerAccounts(): Promise<AdminCustomerAccountItem[]> {
    const rows = await customerAccountRepository.listCustomerAccounts();
    return rows.map(mapCustomerAccount);
  }

  async createCustomerAccount(input: AdminCreateCustomerAccountInput): Promise<AdminCustomerAccountItem> {
    const parsed = createCustomerAccountSchema.parse(input);
    const created = await customerAccountRepository.createCustomerAccount(parsed);
    await counterpartyLookupService.invalidateLookupCache();
    return mapCustomerAccount(created);
  }

  async updateCustomerAccount(input: AdminUpdateCustomerAccountInput): Promise<AdminCustomerAccountItem> {
    const parsed = updateCustomerAccountSchema.parse(input);
    const updated = await customerAccountRepository.updateCustomerAccount(parsed);
    if (!updated) {
      throw new Error("Müşteri kartı bulunamadı.");
    }

    await counterpartyLookupService.invalidateLookupCache();
    return mapCustomerAccount(updated);
  }

  async getCustomerAccountById(id: string): Promise<AdminCustomerAccountItem | null> {
    const item = await customerAccountRepository.findCustomerAccountById(id);
    return item ? mapCustomerAccount(item) : null;
  }

  async ensureCustomerAccountFromContact(profile: {
    email?: string | null;
    name: string;
  }): Promise<AdminCustomerAccountItem | null> {
    const normalizedName = profile.name.trim();
    const normalizedEmail = profile.email?.trim()
      ? profile.email.trim().toLocaleLowerCase("tr-TR")
      : null;

    if (!normalizedEmail) {
      return null;
    }

    const existingByEmail = await customerAccountRepository.findCustomerAccountByEmail(normalizedEmail);
    if (existingByEmail) {
      return mapCustomerAccount(existingByEmail);
    }

    const slugParts = [
      normalizedName.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-"),
      normalizedEmail.split("@")[0],
    ];
    const slugBase = slugParts.join("-").replace(/[^a-z0-9-]/g, "");
    const created = await customerAccountRepository.createCustomerAccount({
      slug: slugBase || `customer-${Date.now()}`,
      name: normalizedName,
      email: normalizedEmail,
      isActive: true,
    });

    return mapCustomerAccount(created);
  }

  async ensureCustomerAccountFromUserProfile(profile: {
    email: string;
    name: string;
  }): Promise<AdminCustomerAccountItem | null> {
    return this.ensureCustomerAccountFromContact(profile);
  }
}

export const customerAccountService = new CustomerAccountService();
