-- Faz 1 / Dalga 19: AuditLog'un olu tenantId alani canlandirilir --
-- Kolon zaten var (Faz 0'dan beri nullable String), sadece FK + index
-- eklenir. tenantId KASITLI OLARAK NULLABLE KALIR (bazi olaylar --
-- basarisiz giris denemesi, sifre sifirlama talebi -- gercekten hicbir
-- tenant'a ait degildir) ve TENANT_SCOPED_MODELS'e eklenmez.
-- Tarihsel satirlar icin actorUserId uzerinden User'in gercek tenantId'si
-- ile best-effort backfill yapilir; aktoru bilinmeyen/olmayan satirlar
-- NULL kalir (dogru davranis).

UPDATE "AuditLog" AS al SET "tenantId" = u."tenantId" FROM "User" AS u WHERE al."actorUserId" = u."id" AND al."tenantId" IS NULL;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
