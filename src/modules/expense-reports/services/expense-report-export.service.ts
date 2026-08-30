import fs from "node:fs";
import path from "node:path";

import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import type { AdminExpenseItemReportRow } from "@/modules/expense-reports/contracts/expense-report-analytics.contract";

const REGULAR_FONT_PATH = path.join(process.cwd(), "src/assets/fonts/NotoSans-Regular.ttf");
const BOLD_FONT_PATH = path.join(process.cwd(), "src/assets/fonts/NotoSans-Bold.ttf");

const PDF_COLUMNS = [
  { key: "expenseDate", label: "Tarih", width: 58 },
  { key: "receiptNo", label: "Fiş/Fatura No", width: 72 },
  { key: "vendorName", label: "Satıcı Adı", width: 95 },
  { key: "categoryName", label: "Harcama Cinsi", width: 78 },
  { key: "description", label: "Açıklama", width: 140 },
  { key: "employeeName", label: "Personel", width: 85 },
  { key: "status", label: "Durum", width: 62 },
  { key: "amount", label: "Tutar", width: 75 },
] as const;

function statusLabel(status: AdminExpenseItemReportRow["status"]) {
  if (status === "DRAFT") return "Gönderilmedi";
  if (status === "SUBMITTED") return "Onay Bekliyor";
  if (status === "APPROVED") return "Onaylandı";
  return "Reddedildi";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR");
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export class ExpenseReportExportService {
  async buildExcelBuffer(items: AdminExpenseItemReportRow[], totalAmount: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BEEMMB";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Masraf Raporu");
    sheet.columns = [
      { header: "Tarih", key: "expenseDate", width: 14 },
      { header: "Fiş/Fatura No", key: "receiptNo", width: 18 },
      { header: "Satıcı Adı", key: "vendorName", width: 28 },
      { header: "Harcama Cinsi", key: "categoryName", width: 20 },
      { header: "Açıklama", key: "description", width: 32 },
      { header: "Personel", key: "employeeName", width: 22 },
      { header: "Durum", key: "status", width: 16 },
      { header: "Tutar", key: "amount", width: 16 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };

    for (const item of items) {
      sheet.addRow({
        expenseDate: formatDate(item.expenseDate),
        receiptNo: item.receiptNo ?? "-",
        vendorName: item.vendorName,
        categoryName: item.categoryName,
        description: item.description ?? "-",
        employeeName: item.employeeName,
        status: statusLabel(item.status),
        amount: item.amount,
      });
    }

    sheet.getColumn("amount").numFmt = "#,##0.00";

    const subtotalRow = sheet.addRow({ vendorName: "Alt Toplam", amount: totalAmount });
    subtotalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  buildPdfBuffer(items: AdminExpenseItemReportRow[], totalAmount: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const hasFonts = fs.existsSync(REGULAR_FONT_PATH) && fs.existsSync(BOLD_FONT_PATH);
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (hasFonts) {
        doc.registerFont("Body", REGULAR_FONT_PATH);
        doc.registerFont("Heading", BOLD_FONT_PATH);
      }

      const bodyFont = hasFonts ? "Body" : "Helvetica";
      const headingFont = hasFonts ? "Heading" : "Helvetica-Bold";

      const marginLeft = doc.page.margins.left;
      const pageBottom = doc.page.height - doc.page.margins.bottom;
      const rowHeight = 20;
      const tableWidth = PDF_COLUMNS.reduce((sum, column) => sum + column.width, 0);

      function drawHeader(y: number) {
        let x = marginLeft;
        doc.font(headingFont).fontSize(9).fillColor("#000000");
        for (const column of PDF_COLUMNS) {
          doc.text(column.label, x, y, { width: column.width - 4, ellipsis: true });
          x += column.width;
        }
        doc.moveTo(marginLeft, y + 14).lineTo(marginLeft + tableWidth, y + 14).strokeColor("#cccccc").stroke();
      }

      doc.font(headingFont).fontSize(16).fillColor("#000000").text("Masraf Raporu", marginLeft, doc.y);
      doc.moveDown(0.3);
      doc.font(bodyFont).fontSize(9).fillColor("#555555").text(`Oluşturulma: ${new Date().toLocaleString("tr-TR")}`, marginLeft, doc.y);
      doc.moveDown(0.8);

      let y = doc.y;
      drawHeader(y);
      y += rowHeight;

      for (const item of items) {
        if (y + rowHeight > pageBottom) {
          doc.addPage();
          y = doc.page.margins.top;
          drawHeader(y);
          y += rowHeight;
        }

        const values: Record<(typeof PDF_COLUMNS)[number]["key"], string> = {
          expenseDate: formatDate(item.expenseDate),
          receiptNo: item.receiptNo ?? "-",
          vendorName: item.vendorName,
          categoryName: item.categoryName,
          description: item.description ?? "-",
          employeeName: item.employeeName,
          status: statusLabel(item.status),
          amount: formatCurrency(item.amount, item.currency),
        };

        let x = marginLeft;
        doc.font(bodyFont).fontSize(8.5).fillColor("#000000");
        for (const column of PDF_COLUMNS) {
          doc.text(values[column.key], x, y, { width: column.width - 4, ellipsis: true });
          x += column.width;
        }
        y += rowHeight;
      }

      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      doc.moveTo(marginLeft, y).lineTo(marginLeft + tableWidth, y).strokeColor("#000000").stroke();
      y += 4;

      const amountColumnX = marginLeft + PDF_COLUMNS.slice(0, -1).reduce((sum, column) => sum + column.width, 0);
      doc.font(headingFont).fontSize(9).fillColor("#000000");
      doc.text("Alt Toplam", marginLeft, y);
      doc.text(formatCurrency(totalAmount, "TRY"), amountColumnX, y, { width: PDF_COLUMNS[PDF_COLUMNS.length - 1].width - 4 });

      doc.end();
    });
  }
}

export const expenseReportExportService = new ExpenseReportExportService();
