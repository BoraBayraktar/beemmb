export function sanitizeHttpHeaderValue(value: string, fallback = "unknown") {
  const safeValue = value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
  return safeValue || fallback;
}
