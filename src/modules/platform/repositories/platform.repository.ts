import { prisma } from "@/lib/prisma";
import type { CreateTenantInput, SetTenantModuleEntitlementInput, UpdateTenantInput } from "@/modules/platform/contracts/platform.contract";

export class PlatformRepository {
  async listTenants() {
    return prisma.tenant.findMany({
      where: { deleted: false },
      orderBy: { createdAt: "asc" },
    });
  }

  async findTenantById(id: string) {
    return prisma.tenant.findFirst({ where: { id, deleted: false } });
  }

  async findTenantBySlug(slug: string) {
    return prisma.tenant.findFirst({ where: { slug, deleted: false } });
  }

  async createTenant(input: CreateTenantInput) {
    return prisma.tenant.create({
      data: {
        slug: input.slug,
        name: input.name,
        legalName: input.legalName,
        taxNumber: input.taxNumber,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
      },
    });
  }

  async updateTenant(input: UpdateTenantInput) {
    return prisma.tenant.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.taxNumber !== undefined ? { taxNumber: input.taxNumber } : {}),
        ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
        ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
  }

  async listModuleCatalog() {
    return prisma.moduleCatalog.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async listEntitlementsForTenant(tenantId: string) {
    return prisma.tenantModuleEntitlement.findMany({
      where: { tenantId },
    });
  }

  async setEntitlement(input: SetTenantModuleEntitlementInput) {
    return prisma.tenantModuleEntitlement.upsert({
      where: { tenantId_moduleKey: { tenantId: input.tenantId, moduleKey: input.moduleKey } },
      update: {
        isEnabled: input.isEnabled,
        grantedByUserId: input.grantedByUserId,
        note: input.note,
      },
      create: {
        tenantId: input.tenantId,
        moduleKey: input.moduleKey,
        isEnabled: input.isEnabled,
        grantedByUserId: input.grantedByUserId,
        note: input.note,
      },
    });
  }
}
