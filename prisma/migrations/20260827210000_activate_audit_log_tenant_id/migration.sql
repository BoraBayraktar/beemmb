-- Faz 1 / Dalga 19: AuditLog'un olu tenantId alani canlandirilir --
-- Kolon zaten var (Faz 0'dan beri nullable String), sadece FK + index
-- eklenir. tenantId KASITLI OLARAK NULLABLE KALIR (bazi olaylar --
-- basarisiz giris denemesi, sifre sifirlama talebi -- gercekten hicbir
-- tenant'a ait degildir) ve TENANT_SCOPED_MODELS'e eklenmez.
--
-- ONEMLI: bu tabloda append-only'yi zorlayan bir DB trigger'i var
-- (prevent_audit_mutation) -- tarihsel satirlari UPDATE ile geriye donuk
-- doldurmaya CALISILMAZ (denetim gunlugunun degismezlik garantisini
-- bozar ve prod'da zaten trigger tarafindan reddedilir). Tarihsel
-- satirlar tenantId=NULL kalir; bu, o donemde tenant kavraminin henuz
-- olmadigini dogru sekilde yansitir. Sadece yeni yazilan satirlar
-- (uygulama kodundaki write-path auto-populate ile) tenantId tasir.

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
