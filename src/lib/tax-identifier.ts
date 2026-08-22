export type TaxIdentifierType = "vkn" | "tckn";

export type TaxIdentifierResolution =
  | { status: "empty" }
  | { status: "incomplete"; digits: string }
  | { status: "valid"; type: TaxIdentifierType; digits: string }
  | { status: "invalid"; digits: string };

export function isValidVkn(value: string): boolean {
  if (!/^\d{10}$/.test(value)) {
    return false;
  }

  const digits = value.split("").map(Number);
  const lastDigit = digits[9];
  let sum = 0;

  for (let i = 0; i < 9; i += 1) {
    let tmp = (digits[i] + (9 - i)) % 10;
    if (tmp !== 0) {
      tmp = (tmp * 2 ** (9 - i)) % 9;
      if (tmp === 0) {
        tmp = 9;
      }
    }
    sum += tmp;
  }

  const calculatedLastDigit = (10 - (sum % 10)) % 10;
  return calculatedLastDigit === lastDigit;
}

export function isValidTckn(value: string): boolean {
  if (!/^\d{11}$/.test(value) || value[0] === "0") {
    return false;
  }

  const digits = value.split("").map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenthDigit = (((oddSum * 7) - evenSum) % 10 + 10) % 10;

  if (tenthDigit !== digits[9]) {
    return false;
  }

  const sumFirstTen = digits.slice(0, 10).reduce((total, digit) => total + digit, 0);
  const eleventhDigit = sumFirstTen % 10;

  return eleventhDigit === digits[10];
}

export function resolveTaxIdentifier(rawValue: string): TaxIdentifierResolution {
  const digits = rawValue.replace(/\D/g, "");

  if (!digits) {
    return { status: "empty" };
  }

  if (digits.length < 10) {
    return { status: "incomplete", digits };
  }

  if (digits.length === 10) {
    return isValidVkn(digits)
      ? { status: "valid", type: "vkn", digits }
      : { status: "invalid", digits };
  }

  if (digits.length === 11) {
    return isValidTckn(digits)
      ? { status: "valid", type: "tckn", digits }
      : { status: "invalid", digits };
  }

  return { status: "invalid", digits };
}
