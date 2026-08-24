import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant-context";
import type {
  AdminCreateCariInput,
  AdminListCariFilter,
  AdminUpdateCariInput,
} from "@/modules/cari/contracts/cari.contract";

const cariInclude = {
  carrierProfile: true,
} satisfies Prisma.CariInclude;

type CarrierProfileWriteInput = {
  isCarrier?: boolean;
  trackingUrlTemplate?: string | null;
  externalCodeTrendyol?: number | null;
  externalCodePazarama?: string | null;
  externalCodeHepsiburada?: string | null;
};

function carrierProfileData(input: CarrierProfileWriteInput) {
  return {
    trackingUrlTemplate: input.trackingUrlTemplate ?? null,
    externalCodeTrendyol: input.externalCodeTrendyol ?? null,
    externalCodePazarama: input.externalCodePazarama ?? null,
    externalCodeHepsiburada: input.externalCodeHepsiburada ?? null,
  };
}

function buildCarrierProfileCreate(input: CarrierProfileWriteInput): Prisma.CariCreateInput["carrierProfile"] {
  if (!input.isCarrier) {
    return undefined;
  }

  return { create: carrierProfileData(input) };
}

function buildCarrierProfileUpsert(input: CarrierProfileWriteInput): Prisma.CariUpdateInput["carrierProfile"] {
  if (!input.isCarrier) {
    return undefined;
  }

  return {
    upsert: {
      create: carrierProfileData(input),
      update: carrierProfileData(input),
    },
  };
}

export class CariRepository {
  async listCari(filter: AdminListCariFilter = {}) {
    const roleFilter = filter.role === "CUSTOMER"
      ? { isCustomer: true }
      : filter.role === "SUPPLIER"
        ? { isSupplier: true }
        : filter.role === "CARRIER"
          ? { isCarrier: true }
          : {};

    const searchFilter = filter.search?.trim()
      ? {
        OR: [
          { name: { contains: filter.search.trim(), mode: Prisma.QueryMode.insensitive } },
          { slug: { contains: filter.search.trim(), mode: Prisma.QueryMode.insensitive } },
          { taxNumber: { contains: filter.search.trim(), mode: Prisma.QueryMode.insensitive } },
          { email: { contains: filter.search.trim(), mode: Prisma.QueryMode.insensitive } },
        ],
      }
      : {};

    return prisma.cari.findMany({
      where: {
        deleted: false,
        ...roleFilter,
        ...searchFilter,
      },
      include: cariInclude,
      orderBy: [
        { isActive: "desc" },
        { name: "asc" },
      ],
    });
  }

  async createCari(input: AdminCreateCariInput) {
    return prisma.cari.create({
      data: {
        tenantId: requireTenantId(),
        slug: input.slug,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        taxNumber: input.taxNumber ?? null,
        taxOffice: input.taxOffice ?? null,
        photoUrl: input.photoUrl ?? null,
        iban: input.iban ?? null,
        bankName: input.bankName ?? null,
        bankAccountHolder: input.bankAccountHolder ?? null,
        contactPersonName: input.contactPersonName ?? null,
        contactPersonPhone: input.contactPersonPhone ?? null,
        contactPersonEmail: input.contactPersonEmail ?? null,
        address: input.address ?? null,
        note: input.note ?? null,
        defaultPaymentTermDays: input.defaultPaymentTermDays ?? null,
        creditLimit: input.creditLimit ?? null,
        isCustomer: input.isCustomer ?? false,
        isSupplier: input.isSupplier ?? false,
        isCarrier: input.isCarrier ?? false,
        isActive: input.isActive ?? true,
        carrierProfile: buildCarrierProfileCreate(input),
      },
      include: cariInclude,
    });
  }

  async updateCari(input: AdminUpdateCariInput) {
    return prisma.cari.update({
      where: {
        id: input.id,
      },
      data: {
        slug: input.slug,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        taxNumber: input.taxNumber ?? null,
        taxOffice: input.taxOffice ?? null,
        photoUrl: input.photoUrl ?? null,
        iban: input.iban ?? null,
        bankName: input.bankName ?? null,
        bankAccountHolder: input.bankAccountHolder ?? null,
        contactPersonName: input.contactPersonName ?? null,
        contactPersonPhone: input.contactPersonPhone ?? null,
        contactPersonEmail: input.contactPersonEmail ?? null,
        address: input.address ?? null,
        note: input.note ?? null,
        defaultPaymentTermDays: input.defaultPaymentTermDays ?? null,
        creditLimit: input.creditLimit ?? null,
        isCustomer: input.isCustomer ?? false,
        isSupplier: input.isSupplier ?? false,
        isCarrier: input.isCarrier ?? false,
        isActive: input.isActive ?? true,
        carrierProfile: buildCarrierProfileUpsert(input),
      },
      include: cariInclude,
    });
  }

  async findCariById(id: string) {
    return prisma.cari.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: cariInclude,
    });
  }

  async findCariBySlug(slug: string, excludeId?: string) {
    return prisma.cari.findFirst({
      where: {
        deleted: false,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      include: cariInclude,
    });
  }

  async findCariByEmail(email: string) {
    return prisma.cari.findFirst({
      where: {
        deleted: false,
        email,
      },
      include: cariInclude,
    });
  }

  async deleteCari(id: string, deletedUserId: string) {
    return prisma.cari.update({
      where: { id },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId,
      },
    });
  }

  async findCariByName(name: string) {
    return prisma.cari.findFirst({
      where: {
        deleted: false,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      include: cariInclude,
    });
  }
}

export const cariRepository = new CariRepository();
