-- Data-only fix:
-- 1) "inventory" modulunun adi "Stok Yonetimi" idi -- "products" modulunun
--    icerdigi "Stok Kartlari" ile aynı kelimeyi tasidigi icin karisiyordu.
--    Bu modul SADECE ileri depo araclarini (transfer/sayim/hizli barkod/
--    disa aktarim) icerir, Stok Karti'ni degil -- isim bunu netlestiriyor.
-- 2) "documents" ve "system" modullerinin adlari hala ASCII yazilmisti
--    (onceki "products" rename'i sirasinda atlanmisti); admin-menu.ts'teki
--    Turkce karakterli karsiliklariyla tutarli hale getirildi.
UPDATE "ModuleCatalog" SET "name" = 'Depo ve Stok Hareketleri Yönetimi', "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = 'inventory';
UPDATE "ModuleCatalog" SET "name" = 'Belge Yönetimi', "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = 'documents';
UPDATE "ModuleCatalog" SET "name" = 'Sistem ve Kullanıcılar', "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = 'system';
