import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { ExpenseOcrExtractionResult } from "@/modules/expense-reports/contracts/expense-ocr.contract";

const extractionSchema = z.object({
  date: z.string().nullable(),
  receiptNo: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  vendorName: z.string().nullable(),
  vatRate: z.number().nullable(),
  vatAmount: z.number().nullable(),
  confidence: z.number(),
});

const SUPPORTED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
type SupportedMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const OCR_TIMEOUT_MS = 15000;

const EXTRACTION_PROMPT =
  "Bu bir fiş veya fatura görselidir. Görseldeki tarihi (ISO 8601, YYYY-MM-DD), fiş/fatura numarasını, toplam tutarı (KDV dahil), para birimini (TRY/USD/EUR gibi kod), satıcı/şirket adını, KDV oranını (% olarak, ör. 20, 10, 1, 0) ve toplam KDV tutarını çıkar. Fişte birden fazla KDV oranı/satırı varsa en yüksek tutarlı satırı esas al. Emin olmadığın veya görselde bulunmayan alanları null bırak. confidence alanına genel okuma güvenini 0 ile 1 arasında bir sayı olarak yaz.";

export class ExpenseOcrService {
  private client: Anthropic | null = null;

  private getClient(): Anthropic | null {
    if (!process.env.ANTHROPIC_API_KEY) {
      return null;
    }

    if (!this.client) {
      this.client = new Anthropic();
    }

    return this.client;
  }

  async extract(args: { bytes: Buffer; contentType: string }): Promise<ExpenseOcrExtractionResult> {
    const client = this.getClient();
    if (!client || !SUPPORTED_MEDIA_TYPES.has(args.contentType)) {
      return { status: "SKIPPED", data: null, confidence: null, raw: null };
    }

    try {
      const response = await client.messages.parse(
        {
          model: "claude-opus-5",
          max_tokens: 1024,
          output_config: {
            format: zodOutputFormat(extractionSchema),
            effort: "low",
          },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: args.contentType as SupportedMediaType,
                    data: args.bytes.toString("base64"),
                  },
                },
                { type: "text", text: EXTRACTION_PROMPT },
              ],
            },
          ],
        },
        { timeout: OCR_TIMEOUT_MS },
      );

      if (!response.parsed_output) {
        return { status: "FAILED", data: null, confidence: null, raw: { reason: "parse_failed" } };
      }

      const parsed = response.parsed_output;
      return {
        status: "COMPLETED",
        data: {
          date: parsed.date,
          receiptNo: parsed.receiptNo,
          amount: parsed.amount,
          currency: parsed.currency,
          vendorName: parsed.vendorName,
          vatRate: parsed.vatRate,
          vatAmount: parsed.vatAmount,
        },
        confidence: parsed.confidence,
        raw: parsed,
      };
    } catch (error) {
      return {
        status: "FAILED",
        data: null,
        confidence: null,
        raw: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }
}

export const expenseOcrService = new ExpenseOcrService();
