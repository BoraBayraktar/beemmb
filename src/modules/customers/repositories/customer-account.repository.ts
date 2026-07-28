import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  AdminCreateCustomerAccountInput,
  AdminUpdateCustomerAccountInput,
} from "@/modules/customers/contracts/customer-account.contract";

type CustomerAccountRow = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  address: string | null;
  note: string | null;
  defaultPaymentTermDays: number | null;
  creditLimit: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
  deletedDate: Date | null;
  deletedUserId: string | null;
};

export class CustomerAccountRepository {
  private get delegate() {
    return (prisma as unknown as {
      customerAccount?: {
        findMany: (args: unknown) => Promise<CustomerAccountRow[]>;
        create: (args: unknown) => Promise<CustomerAccountRow>;
        findFirst: (args: unknown) => Promise<CustomerAccountRow | null>;
        update: (args: unknown) => Promise<CustomerAccountRow>;
      };
    }).customerAccount;
  }

  async listCustomerAccounts() {
    if (this.delegate) {
      return this.delegate.findMany({
        where: {
          deleted: false,
        },
        orderBy: [
          { isActive: "desc" },
          { name: "asc" },
        ],
      });
    }

    return prisma.$queryRaw<CustomerAccountRow[]>(Prisma.sql`
      SELECT
        "id",
        "slug",
        "name",
        "email",
        "phone",
        "taxNumber",
        "address",
        "note",
        "defaultPaymentTermDays",
        "creditLimit",
        "isActive",
        "createdAt",
        "updatedAt",
        "deleted",
        "deletedDate",
        "deletedUserId"
      FROM "CustomerAccount"
      WHERE "deleted" = false
      ORDER BY "isActive" DESC, "name" ASC
    `);
  }

  async createCustomerAccount(input: AdminCreateCustomerAccountInput) {
    if (this.delegate) {
      return this.delegate.create({
        data: {
          slug: input.slug,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          taxNumber: input.taxNumber ?? null,
          address: input.address ?? null,
          note: input.note ?? null,
          defaultPaymentTermDays: input.defaultPaymentTermDays ?? null,
          creditLimit: input.creditLimit ?? null,
          isActive: input.isActive ?? true,
        },
      });
    }

    const rows = await prisma.$queryRaw<CustomerAccountRow[]>(Prisma.sql`
      INSERT INTO "CustomerAccount" (
        "id",
        "slug",
        "name",
        "email",
        "phone",
        "taxNumber",
        "address",
        "note",
        "defaultPaymentTermDays",
        "creditLimit",
        "isActive",
        "createdAt",
        "updatedAt",
        "deleted"
      )
      VALUES (
        gen_random_uuid()::text,
        ${input.slug},
        ${input.name},
        ${input.email ?? null},
        ${input.phone ?? null},
        ${input.taxNumber ?? null},
        ${input.address ?? null},
        ${input.note ?? null},
        ${input.defaultPaymentTermDays ?? null},
        ${input.creditLimit ?? null},
        ${input.isActive ?? true},
        NOW(),
        NOW(),
        false
      )
      RETURNING
        "id",
        "slug",
        "name",
        "email",
        "phone",
        "taxNumber",
        "address",
        "note",
        "defaultPaymentTermDays",
        "creditLimit",
        "isActive",
        "createdAt",
        "updatedAt",
        "deleted",
        "deletedDate",
        "deletedUserId"
    `);

    return rows[0];
  }

  async updateCustomerAccount(input: AdminUpdateCustomerAccountInput) {
    if (this.delegate) {
      return this.delegate.update({
        where: {
          id: input.id,
        },
        data: {
          slug: input.slug,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          taxNumber: input.taxNumber ?? null,
          address: input.address ?? null,
          note: input.note ?? null,
          defaultPaymentTermDays: input.defaultPaymentTermDays ?? null,
          creditLimit: input.creditLimit ?? null,
          isActive: input.isActive ?? true,
        },
      });
    }

    const rows = await prisma.$queryRaw<CustomerAccountRow[]>(Prisma.sql`
      UPDATE "CustomerAccount"
      SET
        "slug" = ${input.slug},
        "name" = ${input.name},
        "email" = ${input.email ?? null},
        "phone" = ${input.phone ?? null},
        "taxNumber" = ${input.taxNumber ?? null},
        "address" = ${input.address ?? null},
        "note" = ${input.note ?? null},
        "defaultPaymentTermDays" = ${input.defaultPaymentTermDays ?? null},
        "creditLimit" = ${input.creditLimit ?? null},
        "isActive" = ${input.isActive ?? true},
        "updatedAt" = NOW()
      WHERE "id" = ${input.id} AND "deleted" = false
      RETURNING
        "id",
        "slug",
        "name",
        "email",
        "phone",
        "taxNumber",
        "address",
        "note",
        "defaultPaymentTermDays",
        "creditLimit",
        "isActive",
        "createdAt",
        "updatedAt",
        "deleted",
        "deletedDate",
        "deletedUserId"
    `);

    return rows[0] ?? null;
  }

  async findCustomerAccountById(id: string) {
    if (this.delegate) {
      return this.delegate.findFirst({
        where: {
          id,
          deleted: false,
        },
      });
    }

    const rows = await prisma.$queryRaw<CustomerAccountRow[]>(Prisma.sql`
      SELECT
        "id",
        "slug",
        "name",
        "email",
        "phone",
        "taxNumber",
        "address",
        "note",
        "defaultPaymentTermDays",
        "creditLimit",
        "isActive",
        "createdAt",
        "updatedAt",
        "deleted",
        "deletedDate",
        "deletedUserId"
      FROM "CustomerAccount"
      WHERE "id" = ${id} AND "deleted" = false
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async findCustomerAccountByEmail(email: string) {
    if (this.delegate) {
      return this.delegate.findFirst({
        where: {
          deleted: false,
          email,
        },
      });
    }

    const rows = await prisma.$queryRaw<CustomerAccountRow[]>(Prisma.sql`
      SELECT
        "id",
        "slug",
        "name",
        "email",
        "phone",
        "taxNumber",
        "address",
        "note",
        "defaultPaymentTermDays",
        "creditLimit",
        "isActive",
        "createdAt",
        "updatedAt",
        "deleted",
        "deletedDate",
        "deletedUserId"
      FROM "CustomerAccount"
      WHERE "email" = ${email} AND "deleted" = false
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async findCustomerAccountByName(name: string) {
    if (this.delegate) {
      return this.delegate.findFirst({
        where: {
          deleted: false,
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });
    }

    const rows = await prisma.$queryRaw<CustomerAccountRow[]>(Prisma.sql`
      SELECT
        "id",
        "slug",
        "name",
        "email",
        "phone",
        "taxNumber",
        "address",
        "note",
        "defaultPaymentTermDays",
        "creditLimit",
        "isActive",
        "createdAt",
        "updatedAt",
        "deleted",
        "deletedDate",
        "deletedUserId"
      FROM "CustomerAccount"
      WHERE LOWER("name") = LOWER(${name}) AND "deleted" = false
      LIMIT 1
    `);

    return rows[0] ?? null;
  }
}

export const customerAccountRepository = new CustomerAccountRepository();
