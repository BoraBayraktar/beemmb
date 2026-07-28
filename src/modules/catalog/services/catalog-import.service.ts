import { z } from "zod";
import ExcelJS from "exceljs";

import type { AdminCreateProductInput, AdminProductImportResult } from "@/modules/catalog/contracts/catalog-admin.contract";
import { parseCsv } from "@/modules/catalog/services/catalog-csv.service";
import { catalogAdminService } from "@/modules/catalog/services/catalog-admin.service";

const rowSchema = z.object({
  slug: z.string().trim().min(3),
  sku: z.string().trim().min(3).max(64),
  barcode: z.string().trim().max(64).optional(),
  name: z.string().trim().min(2),
  description: z.string().trim().min(3),
  productType: z.enum(["PHYSICAL", "SERVICE", "RAW_MATERIAL", "SEMI_FINISHED"]).default("PHYSICAL"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  unitType: z.enum(["PIECE", "KILOGRAM", "GRAM", "LITER", "MILLILITER", "METER", "CENTIMETER", "BOX", "PACK"]).default("PIECE"),
  price: z.coerce.number().positive(),
  purchasePrice: z.coerce.number().nonnegative().optional().nullable(),
  compareAtPrice: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  currency: z.string().trim().min(3).max(3).default("TRY"),
  vatRate: z.coerce.number().int().min(0).max(100).default(20),
  stockTrackingEnabled: z.boolean().default(true),
  salesEnabled: z.boolean().default(true),
  purchaseEnabled: z.boolean().default(true),
  brandSlug: z.string().trim().optional().nullable(),
  brandName: z.string().trim().optional().nullable(),
  supplierName: z.string().trim().optional().nullable(),
  categorySlug: z.string().trim().optional().nullable(),
  preferredSalesWarehouseCode: z.string().trim().optional().nullable(),
  preferredPurchaseWarehouseCode: z.string().trim().optional().nullable(),
  searchKeywords: z.array(z.string()).default([]),
  internalNote: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().url(),
  imageUrls: z.array(z.string().trim().url()).default([]),
  features: z.array(z.object({
    key: z.string().trim().min(1),
    value: z.string().trim().min(1),
    highlighted: z.boolean().default(false),
  })).default([]),
});

const PRODUCT_SHEET_NAME = "Ürünler";
const VARIANT_SHEET_NAME = "Varyantlar";

const PRODUCT_IMPORT_COLUMNS = [
  { key: "slug", label: "Slug" },
  { key: "sku", label: "SKU" },
  { key: "barcode", label: "Barkod" },
  { key: "name", label: "Ürün adı" },
  { key: "description", label: "Açıklama" },
  { key: "productType", label: "Ürün tipi" },
  { key: "status", label: "Durum" },
  { key: "unitType", label: "Birim tipi" },
  { key: "price", label: "Satış fiyatı" },
  { key: "purchasePrice", label: "Alış fiyatı" },
  { key: "compareAtPrice", label: "İndirimsiz fiyat" },
  { key: "stock", label: "Stok" },
  { key: "currency", label: "Para birimi" },
  { key: "vatRate", label: "KDV oranı" },
  { key: "stockTrackingEnabled", label: "Stok takibi açık" },
  { key: "salesEnabled", label: "Satışa açık" },
  { key: "purchaseEnabled", label: "Satın almaya açık" },
  { key: "brandSlug", label: "Marka slug" },
  { key: "brandName", label: "Marka adı" },
  { key: "supplierName", label: "Tedarikçi adı" },
  { key: "categorySlug", label: "Kategori slug" },
  { key: "preferredSalesWarehouseCode", label: "Varsayılan satış deposu" },
  { key: "preferredPurchaseWarehouseCode", label: "Varsayılan alış deposu" },
  { key: "searchKeywords", label: "Arama kelimeleri" },
  { key: "internalNote", label: "İç not" },
  { key: "imageUrl", label: "Görsel URL" },
  { key: "imageUrls", label: "Ek Görseller" },
  { key: "features", label: "Ürün Özellikleri" },
];

const VARIANT_IMPORT_COLUMNS = [
  { key: "productSku", label: "Ürün SKU" },
  { key: "variantSlug", label: "Varyant slug" },
  { key: "variantSku", label: "Varyant SKU" },
  { key: "variantBarcode", label: "Varyant barkod" },
  { key: "variantTitle", label: "Varyant adı" },
  { key: "optionSummary", label: "Seçenek özeti" },
  { key: "priceOverride", label: "Satış fiyatı override" },
  { key: "purchasePriceOverride", label: "Alış fiyatı override" },
  { key: "compareAtPriceOverride", label: "İndirimsiz fiyat override" },
  { key: "stockOverride", label: "Stok override" },
  { key: "salesEnabled", label: "Satışa açık" },
  { key: "isDefault", label: "Varsayılan varyant" },
  { key: "sortOrder", label: "Sıralama" },
  { key: "imageUrl", label: "Varyant görsel URL" },
  { key: "imageUrls", label: "Varyant ek görseller" },
  { key: "attributeName1", label: "Varyant özelliği 1" },
  { key: "attributeValue1", label: "Varyant değeri 1" },
  { key: "attributeName2", label: "Varyant özelliği 2" },
  { key: "attributeValue2", label: "Varyant değeri 2" },
  { key: "attributeName3", label: "Varyant özelliği 3" },
  { key: "attributeValue3", label: "Varyant değeri 3" },
  { key: "attributes", label: "Varyant özellikleri" },
];

type SheetRows = {
  headers: string[];
  rows: string[][];
};

type WorkbookRows = Record<string, SheetRows | undefined>;

type ImportColumn = {
  key: string;
  label: string;
};

function toBoolean(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "evet"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "hayir", "hayır"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function splitPipe(value: string | undefined) {
  return (value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFeatures(value: string | undefined) {
  return splitPipe(value).map((item) => {
    const [key = "", featureValue = "", highlighted = "0"] = item.split(":");
    return {
      key: key.trim(),
      value: featureValue.trim(),
      highlighted: highlighted.trim() === "1" || highlighted.trim().toLowerCase() === "true",
    };
  }).filter((item) => item.key && item.value);
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeLookup(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function normalizeSku(value: string) {
  return value.trim().toLocaleUpperCase("tr-TR");
}

function buildHeaderIndex(headers: string[], columns: ImportColumn[]) {
  const directIndex = new Map(headers.map((header, index) => [header, index]));
  const normalizedIndex = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const aliases = new Map<string, number>();

  for (const column of columns) {
    const index = directIndex.get(column.key)
      ?? directIndex.get(column.label)
      ?? normalizedIndex.get(normalizeHeader(column.key))
      ?? normalizedIndex.get(normalizeHeader(column.label));

    if (index !== undefined) {
      aliases.set(column.key, index);
    }
  }

  return aliases;
}

function normalizeHeader(value: string) {
  return normalizeLookup(value).replace(/\s+\*$/, "");
}

function readCell(row: string[], headerIndex: Map<string, number>, key: string) {
  return row[headerIndex.get(key) ?? -1] ?? "";
}

function cellValueToString(value: ExcelJS.CellValue) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("result" in value) {
      return String(value.result ?? "").trim();
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("").trim();
    }
  }

  return String(value).trim();
}

function worksheetToRows(worksheet: ExcelJS.Worksheet | undefined): SheetRows | undefined {
  if (!worksheet) {
    return undefined;
  }

  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = cellValueToString(cell.value);
    });

    if (values.some((value) => value.trim())) {
      rows.push(values.map((value) => value ?? ""));
    }
  });

  const [headers = [], ...dataRows] = rows;
  return { headers, rows: dataRows };
}

function addHeaderStyle(worksheet: ExcelJS.Worksheet) {
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD1D5DB" } } };
  });
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };
}

function setColumnWidths(worksheet: ExcelJS.Worksheet, widths: number[]) {
  worksheet.columns = widths.map((width) => ({ width }));
}

function addListValidation(worksheet: ExcelJS.Worksheet, columnNumber: number, formula: string, prompt: string) {
  for (let rowNumber = 2; rowNumber <= 501; rowNumber += 1) {
    worksheet.getCell(rowNumber, columnNumber).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Geçersiz değer",
      error: "Lütfen listeden bir değer seçin.",
      showInputMessage: true,
      promptTitle: "Beklenen değer",
      prompt,
    };
  }
}

function addNumberValidation(worksheet: ExcelJS.Worksheet, columnNumber: number, prompt: string, allowBlank = true) {
  for (let rowNumber = 2; rowNumber <= 501; rowNumber += 1) {
    worksheet.getCell(rowNumber, columnNumber).dataValidation = {
      type: "decimal",
      operator: "greaterThanOrEqual",
      allowBlank,
      formulae: [0],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Geçersiz sayı",
      error: "Bu alana 0 veya daha büyük bir sayı girin.",
      showInputMessage: true,
      promptTitle: "Beklenen değer",
      prompt,
    };
  }
}

function addReferenceSheet(workbook: ExcelJS.Workbook, args: {
  brands: Array<{ slug: string; name: string }>;
  suppliers: Array<{ name: string }>;
  categories: Array<{ slug: string; name: string }>;
  warehouses: Array<{ code: string; name: string }>;
  attributes: Array<{ slug: string; name: string }>;
}) {
  const sheet = workbook.addWorksheet("Referanslar");
  sheet.addRow(["Marka slug", "Marka adı", "Tedarikçi adı", "Kategori slug", "Kategori adı", "Depo kodu", "Depo adı", "Varyant özelliği"]);
  const maxRows = Math.max(args.brands.length, args.suppliers.length, args.categories.length, args.warehouses.length, args.attributes.length, 1);

  for (let index = 0; index < maxRows; index += 1) {
    sheet.addRow([
      args.brands[index]?.slug ?? "",
      args.brands[index]?.name ?? "",
      args.suppliers[index]?.name ?? "",
      args.categories[index]?.slug ?? "",
      args.categories[index]?.name ?? "",
      args.warehouses[index]?.code ?? "",
      args.warehouses[index]?.name ?? "",
      args.attributes[index]?.name ?? "",
    ]);
  }

  setColumnWidths(sheet, [22, 26, 28, 24, 28, 18, 28, 24]);
  addHeaderStyle(sheet);
  return sheet;
}

function addListSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet("Listeler");
  const columns = [
    ["Ürün tipleri", "PHYSICAL", "SERVICE", "RAW_MATERIAL", "SEMI_FINISHED"],
    ["Durumlar", "DRAFT", "ACTIVE", "ARCHIVED"],
    ["Birim tipleri", "PIECE", "KILOGRAM", "GRAM", "LITER", "MILLILITER", "METER", "CENTIMETER", "BOX", "PACK"],
    ["Evet/Hayır", "true", "false"],
  ];

  columns.forEach((values, index) => {
    const columnNumber = index + 1;
    values.forEach((value, rowIndex) => {
      sheet.getCell(rowIndex + 1, columnNumber).value = value;
    });
  });

  setColumnWidths(sheet, [24, 18, 18, 18]);
  addHeaderStyle(sheet);
  return sheet;
}

async function listAllCategoriesForTemplate() {
  const firstPage = await catalogAdminService.listCategories({ page: 1, pageSize: 50 });
  const items = [...firstPage.items];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const result = await catalogAdminService.listCategories({ page, pageSize: 50 });
    items.push(...result.items);
  }

  return items;
}

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseSpreadsheetXml(text: string): WorkbookRows {
  const workbook: WorkbookRows = {};
  const worksheetPattern = /<Worksheet\b[^>]*ss:Name="([^"]+)"[^>]*>([\s\S]*?)<\/Worksheet>/g;
  let worksheetMatch: RegExpExecArray | null;

  while ((worksheetMatch = worksheetPattern.exec(text)) !== null) {
    const sheetName = decodeXml(worksheetMatch[1] ?? "");
    const sheetXml = worksheetMatch[2] ?? "";
    const rows: string[][] = [];
    const rowPattern = /<Row\b[^>]*>([\s\S]*?)<\/Row>/g;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowPattern.exec(sheetXml)) !== null) {
      const cells: string[] = [];
      const cellPattern = /<Cell\b[^>]*>([\s\S]*?)<\/Cell>/g;
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellPattern.exec(rowMatch[1] ?? "")) !== null) {
        const dataMatch = /<Data\b[^>]*>([\s\S]*?)<\/Data>/.exec(cellMatch[1] ?? "");
        cells.push(decodeXml((dataMatch?.[1] ?? "").replace(/<[^>]+>/g, "")).trim());
      }

      if (cells.some((cell) => cell.length > 0)) {
        rows.push(cells);
      }
    }

    const [headers = [], ...dataRows] = rows;
    workbook[sheetName] = { headers, rows: dataRows };
  }

  return workbook;
}

function zodMessage(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "satır"}: ${issue.message}`).join("; ");
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return zodMessage(error);
  }

  return error instanceof Error ? error.message : "Bilinmeyen içe aktarma hatası";
}

function parseVariantAttributes(value: string | undefined, attributeDefinitions: Map<string, { id: string; name: string; slug: string }>) {
  return splitPipe(value).map((item) => {
    const separatorIndex = item.indexOf("=");
    if (separatorIndex <= 0) {
      throw new Error(`Varyant özelliği "Ozellik=Deger" formatında olmalı: ${item}`);
    }

    const attributeKey = item.slice(0, separatorIndex).trim();
    const attributeValue = item.slice(separatorIndex + 1).trim();
    const definition = attributeDefinitions.get(normalizeLookup(attributeKey)) ?? attributeDefinitions.get(normalizeSlug(attributeKey));

    if (!definition) {
      throw new Error(`Ürün özellik tanımı bulunamadı: ${attributeKey}. Önce Ürün Özellikleri ekranında tanımlayın.`);
    }

    if (!attributeValue) {
      throw new Error(`Varyant özellik değeri boş olamaz: ${attributeKey}`);
    }

    return {
      attributeDefinitionId: definition.id,
      value: attributeValue,
    };
  });
}

function parseVariantAttributesFromRow(raw: (key: string) => string, attributeDefinitions: Map<string, { id: string; name: string; slug: string }>) {
  const structuredAttributes = [1, 2, 3].flatMap((index) => {
    const attributeName = raw(`attributeName${index}`).trim();
    const attributeValue = raw(`attributeValue${index}`).trim();

    if (!attributeName && !attributeValue) {
      return [];
    }

    if (!attributeName || !attributeValue) {
      throw new Error(`Varyant özelliği ${index} ve Varyant değeri ${index} birlikte doldurulmalıdır.`);
    }

    return [`${attributeName}=${attributeValue}`];
  });

  if (structuredAttributes.length > 0) {
    return parseVariantAttributes(structuredAttributes.join("|"), attributeDefinitions);
  }

  return parseVariantAttributes(raw("attributes"), attributeDefinitions);
}

export class CatalogImportService {
  async buildProductImportTemplate() {
    const [brands, suppliers, categories, warehouses, attributeDefinitions] = await Promise.all([
      catalogAdminService.listBrands(),
      catalogAdminService.listSuppliers(),
      listAllCategoriesForTemplate(),
      catalogAdminService.listWarehousesForProductAdmin(),
      catalogAdminService.listAttributeDefinitions(),
    ]);
    const productExample = [
      "ornek-tisort",
      "TSHIRT-001",
      "8690000000001",
      "Örnek Tişört",
      "Pamuklu örnek ürün açıklaması",
      "PHYSICAL",
      "ACTIVE",
      "PIECE",
      "499.90",
      "250",
      "599.90",
      "25",
      "TRY",
      "20",
      "true",
      "true",
      "true",
      "ornek-marka",
      "Örnek Marka",
      "Örnek Tedarikçi",
      "giyim",
      "MERKEZ",
      "MERKEZ",
      "tişört|pamuk|yaz",
      "Excel şablon örneği",
      "https://example.com/images/tshirt-main.jpg",
      "https://example.com/images/tshirt-1.jpg|https://example.com/images/tshirt-2.jpg",
      "Kumaş:Pamuk:1|Kalıp:Regular:0",
    ];
    const variantExampleRows = [
      ["TSHIRT-001", "ornek-tisort-siyah-s", "TSHIRT-001-BLK-S", "8690000000002", "Örnek Tişört - Renk: Siyah / Beden: S", "Renk: Siyah / Beden: S", "499.90", "250", "599.90", "10", "true", "true", "1", "https://example.com/images/tshirt-black-s.jpg", "", "Renk", "Siyah", "Beden", "S", "", "", ""],
      ["TSHIRT-001", "ornek-tisort-beyaz-m", "TSHIRT-001-WHT-M", "8690000000003", "Örnek Tişört - Renk: Beyaz / Beden: M", "Renk: Beyaz / Beden: M", "499.90", "250", "599.90", "15", "true", "false", "2", "https://example.com/images/tshirt-white-m.jpg", "", "Renk", "Beyaz", "Beden", "M", "", "", ""],
    ];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BEEMMB";
    workbook.created = new Date();
    workbook.modified = new Date();

    const helpSheet = workbook.addWorksheet("Açıklamalar");
    helpSheet.addRows([
      ["BEEMMB Ürün Excel İçe Aktarım Şablonu"],
      ["1. Ürünleri Ürünler sayfasına yazın. Zorunlu alanları boş bırakmayın."],
      ["2. Varyantları Varyantlar sayfasına yazın ve Ürün SKU alanıyla ana ürüne bağlayın."],
      ["3. Dropdown olan alanlarda listeden seçim yapın. Serbest yazılan referanslar Referanslar sayfasındaki değerlerle aynı olmalıdır."],
      ["4. Çoklu değerlerde | kullanın. Örnek: tişört|pamuk|yaz"],
      ["5. Ürün Özellikleri formatı: Özellik Adı:Değer:ÖneÇıkar. Örnek: Kumaş:Pamuk:1"],
      ["6. Varyant özelliklerini seçimli kolonlardan doldurun. Daha fazla özellik gerekirse Varyant özellikleri alanında Renk=Siyah|Beden=M formatı da desteklenir."],
      ["7. Dosya tamamen doğrulanmadan hiçbir ürün içe aktarılmaz."],
    ]);
    helpSheet.getCell("A1").font = { bold: true, size: 16 };
    helpSheet.getColumn(1).width = 120;

    const productSheet = workbook.addWorksheet(PRODUCT_SHEET_NAME);
    productSheet.addRow(PRODUCT_IMPORT_COLUMNS.map((column) => `${column.label}${["sku", "name", "description", "price", "imageUrl"].includes(column.key) ? " *" : ""}`));
    productSheet.addRow(productExample);
    setColumnWidths(productSheet, [18, 18, 18, 28, 42, 18, 16, 16, 16, 16, 18, 12, 14, 12, 18, 14, 20, 18, 24, 28, 20, 24, 24, 28, 32, 42, 46, 42]);
    addHeaderStyle(productSheet);

    const variantSheet = workbook.addWorksheet(VARIANT_SHEET_NAME);
    variantSheet.addRow(VARIANT_IMPORT_COLUMNS.map((column) => `${column.label}${["productSku", "variantSlug", "variantSku", "variantTitle", "optionSummary", "attributes"].includes(column.key) ? " *" : ""}`));
    for (const row of variantExampleRows) {
      variantSheet.addRow(row);
    }
    setColumnWidths(variantSheet, [18, 24, 22, 20, 42, 34, 22, 20, 24, 16, 14, 18, 12, 42, 42, 24, 18, 24, 18, 24, 18, 38]);
    addHeaderStyle(variantSheet);

    const listSheet = addListSheet(workbook);
    const referenceSheet = addReferenceSheet(workbook, {
      brands: brands.filter((item) => item.isActive).map((item) => ({ slug: item.slug, name: item.name })),
      suppliers: suppliers.filter((item) => item.isActive).map((item) => ({ name: item.name })),
      categories: categories.map((item) => ({ slug: item.slug, name: item.name })),
      warehouses: warehouses.map((item) => ({ code: item.code, name: item.name })),
      attributes: attributeDefinitions.filter((item) => item.isActive).map((item) => ({ slug: item.slug, name: item.name })),
    });

    addListValidation(productSheet, 6, `'${listSheet.name}'!$A$2:$A$5`, "Ürün tipini Listeler sayfasından seçin.");
    addListValidation(productSheet, 7, `'${listSheet.name}'!$B$2:$B$4`, "Ürün durumunu Listeler sayfasından seçin.");
    addListValidation(productSheet, 8, `'${listSheet.name}'!$C$2:$C$10`, "Birim tipini Listeler sayfasından seçin.");
    addListValidation(productSheet, 15, `'${listSheet.name}'!$D$2:$D$3`, "Stok takibi açık mı?");
    addListValidation(productSheet, 16, `'${listSheet.name}'!$D$2:$D$3`, "Satışa açık mı?");
    addListValidation(productSheet, 17, `'${listSheet.name}'!$D$2:$D$3`, "Satın almaya açık mı?");
    addListValidation(productSheet, 18, `'Referanslar'!$A$2:$A$${Math.max(2, referenceSheet.rowCount)}`, "Referanslar sayfasındaki marka slug değerlerinden seçin.");
    addListValidation(productSheet, 19, `'Referanslar'!$B$2:$B$${Math.max(2, referenceSheet.rowCount)}`, "Referanslar sayfasındaki marka adlarından seçin.");
    addListValidation(productSheet, 20, `'Referanslar'!$C$2:$C$${Math.max(2, referenceSheet.rowCount)}`, "Referanslar sayfasındaki tedarikçi adlarından seçin.");
    addListValidation(productSheet, 21, `'Referanslar'!$D$2:$D$${Math.max(2, referenceSheet.rowCount)}`, "Referanslar sayfasındaki kategori slug değerlerinden seçin.");
    addListValidation(productSheet, 22, `'Referanslar'!$F$2:$F$${Math.max(2, referenceSheet.rowCount)}`, "Referanslar sayfasındaki depo kodlarından seçin.");
    addListValidation(productSheet, 23, `'Referanslar'!$F$2:$F$${Math.max(2, referenceSheet.rowCount)}`, "Referanslar sayfasındaki depo kodlarından seçin.");
    addNumberValidation(productSheet, 9, "Satış fiyatı 0'dan büyük olmalıdır.", false);
    addNumberValidation(productSheet, 10, "Alış fiyatı boş veya 0'dan büyük olabilir.");
    addNumberValidation(productSheet, 11, "İndirimsiz fiyat boş veya satış fiyatından büyük olabilir.");
    addNumberValidation(productSheet, 12, "Stok 0 veya daha büyük olmalıdır.");
    addNumberValidation(productSheet, 14, "KDV oranı 0-100 arası olmalıdır.");

    addListValidation(variantSheet, 11, `'${listSheet.name}'!$D$2:$D$3`, "Varyant satışa açık mı?");
    addListValidation(variantSheet, 12, `'${listSheet.name}'!$D$2:$D$3`, "Varsayılan varyant mı?");
    addListValidation(variantSheet, 16, `'Referanslar'!$H$2:$H$${Math.max(2, referenceSheet.rowCount)}`, "Referanslar sayfasındaki varyant özelliklerinden seçin.");
    addListValidation(variantSheet, 18, `'Referanslar'!$H$2:$H$${Math.max(2, referenceSheet.rowCount)}`, "Referanslar sayfasındaki varyant özelliklerinden seçin.");
    addListValidation(variantSheet, 20, `'Referanslar'!$H$2:$H$${Math.max(2, referenceSheet.rowCount)}`, "Referanslar sayfasındaki varyant özelliklerinden seçin.");
    addNumberValidation(variantSheet, 7, "Varyant satış fiyatı boş veya 0'dan büyük olabilir.");
    addNumberValidation(variantSheet, 8, "Varyant alış fiyatı boş veya 0'dan büyük olabilir.");
    addNumberValidation(variantSheet, 9, "Varyant indirimsiz fiyatı boş veya satış fiyatından büyük olabilir.");
    addNumberValidation(variantSheet, 10, "Varyant stoğu boş veya 0'dan büyük olabilir.");
    addNumberValidation(variantSheet, 13, "Sıralama boş veya 0'dan büyük bir sayı olabilir.");

    return workbook.xlsx.writeBuffer();
  }

  async importProductsFromCsv(csvText: string): Promise<AdminProductImportResult> {
    const { headers, rows } = parseCsv(csvText);

    if (headers.length === 0 || rows.length === 0) {
      return {
        createdCount: 0,
        failedCount: 1,
        errors: [{ rowNumber: 1, message: "CSV dosyası boş veya başlık satırı eksik." }],
      };
    }

    const headerIndex = new Map(headers.map((header, index) => [header, index]));
    const brands = new Map((await catalogAdminService.listBrands()).map((item) => [normalizeSlug(item.slug), item.id]));
    const suppliers = new Map((await catalogAdminService.listSuppliers()).map((item) => [normalizeLookup(item.name), item.id]));
    const categories = new Map((await listAllCategoriesForTemplate()).map((item) => [normalizeSlug(item.slug), item.id]));
    const warehouses = new Map((await catalogAdminService.listWarehousesForProductAdmin()).map((item) => [item.code.trim().toUpperCase(), item.id]));

    const result: AdminProductImportResult = { createdCount: 0, failedCount: 0, errors: [] };
    const preparedProducts: AdminCreateProductInput[] = [];
    const seenProductSkus = new Set<string>();
    const seenProductSlugs = new Set<string>();

    for (const [index, row] of rows.entries()) {
      try {
        const raw = (key: string) => row[headerIndex.get(key) ?? -1] ?? "";
        const parsed = rowSchema.parse({
          slug: raw("slug"),
          sku: raw("sku"),
          barcode: raw("barcode") || null,
          name: raw("name"),
          description: raw("description"),
          productType: raw("productType") || undefined,
          status: raw("status") || undefined,
          unitType: raw("unitType") || undefined,
          price: raw("price"),
          purchasePrice: raw("purchasePrice") ? raw("purchasePrice") : null,
          compareAtPrice: raw("compareAtPrice") ? raw("compareAtPrice") : null,
          stock: raw("stock") || "0",
          currency: raw("currency") || "TRY",
          vatRate: raw("vatRate") || "20",
          stockTrackingEnabled: toBoolean(raw("stockTrackingEnabled")) ?? true,
          salesEnabled: toBoolean(raw("salesEnabled")) ?? true,
          purchaseEnabled: toBoolean(raw("purchaseEnabled")) ?? true,
          brandSlug: raw("brandSlug") || null,
          brandName: raw("brandName") || null,
          supplierName: raw("supplierName") || null,
          categorySlug: raw("categorySlug") || null,
          preferredSalesWarehouseCode: raw("preferredSalesWarehouseCode") || null,
          preferredPurchaseWarehouseCode: raw("preferredPurchaseWarehouseCode") || null,
          searchKeywords: splitPipe(raw("searchKeywords")),
          internalNote: raw("internalNote") || null,
          imageUrl: raw("imageUrl"),
          imageUrls: splitPipe(raw("imageUrls")),
          features: parseFeatures(raw("features")),
        });

        let brandId: string | null = null;
        if (parsed.brandSlug || parsed.brandName) {
          const candidateSlug = normalizeSlug(parsed.brandSlug ?? parsed.brandName ?? "");
          brandId = brands.get(candidateSlug) ?? null;
          if (!brandId) {
            throw new Error(`Marka kaydi bulunamadi: ${parsed.brandName ?? parsed.brandSlug}. Once merkezi marka tanimini olusturun.`);
          }
        }

        let primarySupplierId: string | null = null;
        if (parsed.supplierName) {
          const supplierKey = normalizeLookup(parsed.supplierName);
          primarySupplierId = suppliers.get(supplierKey) ?? null;
          if (!primarySupplierId) {
            throw new Error(`Tedarikci kaydi bulunamadi: ${parsed.supplierName}. Once merkezi tedarikci tanimini olusturun.`);
          }
        }

        const categoryId = parsed.categorySlug
          ? (categories.get(normalizeSlug(parsed.categorySlug)) ?? null)
          : null;
        if (parsed.categorySlug && !categoryId) {
          throw new Error(`Kategori kaydi bulunamadi: ${parsed.categorySlug}. Once merkezi kategori tanimini olusturun.`);
        }

        const preferredSalesWarehouseId = parsed.preferredSalesWarehouseCode
          ? (warehouses.get(parsed.preferredSalesWarehouseCode.trim().toUpperCase()) ?? null)
          : null;
        if (parsed.preferredSalesWarehouseCode && !preferredSalesWarehouseId) {
          throw new Error(`Satis deposu bulunamadi: ${parsed.preferredSalesWarehouseCode}. Once merkezi depo tanimini olusturun.`);
        }

        const preferredPurchaseWarehouseId = parsed.preferredPurchaseWarehouseCode
          ? (warehouses.get(parsed.preferredPurchaseWarehouseCode.trim().toUpperCase()) ?? null)
          : null;
        if (parsed.preferredPurchaseWarehouseCode && !preferredPurchaseWarehouseId) {
          throw new Error(`Satin alma deposu bulunamadi: ${parsed.preferredPurchaseWarehouseCode}. Once merkezi depo tanimini olusturun.`);
        }

        const skuKey = normalizeSku(parsed.sku);
        const slugKey = normalizeSlug(parsed.slug);
        if (seenProductSkus.has(skuKey)) {
          throw new Error(`Dosya içinde mükerrer ürün SKU var: ${parsed.sku}`);
        }
        if (seenProductSlugs.has(slugKey)) {
          throw new Error(`Dosya içinde mükerrer ürün slug var: ${parsed.slug}`);
        }
        seenProductSkus.add(skuKey);
        seenProductSlugs.add(slugKey);

        preparedProducts.push({
          slug: parsed.slug,
          sku: parsed.sku,
          barcode: parsed.barcode,
          name: parsed.name,
          description: parsed.description,
          productType: parsed.productType,
          status: parsed.status,
          unitType: parsed.unitType,
          price: parsed.price,
          purchasePrice: parsed.purchasePrice,
          compareAtPrice: parsed.compareAtPrice,
          stock: parsed.stock,
          currency: parsed.currency,
          vatRate: parsed.vatRate,
          stockTrackingEnabled: parsed.stockTrackingEnabled,
          salesEnabled: parsed.salesEnabled,
          purchaseEnabled: parsed.purchaseEnabled,
          brandId,
          primarySupplierId,
          categoryId,
          preferredSalesWarehouseId,
          preferredPurchaseWarehouseId,
          searchKeywords: parsed.searchKeywords,
          internalNote: parsed.internalNote,
          imageUrl: parsed.imageUrl,
          imageUrls: parsed.imageUrls,
          features: parsed.features,
        });
      } catch (error) {
        result.failedCount += 1;
        result.errors.push({
          rowNumber: index + 2,
          sheetName: "CSV",
          message: errorMessage(error),
        });
      }
    }

    if (result.errors.length > 0) {
      return result;
    }

    result.validatedCount = preparedProducts.length;
    try {
      await catalogAdminService.validateProductImportCandidates(preparedProducts);
    } catch (error) {
      return {
        createdCount: 0,
        failedCount: 1,
        validatedCount: 0,
        errors: [{ rowNumber: 1, sheetName: "CSV", message: errorMessage(error) }],
      };
    }

    for (const product of preparedProducts) {
      await catalogAdminService.createProduct(product);
      result.createdCount += 1;
    }

    return result;
  }

  async importProductsFromText(text: string): Promise<AdminProductImportResult> {
    return text.includes("<Workbook")
      ? this.importProductsFromExcel(text)
      : this.importProductsFromCsv(text);
  }

  async importProductsFromExcel(excelText: string): Promise<AdminProductImportResult> {
    const workbook = parseSpreadsheetXml(excelText);
    return this.importProductsFromWorkbookRows(workbook);
  }

  async importProductsFromXlsx(buffer: ArrayBuffer): Promise<AdminProductImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return this.importProductsFromWorkbookRows({
      [PRODUCT_SHEET_NAME]: worksheetToRows(workbook.getWorksheet(PRODUCT_SHEET_NAME)),
      Urunler: worksheetToRows(workbook.getWorksheet("Urunler")),
      [VARIANT_SHEET_NAME]: worksheetToRows(workbook.getWorksheet(VARIANT_SHEET_NAME)),
    });
  }

  private async importProductsFromWorkbookRows(workbook: WorkbookRows): Promise<AdminProductImportResult> {
    const productSheet = workbook[PRODUCT_SHEET_NAME] ?? workbook.Urunler;
    const variantSheet = workbook[VARIANT_SHEET_NAME];

    if (!productSheet || productSheet.headers.length === 0 || productSheet.rows.length === 0) {
      return {
        createdCount: 0,
        failedCount: 1,
        errors: [{ rowNumber: 1, sheetName: PRODUCT_SHEET_NAME, message: "Excel şablonunda Ürünler sayfası veya başlık satırı eksik." }],
      };
    }

    const productHeaderIndex = buildHeaderIndex(productSheet.headers, PRODUCT_IMPORT_COLUMNS);
    const variantHeaderIndex = buildHeaderIndex(variantSheet?.headers ?? [], VARIANT_IMPORT_COLUMNS);
    const brands = new Map((await catalogAdminService.listBrands()).map((item) => [normalizeSlug(item.slug), item.id]));
    const suppliers = new Map((await catalogAdminService.listSuppliers()).map((item) => [normalizeLookup(item.name), item.id]));
    const categories = new Map((await listAllCategoriesForTemplate()).map((item) => [normalizeSlug(item.slug), item.id]));
    const warehouses = new Map((await catalogAdminService.listWarehousesForProductAdmin()).map((item) => [item.code.trim().toUpperCase(), item.id]));
    const attributeDefinitions = new Map<string, { id: string; name: string; slug: string }>();

    for (const item of await catalogAdminService.listAttributeDefinitions()) {
      if (item.isActive) {
        attributeDefinitions.set(normalizeLookup(item.name), { id: item.id, name: item.name, slug: item.slug });
        attributeDefinitions.set(normalizeSlug(item.slug), { id: item.id, name: item.name, slug: item.slug });
      }
    }

    const result: AdminProductImportResult = { createdCount: 0, failedCount: 0, errors: [] };
    const preparedBySku = new Map<string, AdminCreateProductInput>();
    const seenProductSlugs = new Set<string>();
    const seenVariantSkus = new Set<string>();
    const seenVariantSlugs = new Set<string>();

    for (const [index, row] of productSheet.rows.entries()) {
      try {
        const raw = (key: string) => readCell(row, productHeaderIndex, key);
        const parsed = rowSchema.parse({
          slug: raw("slug"),
          sku: raw("sku"),
          barcode: raw("barcode") || null,
          name: raw("name"),
          description: raw("description"),
          productType: raw("productType") || undefined,
          status: raw("status") || undefined,
          unitType: raw("unitType") || undefined,
          price: raw("price"),
          purchasePrice: raw("purchasePrice") ? raw("purchasePrice") : null,
          compareAtPrice: raw("compareAtPrice") ? raw("compareAtPrice") : null,
          stock: raw("stock") || "0",
          currency: raw("currency") || "TRY",
          vatRate: raw("vatRate") || "20",
          stockTrackingEnabled: toBoolean(raw("stockTrackingEnabled")) ?? true,
          salesEnabled: toBoolean(raw("salesEnabled")) ?? true,
          purchaseEnabled: toBoolean(raw("purchaseEnabled")) ?? true,
          brandSlug: raw("brandSlug") || null,
          brandName: raw("brandName") || null,
          supplierName: raw("supplierName") || null,
          categorySlug: raw("categorySlug") || null,
          preferredSalesWarehouseCode: raw("preferredSalesWarehouseCode") || null,
          preferredPurchaseWarehouseCode: raw("preferredPurchaseWarehouseCode") || null,
          searchKeywords: splitPipe(raw("searchKeywords")),
          internalNote: raw("internalNote") || null,
          imageUrl: raw("imageUrl"),
          imageUrls: splitPipe(raw("imageUrls")),
          features: parseFeatures(raw("features")),
        });

        const skuKey = normalizeSku(parsed.sku);
        const slugKey = normalizeSlug(parsed.slug);
        if (preparedBySku.has(skuKey)) {
          throw new Error(`Dosya içinde mükerrer ürün SKU var: ${parsed.sku}`);
        }
        if (seenProductSlugs.has(slugKey)) {
          throw new Error(`Dosya içinde mükerrer ürün slug var: ${parsed.slug}`);
        }

        let brandId: string | null = null;
        if (parsed.brandSlug || parsed.brandName) {
          brandId = brands.get(normalizeSlug(parsed.brandSlug ?? parsed.brandName ?? "")) ?? null;
          if (!brandId) {
            throw new Error(`Marka kaydı bulunamadı: ${parsed.brandName ?? parsed.brandSlug}. Önce merkezi marka tanımını oluşturun.`);
          }
        }

        let primarySupplierId: string | null = null;
        if (parsed.supplierName) {
          primarySupplierId = suppliers.get(normalizeLookup(parsed.supplierName)) ?? null;
          if (!primarySupplierId) {
            throw new Error(`Tedarikçi kaydı bulunamadı: ${parsed.supplierName}. Önce merkezi tedarikçi tanımını oluşturun.`);
          }
        }

        const categoryId = parsed.categorySlug ? (categories.get(normalizeSlug(parsed.categorySlug)) ?? null) : null;
        if (parsed.categorySlug && !categoryId) {
          throw new Error(`Kategori kaydı bulunamadı: ${parsed.categorySlug}. Önce merkezi kategori tanımını oluşturun.`);
        }

        const preferredSalesWarehouseId = parsed.preferredSalesWarehouseCode
          ? (warehouses.get(parsed.preferredSalesWarehouseCode.trim().toUpperCase()) ?? null)
          : null;
        if (parsed.preferredSalesWarehouseCode && !preferredSalesWarehouseId) {
          throw new Error(`Satış deposu bulunamadı: ${parsed.preferredSalesWarehouseCode}. Önce merkezi depo tanımını oluşturun.`);
        }

        const preferredPurchaseWarehouseId = parsed.preferredPurchaseWarehouseCode
          ? (warehouses.get(parsed.preferredPurchaseWarehouseCode.trim().toUpperCase()) ?? null)
          : null;
        if (parsed.preferredPurchaseWarehouseCode && !preferredPurchaseWarehouseId) {
          throw new Error(`Satın alma deposu bulunamadı: ${parsed.preferredPurchaseWarehouseCode}. Önce merkezi depo tanımını oluşturun.`);
        }

        preparedBySku.set(skuKey, {
          slug: parsed.slug,
          sku: parsed.sku,
          barcode: parsed.barcode,
          name: parsed.name,
          description: parsed.description,
          productType: parsed.productType,
          status: parsed.status,
          unitType: parsed.unitType,
          price: parsed.price,
          purchasePrice: parsed.purchasePrice,
          compareAtPrice: parsed.compareAtPrice,
          stock: parsed.stock,
          currency: parsed.currency,
          vatRate: parsed.vatRate,
          stockTrackingEnabled: parsed.stockTrackingEnabled,
          salesEnabled: parsed.salesEnabled,
          purchaseEnabled: parsed.purchaseEnabled,
          brandId,
          primarySupplierId,
          categoryId,
          preferredSalesWarehouseId,
          preferredPurchaseWarehouseId,
          searchKeywords: parsed.searchKeywords,
          internalNote: parsed.internalNote,
          imageUrl: parsed.imageUrl,
          imageUrls: parsed.imageUrls,
          features: parsed.features,
          attributeLinks: [],
          variants: [],
        });
        seenProductSlugs.add(slugKey);
      } catch (error) {
        result.errors.push({ rowNumber: index + 2, sheetName: PRODUCT_SHEET_NAME, message: errorMessage(error) });
      }
    }

    for (const [index, row] of (variantSheet?.rows ?? []).entries()) {
      try {
        const raw = (key: string) => readCell(row, variantHeaderIndex, key);
        const productSku = raw("productSku");
        const product = preparedBySku.get(normalizeSku(productSku));
        if (!product) {
          throw new Error(`Varyantın bağlı olduğu ürün SKU bulunamadı: ${productSku}`);
        }

        const attributes = parseVariantAttributesFromRow(raw, attributeDefinitions);
        if (attributes.length === 0) {
          throw new Error("Varyant için en az bir özellik değeri girilmelidir.");
        }

        const variantSku = raw("variantSku");
        const variantSlug = raw("variantSlug");
        const variantSkuKey = normalizeSku(variantSku);
        const variantSlugKey = normalizeSlug(variantSlug);
        if (seenVariantSkus.has(variantSkuKey) || preparedBySku.has(variantSkuKey)) {
          throw new Error(`Dosya içinde mükerrer varyant SKU var: ${variantSku}`);
        }
        if (seenVariantSlugs.has(variantSlugKey) || seenProductSlugs.has(variantSlugKey)) {
          throw new Error(`Dosya içinde mükerrer varyant slug var: ${variantSlug}`);
        }
        seenVariantSkus.add(variantSkuKey);
        seenVariantSlugs.add(variantSlugKey);

        const linkIds = new Set(product.attributeLinks?.map((item) => item.attributeDefinitionId) ?? []);
        for (const attribute of attributes) {
          if (!linkIds.has(attribute.attributeDefinitionId)) {
            product.attributeLinks = [
              ...(product.attributeLinks ?? []),
              { attributeDefinitionId: attribute.attributeDefinitionId, isVariantAxis: true, sortOrder: linkIds.size },
            ];
            linkIds.add(attribute.attributeDefinitionId);
          }
        }

        product.variants = [
          ...(product.variants ?? []),
          {
            slug: variantSlug,
            sku: variantSku,
            barcode: raw("variantBarcode") || null,
            title: raw("variantTitle"),
            optionSummary: raw("optionSummary"),
            priceOverride: raw("priceOverride") ? Number(raw("priceOverride")) : null,
            purchasePriceOverride: raw("purchasePriceOverride") ? Number(raw("purchasePriceOverride")) : null,
            compareAtPriceOverride: raw("compareAtPriceOverride") ? Number(raw("compareAtPriceOverride")) : null,
            stockOverride: raw("stockOverride") ? Number(raw("stockOverride")) : null,
            salesEnabled: toBoolean(raw("salesEnabled")) ?? true,
            isDefault: toBoolean(raw("isDefault")) ?? false,
            sortOrder: raw("sortOrder") ? Number(raw("sortOrder")) : undefined,
            imageUrl: raw("imageUrl") || null,
            imageUrls: splitPipe(raw("imageUrls")),
            attributes,
          },
        ];
      } catch (error) {
        result.errors.push({ rowNumber: index + 2, sheetName: VARIANT_SHEET_NAME, message: errorMessage(error) });
      }
    }

    result.failedCount = result.errors.length;
    if (result.errors.length > 0) {
      return result;
    }

    const products = Array.from(preparedBySku.values());
    result.validatedCount = products.length;
    try {
      await catalogAdminService.validateProductImportCandidates(products);
    } catch (error) {
      return {
        createdCount: 0,
        failedCount: 1,
        validatedCount: 0,
        errors: [{ rowNumber: 1, sheetName: "Genel", message: errorMessage(error) }],
      };
    }

    for (const product of products) {
      await catalogAdminService.createProduct(product);
      result.createdCount += 1;
    }

    return result;
  }
}

export const catalogImportService = new CatalogImportService();
