export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isValidIban(value: string): boolean {
  const normalized = normalizeIban(value);

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)) {
    return false;
  }

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const converted = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));

  let remainder = 0;
  for (const digitChar of converted) {
    remainder = (remainder * 10 + Number(digitChar)) % 97;
  }

  return remainder === 1;
}

export function formatIbanInput(value: string): string {
  const normalized = normalizeIban(value).replace(/[^A-Z0-9]/g, "").slice(0, 34);
  return normalized.replace(/(.{4})/g, "$1 ").trim();
}
