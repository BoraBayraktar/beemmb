-- Data-only fix: "Urun ve Siparis Yonetimi" (onceki migration) hala "Stok"
-- kelimesini icermiyordu, ve bare "Stok" eklemek "inventory" modulunun adiyla
-- ("Stok Yonetimi") karisirdi -- oysa bu modul sadece Stok Karti (master data)
-- iceriyor, depo/transfer/sayim gibi gercek stok islemleri hala ayri
-- "inventory" entitlement'inda. Bu yuzden "Stok Karti" (net, "Stok Yonetimi"
-- ile karismayan bir terim) tercih edildi.
UPDATE "ModuleCatalog" SET "name" = 'Katalog, Stok Kartı ve Sipariş Yönetimi', "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = 'products';
