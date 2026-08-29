import { z } from "zod";

import {
  type AdminCariItem,
  type AdminCreateCariInput,
  type AdminListCariFilter,
  type AdminUpdateCariInput,
} from "@/modules/cari/contracts/cari.contract";
import { cariRepository } from "@/modules/cari/repositories/cari.repository";
import { resolveTaxIdentifier } from "@/lib/tax-identifier";
import { isValidIban, normalizeIban } from "@/lib/iban";
import { buildTenantCacheKey } from "@/lib/cache-key";
import { redisCache } from "@/lib/redis";
import { requireTenantId } from "@/lib/tenant-context";

const optionalTrimmed = (max: number, label: string) => z.string().trim().max(max, `${label} en fazla ${max} karakter olabilir.`).optional().nullable().or(z.literal("")).transform((value) => value || null);
const emailField = (label: string) => z.string().trim().email(`Geçerli bir ${label} giriniz.`).max(160, `${label} en fazla 160 karakter olabilir.`).optional().nullable().or(z.literal("")).transform((value) => value || null);
const requiredString = (message: string) => z.string({ error: message }).trim().min(1, message);

const createCariSchema = z.object({
  slug: requiredString("Cari kodu girilmelidir.").max(120, "Cari kodu en fazla 120 karakter olabilir."),
  name: z.string({ error: "Ad Soyad / Unvan girilmelidir." }).trim().min(2, "Ad Soyad / Unvan en az 2 karakter olmalıdır.").max(160, "Ad Soyad / Unvan en fazla 160 karakter olabilir."),
  email: emailField("e-posta adresi"),
  phone: optionalTrimmed(64, "Telefon"),
  taxNumber: optionalTrimmed(64, "Vergi No / TC Kimlik No"),
  taxOffice: optionalTrimmed(120, "Vergi dairesi"),
  photoUrl: z.string().trim().url("Geçerli bir görsel adresi giriniz.").max(2048, "Görsel adresi çok uzun.").optional().nullable().or(z.literal("")).transform((value) => value || null),
  iban: z.string().trim().max(42, "IBAN çok uzun.").optional().nullable().or(z.literal("")).transform((value) => (value ? normalizeIban(value) : null)),
  bankName: optionalTrimmed(120, "Banka adı"),
  bankAccountHolder: optionalTrimmed(160, "Hesap sahibi"),
  contactPersonName: optionalTrimmed(160, "İlgili kişi adı"),
  contactPersonPhone: optionalTrimmed(64, "İlgili kişi telefonu"),
  contactPersonEmail: emailField("ilgili kişi e-posta adresi"),
  address: optionalTrimmed(500, "Adres"),
  note: optionalTrimmed(500, "Not"),
  defaultPaymentTermDays: z.coerce.number({ error: "Ödeme vadesi geçerli bir sayı olmalıdır." }).int("Ödeme vadesi tam sayı olmalıdır.").min(0, "Ödeme vadesi negatif olamaz.").max(365, "Ödeme vadesi en fazla 365 gün olabilir.").optional().nullable(),
  creditLimit: z.coerce.number({ error: "Kredi limiti geçerli bir sayı olmalıdır." }).nonnegative("Kredi limiti negatif olamaz.").optional().nullable(),
  isCustomer: z.boolean().default(false),
  isSupplier: z.boolean().default(false),
  isCarrier: z.boolean().default(false),
  isActive: z.boolean().default(true),
  trackingUrlTemplate: optionalTrimmed(500, "Kargo takip URL şablonu"),
  externalCodeTrendyol: z.coerce.number({ error: "Trendyol kodu geçerli bir sayı olmalıdır." }).int("Trendyol kodu tam sayı olmalıdır.").optional().nullable(),
  externalCodePazarama: optionalTrimmed(64, "Pazarama kodu"),
  externalCodeHepsiburada: optionalTrimmed(64, "Hepsiburada kodu"),
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
    await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "cari", "lookup"));
    return mapCari(created);
  }

  async updateCari(input: AdminUpdateCariInput): Promise<AdminCariItem> {
    const parsed = updateCariSchema.parse(input);

    const existing = await cariRepository.findCariBySlug(parsed.slug, parsed.id);
    if (existing) {
      throw new DuplicateCariSlugError();
    }

    const updated = await cariRepository.updateCari(parsed);
    await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "cari", "lookup"));
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
    await redisCache.delByPrefix(buildTenantCacheKey(requireTenantId(), "cari", "lookup"));
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
