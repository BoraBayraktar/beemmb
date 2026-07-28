# Inventory Costing Policy

Bu doküman, BEEMMB stok raporlarında hangi maliyet yaklaşımının resmi kabul edildiğini tanımlar.

## Resmi Karar

- Operasyonel ve raporlama bazlı resmi maliyet yöntemi: `Ağırlıklı ortalama maliyet`
- `InventoryItem.costingMethod` alanı mimari genişleme payı için korunur.
- Mevcut yönetim panelleri ve özet raporlar varsayılan olarak `AVERAGE_COST` üstünden hesap üretir.

## Alanların Rolü

- `InventoryItem.averageUnitCost`
  Aktif resmi maliyet değeridir.
- `InventoryItem.lastPurchaseUnitCost`
  Son alış bilgisini izleme ve karşılaştırma amaçlı saklanır.
- `Product.purchasePrice`
  Katalog/ürün kartı seviyesinde yardımcı referanstır; inventory aggregate maliyet otoritesi değildir.

## Güncelleme Kuralları

- Satın alma belgesiyle gelen stok girişinde:
  - son alış maliyeti `lastPurchaseUnitCost` alanına yazılır
  - ağırlıklı ortalama maliyet `averageUnitCost` alanında tekrar hesaplanır
- Stok çıkış, rezervasyon ve transfer işlemleri maliyet yöntemini değiştirmez.
- Sayım işlemi miktar düzeltir; maliyet değeri yeniden yazmaz.

## Raporlama Kuralı

- Dashboard ve inventory raporları `averageUnitCost` üstünden toplam maliyet değeri hesaplar.
- Eğer ortalama maliyet yoksa kontrollü fallback olarak `lastPurchaseUnitCost`, ardından `Product.purchasePrice` kullanılabilir.
- Bu fallback yalnızca rapor okunabilirliğini korumak içindir; resmi maliyet tercihi değişmiş sayılmaz.

## Sprint 4 Karar Matrisi

- Resmi maliyet otoritesi:
  - `AVERAGE_COST`
- Karşılaştırma / analiz görünümü:
  - `LAST_PURCHASE_COST` seçilebilir
  - bu seçim yalnızca ekran hesap görünümünü değiştirir
  - muhasebesel veya operasyonel resmi maliyet otoritesini değiştirmez

## Uygulama Kuralları

- `resolveInventoryUnitCost` helper'ı resmi maliyet çözümleyicisidir ve daima ağırlıklı ortalama mantığıyla çalışır.
- `resolveInventoryUnitCostByPreference` yalnızca rapor/karşılaştırma görünümü için kullanılabilir.
- Satın alma girişi geldiğinde:
  - `lastPurchaseUnitCost` son alış izleme alanı olarak güncellenir
  - `averageUnitCost` resmi maliyet alanı olarak yeniden hesaplanır
  - `InventoryItem.costingMethod` alanı ileri genişleme için korunur, mevcut karar otoritesini değiştirmez
