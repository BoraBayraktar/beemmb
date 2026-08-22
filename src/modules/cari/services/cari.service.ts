import { z } from "zod";

import {
  CARI_LOOKUP_CACHE_PREFIX,
  type AdminCariItem,
  type AdminCreateCariInput,
  type AdminListCariFilter,
  type AdminUpdateCariInput,
} from "@/modules/cari/contracts/cari.contract";
import { cariRepository } from "@/modules/cari/repositories/cari.repository";
import { resolveTaxIdentifier } from "@/lib/tax-identifier";
import { isValidIban, normalizeIban } from "@/lib/iban";
import { redisCache } from "@/lib/redis";

const optionalTrimmed = (max: number) => z.string().trim().max(max).optional().nullable().or(z.literal("")).transform((value) => value || null);

const createCariSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")).transform((value) => value || null),
  phone: optionalTrimmed(64),
  taxNumber: optionalTrimmed(64),
  taxOffice: optionalTrimmed(120),
  photoUrl: z.string().trim().url().max(2048).optional().nullable().or(z.literal("")).transform((value) => value || null),
  iban: z.string().trim().max(42).optional().nullable().or(z.literal("")).transform((value) => (value ? normalizeIban(value) : null)),
  bankName: optionalTrimmed(120),
  bankAccountHolder: optionalTrimmed(160),
  contactPersonName: optionalTrimmed(160),
  contactPersonPhone: optionalTrimmed(64),
  contactPersonEmail: z.string().trim().email().max(160).optional().nullable().or(z.literal("")).transform((value) => value || null),
  address: optionalTrimmed(500),
  note: optionalTrimmed(500),
  defaultPaymentTermDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  creditLimit: z.coerce.number().nonnegative().optional().nullable(),
  isCustomer: z.boolean().default(false),
  isSupplier: z.boolean().default(false),
  isCarrier: z.boolean().default(false),
  isActive: z.boolean().default(true),
  trackingUrlTemplate: optionalTrimmed(500),
  externalCodeTrendyol: z.coerce.number().int().optional().nullable(),
  externalCodePazarama: optionalTrimmed(64),
  externalCodeHepsiburada: optionalTrimmed(64),
}).superRefine((data, ctx) => {
  if (!data.isCustomer && !data.isSupplier && !data.isCarrier) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["isCustomer"],
      message: "En az bir rol seçilmelidir (Müşteri / Tedarikçi / Nakliyeci).",
    });
  }

  if (data.taxNumber) {
    const resolution = resolveTaxIdentifier(data.taxNumber);
    if (resolution.status !== "valid") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["taxNumber"],
        message: "Lütfen geçerli bir vergi no ya da TC kimlik no giriniz.",
      });
    }
  }

  if (data.iban && !isValidIban(data.iban)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["iban"],
      message: "Lütfen geçerli bir IBAN giriniz.",
    });
  }
});

const updateCariSchema = createCariSchema.and(z.object({
  id: z.string().trim().min(1),
}));

export class DuplicateCariSlugError extends Error {
  constructor() {
    super("Bu cari kodu zaten kullanılıyor.");
    this.name = "DuplicateCariSlugError";
  }
}

function toNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "object" && "toNumber" in (value as { toNumber?: () => number })) {
    return (value as { toNumber: () => number }).toNumber();
  }

  return Number(value);
}

function mapCari(item: Awaited<ReturnType<typeof cariRepository.listCari>>[number]): AdminCariItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    email: item.email,
    phone: item.phone,
    taxNumber: item.taxNumber,
    taxOffice: item.taxOffice,
    photoUrl: item.photoUrl,
    iban: item.iban,
    bankName: item.bankName,
    bankAccountHolder: item.bankAccountHolder,
    contactPersonName: item.contactPersonName,
    contactPersonPhone: item.contactPersonPhone,
    contactPersonEmail: item.contactPersonEmail,
    address: item.address,
    note: item.note,
    defaultPaymentTermDays: item.defaultPaymentTermDays ?? null,
    creditLimit: toNumber(item.creditLimit),
    isCustomer: item.isCustomer,
    isSupplier: item.isSupplier,
    isCarrier: item.isCarrier,
    isActive: item.isActive,
    carrierProfile: item.carrierProfile
      ? {
        trackingUrlTemplate: item.carrierProfile.trackingUrlTemplate,
        externalCodeTrendyol: item.carrierProfile.externalCodeTrendyol,
        externalCodePazarama: item.carrierProfile.externalCodePazarama,
        externalCodeHepsiburada: item.carrierProfile.externalCodeHepsiburada,
      }
      : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export class CariService {
  async listCari(filter: AdminListCariFilter = {}): Promise<AdminCariItem[]> {
    const rows = await cariRepository.listCari(filter);
    return rows.map(mapCari);
  }

  async createCari(input: AdminCreateCariInput): Promise<AdminCariItem> {
    const parsed = createCariSchema.parse(input);

    const existing = await cariRepository.findCariBySlug(parsed.slug);
    if (existing) {
      throw new DuplicateCariSlugError();
    }

    const created = await cariRepository.createCari(parsed);
    await redisCache.delByPrefix(CARI_LOOKUP_CACHE_PREFIX);
    return mapCari(created);
  }

  async updateCari(input: AdminUpdateCariInput): Promise<AdminCariItem> {
    const parsed = updateCariSchema.parse(input);

    const existing = await cariRepository.findCariBySlug(parsed.slug, parsed.id);
    if (existing) {
      throw new DuplicateCariSlugError();
    }

    const updated = await cariRepository.updateCari(parsed);
    await redisCache.delByPrefix(CARI_LOOKUP_CACHE_PREFIX);
    return mapCari(updated);
  }

  async getCariById(id: string): Promise<AdminCariItem | null> {
    const item = await cariRepository.findCariById(id);
    return item ? mapCari(item) : null;
  }

  async getCariBySlug(slug: string): Promise<AdminCariItem | null> {
    const item = await cariRepository.findCariBySlug(slug);
    return item ? mapCari(item) : null;
  }

  async deleteCari(id: string, deletedUserId: string): Promise<void> {
    await cariRepository.deleteCari(id, deletedUserId);
    await redisCache.delByPrefix(CARI_LOOKUP_CACHE_PREFIX);
  }

  async ensureCariFromContact(profile: {
    email?: string | null;
    name: string;
  }): Promise<AdminCariItem | null> {
    const normalizedName = profile.name.trim();
    const normalizedEmail = profile.email?.trim()
      ? profile.email.trim().toLocaleLowerCase("tr-TR")
      : null;

    if (!normalizedEmail) {
      return null;
    }

    const existingByEmail = await cariRepository.findCariByEmail(normalizedEmail);
    if (existingByEmail) {
      return mapCari(existingByEmail);
    }

    const slugParts = [
      normalizedName.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-"),
      normalizedEmail.split("@")[0],
    ];
    const slugBase = slugParts.join("-").replace(/[^a-z0-9-]/g, "");
    const created = await cariRepository.createCari({
      slug: slugBase || `cari-${Date.now()}`,
      name: normalizedName,
      email: normalizedEmail,
      isCustomer: true,
      isActive: true,
    });

    return mapCari(created);
  }
}

export const cariService = new CariService();
