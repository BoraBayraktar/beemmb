import fs from "fs";
import path from "path";

import type { EDocumentConfigCheck, EDocumentConfigReadinessReport } from "@/modules/edocument/contracts/edocument.contract";
import { eDocumentProviderRegistryService } from "@/modules/edocument/services/edocument-provider-registry.service";
import { eDocumentProductionChecklistService } from "@/modules/edocument/services/edocument-production-checklist.service";
import { eDocumentSenderConfigService } from "@/modules/edocument/services/edocument-sender-config.service";
import { eDocumentShipmentConfigService } from "@/modules/edocument/services/edocument-shipment-config.service";
import { eDocumentTaxConfigService } from "@/modules/edocument/services/edocument-tax-config.service";
import { gibSchemaManifestService } from "@/modules/edocument/services/gib-schema-manifest.service";
import { liveProviderTestPlanService } from "@/modules/edocument/services/live-provider-test-plan.service";
import { normalizeLiveEDocumentProviderProtocol } from "@/modules/edocument/services/live-edocument-provider.adapter";

function checkRequired(key: string, label: string, value: string | number | null): EDocumentConfigCheck {
  const ready = value !== null && String(value).trim().length > 0;

  return {
    key,
    label,
    ready,
    message: ready ? "Hazır" : `${key} tanımlanmalıdır.`,
  };
}

function checkTaxRate(value: number | null): EDocumentConfigCheck {
  const ready = value !== null && value >= 0 && value <= 100;

  return {
    key: "EDOCUMENT_DEFAULT_VAT_RATE",
    label: "Varsayılan KDV oranı",
    ready,
    message: ready ? "Hazır" : "EDOCUMENT_DEFAULT_VAT_RATE 0 ile 100 arasında tanımlanmalıdır.",
  };
}

function checkInvoicePrefix() {
  const value = process.env.EDOCUMENT_INVOICE_NUMBER_PREFIX?.trim() ?? "";
  const ready = /^[A-Za-z0-9]{3}$/.test(value);

  return {
    key: "EDOCUMENT_INVOICE_NUMBER_PREFIX",
    label: "E-fatura seri prefix",
    ready,
    message: ready ? "Hazır" : "EDOCUMENT_INVOICE_NUMBER_PREFIX 3 alfanümerik karakter olmalıdır.",
  };
}

function isExecutableFile(filePath: string) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function isCommandResolvable(command: string) {
  if (command.includes("/") || command.includes("\\")) {
    return isExecutableFile(command);
  }

  return (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .some((directory) => isExecutableFile(path.join(directory, command)));
}

function checkValidatorCommand(key: string, label: string) {
  const value = process.env[key]?.trim() ?? "";
  const ready = value.length > 0 && isCommandResolvable(value);

  return {
    key,
    label,
    ready,
    message: ready ? "Hazır" : value ? `${key} çalıştırılabilir bir komut olmalıdır.` : `${key} tanımlanmalıdır.`,
  };
}

function checkValidatorArgs(key: string, label: string) {
  const value = process.env[key]?.trim() ?? "";
  const hasXmlPlaceholder = value.includes("{xml}");
  const hasSchemaPlaceholder = value.includes("{schema}");
  const ready = value.length > 0 && hasXmlPlaceholder && hasSchemaPlaceholder;
  const message = (() => {
    if (!value) {
      return `${key} tanımlanmalıdır.`;
    }

    if (!hasXmlPlaceholder || !hasSchemaPlaceholder) {
      return `${key} {xml} ve {schema} placeholder değerlerini içermelidir.`;
    }

    return "Hazır";
  })();

  return {
    key,
    label,
    ready,
    message,
  };
}

function checkProviderMode() {
  const value = process.env.EDOCUMENT_PROVIDER_MODE?.trim().toUpperCase() ?? "";
  const ready = value === "LIVE";
  const message = (() => {
    if (ready) {
      return "Hazır";
    }

    if (!value) {
      return "EDOCUMENT_PROVIDER_MODE LIVE olarak tanımlanmalıdır.";
    }

    if (value === "MOCK") {
      return "Mock provider yalnızca geliştirme içindir; tam uyumluluk için EDOCUMENT_PROVIDER_MODE LIVE olmalıdır.";
    }

    return "EDOCUMENT_PROVIDER_MODE yalnızca LIVE veya MOCK değerini almalıdır; tam uyumluluk için LIVE kullanılmalıdır.";
  })();

  return {
    key: "EDOCUMENT_PROVIDER_MODE",
    label: "E-belge provider modu",
    ready,
    message,
  };
}

function checkLiveProviderProtocol() {
  const value = process.env.EDOCUMENT_LIVE_PROVIDER_PROTOCOL?.trim() ?? "";
  const ready = Boolean(normalizeLiveEDocumentProviderProtocol(value));

  return {
    key: "EDOCUMENT_LIVE_PROVIDER_PROTOCOL",
    label: "Canlı e-belge provider protokolü",
    ready,
    message: ready ? "Hazır" : value ? "EDOCUMENT_LIVE_PROVIDER_PROTOCOL desteklenen bir protokol olmalıdır." : "EDOCUMENT_LIVE_PROVIDER_PROTOCOL tanımlanmalıdır.",
  };
}

function checkConfiguredLiveProviderAdapter() {
  const ready = eDocumentProviderRegistryService.hasConfiguredLiveAdapter();

  return {
    key: "EDOCUMENT_LIVE_PROVIDER_CONFIGURED",
    label: "Canlı e-belge adapter konfigürasyonu",
    ready,
    message: ready ? "Hazır" : "Canlı e-belge gönderimi için mock dışı provider adapter env konfigürasyonu tamamlanmalıdır.",
  };
}

function checkOperationalLiveProviderAdapter() {
  const ready = eDocumentProviderRegistryService.hasOperationalLiveAdapter();

  return {
    key: "EDOCUMENT_LIVE_PROVIDER_OPERATIONAL",
    label: "Canlı e-belge adapter operasyonel",
    ready,
    message: ready ? "Hazır" : "Canlı e-belge gönderimi için mock dışı provider adapter operasyonel olmalıdır.",
  };
}

function resolveProviderMode() {
  return process.env.EDOCUMENT_PROVIDER_MODE?.trim().toUpperCase() || "TANIMSIZ";
}

export class EDocumentConfigReadinessService {
  getReport(): EDocumentConfigReadinessReport {
    const sender = eDocumentSenderConfigService.resolveSender();
    const tax = eDocumentTaxConfigService.resolveTaxConfig();
    const shipment = eDocumentShipmentConfigService.resolveShipment();
    const invoiceSchema = gibSchemaManifestService.getStatus("INVOICE");
    const despatchSchema = gibSchemaManifestService.getStatus("DESPATCH_ADVICE");

    const senderChecks = [
      checkRequired("EDOCUMENT_SENDER_NAME", "Gönderici unvanı", sender.name),
      checkRequired("EDOCUMENT_SENDER_TAX_NUMBER", "Gönderici VKN/TCKN", sender.taxNumber),
      checkRequired("EDOCUMENT_SENDER_TAX_OFFICE", "Gönderici vergi dairesi", sender.taxOffice),
      checkRequired("EDOCUMENT_SENDER_EMAIL", "Gönderici e-posta", sender.email),
      checkRequired("EDOCUMENT_SENDER_ADDRESS", "Gönderici adresi", sender.address),
    ];
    const taxChecks = [checkTaxRate(tax.vatRate)];
    const numberingChecks = [checkInvoicePrefix()];
    const shipmentChecks = [
      checkRequired("EDOCUMENT_SHIPMENT_CARRIER_NAME", "Taşıyıcı adı", shipment.carrierName),
      checkRequired("EDOCUMENT_SHIPMENT_CARRIER_TAX_NUMBER", "Taşıyıcı VKN/TCKN", shipment.carrierTaxNumber),
      checkRequired("EDOCUMENT_SHIPMENT_VEHICLE_PLATE", "Araç plakası", shipment.vehiclePlate),
      checkRequired("EDOCUMENT_SHIPMENT_DRIVER_NAME", "Şoför adı", shipment.driverName),
      checkRequired("EDOCUMENT_SHIPMENT_DRIVER_TCKN", "Şoför TCKN", shipment.driverTckn),
    ];
    const schemaChecks: EDocumentConfigCheck[] = [
      {
        key: "GIB_INVOICE_XSD",
        label: "Fatura resmi XSD",
        ready: invoiceSchema.officialSchemaReady,
        message: invoiceSchema.officialSchemaReady ? `Hazır · SHA-256 ${invoiceSchema.xsdHash}` : invoiceSchema.xsdPath,
      },
      {
        key: "GIB_DESPATCH_XSD",
        label: "İrsaliye resmi XSD",
        ready: despatchSchema.officialSchemaReady,
        message: despatchSchema.officialSchemaReady ? `Hazır · SHA-256 ${despatchSchema.xsdHash}` : despatchSchema.xsdPath,
      },
      {
        key: "GIB_INVOICE_SCHEMATRON",
        label: "Fatura resmi Schematron",
        ready: invoiceSchema.officialSchematronReady,
        message: invoiceSchema.officialSchematronReady ? `Hazır · SHA-256 ${invoiceSchema.schematronHash}` : invoiceSchema.schematronPath,
      },
      {
        key: "GIB_DESPATCH_SCHEMATRON",
        label: "İrsaliye resmi Schematron",
        ready: despatchSchema.officialSchematronReady,
        message: despatchSchema.officialSchematronReady ? `Hazır · SHA-256 ${despatchSchema.schematronHash}` : despatchSchema.schematronPath,
      },
    ];
    const validatorChecks: EDocumentConfigCheck[] = [
      checkValidatorCommand("EDOCUMENT_XSD_VALIDATOR_COMMAND", "XSD validator komutu"),
      checkValidatorArgs("EDOCUMENT_XSD_VALIDATOR_ARGS", "XSD validator argümanları"),
      checkValidatorCommand("EDOCUMENT_SCHEMATRON_VALIDATOR_COMMAND", "Schematron validator komutu"),
      checkValidatorArgs("EDOCUMENT_SCHEMATRON_VALIDATOR_ARGS", "Schematron validator argümanları"),
    ];
    const providerChecks = [checkProviderMode(), checkLiveProviderProtocol(), checkConfiguredLiveProviderAdapter(), checkOperationalLiveProviderAdapter()];

    const senderReady = senderChecks.every((check) => check.ready);
    const taxReady = taxChecks.every((check) => check.ready);
    const shipmentReady = shipmentChecks.every((check) => check.ready);
    const schemaReady = invoiceSchema.officialSchemaReady && despatchSchema.officialSchemaReady;
    const schematronReady = invoiceSchema.officialSchematronReady && despatchSchema.officialSchematronReady;
    const validationEngineReady = validatorChecks.every((check) => check.ready);
    const providerReady = providerChecks.every((check) => check.ready);
    const checks = [
      ...senderChecks,
      ...taxChecks,
      ...numberingChecks,
      ...shipmentChecks,
      ...schemaChecks,
      ...validatorChecks,
      ...providerChecks,
    ];

    return {
      ready: checks.every((check) => check.ready),
      senderReady,
      taxReady,
      shipmentReady,
      schemaReady,
      schematronReady,
      validationEngineReady,
      providerReady,
      providerMode: resolveProviderMode(),
      registeredProviderAdapters: eDocumentProviderRegistryService.listProviderKeys(),
      providerAdapters: eDocumentProviderRegistryService.listProviderStatuses(),
      productionChecklist: eDocumentProductionChecklistService.listItems(),
      liveProviderTestScenarios: liveProviderTestPlanService.listRequiredScenarios(),
      checks,
    };
  }
}

export const eDocumentConfigReadinessService = new EDocumentConfigReadinessService();
