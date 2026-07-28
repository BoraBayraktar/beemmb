export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildFinanceAdvisorExportXml(args: {
  generatedAt: string;
  periodLabel: string;
  from?: string;
  to?: string;
  files: Array<{ key: string; title: string; format: string; filename: string; content: string }>;
}) {
  const fileNodes = args.files
    .map(
      (file) => `  <File key="${escapeXml(file.key)}" format="${escapeXml(file.format)}" filename="${escapeXml(file.filename)}" title="${escapeXml(file.title)}"><![CDATA[${file.content}]]></File>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<FinanceAdvisorExport generatedAt="${escapeXml(args.generatedAt)}" periodLabel="${escapeXml(args.periodLabel)}" from="${escapeXml(args.from ?? "")}" to="${escapeXml(args.to ?? "")}">\n${fileNodes}\n</FinanceAdvisorExport>\n`;
}
