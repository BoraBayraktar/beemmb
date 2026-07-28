# GİB/Kurumsal Audit Hardening Runbook

Bu runbook BEEMMB audit kanıt zincirinin üretilmesi, doğrulanması, saklanması ve denetçiye ibrazı için uygulanır.

## Kapsam

- `AuditLog` kayıtları append-only kabul edilir.
- `BusinessDocumentLifecycleEvent` e-belge yaşam döngüsü kanıtıdır.
- `BusinessDocumentIntegrationMessage` entegrasyon mesaj kanıtıdır.
- `AuditAnchor` dönemsel hash sabitleme kaydıdır.

## Saklama Politikası

- Audit kayıtları ve e-belge kanıtları en az 10 yıl saklanacak şekilde planlanır.
- WORM/Object Lock destekli storage kullanımı önerilir.
- Local fallback yalnızca geliştirme ve acil durum içindir; üretimde `AUDIT_WORM_BUCKET` tanımlanmalıdır.

## Günlük Anchor Üretimi

1. Önce zincir doğrulaması çalıştırılır:

```bash
npm run verify:audit:integrity
```

2. Admin API üzerinden anchor oluşturulur:

```http
POST /api/admin/audit-logs/anchors
Content-Type: application/json

{
  "startDate": "2026-07-21",
  "endDate": "2026-07-21"
}
```

3. Oluşan `manifestHash`, `storageMode`, `storageObjectKey` ve kayıt sayısı saklanır.

## Denetçi Manifesti

Audit ekranındaki `Denetçi manifesti indir` aksiyonu veya aşağıdaki endpoint kullanılır:

```http
GET /api/admin/audit-logs?export=manifest&startDate=2026-07-21&endDate=2026-07-21&pageSize=100
```

Manifest içinde:

- `manifestHash`
- `firstChainHash`
- `lastChainHash`
- kayıt bazlı `payloadHash`, `previousHash`, `chainHash`
- filtre bilgisi

bulunur.

## E-Belge Kanıt Paketi

Belge bazlı kanıt paketi:

```http
GET /api/admin/documents/{id}/evidence-package
```

Paket içinde belge özeti, dispatch kayıtları, XML artifact metadata bilgileri, lifecycle event metadata değerleri, entegrasyon mesaj hashleri ve `packageHash` bulunur. XML içeriği pakete eklenmez; XML bütünlüğü `xmlHash` ile kanıtlanır.

XML artifact kayıtları, üretim anındaki resmi XSD ve Schematron SHA-256 hash değerlerini kalıcı olarak saklar. Denetçi paketindeki `xsdHash` ve `schematronHash` alanları canlı dosya sisteminden değil, artifact üzerinde saklanan bu değerlerden okunur.

Kanıt paketi export audit kaydı `packageHash`, belge numarası, XML artifact sayısı, lifecycle event sayısı, entegrasyon mesaj sayısı, idempotency evidence sayısı ve güncel XML/XSD/Schematron hash özetini taşır.

## UBL-TR Üretim ve Doğrulama Hazırlığı

E-fatura ve e-irsaliye XML üretimi sevk öncesinde tamamlanmalıdır. Sistem, geçerli ve güncel XML artifact yoksa dış sisteme gönderimi bloke eder.

Resmi GİB UBL-TR dosyaları aşağıdaki dizine yerleştirilir:

```text
src/modules/edocument/schemas/gib/ubl-tr-1.2.1/
```

Kaynak paketler:

- `https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/UBL-TR1.2.1_Paketi.zip`
- `https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-FaturaPaketi.zip`

Beklenen resmi dosya yolları:

- `xsdrt/maindoc/UBL-Invoice-2.1.xsd`
- `xsdrt/maindoc/UBL-DespatchAdvice-2.1.xsd`
- `xsdrt/common/*.xsd`
- `schematron/UBL-TR_Main_Schematron.xml`
- `schematron/UBL-TR_Common_Schematron.xml`
- `schematron/UBL-TR_Codelist.xml`

GİB ana şematron dosyası hem `Invoice` hem `DespatchAdvice` kurallarını içerir; ortak abstract kurallar ve kod listesi aynı `schematron` klasöründe tutulur.

Resmi dosyalar el ile yeniden oluşturulmaz; GİB dağıtım paketinden alınır ve hash/kaynak bilgisi release notuna yazılır. Yeni resmi dosya seti yüklendikten sonra üretilen XML artifact kayıtları yeni hash değerlerini taşır; eski artifact kayıtları kendi üretim anındaki hash değerlerini korur.

## E-Belge Ortam Değişkenleri

Gönderici, vergilendirme, sevkiyat ve doğrulama motoru ayarları production ortamında tanımlı olmalıdır:

- `EDOCUMENT_SENDER_NAME`
- `EDOCUMENT_SENDER_TAX_NUMBER`
- `EDOCUMENT_SENDER_TAX_OFFICE`
- `EDOCUMENT_SENDER_EMAIL`
- `EDOCUMENT_SENDER_ADDRESS`
- `EDOCUMENT_INVOICE_NUMBER_PREFIX`
- `EDOCUMENT_DEFAULT_VAT_RATE`
- `EDOCUMENT_SHIPMENT_CARRIER_NAME`
- `EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER`
- `EDOCUMENT_SHIPMENT_VEHICLE_PLATE`
- `EDOCUMENT_SHIPMENT_DRIVER_NAME`
- `EDOCUMENT_SHIPMENT_DRIVER_TCKN`
- `EDOCUMENT_XSD_VALIDATOR_COMMAND`
- `EDOCUMENT_XSD_VALIDATOR_ARGS`
- `EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND`
- `EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS`
- `EDOCUMENT_PROVIDER_MODE`
- `EDOCUMENT_LIVE_PROVIDER_PROTOCOL`
- `EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL`
- `EDOCUMENT_LIVE_PROVIDER_USERNAME`
- `EDOCUMENT_LIVE_PROVIDER_SECRET_KEY`
- `EDOCUMENT_LIVE_PROVIDER_TIMEOUT_MS`

Validator argümanlarında `{xml}` geçici XML dosya yolunu, `{schema}` resmi XSD veya Schematron dosya yolunu temsil eder. Her validator argüman şablonu iki placeholder değerini de içermelidir. Örnek XSD motoru:

```env
EDOCUMENT_XSD_VALIDATOR_COMMAND="xmllint"
EDOCUMENT_XSD_VALIDATOR_ARGS="--noout --schema {schema} {xml}"
```

Schematron için kurumun seçtiği ISO Schematron processor veya özel entegratör tarafından onaylanan validator CLI kullanılmalı; komut ve argüman şablonu production env içinde tanımlanmalıdır.

Production validator operasyon raporu `eDocumentValidatorOperationsService` tarafından üretilir. Rapor `schemaVersion`, fatura/irsaliye XSD hashleri, ortak Schematron hash değeri, validator command/args evidence durumu ve `{xml}`/`{schema}` placeholder kontrollerini taşır. Bu rapor staging/production release kanıtlarına eklenir.

Tam GİB uyumluluk için `EDOCUMENT_PROVIDER_MODE` değeri `LIVE` olmalıdır. Kabul edilen değerler `LIVE` ve `MOCK` değerleridir; `MOCK` yalnızca yerel geliştirme ve kontrollü demo akışlarında kullanılır. `LIVE` mod tek başına yeterli değildir; uygulamada konfigüre edilmiş ve operasyonel mock dışı canlı e-belge provider adapter tanımlı olmalıdır. `live-edocs-provider` protokol, endpoint, kullanıcı adı ve secret env değerleri olmadan konfigüre sayılmaz; eksik konfigürasyonda gönderim çağrıları güvenli şekilde `LIVE_PROVIDER_NOT_CONFIGURED` hatasıyla durur.

`CUSTOM_HTTP_JSON` protokolü konfigüre endpoint değerine JSON `POST` isteği atar. Dispatch çağrısında güncel XML artifact içeriği, `xmlHash`, belge bilgileri ve operasyon bilgisi gönderilir; durum sorgusunda provider reference ile sorgu yapılır. Auth için bearer secret ve kullanıcı header değeri üretilir; bu değerler audit/evidence payload içine ham yazılmaz. Timeout varsayılanı `15000` ms olup `EDOCUMENT_LIVE_PROVIDER_TIMEOUT_MS` ile sınırlı şekilde değiştirilebilir.

Canlı provider endpoint değeri geçerli `http` veya `https` URL olmalıdır. Protokolsüz, boş veya farklı protokollü endpoint değerleri readiness raporunda konfigüre canlı provider olarak kabul edilmez.

Belge oluşturma ve güncelleme sırasında seçilen aktif provider kaydının registry içinde kayıtlı adapter karşılığı olmalıdır. Böylece eski veya yanlış provider kodu belgeye atanıp gönderim aşamasında sessiz mock fallback oluşmaz.

Canlı provider request evidence yardımcıları dispatch ve durum sorgu için protokol, endpoint, kullanıcı, belge numarası, provider referansı ve XML hash bilgilerini taşır; secret veya authorization değeri evidence/audit payload içine yazılmaz.

Canlı provider response normalizasyonu `accepted`, `providerReference` ve `providerStatus` alanlarını tek sözleşmeye indirger. Provider payload içinde secret, token, authorization, signature, password veya api key benzeri alanlar maskelenmeden evidence/audit payload içine yazılmaz.

Canlı provider hata normalizasyonu `providerErrorCode`, `providerErrorMessage`, `statusCode` ve maskelenmiş `responsePayload` üretir. Böylece provider doğrulama hataları kullanıcıya ve audit/evidence akışına ham secret taşımadan aktarılır.

Canlı provider webhook payload değeri provider-specific alan adlarından ortak `documentNumber`, `externalReference`, `status`, `providerStatus`, `providerErrorCode` ve `providerErrorMessage` sözleşmesine normalize edilir. `ACCEPTED/DELIVERED` benzeri durumlar `SENT`, `PROCESSING/PENDING` benzeri durumlar `QUEUED`, `REJECTED/ERROR/CANCELLED` ve bilinmeyen durumlar güvenli şekilde `FAILED` olarak işlenir. Provider payload içindeki token, authorization, signature, secret, password ve api key alanları maskelenir; ham body yerine yalnızca `rawBodyHash` saklanır.

Ret, iptal ve iade gibi edge case durumlarında dış sistem sync status değeri güvenli şekilde `FAILED` olur; ayrıntı `providerOutcome` alanında `REJECTED`, `CANCELLED`, `RETURNED` veya `UNKNOWN` olarak lifecycle metadata ve evidence payload içinde saklanır. Böylece operasyon ekranları sade sync status kullanırken denetim paketi provider kararını kaybetmez.

Dispatch kuyruğu idempotency suffix değeri provider, belge id ve `xmlHash` üzerinden deterministik üretilir. Aynı XML hash için tekrar gönderim aynı idempotency anahtarını, revize XML hash yeni anahtarı üretir. Durum senkronu provider referansı varsa bu referansla, yoksa `no-reference` fallback değeriyle deterministik anahtar üretir. Suffix değerleri güvenli karakter setine normalize edilir, kısa SHA-256 parçası taşır ve integration sınırı olan 120 karakteri aşmaz. Kuyruk lifecycle metadata içinde `idempotencyKey`, `idempotencySuffix`, `deduplicated`, `xmlArtifactId` ve `xmlHash` alanları saklanır.

## E-Belge Kalite Kapısı

Kod değişikliği, schema kurulumu veya validator değişikliği sonrasında aşağıdaki komut çalıştırılır:

```bash
npm run verify:edocument
```

Bu komut hazırlık raporunu, UBL builder çıktısını, validator adapter argüman işlemesini, evidence package üretimini, provider registry/connector davranışını, lifecycle/webhook evidence sanitizasyonunu ve dispatch service kuyruk öncesi adapter korumasını kontrol eder.

Admin panelinde belge detayında `E-belge hazırlık durumu` ve `GİB uyumluluk raporu` alanları kontrol edilir. `E-belge provider modu` değeri `LIVE` olmalı, `Kayıtlı provider adapterları` listesinde mock dışı canlı adapter görünmeli, canlı adapter için `Konfigüre` ve `Operasyonel` durumları hazır görünmeli; `Resmi XSD hazır`, `Resmi Schematron hazır`, `XSD doğrulama hazır`, `Schematron doğrulama hazır` ve `Resmi doğrulama motoru hazır` durumları geçmeden üretim sevki yapılmaz.

## Production Deployment Checklist

- Resmi GİB XSD ve Schematron dosyalarının SHA-256 hashleri release notuna yazıldı.
- `npm run verify:edocument` production build kaynakları üzerinde geçti.
- `EDOCUMENT_PROVIDER_MODE=LIVE` tanımlandı.
- `EDOCUMENT_LIVE_PROVIDER_PROTOCOL` gerçek özel entegratör adapter protokolüyle eşleşiyor.
- Canlı provider HTTP client dispatch/status operasyonları, timeout ve hata masking davranışı doğrulandı.
- Canlı provider webhook payload, imza, durum ve hata mapping akışı doğrulandı.
- Ret, iptal, iade ve bilinmeyen provider durumları domain outcome olarak doğrulandı.
- XSD ve Schematron validator komutları `{schema}` ve `{xml}` placeholder değerleriyle tanımlandı.
- Validator operasyon raporu schema hash ve validator evidence durumuyla arşivlendi.
- Canlı e-belge provider adapterı `Konfigüre` ve `Operasyonel` görünüyor.
- Test ortamında gönderim, durum sorgu, webhook, sağlayıcı hata dönüşü ve tekrar gönderim senaryoları kayıt altına alındı.
- Canlı provider test evidence raporu tüm zorunlu senaryolar için hazır.
- Evidence package export alındı; `packageHash`, `xmlHash`, `xsdHash`, `schematronHash` değerleri release kaydına işlendi.
- E-belge audit log export alındı; arşiv referansı, retention policy ve operasyon sahibi release kaydına işlendi.
- Rollback/fallback prosedürü onaylandı; `rollbackPlanReference`, fallback provider modu, sorumlu kişi ve onay tarihi kaydedildi.
- Production deployment readiness raporu arşivlendi; `providerMode`, canlı adapter operational durumu, validator evidence, evidence package hash, audit export referansı, rollback plan referansı ve arşiv tarihi birlikte tutuldu.

Bu liste `eDocumentProductionChecklistService` içinde kodlanmıştır ve `npm run verify:edocument` tarafından doğrulanır.

Production geçişi için son kapı `eDocumentProductionDeploymentReadinessService` raporudur. Otomatik kapılar `EDOCUMENT_PROVIDER_MODE=LIVE`, mock dışı canlı adapterın `configured=true` ve `operational=true` olması, resmi schema hashlerinin hazır olması, validator operation evidence değerinin hazır olması ve checklist tanımlarının eksiksiz olmasıdır. Manuel kanıt kapıları ise evidence package hash, audit export referansı, rollback/fallback plan referansı ve readiness raporu arşiv tarihidir. Bu manuel kanıtlar verilmeden rapor bilinçli olarak `ready=false` döner.

## Tam GİB Canlı Geçiş Checklist

Şu anda production geçişi yapılmayacaksa aşağıdaki maddeler bekleyen geliştirme işi değil, canlı geçiş gününde doldurulacak bloklayıcı operasyon checklistidir. Liste `eDocumentProductionChecklistService.listFullGibGoLiveItems()` içinde kodlanmıştır ve `npm run verify:edocument` tarafından korunur.

- Production/staging ortamına gerçek özel entegratör ve e-belge env değerleri girildi: `environmentName`, `providerCode`, `EDOCUMENT_PROVIDER_MODE`, `EDOCUMENT_LIVE_PROVIDER_PROTOCOL`, `EDOCUMENT_LIVE_PROVIDER_ENDPOINT_URL`, `credentialRotationOwner`
- Gerçek provider test ortamında e-fatura gönderimi kabul edildi: `providerCode`, `documentNumber`, `xmlArtifactId`, `xmlHash`, `providerReference`, `acceptedAt`
- Gerçek provider test ortamında e-irsaliye gönderimi kabul edildi: `providerCode`, `documentNumber`, `xmlArtifactId`, `xmlHash`, `providerReference`, `acceptedAt`
- Gerçek provider durum sorgu senaryosu doğrulandı: `providerCode`, `providerReference`, `providerStatus`, `externalSystemStatus`, `statusSyncedAt`
- Gerçek provider webhook bildirimi imza ve payload mapping ile işlendi: `providerCode`, `webhookUrl`, `signaturePresent`, `rawBodyHash`, `documentNumber`, `providerOutcome`
- Gerçek provider hata, ret, iptal, iade ve tekrar gönderim edge case senaryoları doğrulandı: `providerCode`, `providerErrorCode`, `rejectedOutcome`, `cancelledOutcome`, `returnedOutcome`, `idempotencyKey`
- Canlı geçiş evidence package hashleri release kaydına işlendi: `packageHash`, `xmlHash`, `xsdHash`, `schematronHash`, `releaseRecordReference`
- E-belge audit export arşiv referansı release kaydına işlendi: `auditExportReference`, `exportedAt`, `retentionPolicy`, `owner`
- Production validator motorları ve resmi schema hashleri son kez doğrulandı: `invoiceXsdHash`, `despatchXsdHash`, `schematronHash`, `xsdValidatorEvidenceReady`, `schematronValidatorEvidenceReady`, `validatedAt`
- Tam GİB canlı geçiş readiness raporu gerçek kanıtlarla `ready=true` döndü: `readinessReportHash`, `readinessReportArchivedAt`, `evidencePackageHash`, `auditExportReference`, `rollbackPlanReference`

## Canlı Provider Test Senaryoları

Production öncesinde gerçek özel entegratör test ortamında aşağıdaki senaryolar kanıtlanır:

- E-fatura gönderimi kabul edildi: `providerReference`, `xmlArtifactId`, `xmlHash`, `xsdHash`, `schematronHash`
- E-irsaliye gönderimi kabul edildi: `providerReference`, `xmlArtifactId`, `xmlHash`, `xsdHash`, `schematronHash`
- Durum sorgusu `SENT` sonucunu döndürdü: `providerReference`, `providerStatus`, `statusSyncedAt`
- Webhook durum bildirimi işlendi: `rawBodyHash`, `signaturePresent`, `documentNumber`, `externalSystemStatus`
- Provider doğrulama hatası kullanıcı/audit akışına taşındı: `providerErrorCode`, `providerErrorMessage`, `validationStatus`
- Aynı XML hash için tekrar gönderim idempotent işlendi: `xmlHash`, `previousDispatchId`, `currentDispatchId`, `idempotencyKey`
- İptal edilmiş belge gönderim kuyruğuna alınmadı: `documentId`, `documentNumber`, `blockedReason`

Bu liste `liveProviderTestPlanService` içinde kodlanmıştır ve `npm run verify:edocument` tarafından doğrulanır.

Test ortamı kanıtları `liveProviderTestEvidenceService` ile değerlendirilir. Her senaryo için zorunlu evidence alanları dolu değilse rapor `ready=false` üretir ve `missingScenarioKeys` ile `missingEvidence` alanlarını döndürür. Production geçişinde `scenarioCount`, `readyScenarioCount`, `missingScenarioKeys` ve `evidenceReportCapturedAt` release kaydına eklenir.

## Canlı Provider Teknik Sözleşmesi

Gerçek özel entegratör adapter implementasyonuna başlamadan önce provider teknik sözleşmesi tamamlanır. Sözleşme bölümleri `liveProviderContractService` içinde kodlanmıştır ve `npm run verify:edocument` tarafından doğrulanır.

Zorunlu sözleşme bölümleri:

- Özel entegratör kimliği ve ortamları: `providerCode`, test/production endpoint, adapter version
- Kimlik doğrulama: auth tipi, credential lokasyonu, token yenileme ve secret rotasyon sorumlusu
- E-fatura gönderim: endpoint/action, XML alanı, success response ve provider reference alanı
- E-irsaliye gönderim: endpoint/action, XML alanı, success response ve provider reference alanı
- Durum sorgu: provider reference input, status response alanı ve status değer eşlemesi
- Webhook: URL, imza header, imza algoritması, belge numarası/status/provider reference alanları
- Hata mapping: provider error code/message, doğrulama hata alanları ve retry edilebilir hata kodları
- Timeout/retry/idempotency: timeout, max attempts, backoff ve idempotency field/header
- Security/evidence: maskelenecek alanlar, evidence retention ve audit export sorumlusu

Bu sözleşme tamamlanmadan canlı adapter `operational=true` yapılmaz.

## Bütünlük Doğrulama

```bash
npm run verify:audit:integrity
```

Hata varsa:

- Üretim sisteminde kayıtlar değiştirilmiş olabilir.
- İlgili tarih aralığının WORM anchor manifesti ile karşılaştırılması gerekir.
- Düzeltme yapılmaz; yeni correction event ve olay raporu oluşturulur.

## Audit Coverage Kontrolü

```bash
npm run verify:audit:coverage
```

Her write endpoint audit üretmeli veya açık `AUDIT_EXEMPT_REASON` taşımalıdır.

## Hassas Veri Standardı

- Şifre, token, secret, authorization, signature, api key alanları maskelenir.
- Ham gizli değerler audit metadata veya entegrasyon mesaj payload içinde saklanmaz.
- Gerekiyorsa sadece hash veya masked değer tutulur.
- E-belge webhook kayıtlarında ham body ve imza değeri saklanmaz; kanıt payload içinde `rawBodyHash`, parse edilmiş iş alanları ve `signaturePresent` bilgisi tutulur.

## Üretim Ortam Değişkenleri

- `AUDIT_WORM_ENDPOINT`
- `AUDIT_WORM_PORT`
- `AUDIT_WORM_USE_SSL`
- `AUDIT_WORM_ACCESS_KEY`
- `AUDIT_WORM_SECRET_KEY`
- `AUDIT_WORM_BUCKET`
- `AUDIT_WORM_PUBLIC_BASE_URL`
- `AUDIT_EVIDENCE_LOCAL_DIR`

## Denetçi Talebi Yanıtlama

1. İstenen tarih aralığı belirlenir.
2. Audit manifest export alınır.
3. İlgili e-belgeler için evidence package alınır.
4. Aynı tarih aralığı için `AuditAnchor` ve WORM manifest bilgisi eklenir.
5. Paket hashleri ve manifest hashleri teslim formuna yazılır.
