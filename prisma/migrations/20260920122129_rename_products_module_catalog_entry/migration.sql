-- Data-only fix: "products" ModuleCatalog kaydinin gorunen adi admin-menu.ts'teki
-- ust menu grubuyla birebir eslesecek sekilde tanimlanmisti ("Urun Yonetimi"),
-- ancak bu grup artik Katalog Yonetimi / Stok Yonetimi (Stok Kartlari) / Siparis
-- Yonetimi olarak uce bolundu -- ucu de hala tek "products" entitlement'ina bagli.
-- Platform > Tenant'lar ekranindaki modul checkbox'i artik bu ucunu kapsayan
-- daha genel bir isim tasiyor.
UPDATE "ModuleCatalog" SET "name" = 'Ürün ve Sipariş Yönetimi', "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = 'products';
