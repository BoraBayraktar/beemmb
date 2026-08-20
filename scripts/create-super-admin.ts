import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME?.trim() || "Süper Yönetici";

  if (!email || !password) {
    console.error("SUPER_ADMIN_EMAIL ve SUPER_ADMIN_PASSWORD ortam değişkenleri zorunludur.");
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error("SUPER_ADMIN_PASSWORD en az 8 karakter olmalıdır.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN",
      isSuperAdmin: true,
      deleted: false,
      deletedDate: null,
      deletedUserId: null,
    },
    create: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
      isSuperAdmin: true,
    },
    select: { id: true, email: true, isSuperAdmin: true },
  });

  console.log(`Süper admin hazır: ${user.email} (id: ${user.id}, isSuperAdmin: ${user.isSuperAdmin})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
