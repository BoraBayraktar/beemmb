import { createHash } from "node:crypto";
import { z } from "zod";

import { redisCache } from "@/lib/redis";
import type {
  AdminFinanceCounterpartyKind,
  AdminFinanceCounterpartyLookupQuery,
  AdminFinanceCounterpartyLookupResult,
} from "@/modules/finance/contracts/counterparty-lookup.contract";
import { cariService } from "@/modules/cari/services/cari.service";
import { CARI_LOOKUP_CACHE_PREFIX, type CariRole } from "@/modules/cari/contracts/cari.contract";

const lookupQuerySchema = z.object({
  search: z.string().trim().optional(),
  kind: z.enum(["all", "CUSTOMER", "SUPPLIER"]).default("all"),
  limit: z.coerce.number().int().min(1).max(40).default(20),
});

const CACHE_TTL_SECONDS = 60;
const CARI_ROLE_BY_KIND: Record<AdminFinanceCounterpartyKind, CariRole> = {
  CUSTOMER: "CUSTOMER",
  SUPPLIER: "SUPPLIER",
};

function buildCacheKey(parsed: z.infer<typeof lookupQuerySchema>) {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({
      search: parsed.search ?? "",
      kind: parsed.kind,
      limit: parsed.limit,
    }))
    .digest("hex")
    .slice(0, 16);

  return `${CARI_LOOKUP_CACHE_PREFIX}${fingerprint}`;
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
    const kinds: AdminFinanceCounterpartyKind[] = parsed.kind === "all"
      ? ["CUSTOMER", "SUPPLIER"]
      : [parsed.kind];

    const items: AdminFinanceCounterpartyLookupResult["items"] = [];
    const seenIds = new Set<string>();

    for (const kind of kinds) {
      const cariItems = await cariService.listCari({
        role: CARI_ROLE_BY_KIND[kind],
        search,
      });

      for (const cari of cariItems) {
        if (!cari.isActive || seenIds.has(cari.id)) {
          continue;
        }

        seenIds.add(cari.id);
        items.push({
          id: cari.id,
          kind,
          slug: cari.slug,
          label: cari.name,
          subtitle: cari.email ?? cari.taxNumber,
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
    await redisCache.delByPrefix(CARI_LOOKUP_CACHE_PREFIX);
  }
}

export const counterpartyLookupService = new CounterpartyLookupService();
