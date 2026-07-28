import { createHash } from "node:crypto";
import { z } from "zod";

import { redisCache } from "@/lib/redis";
import type {
  AdminFinanceCounterpartyLookupQuery,
  AdminFinanceCounterpartyLookupResult,
} from "@/modules/finance/contracts/counterparty-lookup.contract";
import { financeRepository } from "@/modules/finance/repositories/finance.repository";

const lookupQuerySchema = z.object({
  search: z.string().trim().optional(),
  kind: z.enum(["all", "CUSTOMER", "SUPPLIER"]).default("all"),
  limit: z.coerce.number().int().min(1).max(40).default(20),
});

const CACHE_TTL_SECONDS = 60;

function buildCacheKey(parsed: z.infer<typeof lookupQuerySchema>) {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({
      search: parsed.search ?? "",
      kind: parsed.kind,
      limit: parsed.limit,
    }))
    .digest("hex")
    .slice(0, 16);

  return `finance:counterparties:${fingerprint}`;
}

export class CounterpartyLookupService {
  async searchCounterparties(query: AdminFinanceCounterpartyLookupQuery = {}): Promise<AdminFinanceCounterpartyLookupResult> {
    const parsed = lookupQuerySchema.parse(query);
    const cacheKey = buildCacheKey(parsed);
    const cached = await redisCache.get<AdminFinanceCounterpartyLookupResult>(cacheKey);

    if (cached) {
      return cached;
    }

    const search = parsed.search?.trim() ?? "";
    const normalizedSearch = search.toLocaleLowerCase("tr-TR");
    const items: AdminFinanceCounterpartyLookupResult["items"] = [];

    if (parsed.kind === "all" || parsed.kind === "CUSTOMER") {
      const customers = await financeRepository.searchCustomerAccounts({
        search,
        limit: parsed.limit,
      });

      for (const customer of customers) {
        if (!customer.isActive) {
          continue;
        }

        items.push({
          id: customer.id,
          kind: "CUSTOMER",
          slug: customer.slug,
          label: customer.name,
          subtitle: customer.email ?? customer.taxNumber,
        });
      }
    }

    if (parsed.kind === "all" || parsed.kind === "SUPPLIER") {
      const suppliers = await financeRepository.searchSuppliers({
        search,
        limit: parsed.limit,
      });

      for (const supplier of suppliers) {
        if (!supplier.isActive) {
          continue;
        }

        items.push({
          id: supplier.id,
          kind: "SUPPLIER",
          slug: supplier.slug,
          label: supplier.name,
          subtitle: supplier.taxNumber,
        });
      }
    }

    const filtered = items
      .filter((item) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = `${item.label} ${item.subtitle ?? ""} ${item.slug}`.toLocaleLowerCase("tr-TR");
        return haystack.includes(normalizedSearch);
      })
      .sort((left, right) => left.label.localeCompare(right.label, "tr-TR"))
      .slice(0, parsed.limit);

    const result = { items: filtered };
    await redisCache.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  async invalidateLookupCache() {
    await redisCache.delByPrefix("finance:counterparties:");
  }
}

export const counterpartyLookupService = new CounterpartyLookupService();
