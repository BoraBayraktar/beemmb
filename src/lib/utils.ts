import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TURKISH_SLUG_REPLACEMENTS: Record<string, string> = {
  ç: "c", Ç: "c",
  ğ: "g", Ğ: "g",
  ı: "i", I: "i",
  İ: "i",
  ö: "o", Ö: "o",
  ş: "s", Ş: "s",
  ü: "u", Ü: "u",
};

/** İsimden URL-uyumlu bir slug türetir (Türkçe karakterleri de doğru çevirir). */
export function slugify(value: string) {
  const withoutTurkishChars = value
    .trim()
    .split("")
    .map((char) => TURKISH_SLUG_REPLACEMENTS[char] ?? char)
    .join("");

  return withoutTurkishChars
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
