GIB UBL-TR 1.2.1 schema and schematron files live here.

Do not hand-edit or recreate official schema files.

Installed package sources:

- `https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/UBL-TR1.2.1_Paketi.zip`
- `https://ebelge.gib.gov.tr/dosyalar/kilavuzlar/e-FaturaPaketi.zip`

Expected runtime paths:

- `xsdrt/maindoc/UBL-Invoice-2.1.xsd`
- `xsdrt/maindoc/UBL-DespatchAdvice-2.1.xsd`
- `xsdrt/common/*.xsd`
- `schematron/UBL-TR_Main_Schematron.xml`
- `schematron/UBL-TR_Common_Schematron.xml`
- `schematron/UBL-TR_Codelist.xml`

`UBL-TR_Main_Schematron.xml` contains rules for both `Invoice` and `DespatchAdvice`; common abstract rules and code lists are kept beside it.

When official files are present, BEEMMB includes their SHA-256 hashes in the e-document readiness report and persists the hashes on newly generated XML artifacts for audit traceability.

Required sender environment variables:

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

Required validation engine environment variables:

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

Validator argument templates support these placeholders:

- `{xml}`: generated temporary XML file path
- `{schema}`: official XSD or Schematron file path

Both placeholders are required for each validator argument template. Production values depend on the selected validator engine. For example:

- XSD: `EDOCUMENT_XSD_VALIDATOR_COMMAND=xmllint`
- XSD args: `--noout --schema {schema} {xml}`
- Schematron: use the chosen ISO Schematron processor or provider-approved validator command with `{schema}` and `{xml}` placeholders.

Full production readiness expects `EDOCUMENT_PROVIDER_MODE=LIVE` and a configured, operational non-mock live e-document provider adapter registered in the application. Accepted values are `LIVE` and `MOCK`; `MOCK` is for local development and controlled demo flows only.

The `live-edocs-provider` adapter requires protocol, endpoint URL, username, and secret env values before it is considered configured. The `CUSTOM_HTTP_JSON` protocol posts JSON requests to the configured endpoint with operation metadata, XML content for dispatch, bearer authorization, timeout handling, response normalization, and recursive secret masking.

The readiness report exposes registered provider adapter keys so production operators can confirm that a live adapter is loaded instead of relying on the mock-only registry.

`npm run verify:edocument` covers official file presence/hash discovery, UBL builder output, official validation adapter argument handling, evidence package metadata, provider registry behavior, connector fallback rules, and dispatch service pre-queue adapter checks.
