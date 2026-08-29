import { prisma } from "@/lib/prisma";
import { RBAC_SYSTEM_ROLES } from "@/modules/identity/contracts/rbac.contract";
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

  /**
   * Yeni bir tenant'i tum on-kosullariyla birlikte tek islemde kurar: Tenant
   * satiri, secilen moduller icin entitlement'lar, RBAC_SYSTEM_ROLES'ten
   * klonlanan varsayilan rol seti (Role + RolePermission) ve tenant'in ilk
   * admin kullanicisi (super-admin rolune atanmis). Tek transaction icinde
   * calisir -- rolsuz/kullanicisiz yarim kalmis bir tenant kullanilamaz
   * durumda olacagindan atomiklik zorunludur.
   */
  async provisionTenant(input: {
    slug: string;
    name: string;
    legalName?: string;
    taxNumber?: string;
    contactEmail: string;
    contactPhone?: string;
    moduleKeys: string[];
    adminUser: { email: string; name: string; passwordHash: string };
    actorUserId: string;
  }) {
    // RBAC_PERMISSIONS zaman icinde buyudukce, her rol icin her izni ayri ayri
    // `permission: { connect: { key } } }` ile bagliyor olmak (asagida eskiden
    // oldugu gibi) her baglanti icin ayri bir round-trip gerektirir; tum
    // permission satirlarini tek seferde onceden cekip RolePermission'lari
    // createMany ile toplu yazmak bunu ~170 sorgudan ~10'a indirir. Bu, Prisma
    // Postgres (db.prisma.io) gibi daha yuksek gecikmeli baglantilarda
    // interactive transaction timeout'unu (varsayilan 5000ms) asmayi onler.
    const allPermissions = await prisma.permission.findMany({ select: { id: true, key: true } });
    const permissionIdByKey = new Map(allPermissions.map((permission) => [permission.key, permission.id]));

    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: input.slug,
          name: input.name,
          legalName: input.legalName,
          taxNumber: input.taxNumber,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
        },
      });

      if (input.moduleKeys.length > 0) {
        await tx.tenantModuleEntitlement.createMany({
          data: input.moduleKeys.map((moduleKey) => ({
            tenantId: tenant.id,
            moduleKey,
            isEnabled: true,
            grantedByUserId: input.actorUserId,
          })),
        });
      }

      const roleIdByKey = new Map<string, string>();
      for (const roleDef of RBAC_SYSTEM_ROLES) {
        const role = await tx.role.create({
          data: {
            tenantId: tenant.id,
            key: roleDef.key,
            name: roleDef.name,
            description: roleDef.description,
            isSystem: true,
          },
          select: { id: true },
        });
        roleIdByKey.set(roleDef.key, role.id);
      }

      const rolePermissionRows = RBAC_SYSTEM_ROLES.flatMap((roleDef) => {
        const roleId = roleIdByKey.get(roleDef.key);
        if (!roleId) {
          throw new Error(`Rol olusturulamadi: ${roleDef.key}`);
        }

        return roleDef.permissions.map((permissionKey) => {
          const permissionId = permissionIdByKey.get(permissionKey);
          if (!permissionId) {
            throw new Error(`Bilinmeyen izin anahtari: ${permissionKey}`);
          }

          return { tenantId: tenant.id, roleId, permissionId };
        });
      });

      if (rolePermissionRows.length > 0) {
        await tx.rolePermission.createMany({ data: rolePermissionRows });
      }

      const superAdminRoleId = roleIdByKey.get("super-admin");
      if (!superAdminRoleId) {
        throw new Error("super-admin rolu olusturulamadi");
      }

      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.adminUser.email,
          name: input.adminUser.name,
          role: "ADMIN",
          passwordHash: input.adminUser.passwordHash,
        },
        select: { id: true, email: true, name: true },
      });

      await tx.userRoleAssignment.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          roleId: superAdminRoleId,
          assignedByUserId: input.actorUserId,
        },
      });

      return { tenant, adminUser };
    }, { timeout: 15000 });
  }
}
