const gibDocumentNumberPattern = /^[A-Z0-9]{3}\d{13}$/;

export function normalizeGibDocumentNumberPrefix(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().padEnd(3, "0").slice(0, 3);
}

export function isValidGibDocumentNumber(value: string) {
  return gibDocumentNumberPattern.test(value.trim().toUpperCase());
}

export function buildGibDocumentNumberFromSequence(args: {
  prefix: string;
  year: number;
  sequence: number;
}) {
  const sequence = String(args.sequence).padStart(9, "0").slice(-9);

  return `${normalizeGibDocumentNumberPrefix(args.prefix)}${args.year}${sequence}`;
}
