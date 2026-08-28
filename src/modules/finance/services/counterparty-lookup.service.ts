import { createHash } from "node:crypto";
import { z } from "zod";

import { buildTenantCacheKey } from "@/lib/cache-key";
import { redisCache } from "@/lib/redis";
import { requireTenantId } from "@/lib/tenant-context";
import type {
  AdminFinanceCounterpartyKind,
  AdminFinanceCounterpartyLookupQuery,
  AdminFinanceCounterpartyLookupResult,
} from "@/modules/finance/contracts/counterparty-lookup.contract";
import { cariService } from "@/modules/cari/services/cari.service";
import { type CariRole } from "@/modules/cari/contracts/cari.contract";

const lookupQuerySchema = z.object({
  search: z.string().trim().optional(),
  kind: z.enum(["all", "CUSTOMER", "SUPPLIER", "CARRIER"]).default("all"),
  limit: z.coerce.number().int().min(1).max(40).default(20),
});

const CACHE_TTL_SECONDS = 60;
const CARI_ROLE_BY_KIND: Record<AdminFinanceCounterpartyKind, CariRole> = {
  CUSTOMER: "CUSTOMER",
  SUPPLIER: "SUPPLIER",
  CARRIER: "CARRIER",
};

function resolveCariKind(cari: { isCustomer: boolean; isSupplier: boolean; isCarrier: boolean }): AdminFinanceCounterpartyKind {
  if (cari.isCustomer) {
    return "CUSTOMER";
  }

  if (cari.isSupplier) {
    return "SUPPLIER";
  }

  return "CARRIER";
}

function buildCacheKey(parsed: z.infer<typeof lookupQuerySchema>) {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({
      search: parsed.search ?? "",
      kind: parsed.kind,
      limit: parsed.limit,
    }))
    .digest("hex")
    .slice(0, 16);

  return buildTenantCacheKey(requireTenantId(), "cari", "lookup", fingerprint);
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
    // "all" -> hiçbir role filtresi uygulanmaz, sistemdeki tüm cari kartları kapsar.
    const cariItems = await cariService.listCari({
      role: parsed.kind === "all" ? undefined : CARI_ROLE_BY_KIND[parsed.kind],
      search,
    });

    const items = cariItems
      .filter((cari) => cari.isActive)
      .map((cari) => ({
        id: cari.id,
        kind: resolveCariKind(cari),
        slug: cari.slug,
        label: cari.name,
        subtitle: cari.email ?? cari.taxNumber ?? cari.slug,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "tr-TR"))
      .slice(0, parsed.limit);

    const result = { items };
    await redisCache.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  async invalidateLookupCache() {
    await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "cari", "lookup"));
  }
}

export const counterpartyLookupService = new CounterpartyLookupService();
