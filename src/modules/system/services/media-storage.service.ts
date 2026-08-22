import { z } from "zod";

import type {
  UploadCariPhotoInput,
  UploadCariPhotoResult,
  UploadProductImageInput,
  UploadProductImageResult,
} from "@/modules/system/contracts/media.contract";
import { MediaStorageRepository } from "@/modules/system/repositories/media-storage.repository";

const uploadProductImageSchema = z.object({
  bytes: z.instanceof(Buffer).refine((value) => value.length > 0, {
    message: "Image file is empty",
  }),
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  productSlug: z.string().trim().optional(),
});

const uploadCariPhotoSchema = z.object({
  bytes: z.instanceof(Buffer).refine((value) => value.length > 0, {
    message: "Image file is empty",
  }),
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  cariSlug: z.string().trim().optional(),
});

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export class MediaUploadError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MediaUploadError";
  }
}

function toSafeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function getExtension(contentType: string, fileName: string) {
  const fromType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };

  if (fromType[contentType]) {
    return fromType[contentType];
  }

  const fromName = fileName.split(".").pop()?.toLowerCase();
  return fromName && /^[a-z0-9]+$/.test(fromName) ? fromName : "bin";
}

export class MediaStorageService {
  constructor(private readonly repository: MediaStorageRepository) {}

  async uploadProductImage(input: UploadProductImageInput): Promise<UploadProductImageResult> {
    if (!this.repository.isConfigured()) {
      throw new MediaUploadError(503, "Media storage is not configured");
    }

    const parsed = uploadProductImageSchema.parse(input);

    if (!ALLOWED_IMAGE_TYPES.has(parsed.contentType)) {
      throw new MediaUploadError(400, "Unsupported image type");
    }

    if (parsed.bytes.length > MAX_IMAGE_BYTES) {
      throw new MediaUploadError(400, "Image is too large. Max size is 8MB");
    }

    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const productSegment = parsed.productSlug ? toSafeSlug(parsed.productSlug) : "general";
    const ext = getExtension(parsed.contentType, parsed.fileName);
    const objectKey = `products/${yyyy}/${mm}/${productSegment}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const uploaded = await this.repository.uploadObject({
      objectKey,
      contentType: parsed.contentType,
      bytes: parsed.bytes,
      cacheControl: "public, max-age=31536000, immutable",
    });

    return {
      bucket: uploaded.bucket,
      objectKey: uploaded.objectKey,
      contentType: parsed.contentType,
      size: parsed.bytes.length,
      url: uploaded.url,
    };
  }

  async uploadCariPhoto(input: UploadCariPhotoInput): Promise<UploadCariPhotoResult> {
    if (!this.repository.isConfigured()) {
      throw new MediaUploadError(503, "Media storage is not configured");
    }

    const parsed = uploadCariPhotoSchema.parse(input);

    if (!ALLOWED_IMAGE_TYPES.has(parsed.contentType)) {
      throw new MediaUploadError(400, "Unsupported image type");
    }

    if (parsed.bytes.length > MAX_IMAGE_BYTES) {
      throw new MediaUploadError(400, "Image is too large. Max size is 8MB");
    }

    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const cariSegment = parsed.cariSlug ? toSafeSlug(parsed.cariSlug) : "general";
    const ext = getExtension(parsed.contentType, parsed.fileName);
    const objectKey = `cari/${yyyy}/${mm}/${cariSegment}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const uploaded = await this.repository.uploadObject({
      objectKey,
      contentType: parsed.contentType,
      bytes: parsed.bytes,
      cacheControl: "public, max-age=31536000, immutable",
    });

    return {
      bucket: uploaded.bucket,
      objectKey: uploaded.objectKey,
      contentType: parsed.contentType,
      size: parsed.bytes.length,
      url: uploaded.url,
    };
  }
}

export const mediaStorageService = new MediaStorageService(new MediaStorageRepository());
