export function sanitizeAttachmentFileName(value: string, fallback = "document") {
  const safeValue = value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
  return safeValue || fallback;
}
